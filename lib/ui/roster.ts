import seed from "@/data/seed.json";
import { demoDirectory } from "@/lib/fixtures/demo-state";
import type { Offer, RunState, Usher } from "@/lib/types";

const seedUshers = (seed as { ushers: Usher[] }).ushers;

const seedDirectory: Record<string, string> = Object.fromEntries(
  seedUshers.map((u) => [u.id, u.name]),
);

/**
 * Name for a usher id. The live run carries its own crew list (RunState.crew),
 * so pass it when you have it; the CRM seed and the fixture directory cover the
 * rest. Never falls back to a blank: the id is shown rather than an empty cell.
 */
export function usherName(id: string, crew?: Usher[]): string {
  const fromCrew = crew?.find((u) => u.id === id)?.name;
  return fromCrew ?? seedDirectory[id] ?? demoDirectory[id] ?? id;
}

export function usherById(id: string, crew?: Usher[]): Usher | undefined {
  return crew?.find((u) => u.id === id) ?? seedUshers.find((u) => u.id === id);
}

export type SlotState = "empty" | "proposed" | "sent" | "confirmed" | "declined";

export interface Slot {
  key: string;
  index: number;
  state: SlotState;
  offer?: Offer;
  name?: string;
}

export interface AreaRow {
  area: string;
  needed: number;
  confirmed: number;
  slots: Slot[];
}

export function slotStateOf(offer: Offer): SlotState {
  switch (offer.status) {
    case "confirmed":
      return "confirmed";
    case "declined":
      return "declined";
    case "sent":
      return "sent";
    case "proposed":
    case "queued":
      return "proposed";
    default:
      return "empty";
  }
}

/**
 * One row per area from brief.positions, one cell per required slot.
 * Offers are ordered by id so a cell keeps its person as statuses change.
 */
export function buildGrid(state: RunState): AreaRow[] {
  const positions = state.brief?.positions ?? [];
  return positions.map((position) => {
    const placed = state.offers
      .filter((o) => o.area === position.area && o.status !== "waitlisted")
      .sort((a, b) => a.id.localeCompare(b.id));

    const slots: Slot[] = Array.from({ length: position.needed }, (_, i) => {
      const offer = placed[i];
      return offer
        ? {
            key: offer.id,
            index: i,
            state: slotStateOf(offer),
            offer,
            name: usherName(offer.usherId, state.crew),
          }
        : { key: `${position.area}-${i}`, index: i, state: "empty" as const };
    });

    return {
      area: String(position.area),
      needed: position.needed,
      confirmed: slots.filter((s) => s.state === "confirmed").length,
      slots,
    };
  });
}

export interface RosterTotals {
  needed: number;
  confirmed: number;
  proposed: number;
  sent: number;
  declined: number;
  waitlisted: number;
  firstTimer: number;
}

export function rosterTotals(state: RunState): RosterTotals {
  const needed = (state.brief?.positions ?? []).reduce(
    (sum, p) => sum + p.needed,
    0,
  );
  const count = (predicate: (o: Offer) => boolean) =>
    state.offers.filter(predicate).length;

  return {
    needed,
    confirmed: count((o) => o.status === "confirmed"),
    proposed: count((o) => o.status === "proposed" || o.status === "queued"),
    sent: count((o) => o.status === "sent"),
    declined: count((o) => o.status === "declined"),
    waitlisted: count((o) => o.status === "waitlisted"),
    firstTimer: count((o) => o.firstTimerSlot === true),
  };
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-10-06" -> "6 Oct". Plain string maths: no timezone surprises. */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  if (!month || !day) return iso;
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? month}`;
}

export function dateRange(dates: string[]): string {
  if (dates.length === 0) return "dates to confirm";
  if (dates.length === 1) return shortDate(dates[0]);
  return `${shortDate(dates[0])} to ${shortDate(dates[dates.length - 1])}`;
}

export function clockTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--:--";
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

export const STAGE_LABEL: Record<string, string> = {
  idle: "Idle",
  researching: "Researching event",
  searching_crew: "Searching crew",
  verifying: "Verifying experience",
  building_roster: "Building roster",
  awaiting_approval: "Awaiting approval",
  sending_offers: "Sending offers",
  collecting_replies: "Collecting replies",
  complete: "Complete",
  failed: "Failed",
};
