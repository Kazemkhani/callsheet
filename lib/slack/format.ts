// Pure formatting helpers for the Slack surface.
// No Bolt, no fetch, no side effects: everything here is unit-testable.

import type { AgentEvent, EventBrief, Offer, RunStage } from "../types";

const STAGE_WORDS: Record<RunStage, string> = {
  idle: "idle",
  researching: "researching the event",
  searching_crew: "searching the crew CRM",
  verifying: "verifying experience",
  building_roster: "building the roster",
  awaiting_approval: "waiting for your approval",
  sending_offers: "sending offers",
  collecting_replies: "collecting replies",
  complete: "complete",
  failed: "failed",
};

export function stageWords(stage: RunStage): string {
  return STAGE_WORDS[stage] ?? "working";
}

/** "██████░░░░ 36/60 confirmed" */
export function meter(confirmed: number, total: number, width = 10): string {
  const safeTotal = Math.max(0, Math.floor(total));
  const safeConfirmed = Math.max(0, Math.min(Math.floor(confirmed), safeTotal || Math.floor(confirmed)));
  let filled = safeTotal > 0 ? Math.round((safeConfirmed / safeTotal) * width) : 0;
  if (filled < 0) filled = 0;
  if (filled > width) filled = width;
  return `${"█".repeat(filled)}${"░".repeat(width - filled)} ${safeConfirmed}/${safeTotal} confirmed`;
}

export function truncate(value: string, max = 120): string {
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 3)}...`;
}

function clockOf(iso: string): string {
  const match = /T(\d{2}:\d{2})/.exec(iso ?? "");
  return match ? match[1] : "--:--";
}

/** One short mono line per agent event: "14:02 research_event Exa: 3 sources, venue resolved to ADNEC" */
export function eventLine(event: AgentEvent): string {
  const mark = event.level === "error" ? "x " : event.level === "warn" ? "! " : "";
  return `${clockOf(event.at)} ${mark}${event.tool} ${truncate(event.message, 110)}`;
}

export function lastEvents(events: AgentEvent[], count = 6): AgentEvent[] {
  return events.slice(-count);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!match) return iso ?? "";
  const [, year, month, day] = match;
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? month} ${year}`;
}

export function formatDates(dates: string[]): string {
  if (!dates || dates.length === 0) return "dates not stated";
  return dates.map(shortDate).join(", ");
}

function money(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/** The brief, one fact per line. Includes a "Venue corrected" line when Exa disagreed with the request. */
export function briefLines(brief: EventBrief): string[] {
  const lines: string[] = [];
  lines.push(`Event: ${brief.name}${brief.organiser ? ` (${brief.organiser})` : ""}`);

  const corrected = brief.verifiedVenue && brief.verifiedVenue !== brief.venue;
  if (corrected) {
    lines.push(`Venue as stated: ${brief.venue}`);
    lines.push(`Venue corrected: ${brief.verifiedVenue}, ${brief.city}`);
  } else {
    lines.push(`Venue: ${brief.verifiedVenue ?? brief.venue}, ${brief.city}`);
  }

  lines.push(`Dates: ${formatDates(brief.dates)}, ${brief.shiftStart} to ${brief.shiftEnd}`);
  lines.push(
    `Rate: AED ${money(brief.rateAedPerHour * brief.hoursPerDay)} per ${brief.hoursPerDay}h shift (AED ${money(brief.rateAedPerHour)} per hour)`,
  );

  if (brief.training) {
    const t = brief.training;
    lines.push(
      `Training: ${shortDate(t.date)}, ${t.durationHours}h, ${t.onSite ? "on site" : "remote"}, ${t.mandatory ? "mandatory" : "optional"}`,
    );
  } else {
    lines.push("Training: none stated");
  }

  lines.push(`Transport: ${brief.transport}. Meals: ${brief.meals}.`);
  return lines;
}

// --- roster arithmetic -------------------------------------------------------

export const CONFIRMABLE: Offer["status"][] = ["proposed", "queued", "sent", "confirmed", "declined"];

export function totalSlots(brief: EventBrief | null, offers: Offer[]): number {
  if (brief && brief.positions.length > 0) {
    return brief.positions.reduce((sum, p) => sum + p.needed, 0);
  }
  return offers.filter((o) => o.status !== "waitlisted").length;
}

export function confirmedCount(offers: Offer[]): number {
  return offers.filter((o) => o.status === "confirmed").length;
}

export interface AreaTally {
  area: string;
  proposed: number;
  needed: number;
  waitlisted: number;
  firstTimerSlots: number;
  confirmed: number;
}

export function tallyByArea(brief: EventBrief | null, offers: Offer[]): AreaTally[] {
  const order: string[] = [];
  const byArea = new Map<string, AreaTally>();

  const ensure = (area: string): AreaTally => {
    let tally = byArea.get(area);
    if (!tally) {
      tally = { area, proposed: 0, needed: 0, waitlisted: 0, firstTimerSlots: 0, confirmed: 0 };
      byArea.set(area, tally);
      order.push(area);
    }
    return tally;
  };

  for (const position of brief?.positions ?? []) {
    ensure(String(position.area)).needed = position.needed;
  }

  for (const offer of offers) {
    const tally = ensure(String(offer.area));
    if (offer.status === "waitlisted") tally.waitlisted += 1;
    else tally.proposed += 1;
    if (offer.firstTimerSlot) tally.firstTimerSlots += 1;
    if (offer.status === "confirmed") tally.confirmed += 1;
  }

  return order.map((area) => byArea.get(area)!);
}

/** "Stage 10/10 proposed, 2 waitlisted, 1 first-timer slot" */
export function areaLine(tally: AreaTally): string {
  const needed = tally.needed || tally.proposed;
  const parts = [`${tally.area} ${tally.proposed}/${needed} proposed`, `${tally.waitlisted} waitlisted`];
  parts.push(`${tally.firstTimerSlots} first-timer ${tally.firstTimerSlots === 1 ? "slot" : "slots"}`);
  return parts.join(", ");
}
