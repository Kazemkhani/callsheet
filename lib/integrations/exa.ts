import Exa from "exa-js";
import type { Usher } from "@/lib/types";

const TIMEOUT_MS = 8000;

export interface EventResearch {
  verifiedVenue?: string;
  city?: string;
  dates?: string[];
  organiser?: string;
  expectedAttendance?: number;
  sources: string[];
}

function client(): Exa {
  const key = process.env.EXA_API_KEY;
  if (!key) throw new Error("Exa: EXA_API_KEY is not set");
  return new Exa(key);
}

type ExaResult = { title?: string | null; url: string; text?: string; highlights?: string[] };

// exa-js does not accept an AbortSignal, so the call is bounded by an explicit race.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

async function search(query: string, numResults: number, highlights = false): Promise<ExaResult[]> {
  const exa = client();
  try {
    const res = await withTimeout(
      exa.search(query, {
        type: "auto",
        numResults,
        contents: highlights
          ? { highlights: true, text: { maxCharacters: 1500 } }
          : { text: { maxCharacters: 2000 } },
      } as never),
      TIMEOUT_MS,
      "Exa",
    );
    return ((res as { results?: ExaResult[] }).results ?? []) as ExaResult[];
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    if (/abort|timeout/i.test(msg)) throw new Error(`Exa timed out after ${TIMEOUT_MS}ms`);
    if (/429/.test(msg)) throw new Error("Exa 429 rate limited");
    throw new Error(`Exa search failed: ${msg}`);
  }
}

const VENUES = [
  "ADNEC Centre Abu Dhabi",
  "Dubai World Trade Centre",
  "Expo City Dubai",
  "Dubai Design District",
  "Coca-Cola Arena",
  "Etihad Arena",
  "Madinat Jumeirah",
];

const CITIES = ["Abu Dhabi", "Dubai", "Sharjah", "Doha", "Riyadh"];

function haystack(results: ExaResult[]): string {
  return results
    .map((r) => `${r.title ?? ""} ${r.text ?? ""} ${(r.highlights ?? []).join(" ")}`)
    .join("\n")
    .toLowerCase();
}

export async function researchEvent(name: string, statedVenue?: string): Promise<EventResearch> {
  const results = await search(
    `${name} venue dates organiser expected attendance ${statedVenue ?? ""}`.trim(),
    5,
  );
  const hay = haystack(results);

  const verifiedVenue = VENUES.find((v) => hay.includes(v.toLowerCase().slice(0, 12)));
  const city = CITIES.find((c) => hay.includes(c.toLowerCase()));

  const dateMatches = [...hay.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)].map((m) => m[0]);
  const dates = [...new Set(dateMatches)].slice(0, 5);

  let expectedAttendance: number | undefined;
  const att = hay.match(/([\d,]{4,})\+?\s*(?:visitors|attendees|participants)/);
  if (att) {
    const n = Number(att[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n > 100) expectedAttendance = n;
  }

  const org = hay.match(/organised by ([a-z0-9 &.'-]{3,40})/);

  return {
    verifiedVenue,
    city,
    dates: dates.length ? dates : undefined,
    organiser: org ? org[1].trim() : undefined,
    expectedAttendance,
    sources: results.map((r) => r.url).filter(Boolean),
  };
}

function keyWords(eventName: string): string[] {
  return eventName
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !["event", "with", "from", "hosting"].includes(w))
    .slice(0, 4);
}

async function verifyOne(claim: string): Promise<{ claim: string; confirmed: boolean; url?: string }> {
  const results = await search(`"${claim.split(" - ")[0]}" UAE event`, 3, true);
  const words = keyWords(claim);
  if (words.length === 0) return { claim, confirmed: false };
  for (const r of results) {
    const text = `${r.title ?? ""} ${r.text ?? ""} ${(r.highlights ?? []).join(" ")}`.toLowerCase();
    const hits = words.filter((w) => text.includes(w)).length;
    if (hits >= Math.max(2, Math.ceil(words.length / 2))) {
      return { claim, confirmed: true, url: r.url };
    }
  }
  return { claim, confirmed: false };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export interface VerifiedExperience {
  usherId: string;
  verifiedEvents: string[];
  sources: string[];
}

export async function verifyExperience(usher: Usher): Promise<VerifiedExperience> {
  const claims = (usher.pastEvents ?? []).slice(0, 3);
  if (claims.length === 0) return { usherId: usher.id, verifiedEvents: [], sources: [] };
  const checked = await mapWithConcurrency(claims, 4, verifyOne);
  return {
    usherId: usher.id,
    verifiedEvents: checked.filter((c) => c.confirmed).map((c) => c.claim),
    sources: checked.map((c) => c.url).filter((u): u is string => Boolean(u)),
  };
}

export async function verifyMany(ushers: Usher[]): Promise<VerifiedExperience[]> {
  return mapWithConcurrency(ushers, 4, verifyExperience);
}
