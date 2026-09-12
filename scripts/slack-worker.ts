/**
 * Callsheet Slack worker.
 *
 * Socket Mode process that turns a plain-English staffing request posted in Slack into a run of the
 * Callsheet agent, streams the run back into the same thread, and carries the human approval gate.
 *
 * Run it with:  pnpm exec tsx --env-file=.env.local scripts/slack-worker.ts
 * Setup doc:    docs/SLACK-SETUP.md
 */

import fs from "node:fs";
import path from "node:path";

import { App } from "@slack/bolt";

import {
  ACTION_ADJUST,
  ACTION_APPROVE,
  adjustMessage,
  completeMessage,
  confirmationLine,
  failureMessage,
  fillMessage,
  rosterMessage,
  statusMessage,
  type SlackMessage,
  type StateLike,
} from "../lib/slack/blocks";
import { confirmedCount, totalSlots } from "../lib/slack/format";

// --- env ---------------------------------------------------------------------

/** Minimal .env.local reader so the worker runs with or without --env-file. No new dependency. */
function loadEnvFile(file: string): void {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
    if (quoted) {
      value = value.slice(1, -1);
    } else {
      const comment = value.indexOf(" #");
      if (comment !== -1) value = value.slice(0, comment).trim();
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(__dirname, "..", ".env.local"));

const REQUIRED = ["SLACK_BOT_TOKEN", "SLACK_APP_TOKEN", "SLACK_SIGNING_SECRET"] as const;
const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(
    `Missing ${missing.join(", ")} in the environment or .env.local. Get each value from docs/SLACK-SETUP.md, then run: pnpm exec tsx --env-file=.env.local scripts/slack-worker.ts`,
  );
  process.exit(1);
}

const BASE_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
type SlackClient = App["client"];

const POLL_MS = 1500;
const POLL_TIMEOUT_MS = 4000;
const RUN_BUDGET_MS = 10 * 60 * 1000;

// --- app API -----------------------------------------------------------------

/** Turn any transport failure into the mechanism, never a shrug. */
function describeError(error: unknown, what: string): string {
  const cause = (error as { cause?: { code?: string; message?: string } })?.cause;
  const code = cause?.code;
  if (code) return `${what} unreachable at ${BASE_URL}: ${code}`;
  if (error instanceof Error && error.name === "TimeoutError") return `${what} timed out at ${BASE_URL} after ${POLL_TIMEOUT_MS}ms`;
  const message = error instanceof Error ? error.message : String(error);
  return `${what} failed at ${BASE_URL}: ${message}`;
}

async function startRun(request: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/agent`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ request }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`POST /api/agent returned ${res.status} ${res.statusText}`);
  const body = (await res.json()) as { runId?: string };
  if (!body.runId) throw new Error("POST /api/agent returned no runId");
  return body.runId;
}

async function approveRun(runId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/agent/approve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ runId }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`POST /api/agent/approve returned ${res.status} ${res.statusText}`);
}

async function fetchState(): Promise<StateLike> {
  const res = await fetch(`${BASE_URL}/api/state`, { signal: AbortSignal.timeout(POLL_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`GET /api/state returned ${res.status} ${res.statusText}`);
  return (await res.json()) as StateLike;
}

// --- run bookkeeping ---------------------------------------------------------

interface RunContext {
  runId: string;
  channel: string;
  threadTs: string;
  statusTs: string;
  rosterTs?: string;
  fillTs?: string;
  approved: boolean;
  finished: boolean;
  seenConfirmed: Set<string>;
  confirmationLines: string[];
  lastError?: string;
}

const runs = new Map<string, RunContext>();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function post(client: SlackClient, run: RunContext, message: SlackMessage): Promise<string | undefined> {
  const res = await client.chat.postMessage({
    channel: run.channel,
    thread_ts: run.threadTs,
    text: message.text,
    blocks: message.blocks as never,
  });
  return res.ts;
}

async function update(client: SlackClient, run: RunContext, ts: string, message: SlackMessage): Promise<void> {
  await client.chat.update({
    channel: run.channel,
    ts,
    text: message.text,
    blocks: message.blocks as never,
  });
}

/** Post a mechanism line once per distinct failure, so a flapping API does not spam the thread. */
async function reportError(client: SlackClient, run: RunContext, detail: string): Promise<void> {
  if (run.lastError === detail) return;
  run.lastError = detail;
  await post(client, run, failureMessage(detail));
}

// --- the loop ----------------------------------------------------------------

async function pollRun(client: SlackClient, run: RunContext): Promise<void> {
  const startedAt = Date.now();

  while (!run.finished && Date.now() - startedAt < RUN_BUDGET_MS) {
    await sleep(POLL_MS);

    let state: StateLike;
    try {
      state = await fetchState();
      run.lastError = undefined;
    } catch (error) {
      await reportError(client, run, describeError(error, "GET /api/state"));
      continue;
    }

    try {
      await update(client, run, run.statusTs, statusMessage(state));

      if (state.stage === "awaiting_approval" && !run.rosterTs) {
        run.rosterTs = await post(client, run, rosterMessage(state));
      }

      if (run.approved) {
        const newly = state.offers.filter((o) => o.status === "confirmed" && !run.seenConfirmed.has(o.id));
        for (const offer of newly) {
          run.seenConfirmed.add(offer.id);
          run.confirmationLines.push(confirmationLine(state, offer));
        }

        if (newly.length > 0 || !run.fillTs) {
          const message = fillMessage(state, run.confirmationLines);
          if (run.fillTs) await update(client, run, run.fillTs, message);
          else run.fillTs = await post(client, run, message);
        }
      }

      const total = totalSlots(state.brief, state.offers);
      const allConfirmed = total > 0 && confirmedCount(state.offers) >= total;

      if (state.stage === "complete" || (run.approved && allConfirmed)) {
        await post(client, run, completeMessage(state));
        run.finished = true;
      } else if (state.stage === "failed") {
        run.finished = true;
      }
    } catch (error) {
      console.error("Slack write failed:", error);
    }
  }

  if (!run.finished) {
    await post(client, run, failureMessage(`Stopped watching this run after 10 minutes. The run may still be going: check ${BASE_URL}.`));
  }
  runs.delete(run.runId);
}

/** Every entry point lands here: slash command, app mention, direct message. */
async function runRequest(client: SlackClient, request: string, channel: string, threadTs?: string): Promise<void> {
  const text = request.trim();
  if (!text) {
    await client.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: "Give me the request in one message, for example: 60 for AI Everything Summit, 6-7 Oct, 10 each: Stage, Kids Zone, F&B, Traditional Games, Registration & Scanning, Info Desk.",
    });
    return;
  }

  let runId: string;
  try {
    runId = await startRun(text);
  } catch (error) {
    const detail = describeError(error, "POST /api/agent");
    await client.chat.postMessage({ channel, thread_ts: threadTs, text: `Callsheet stopped. ${detail}` });
    return;
  }

  const opening: SlackMessage = {
    text: "Callsheet is on it. Stage: researching the event",
    blocks: [{ type: "section", text: { type: "mrkdwn", text: "*Callsheet is on it. Stage: researching the event*" } }],
  };

  const posted = await client.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text: opening.text,
    blocks: opening.blocks as never,
  });
  const statusTs = posted.ts as string;

  const run: RunContext = {
    runId,
    channel,
    threadTs: threadTs ?? statusTs,
    statusTs,
    approved: false,
    finished: false,
    seenConfirmed: new Set(),
    confirmationLines: [],
  };
  runs.set(runId, run);

  void pollRun(client, run).catch((error) => console.error("Poll loop crashed:", error));
}

// --- Slack wiring ------------------------------------------------------------

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

// (a) /staff <request>
app.command("/staff", async ({ command, ack, client }) => {
  await ack();
  await runRequest(client, command.text ?? "", command.channel_id);
});

// (b) @Callsheet <request> in a channel
app.event("app_mention", async ({ event, client }) => {
  const text = (event.text ?? "").replace(/<@[A-Z0-9]+>/g, " ").trim();
  await runRequest(client, text, event.channel, event.thread_ts ?? event.ts);
});

// (c) direct message to the bot
app.message(async ({ message, client }) => {
  const m = message as unknown as {
    subtype?: string;
    bot_id?: string;
    channel_type?: string;
    channel: string;
    text?: string;
    ts: string;
    thread_ts?: string;
  };
  if (m.subtype || m.bot_id) return;
  if (m.channel_type !== "im") return; // channel traffic arrives via app_mention
  await runRequest(client, m.text ?? "", m.channel, m.thread_ts ?? m.ts);
});

interface ActionBody {
  actions?: { value?: string }[];
  user?: { id?: string };
  channel?: { id?: string };
  message?: { thread_ts?: string; ts?: string };
}

app.action(ACTION_APPROVE, async ({ ack, body, client }) => {
  await ack();
  const payload = body as unknown as ActionBody;
  const runId = payload.actions?.[0]?.value ?? "";
  const run = runs.get(runId);
  const channel = run?.channel ?? payload.channel?.id ?? "";
  const threadTs = run?.threadTs ?? payload.message?.thread_ts ?? payload.message?.ts;

  try {
    await approveRun(runId);
  } catch (error) {
    await client.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: `Callsheet stopped. ${describeError(error, "POST /api/agent/approve")}`,
    });
    return;
  }

  if (run?.rosterTs) {
    await client.chat.update({
      channel: run.channel,
      ts: run.rosterTs,
      text: "Roster approved.",
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: `*Roster approved by <@${payload.user?.id ?? "coordinator"}>.* Offers are going out now.` },
        },
      ] as never,
    });
  }

  if (run) {
    run.approved = true;
  } else {
    await client.chat.postMessage({
      channel,
      thread_ts: threadTs,
      text: "Approved. This worker did not start that run, so it cannot stream confirmations here: watch the console at " + BASE_URL,
    });
  }
});

app.action(ACTION_ADJUST, async ({ ack, body, client }) => {
  await ack();
  const payload = body as unknown as ActionBody;
  const run = runs.get(payload.actions?.[0]?.value ?? "");
  const message = adjustMessage();
  await client.chat.postMessage({
    channel: run?.channel ?? payload.channel?.id ?? "",
    thread_ts: run?.threadTs ?? payload.message?.thread_ts ?? payload.message?.ts,
    text: message.text,
    blocks: message.blocks as never,
  });
});

app.error(async (error) => {
  console.error("Bolt error:", error);
});

void (async () => {
  await app.start();
  console.log(`Callsheet Slack worker connected over Socket Mode. App API base: ${BASE_URL}`);
})();
