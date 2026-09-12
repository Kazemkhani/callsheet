import type { EventBrief, Offer, RunState, Usher } from "@/lib/types";
import { appendEvent, getState, update } from "@/lib/store";
import { buildRoster } from "@/lib/roster/build";
import { buildCrewPool, type SeedUsher } from "@/lib/roster/pool";
import * as exa from "@/lib/integrations/exa";
import * as ambi from "@/lib/integrations/ambiguous";
import * as telegram from "@/lib/integrations/telegram";
import { parseRequest } from "@/lib/agent/parse";
import { renderCallsheet } from "@/lib/agent/callsheet";

const PROJECT_SUFFIX = " staffing";
const MAIL_LIMIT = Number(process.env.OFFER_MAIL_LIMIT ?? "6");
const VERIFY_LIMIT = Number(process.env.VERIFY_LIMIT ?? "10");

function llmKey(): { key: string; kind: "openrouter" | "openai" } | null {
  const or = process.env.OPENROUTER_API_KEY?.trim();
  if (or) return { key: or, kind: "openrouter" };
  const oa = process.env.OPENAI_API_KEY?.trim();
  if (oa) return { key: oa, kind: "openai" };
  return null;
}

async function crewFromState(): Promise<SeedUsher[]> {
  const s = await getState();
  return (s.crew ?? []) as SeedUsher[];
}

async function setCrew(crew: SeedUsher[]): Promise<void> {
  await update((s) => {
    s.crew = crew;
  });
}

async function mapLimited<T, R>(items: T[], limit: number, fn: (i: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

// ------------------------------------------------------------------ tools

export async function toolResearchEvent(name: string, statedVenue?: string): Promise<string> {
  await update((s) => {
    s.stage = "researching";
  });
  try {
    const res = await exa.researchEvent(name, statedVenue);
    await update((s) => {
      if (!s.brief) return;
      if (res.verifiedVenue) s.brief.verifiedVenue = res.verifiedVenue;
      if (res.city) s.brief.city = res.city;
      if (res.organiser && !s.brief.organiser) s.brief.organiser = res.organiser;
      if (res.expectedAttendance) s.brief.expectedAttendance = res.expectedAttendance;
      s.brief.sources = res.sources;
    });
    const venueLine = res.verifiedVenue
      ? `venue resolved to ${res.verifiedVenue}${statedVenue && !statedVenue.includes(res.verifiedVenue.split(" ")[0]) ? ` (coordinator said "${statedVenue}")` : ""}`
      : "venue unverified";
    await appendEvent({
      tool: "research_event",
      level: res.verifiedVenue ? "info" : "warn",
      message: `Exa: ${venueLine} from ${res.sources.length} sources`,
      data: { sources: res.sources, organiser: res.organiser, verifiedVenue: res.verifiedVenue },
    });
    return venueLine;
  } catch (err) {
    await appendEvent({
      tool: "research_event",
      level: "warn",
      message: `${(err as Error).message}, continuing with venue unverified`,
    });
    return "venue unverified";
  }
}

export async function toolSearchCrew(): Promise<string> {
  await update((s) => {
    s.stage = "searching_crew";
  });
  const state = await getState();
  if (!state.brief) throw new Error("search_crew: no brief on the run");
  const pool = await buildCrewPool(state.brief);
  await setCrew(pool.ushers);
  const message =
    pool.benchCount > 0
      ? `crew pool: ${pool.seedCount} researched ushers plus ${pool.benchCount} generated bench candidates (marked synthetic, demo addresses) for ${pool.slots} slots`
      : `crew pool: ${pool.seedCount} researched ushers for ${pool.slots} slots`;
  await appendEvent({
    tool: "search_crew",
    level: pool.benchCount > 0 ? "warn" : "info",
    message,
    data: { seedCount: pool.seedCount, benchCount: pool.benchCount, slots: pool.slots },
  });
  return message;
}

export async function toolVerifyExperience(limit = VERIFY_LIMIT): Promise<string> {
  await update((s) => {
    s.stage = "verifying";
  });
  const crew = await crewFromState();
  const candidates = crew.filter((u) => !u.synthetic && (u.pastEvents?.length ?? 0) > 0).slice(0, limit);
  if (candidates.length === 0) {
    await appendEvent({ tool: "verify_experience", level: "warn", message: "no claimed events to verify" });
    return "nothing to verify";
  }
  let verifiedTotal = 0;
  let failures = 0;
  const results = await mapLimited(candidates, 4, async (u) => {
    try {
      return await exa.verifyExperience(u);
    } catch (err) {
      failures++;
      await appendEvent({
        tool: "verify_experience",
        level: "warn",
        message: `${(err as Error).message} for ${u.name}, history left unverified`,
      });
      return { usherId: u.id, verifiedEvents: [], sources: [] };
    }
  });
  const byId = new Map(results.map((r) => [r.usherId, r]));
  const next = crew.map((u) => {
    const r = byId.get(u.id);
    if (!r) return u;
    verifiedTotal += r.verifiedEvents.length;
    return { ...u, verifiedEvents: r.verifiedEvents };
  });
  await setCrew(next);
  const message = `Exa: checked ${candidates.length} ushers, ${verifiedTotal} past events confirmed, ${failures} lookups failed`;
  await appendEvent({ tool: "verify_experience", level: "info", message });
  return message;
}

export async function toolBuildRoster(): Promise<string> {
  await update((s) => {
    s.stage = "building_roster";
  });
  const state = await getState();
  if (!state.brief) throw new Error("build_roster: no brief on the run");
  const crew = await crewFromState();
  const { offers, waitlist, unfilled } = buildRoster(state.brief, crew);
  const firstTimers = offers.filter((o) => o.firstTimerSlot).length;
  await update((s) => {
    s.offers = offers;
    s.waitlist = waitlist;
    s.unfilled = unfilled;
    s.stage = "awaiting_approval";
  });
  const message = `roster: ${offers.length} offers across ${state.brief.positions.length} areas, ${firstTimers} newcomer slots reserved, ${waitlist.length} on the waitlist, ${unfilled.length} areas short`;
  await appendEvent({ tool: "build_roster", level: "info", message, data: { unfilled } });
  return message;
}

export async function writeCallsheet(state?: RunState): Promise<{ id: string; url: string } | null> {
  const s = state ?? (await getState());
  const crew = (s.crew ?? []) as Usher[];
  const markdown = renderCallsheet(s, crew);
  const title = `Call sheet: ${s.brief?.name ?? "event"}`;
  try {
    const existingId = s.workspace.callsheetDocId;
    if (existingId) {
      await ambi.updateDoc(existingId, { title, markdown });
      const url = s.workspace.callsheetDocUrl ?? `${ambi.origin()}/documents/${existingId}`;
      await appendEvent({
        tool: "write_callsheet",
        level: "info",
        message: `Ambiguous: call sheet document updated (${markdown.split("\n").length} lines)`,
        data: { docId: existingId, url, lines: markdown.split("\n").length },
      });
      return { id: existingId, url };
    }
    const doc = await ambi.createDoc({ title, markdown });
    await update((st) => {
      st.workspace.callsheetDocUrl = doc.url;
      st.workspace.callsheetDocId = doc.id;
      st.workspace.connected = true;
    });
    await appendEvent({
      tool: "write_callsheet",
      level: "info",
      message: `Ambiguous: call sheet document created (${markdown.split("\n").length} lines)`,
      data: { docId: doc.id, url: doc.url, lines: markdown.split("\n").length },
    });
    return doc;
  } catch (err) {
    await update((st) => {
      st.workspace.lastSyncError = (err as Error).message;
    });
    await appendEvent({
      tool: "write_callsheet",
      level: "error",
      message: `${(err as Error).message}, call sheet rendered locally only`,
    });
    return null;
  }
}

// ------------------------------------------------------------------ run

export async function startRun(request: string): Promise<string> {
  const runId = `run-${Date.now().toString(36)}`;
  const brief = await parseRequest(request);
  await update((s) => {
    s.runId = runId;
    s.request = request;
    s.brief = brief;
    s.offers = [];
    s.events = [];
    s.waitlist = [];
    s.unfilled = [];
    s.stage = "researching";
    s.workspace = {
      connected: ambi.isConfigured(),
      agentEmail: ambi.agentEmail(),
      projectId: s.workspace?.projectId,
    };
  });

  const planner = llmKey();
  await appendEvent({
    tool: "system",
    level: planner ? "info" : "warn",
    message: planner
      ? `planner: OpenAI Agents SDK via ${planner.kind}, model ${planner.kind === "openrouter" ? "openai/gpt-4.1-mini" : "gpt-4.1-mini"}`
      : "planner: scripted mode (no LLM key configured)",
  });
  await appendEvent({
    tool: "system",
    level: "info",
    message: `brief parsed: ${brief.name}, ${brief.dates.length} days, ${brief.positions.reduce((n, p) => n + p.needed, 0)} slots, AED ${brief.rateAedPerHour}/h`,
  });

  try {
    if (planner) {
      await runWithLlm(request, planner);
    } else {
      await toolResearchEvent(brief.name, brief.venue);
      await toolSearchCrew();
      await toolVerifyExperience();
      await toolBuildRoster();
    }
  } catch (err) {
    await appendEvent({ tool: "system", level: "error", message: `run failed: ${(err as Error).message}` });
    await update((s) => {
      s.stage = "failed";
    });
    throw err;
  }
  return runId;
}

async function runWithLlm(request: string, planner: { key: string; kind: "openrouter" | "openai" }) {
  const { Agent, run, tool, setDefaultOpenAIClient, setOpenAIAPI, setTracingDisabled } = await import(
    "@openai/agents"
  );
  const { z } = await import("zod");

  if (planner.kind === "openrouter") {
    const OpenAI = (await import("openai")).default;
    setDefaultOpenAIClient(
      new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: planner.key }) as never,
    );
    setOpenAIAPI("chat_completions");
    setTracingDisabled(true);
  }

  const tools = [
    tool({
      name: "research_event",
      description: "Verify the event venue, city, organiser and attendance with Exa web research.",
      parameters: z.object({ name: z.string(), statedVenue: z.string().nullable() }),
      execute: async ({ name, statedVenue }) => toolResearchEvent(name, statedVenue ?? undefined),
    }),
    tool({
      name: "search_crew",
      description: "Load the available crew pool for the brief.",
      parameters: z.object({}),
      execute: async () => toolSearchCrew(),
    }),
    tool({
      name: "verify_experience",
      description: "Check claimed past events of the crew against the web with Exa.",
      parameters: z.object({ limit: z.number().nullable() }),
      execute: async ({ limit }) => toolVerifyExperience(limit ?? VERIFY_LIMIT),
    }),
    tool({
      name: "build_roster",
      description: "Score, allocate and waitlist the crew. Stops at awaiting_approval.",
      parameters: z.object({}),
      execute: async () => toolBuildRoster(),
    }),
    tool({
      name: "write_callsheet",
      description: "Write the call sheet document into the Ambiguous workspace.",
      parameters: z.object({}),
      execute: async () => {
        const doc = await writeCallsheet();
        return doc ? `call sheet at ${doc.url}` : "call sheet could not be written to the workspace";
      },
    }),
  ];

  const agent = new Agent({
    name: "Callsheet staffing coordinator",
    model: planner.kind === "openrouter" ? "openai/gpt-4.1-mini" : "gpt-4.1-mini",
    instructions: [
      "You are a UAE event staffing coordinator.",
      "Parse the coordinator's request into an event brief, then call the tools in this order:",
      "research_event, search_crew, verify_experience, build_roster.",
      "Stop after build_roster and report the roster. Never send offers: a human approves first.",
      "Write in British English. No emojis.",
    ].join(" "),
    tools,
  });

  const result = await run(agent, request, { maxTurns: 12 });
  await appendEvent({
    tool: "system",
    level: "info",
    message: `planner finished: ${String(result.finalOutput ?? "").slice(0, 200)}`,
  });
}

/** Workspace task count derived from the offers, so re-running a step can never double count. */
function countWorkspaceTasks(s: RunState): number {
  return s.offers.filter((o) => o.ambiguousTaskId).length + s.offers.filter((o) => o.ambiguousTrainingTaskId).length;
}

// ------------------------------------------------------------------ sending

function offerSubject(brief: EventBrief, offer: Offer): string {
  return `Offer: ${offer.area} at ${brief.name}, ${brief.dates[0]}`;
}

function offerBody(brief: EventBrief, offer: Offer, usher: Usher): string {
  const lines = [
    `Hello ${usher.name.split(" ")[0]},`,
    "",
    `You have been allocated **${offer.area}** at **${brief.name}**.`,
    "",
    `- Venue: ${brief.verifiedVenue ?? brief.venue}, ${brief.city}`,
    `- Dates: ${brief.dates.join(", ")}`,
    `- Shift: ${brief.shiftStart} to ${brief.shiftEnd} (${brief.hoursPerDay} hours)`,
    `- Rate: AED ${brief.rateAedPerHour.toFixed(2)} per hour, AED ${(brief.rateAedPerHour * brief.hoursPerDay).toFixed(0)} per day`,
  ];
  if (brief.training) {
    lines.push(
      `- Training: ${brief.training.date}, ${brief.training.durationHours} hours, ${brief.training.mandatory ? "mandatory" : "optional"}, ${brief.training.onSite ? "on site" : "online"}`,
    );
  }
  lines.push(
    `- Transport: ${brief.transport}`,
    `- Meals: ${brief.meals}`,
    "",
    `Why you: ${offer.reason}`,
    "",
    "Reply YES to confirm or NO to decline. First reply wins the slot.",
  );
  return lines.join("\n");
}

export async function approveAndSend(runId?: string): Promise<{ sent: number; queued: number; tasks: number }> {
  const state = await getState();
  if (runId && state.runId !== runId) throw new Error(`approve: run ${runId} is not the active run`);
  if (!state.brief) throw new Error("approve: no brief on the run");
  const brief = state.brief;
  const crew = (state.crew ?? []) as SeedUsher[];
  const byId = new Map(crew.map((u) => [u.id, u]));

  await update((s) => {
    s.stage = "sending_offers";
    for (const o of s.offers) if (o.status === "proposed") o.status = "queued";
  });
  await appendEvent({
    tool: "approve_roster",
    level: "info",
    message: `coordinator approved ${state.offers.length} offers, human gate passed`,
  });

  let projectId = state.workspace.projectId;
  try {
    projectId = await ambi.ensureProject(`${brief.name}${PROJECT_SUFFIX}`);
    await update((s) => {
      s.workspace.projectId = projectId;
      s.workspace.connected = true;
    });
    await appendEvent({
      tool: "sync_workspace",
      level: "info",
      message: `Ambiguous: staffing project ready in ${(await ambi.workspaceSlug()) ?? "the workspace"}`,
      data: { projectId, project: `${brief.name}${PROJECT_SUFFIX}` },
    });
  } catch (err) {
    await appendEvent({
      tool: "sync_workspace",
      level: "error",
      message: `${(err as Error).message}, offers will send without workspace tasks`,
    });
  }

  let mailsSent = 0;
  const results = await mapLimited(state.offers, 4, async (offer) => {
    const usher = byId.get(offer.usherId);
    if (!usher) return { id: offer.id, status: "queued" as const, error: "usher not in crew pool" };

    if (usher.telegramChatId) {
      try {
        await telegram.sendOffer(usher.telegramChatId, offer, brief, usher);
        return { id: offer.id, status: "sent" as const, channel: ["telegram" as const] };
      } catch (err) {
        return { id: offer.id, status: "queued" as const, error: (err as Error).message };
      }
    }

    if (usher.email.endsWith(".invalid")) {
      return {
        id: offer.id,
        status: "queued" as const,
        error: "bench candidate has no deliverable address, offer held",
      };
    }
    if (mailsSent >= MAIL_LIMIT) {
      return {
        id: offer.id,
        status: "queued" as const,
        error: `real mail capped at OFFER_MAIL_LIMIT=${MAIL_LIMIT} for this demo run`,
      };
    }
    mailsSent++;
    try {
      let contactId = usher.ambiguousContactId;
      if (!contactId) {
        contactId = await ambi.upsertContact(usher);
      }
      // Seed addresses are research data, not consented recipients. Unless OFFER_MAIL_TO is set
      // to the real crew, offers are delivered to the agent's own Ambiguous mailbox with the
      // intended recipient stated in the body. The send itself is real either way.
      const override = process.env.OFFER_MAIL_TO ?? ambi.agentEmail();
      const redirected = Boolean(override) && override !== usher.email;
      const body = redirected
        ? `Intended recipient: ${usher.name} <${usher.email}>. Delivered to the agent mailbox for this demo run.\n\n---\n\n${offerBody(brief, offer, usher)}`
        : offerBody(brief, offer, usher);
      const mail = await ambi.sendMail({
        to: override ?? usher.email,
        subject: offerSubject(brief, offer),
        bodyMarkdown: body,
        contactId,
        idempotencyKey: `offer-${usher.id}-${brief.id}`,
      });
      return {
        id: offer.id,
        status: "sent" as const,
        channel: ["email" as const],
        mailId: mail.mailId,
        contactId,
        reused: mail.reused,
      };
    } catch (err) {
      return { id: offer.id, status: "queued" as const, error: (err as Error).message };
    }
  });

  const now = new Date().toISOString();
  await update((s) => {
    for (const r of results) {
      const offer = s.offers.find((o) => o.id === r.id);
      if (!offer) continue;
      offer.status = r.status;
      offer.error = r.error;
      if (r.status === "sent") {
        offer.sentAt = now;
        if (r.channel) offer.channel = r.channel;
        if (r.mailId) offer.ambiguousMailId = r.mailId;
      }
      if (r.contactId) {
        const u = s.crew?.find((c) => c.id === offer.usherId);
        if (u) u.ambiguousContactId = r.contactId;
      }
    }
    s.workspace.contacts = (s.crew ?? []).filter((c) => c.ambiguousContactId).length;
    s.stage = "collecting_replies";
  });

  const sent = results.filter((r) => r.status === "sent").length;
  const queued = results.filter((r) => r.status === "queued").length;
  await appendEvent({
    tool: "send_offers",
    level: queued > 0 ? "warn" : "info",
    message: `offers: ${sent} sent, ${queued} queued with an error, ${mailsSent} real emails via Ambiguous${process.env.OFFER_MAIL_TO ? "" : " (delivered to the agent mailbox, set OFFER_MAIL_TO to reach the crew)"}`,
  });

  let tasks = 0;
  if (projectId) {
    const pending = (await getState()).offers.filter((o) => o.status === "sent");
    const taskResults = await mapLimited(pending, 4, async (offer) => {
      const usher = byId.get(offer.usherId);
      try {
        const taskId = await ambi.createTask({
          projectId: projectId as string,
          title: `Confirm ${usher?.name ?? offer.usherId} for ${offer.area}`,
          description: `${brief.name}, ${brief.dates.join(" and ")}. ${offer.reason}. Channel: ${offer.channel.join(", ")}.`,
          dueDate: brief.dates[0],
          priority: "high",
        });
        return { id: offer.id, taskId };
      } catch (err) {
        return { id: offer.id, error: (err as Error).message };
      }
    });
    await update((s) => {
      for (const r of taskResults) {
        const offer = s.offers.find((o) => o.id === r.id);
        if (offer && r.taskId) offer.ambiguousTaskId = r.taskId;
      }
      s.workspace.tasks = countWorkspaceTasks(s);
    });
    tasks = taskResults.filter((r) => r.taskId).length;
    const failed = taskResults.filter((r) => r.error);
    await appendEvent({
      tool: "sync_workspace",
      level: failed.length ? "warn" : "info",
      message: `Ambiguous: ${tasks} confirmation tasks created in the staffing project${failed.length ? `, ${failed.length} failed (${failed[0].error})` : ""}`,
      data: { projectId, created: tasks, failed: failed.length, firstError: failed[0]?.error },
    });
  }

  return { sent, queued, tasks };
}

// ------------------------------------------------------------------ replies

export async function recordReply(
  key: string,
  answer: "yes" | "no",
): Promise<{
  offerId: string;
  status: Offer["status"];
  promoted?: string;
  trainingTaskId?: string;
  idempotent?: boolean;
} | null> {
  const state = await getState();
  const offer =
    state.offers.find((o) => o.id === key) ??
    state.offers.find((o) => o.usherId === key && o.status !== "declined");
  if (!offer) {
    await appendEvent({
      tool: "record_reply",
      level: "warn",
      message: `reply "${answer}" from ${key} matched no open offer`,
    });
    return null;
  }
  const crew = (state.crew ?? []) as SeedUsher[];
  const usher = crew.find((u) => u.id === offer.usherId);

  // A reply is not a command, it is a fact. The same fact arriving twice (Telegram retry, double
  // tap, replayed webhook) must not create a second task or promote a second body off the
  // waitlist, so a reply that matches the status already recorded returns the existing state.
  const settled: Offer["status"] = answer === "yes" ? "confirmed" : "declined";
  if (offer.status === settled) {
    await appendEvent({
      tool: "record_reply",
      level: "info",
      message: `${usher?.name ?? offer.usherId} is already ${settled} for ${offer.area}, duplicate ${answer} ignored`,
      data: {
        offerId: offer.id,
        usherId: offer.usherId,
        trainingTaskId: offer.ambiguousTrainingTaskId,
      },
    });
    return {
      offerId: offer.id,
      status: offer.status,
      trainingTaskId: offer.ambiguousTrainingTaskId,
      idempotent: true,
    };
  }

  const now = new Date().toISOString();
  let promoted: string | undefined;

  await update((s) => {
    const target = s.offers.find((o) => o.id === offer.id);
    if (!target) return;
    target.status = answer === "yes" ? "confirmed" : "declined";
    target.respondedAt = now;
    if (answer === "no") {
      const next = (s.waitlist ?? []).find(
        (w) => w.area === target.area && !s.offers.some((o) => o.usherId === w.usherId),
      );
      if (next) {
        promoted = next.usherId;
        s.waitlist = (s.waitlist ?? []).filter((w) => w.id !== next.id);
        s.offers.push({ ...next, id: `off-${target.eventId}-${next.usherId}`, status: "queued" });
      }
    }
  });

  await appendEvent({
    tool: "record_reply",
    level: "info",
    message: `${usher?.name ?? offer.usherId} replied ${answer} for ${offer.area}${promoted ? `, promoted ${crew.find((c) => c.id === promoted)?.name ?? promoted} from the waitlist` : ""}`,
  });

  const after = await getState();
  let trainingTaskId = after.offers.find((o) => o.id === offer.id)?.ambiguousTrainingTaskId;
  if (answer === "yes" && after.workspace.projectId && after.brief?.training && !trainingTaskId) {
    try {
      const taskId = await ambi.createTask({
        projectId: after.workspace.projectId,
        title: `Training reminder: ${usher?.name ?? offer.usherId} (${offer.area})`,
        description: `Mandatory training on ${after.brief.training.date}, ${after.brief.training.durationHours} hours. Confirmed for ${after.brief.name}.`,
        dueDate: after.brief.training.date,
        priority: "medium",
      });
      trainingTaskId = taskId;
      await update((s) => {
        const target = s.offers.find((o) => o.id === offer.id);
        if (target) target.ambiguousTrainingTaskId = taskId;
        s.workspace.tasks = countWorkspaceTasks(s);
      });
      await appendEvent({
        tool: "sync_workspace",
        level: "info",
        message: `Ambiguous: training reminder task created for ${usher?.name ?? offer.usherId} (${offer.area})`,
        data: { taskId, offerId: offer.id, usherId: offer.usherId, area: offer.area },
      });
    } catch (err) {
      await appendEvent({
        tool: "sync_workspace",
        level: "warn",
        message: `training reminder task failed: ${(err as Error).message}`,
        data: { offerId: offer.id, usherId: offer.usherId },
      });
    }
  }

  const replies = after.offers.filter((o) => o.status === "confirmed" || o.status === "declined").length;
  const open = after.offers.filter((o) => o.status === "sent" || o.status === "queued").length;
  if (open === 0 || replies % 10 === 0) {
    await writeCallsheet(after);
  }
  if (open === 0) {
    await update((s) => {
      s.stage = "complete";
    });
  }

  return { offerId: offer.id, status: settled, promoted, trainingTaskId };
}

export async function linkTelegramChat(usherKey: string, chatId: string): Promise<Usher | null> {
  const state = await getState();
  const crew = (state.crew ?? []) as SeedUsher[];
  const needle = usherKey.trim().toLowerCase();
  const usher =
    crew.find((u) => u.id.toLowerCase() === needle) ??
    crew.find((u) => u.name.toLowerCase() === needle) ??
    crew.find((u) => u.name.toLowerCase().split(" ")[0] === needle);
  if (!usher) return null;
  await update((s) => {
    const u = s.crew?.find((c) => c.id === usher.id);
    if (u) u.telegramChatId = chatId;
  });
  await appendEvent({
    tool: "system",
    level: "info",
    message: `Telegram: chat ${chatId} mapped to ${usher.name} (${usher.id})`,
  });
  return { ...usher, telegramChatId: chatId };
}
