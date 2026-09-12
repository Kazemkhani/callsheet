import type { Area, EventBrief, PositionNeed } from "@/lib/types";
import { loadSeed } from "@/lib/roster/pool";

const AREAS: Area[] = [
  "Stage",
  "Kids Zone",
  "F&B",
  "Traditional Games",
  "Registration & Scanning",
  "Info Desk",
];

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

export function parseDates(text: string): string[] {
  const iso = [...text.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)].map((m) => m[1]);
  if (iso.length) return [...new Set(iso)];
  // "6-7 Oct", "6 and 7 October 2026"
  const m = text.match(
    /\b(\d{1,2})\s*(?:-|to|and|&)\s*(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(20\d{2})?/i,
  );
  if (m) {
    const year = m[4] ?? String(new Date().getFullYear() + (new Date().getMonth() > 9 ? 1 : 0));
    const month = MONTHS[m[3].toLowerCase().slice(0, 3)];
    const from = Number(m[1]);
    const to = Number(m[2]);
    const out: string[] = [];
    for (let d = from; d <= to && out.length < 10; d++) {
      out.push(`${year}-${month}-${String(d).padStart(2, "0")}`);
    }
    return out;
  }
  const single = text.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(20\d{2})?/i);
  if (single) {
    const year = single[3] ?? String(new Date().getFullYear());
    return [`${year}-${MONTHS[single[2].toLowerCase().slice(0, 3)]}-${String(Number(single[1])).padStart(2, "0")}`];
  }
  return [];
}

export function parsePositions(text: string): PositionNeed[] {
  const positions: PositionNeed[] = [];
  const lower = text.toLowerCase();

  // "10 each: Stage, Kids Zone, ..."
  const each = lower.match(/(\d{1,3})\s*(?:each|per area|apiece)/);
  const mentioned = AREAS.filter((a) => lower.includes(a.toLowerCase().replace("&", "&")) || lower.includes(a.toLowerCase().split(" ")[0]));

  for (const area of AREAS) {
    const re = new RegExp(`(\\d{1,3})\\s*(?:x|for)?\\s*(?:on\\s+)?${area.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    const hit = text.match(re);
    if (hit) positions.push({ area, needed: Number(hit[1]) });
  }
  if (positions.length === 0 && each) {
    for (const area of mentioned.length ? mentioned : AREAS) {
      positions.push({ area, needed: Number(each[1]) });
    }
  }
  return positions;
}

export function parseRate(text: string): { rateAedPerHour: number; hoursPerDay: number } {
  const perShift = text.match(/aed\s*([\d.]+)\s*(?:\/|per|for)\s*([\d.]+)\s*(?:h|hr|hour)/i);
  if (perShift) {
    const hours = Number(perShift[2]);
    return { rateAedPerHour: Math.round((Number(perShift[1]) / hours) * 100) / 100, hoursPerDay: hours };
  }
  const perHour = text.match(/aed\s*([\d.]+)\s*(?:\/|per)\s*(?:h|hr|hour)/i);
  const hoursMatch = text.match(/([\d.]+)\s*(?:h|hr|hours)\b/i);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 8;
  if (perHour) return { rateAedPerHour: Number(perHour[1]), hoursPerDay: hours };
  const bare = text.match(/aed\s*([\d.]+)/i);
  if (bare) return { rateAedPerHour: Math.round((Number(bare[1]) / hours) * 100) / 100, hoursPerDay: hours };
  return { rateAedPerHour: 0, hoursPerDay: hours };
}

export function parseShift(text: string): { shiftStart: string; shiftEnd: string } {
  const m = text.match(/(\d{1,2}[:.]\d{2})\s*(?:-|to|until)\s*(\d{1,2}[:.]\d{2})/);
  if (m) return { shiftStart: m[1].replace(".", ":"), shiftEnd: m[2].replace(".", ":") };
  return { shiftStart: "08:30", shiftEnd: "18:00" };
}

export function parseTraining(text: string): EventBrief["training"] {
  if (!/training/i.test(text)) return undefined;
  const window = text.slice(Math.max(0, text.toLowerCase().indexOf("training") - 40));
  const dates = parseDates(window);
  const hours = window.match(/([\d.]+)\s*(?:h|hr|hours)/i);
  return {
    date: dates[0] ?? "",
    durationHours: hours ? Number(hours[1]) : 2,
    mandatory: !/optional/i.test(window),
    onSite: !/online|remote|virtual/i.test(window),
  };
}

export async function parseRequest(request: string): Promise<EventBrief> {
  const seed = await loadSeed().catch(() => null);
  const lower = request.toLowerCase();

  const seedEvent = seed?.events.find((e) =>
    lower.includes(String(e.name).toLowerCase().replace(/\s+20\d{2}$/, "")),
  ) as Record<string, unknown> | undefined;

  const nameMatch = request.match(/for (?:the )?([A-Z][\w&'-]*(?:\s+[A-Z0-9][\w&'-]*)*(?:\s+20\d{2})?)/);
  const name = seedEvent ? String(seedEvent.name) : (nameMatch?.[1]?.trim() ?? "Unnamed event");

  let positions = parsePositions(request);
  if (positions.length === 0 && seedEvent) {
    positions = (seedEvent.positions as PositionNeed[]) ?? [];
  }

  let dates = parseDates(request);
  if (dates.length === 0 && seedEvent) dates = (seedEvent.dates as string[]) ?? [];

  const rate = parseRate(request);
  const shift = parseShift(request);
  const training = parseTraining(request);

  const venue = seedEvent ? String(seedEvent.venue) : (request.match(/at ([A-Z][\w ,'-]{3,40})/)?.[1] ?? "");
  const city = venue.includes("Abu Dhabi")
    ? "Abu Dhabi"
    : venue.includes("Dubai")
      ? "Dubai"
      : /abu dhabi/i.test(request)
        ? "Abu Dhabi"
        : "Dubai";

  const transport: EventBrief["transport"] = /transport (?:is )?provided|bus provided/i.test(request)
    ? "provided"
    : /transport allowance|allowance/i.test(request)
      ? "allowance"
      : "none";
  const meals: EventBrief["meals"] = /no meals|no food/i.test(request)
    ? "none"
    : /meals (?:are )?provided|lunch provided|food provided/i.test(request)
      ? "provided"
      : "none";

  return {
    id: seedEvent ? String(seedEvent.id) : `evt-${Date.now().toString(36)}`,
    name,
    venue: venue || "venue not stated",
    city,
    dates,
    hoursPerDay: rate.hoursPerDay || Number(seedEvent?.hours ?? 8),
    shiftStart: shift.shiftStart,
    shiftEnd: shift.shiftEnd,
    rateAedPerHour: rate.rateAedPerHour || Number(seedEvent?.rateAedPerHour ?? 0),
    training: training ?? (seedEvent?.training as EventBrief["training"]),
    transport,
    meals,
    positions,
    organiser: seedEvent ? (seedEvent.organiser as string) : undefined,
  };
}
