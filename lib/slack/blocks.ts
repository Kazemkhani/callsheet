// Pure Block Kit builders. Deliberately no Bolt import: these are data, not transport.

import type { Offer, RunState } from "../types";
import {
  areaLine,
  briefLines,
  confirmedCount,
  eventLine,
  lastEvents,
  meter,
  stageWords,
  tallyByArea,
  totalSlots,
  truncate,
} from "./format";

export const ACTION_APPROVE = "approve_roster";
export const ACTION_ADJUST = "adjust_roster";

export interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

export interface SlackMessage {
  text: string;
  blocks: SlackBlock[];
}

/** The agent core may add an usher directory to the state payload; we read it if present. */
export interface UsherLike {
  id: string;
  name?: string;
  verifiedEvents?: string[];
}

export type StateLike = RunState & {
  ushers?: UsherLike[];
  workspace: RunState["workspace"] & { contacts?: number; tasks?: number };
};

type OfferLike = Offer & { usherName?: string; verified?: boolean };

export function usherName(state: StateLike, offer: Offer): string {
  const denormalised = (offer as OfferLike).usherName;
  if (denormalised) return denormalised;
  const found = state.ushers?.find((u) => u.id === offer.usherId);
  return found?.name ?? offer.usherId;
}

export function isVerified(state: StateLike, offer: Offer): boolean {
  const flag = (offer as OfferLike).verified;
  if (typeof flag === "boolean") return flag;
  const found = state.ushers?.find((u) => u.id === offer.usherId);
  return (found?.verifiedEvents?.length ?? 0) > 0;
}

function section(text: string): SlackBlock {
  return { type: "section", text: { type: "mrkdwn", text } };
}

function context(text: string): SlackBlock {
  return { type: "context", elements: [{ type: "mrkdwn", text }] };
}

function monoBlock(lines: string[]): string {
  return lines.map((line) => `\`${line}\``).join("\n");
}

/**
 * The single status message, chat.update-d on every poll.
 * Stage in words, the brief once it exists, the last 6 agent events as mono lines.
 */
export function statusMessage(state: StateLike): SlackMessage {
  const headline = `Callsheet is on it. Stage: ${stageWords(state.stage)}`;
  const blocks: SlackBlock[] = [section(`*${headline}*`)];

  if (state.brief) {
    blocks.push(section(briefLines(state.brief).map((line) => `• ${line}`).join("\n")));
  }

  const recent = lastEvents(state.events, 6);
  if (recent.length > 0) {
    blocks.push(context(monoBlock(recent.map(eventLine))));
  }

  if (state.stage === "failed") {
    const lastError = [...state.events].reverse().find((e) => e.level === "error");
    blocks.push(context(`Run failed. ${lastError ? truncate(lastError.message, 200) : "No error detail reported."}`));
  }

  return { text: headline, blocks };
}

/** The human gate: per-area counts, top 3 picks per area, approve and adjust buttons. */
export function rosterMessage(state: StateLike): SlackMessage {
  const tallies = tallyByArea(state.brief, state.offers);
  const proposed = state.offers.filter((o) => o.status !== "waitlisted").length;
  const waitlisted = state.offers.filter((o) => o.status === "waitlisted").length;
  const headline = `Roster ready for approval. ${proposed} proposed, ${waitlisted} waitlisted. Nothing has been sent yet.`;

  const blocks: SlackBlock[] = [section(`*${headline}*`)];

  for (const tally of tallies) {
    const picks = state.offers
      .filter((o) => String(o.area) === tally.area && o.status !== "waitlisted")
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((offer) => {
        const tag = isVerified(state, offer) ? " (verified)" : "";
        return `• ${usherName(state, offer)}${tag}: ${truncate(offer.reason, 110)}`;
      });

    const body = [`*${areaLine(tally)}*`, ...picks].join("\n");
    blocks.push(section(body));
  }

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        style: "primary",
        action_id: ACTION_APPROVE,
        text: { type: "plain_text", text: "Approve and send offers" },
        value: state.runId ?? "",
      },
      {
        type: "button",
        action_id: ACTION_ADJUST,
        text: { type: "plain_text", text: "Adjust" },
        value: state.runId ?? "",
      },
    ],
  });

  blocks.push(context("Approving sends the offers on Telegram and email. Nothing leaves before you approve."));

  return { text: headline, blocks };
}

/** The fill line, chat.update-d as confirmations arrive. */
export function fillMessage(state: StateLike, recentConfirmations: string[]): SlackMessage {
  const total = totalSlots(state.brief, state.offers);
  const bar = meter(confirmedCount(state.offers), total);
  const blocks: SlackBlock[] = [section(`\`${bar}\``)];
  if (recentConfirmations.length > 0) {
    blocks.push(context(recentConfirmations.slice(-6).join("\n")));
  }
  return { text: bar, blocks };
}

/** "Omar Tageldin confirmed Stage" */
export function confirmationLine(state: StateLike, offer: Offer): string {
  return `${usherName(state, offer)} confirmed ${offer.area}`;
}

function workspaceLine(state: StateLike): string {
  const ws = state.workspace;
  if (!ws.connected) {
    return `Ambiguous: not connected.${ws.lastSyncError ? ` ${truncate(ws.lastSyncError, 140)}` : ""}`;
  }
  const contacts = ws.contacts ?? new Set(state.offers.map((o) => o.usherId)).size;
  const tasks = ws.tasks ?? state.offers.length;
  const mailbox = ws.agentEmail ?? "not reported";
  return `Ambiguous: ${contacts} contacts, ${tasks} tasks, mailbox ${mailbox}`;
}

/** Final message once the run is complete or every slot is confirmed. */
export function completeMessage(state: StateLike): SlackMessage {
  const total = totalSlots(state.brief, state.offers);
  const confirmed = confirmedCount(state.offers);
  const headline = `Call sheet ready. ${confirmed}/${total} confirmed.`;
  const blocks: SlackBlock[] = [section(`*${headline}*`)];

  const url = state.workspace.callsheetDocUrl;
  blocks.push(section(url ? `<${url}|Open the call sheet>` : "Call sheet document not written: workspace did not return a URL."));
  blocks.push(context(workspaceLine(state)));

  return { text: headline, blocks };
}

/** Mechanism, never a shrug. */
export function failureMessage(detail: string): SlackMessage {
  return { text: detail, blocks: [section(`*Callsheet stopped.* ${detail}`)] };
}

export function adjustMessage(): SlackMessage {
  const text =
    "Nothing sent. Post a new request with the change, for example the corrected headcount or area split, and I will rebuild the roster from scratch.";
  return { text, blocks: [section(text)] };
}
