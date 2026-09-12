import type { Area, EventBrief, Offer, Usher } from "@/lib/types";

// Pure roster builder. No IO, no clock, no randomness: same inputs, same roster.

export interface RosterOptions {
  // "all": usher must be free on every event date. "any": free on at least one date
  //  (the seed crew is mostly day-by-day, so "any" is the default and the day count is scored).
  availabilityMode?: "all" | "any";
  firstTimerShare?: number; // default 0.10
  waitlistShare?: number; // default 0.20
}

export interface RosterResult {
  offers: Offer[];
  waitlist: Offer[];
  unfilled: { area: string; needed: number; filled: number }[];
}

const AREA_SKILL_TOKENS: Record<string, string[]> = {
  Stage: ["stage", "vip hosting", "crowd"],
  "Kids Zone": ["kids", "kids zone", "entertainment"],
  "F&B": ["f&b", "fnb", "food", "hospitality", "catering"],
  "Traditional Games": ["games", "traditional games", "activation", "entertainment"],
  "Registration & Scanning": ["registration", "scanning", "ticketing", "accreditation"],
  "Info Desk": ["info desk", "info", "information", "vip hosting", "guest services"],
};

function normaliseReliability(raw: number): number {
  // Seed data carries 0-100; the contract says 0-1. Accept both, emit 0-1.
  if (raw > 1) return Math.min(1, raw / 100);
  return Math.max(0, raw);
}

function skillMatch(usher: Usher, area: Area | string): boolean {
  const tokens = AREA_SKILL_TOKENS[area] ?? [String(area).toLowerCase()];
  const skills = usher.skills.map((s) => s.toLowerCase());
  return skills.some((s) => tokens.some((t) => s === t || s.includes(t) || t.includes(s)));
}

export function isFirstTimer(usher: Usher): boolean {
  return usher.yearsExperience === 0 || (usher.pastEvents?.length ?? 0) === 0;
}

function daysAvailable(usher: Usher, dates: string[]): number {
  const avail = new Set(usher.availability ?? []);
  return dates.filter((d) => avail.has(d)).length;
}

export interface ScoredCandidate {
  usher: Usher;
  score: number;
  reason: string;
  firstTimer: boolean;
}

export function scoreCandidate(
  usher: Usher,
  area: Area | string,
  brief: EventBrief,
): ScoredCandidate {
  const bits: string[] = [];
  let score = 0;

  if (skillMatch(usher, area)) {
    score += 3;
    bits.push(`${area} skill`);
  }

  const verified = (usher.verifiedEvents ?? []).slice(0, 3);
  if (verified.length > 0) {
    score += 2 * verified.length; // capped at 3 events => max +6
    bits.push(`verified ${verified[0]}`);
  } else if ((usher.pastEvents?.length ?? 0) > 0) {
    bits.push(`${usher.pastEvents.length} events claimed, unverified`);
  }

  score += usher.rating; // 1-5
  bits.push(`${usher.rating.toFixed(1)} rating`);

  const reliability = normaliseReliability(usher.reliabilityScore);
  score += reliability * 2;
  bits.push(`${Math.round(reliability * 100)}% reliability`);

  if (usher.city && brief.city && usher.city.toLowerCase() === brief.city.toLowerCase()) {
    score += 1;
    bits.push(usher.city);
  } else if (usher.city) {
    bits.push(`travels from ${usher.city}`);
  }

  const days = daysAvailable(usher, brief.dates);
  if (days === brief.dates.length && brief.dates.length > 1) {
    score += 2;
  } else if (days > 0 && days < brief.dates.length) {
    bits.push(`${days} of ${brief.dates.length} days`);
  }

  const firstTimer = isFirstTimer(usher);
  if (firstTimer) bits.push("first event, reserved newcomer slot");

  return {
    usher,
    score: Math.round(score * 100) / 100,
    reason: `${area}: ${bits.join(", ")}`,
    firstTimer,
  };
}

function byScore(a: ScoredCandidate, b: ScoredCandidate): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.usher.id.localeCompare(b.usher.id); // deterministic tie break
}

export function buildRoster(
  brief: EventBrief,
  ushers: Usher[],
  options: RosterOptions = {},
): RosterResult {
  const availabilityMode = options.availabilityMode ?? "any";
  const firstTimerShare = options.firstTimerShare ?? 0.1;
  const waitlistShare = options.waitlistShare ?? 0.2;

  const eligible = ushers.filter((u) => {
    const days = daysAvailable(u, brief.dates);
    return availabilityMode === "all" ? days === brief.dates.length : days > 0;
  });

  const taken = new Set<string>(); // one usher, one slot
  const offers: Offer[] = [];
  const waitlist: Offer[] = [];
  const unfilled: { area: string; needed: number; filled: number }[] = [];

  // Areas are filled in the order the brief lists them so the result is stable.
  for (const position of brief.positions) {
    const area = position.area;
    const pool = eligible
      .filter((u) => !taken.has(u.id))
      .map((u) => scoreCandidate(u, area, brief))
      .filter((c) => c.score > 0)
      .sort(byScore);

    const reserved = Math.ceil(position.needed * firstTimerShare);
    const firstTimers = pool.filter((c) => c.firstTimer);
    const rest = pool.filter((c) => !c.firstTimer);

    const picked: ScoredCandidate[] = [];
    const reservedPicks = firstTimers.slice(0, Math.min(reserved, firstTimers.length));
    picked.push(...reservedPicks);

    // Remaining slots from the overall ranking; unused reserved slots are released.
    for (const c of pool) {
      if (picked.length >= position.needed) break;
      if (picked.some((p) => p.usher.id === c.usher.id)) continue;
      picked.push(c);
    }
    void rest;

    for (const c of picked) {
      taken.add(c.usher.id);
      offers.push({
        id: `off-${brief.id}-${c.usher.id}`,
        eventId: brief.id,
        usherId: c.usher.id,
        area,
        status: "proposed",
        channel: c.usher.telegramChatId ? ["telegram"] : ["email"],
        score: c.score,
        reason: c.reason,
        firstTimerSlot: reservedPicks.some((r) => r.usher.id === c.usher.id) || undefined,
      });
    }

    if (picked.length < position.needed) {
      unfilled.push({ area: String(area), needed: position.needed, filled: picked.length });
    }

    const waitDepth = Math.ceil(position.needed * waitlistShare);
    const bench = pool.filter((c) => !taken.has(c.usher.id)).slice(0, waitDepth);
    for (const c of bench) {
      waitlist.push({
        id: `wl-${brief.id}-${c.usher.id}-${String(area).replace(/\W+/g, "").toLowerCase()}`,
        eventId: brief.id,
        usherId: c.usher.id,
        area,
        status: "waitlisted",
        channel: c.usher.telegramChatId ? ["telegram"] : ["email"],
        score: c.score,
        reason: c.reason,
      });
    }
  }

  return { offers, waitlist, unfilled };
}
