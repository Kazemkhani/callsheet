import seed from "@/data/seed.json";
import { demoDirectory } from "@/lib/fixtures/demo-state";
import type { EventBrief, Offer, RunStage, RunState, Usher } from "@/lib/types";

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

const SLOT_ORDER: Record<SlotState, number> = {
  confirmed: 0,
  sent: 1,
  proposed: 2,
  declined: 3,
  empty: 4,
};

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
      // Confirmed first, open last: a row reads left to right as progress, and
      // the eye lands on the cluster that is actually settled.
      slots: slots.sort((a, b) => SLOT_ORDER[a.state] - SLOT_ORDER[b.state]),
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
    // The roster keeps its waitlist in a separate list until a decline promotes
    // someone, so neither source alone is the true depth.
    waitlisted: Math.max(
      count((o) => o.status === "waitlisted"),
      state.waitlist?.length ?? 0,
    ),
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

/* ---------------------------------------------------------------- people ---- */

const PARTICLES = new Set([
  "al",
  "el",
  "bin",
  "bint",
  "ibn",
  "abu",
  "abd",
  "van",
  "von",
  "de",
  "da",
  "del",
  "di",
  "dos",
  "la",
  "le",
  "san",
  "st",
]);

export interface PersonChip {
  /** Two letters, or empty when the person is on record by one name only. */
  initials: string;
  /** Surname where there is one, otherwise the single name, never both. */
  label: string;
}

/**
 * A call sheet row holds ten people from one pool, so first names collide
 * ("Reem" twice in Stage reads as a bug). Surnames separate them and the
 * initials carry the given name without repeating it.
 */
export function personChip(fullName: string): PersonChip {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { initials: "", label: "" };
  if (parts.length === 1) return { initials: "", label: parts[0] };

  let surnameStart = parts.length - 1;
  while (
    surnameStart > 1 &&
    PARTICLES.has(parts[surnameStart - 1].toLowerCase().replace(/[^a-z]/g, ""))
  ) {
    surnameStart -= 1;
  }

  const surname = parts.slice(surnameStart).join(" ");
  const core = parts[parts.length - 1];
  return {
    initials: `${parts[0][0]}${core[0]}`.toUpperCase(),
    label: surname,
  };
}

/* ----------------------------------------------------------------- brief ---- */

function normaliseVenue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface VenueCheck {
  corrected: boolean;
  stated: string;
  resolved: string;
  sources: number;
}

/**
 * Only a real change counts as a correction: punctuation drift between
 * "ADNEC Centre, Abu Dhabi" and "ADNEC Centre Abu Dhabi" is not a finding, and
 * claiming it as one would be the fastest way to lose a coordinator's trust.
 */
export function venueCheck(brief: EventBrief): VenueCheck {
  const resolved = brief.verifiedVenue ?? brief.venue;
  return {
    corrected:
      brief.verifiedVenue !== undefined &&
      normaliseVenue(brief.verifiedVenue) !== normaliseVenue(brief.venue),
    stated: brief.venue,
    resolved,
    sources: brief.sources?.length ?? 0,
  };
}

export function sentenceCase(value: string): string {
  if (value.length === 0) return value;
  return value[0].toUpperCase() + value.slice(1);
}

/* ----------------------------------------------------------------- stage ---- */

export const STAGE_STEPS = [
  "Research",
  "Crew",
  "Verify",
  "Roster",
  "Approve",
  "Offers",
  "Replies",
  "Done",
] as const;

const STAGE_STEP_INDEX: Record<RunStage, number> = {
  idle: -1,
  researching: 0,
  searching_crew: 1,
  verifying: 2,
  building_roster: 3,
  awaiting_approval: 4,
  sending_offers: 5,
  collecting_replies: 6,
  complete: 7,
  failed: -1,
};

/** Index into STAGE_STEPS, or -1 before the first tool call and on failure. */
export function stageStepIndex(stage: RunStage): number {
  return STAGE_STEP_INDEX[stage] ?? -1;
}
