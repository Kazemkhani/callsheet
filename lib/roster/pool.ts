import { promises as fs } from "node:fs";
import path from "node:path";
import type { EventBrief, Usher } from "@/lib/types";

// The crew pool. Seed ushers are real research data; bench candidates are generated only when
// the brief asks for more heads than the seed holds, and every one of them is flagged synthetic
// so nothing downstream can mistake a demo body for a real person.

export interface SeedUsher extends Usher {
  nationality?: string;
  bio?: string;
  synthetic?: boolean;
}

export interface SeedFile {
  agencies: { name: string; website?: string }[];
  events: Record<string, unknown>[];
  ushers: Record<string, unknown>[];
}

let seedCache: SeedFile | null = null;

export async function loadSeed(): Promise<SeedFile> {
  if (seedCache) return seedCache;
  const raw = await fs.readFile(path.join(process.cwd(), "data", "seed.json"), "utf8");
  seedCache = JSON.parse(raw) as SeedFile;
  return seedCache;
}

export function normaliseUsher(raw: Record<string, unknown>): SeedUsher {
  const reliability = Number(raw.reliabilityScore ?? 0);
  return {
    id: String(raw.id),
    name: String(raw.name),
    city: String(raw.city ?? ""),
    phone: String(raw.phone ?? ""),
    email: String(raw.email ?? ""),
    languages: (raw.languages as string[]) ?? [],
    yearsExperience: Number(raw.yearsExperience ?? 0),
    pastEvents: (raw.pastEvents as string[]) ?? [],
    skills: (raw.skills as string[]) ?? [],
    rating: Number(raw.rating ?? 0),
    reliabilityScore: reliability > 1 ? reliability / 100 : reliability,
    availability: (raw.availability as string[]) ?? [],
    nationality: raw.nationality ? String(raw.nationality) : undefined,
    bio: raw.bio ? String(raw.bio) : undefined,
  };
}

export async function loadSeedUshers(): Promise<SeedUsher[]> {
  const seed = await loadSeed();
  return seed.ushers.map(normaliseUsher);
}

const BENCH_FIRST = [
  "Aisha", "Yasmin", "Hind", "Noor", "Salma", "Lina", "Reem", "Dana",
  "Zayed", "Saif", "Marwan", "Adel", "Nabil", "Faris", "Jamal", "Waleed",
  "Anjali", "Divya", "Rohan", "Kiran", "Joel", "Mika", "Grace", "Paolo",
];
const BENCH_LAST = [
  "Al Suwaidi", "Haddad", "Rahman", "Fernandes", "Okoro", "Silva", "Iqbal", "Darwish",
];
const BENCH_CITIES = ["Abu Dhabi", "Dubai", "Sharjah"];

const AREA_SKILLS: Record<string, string[]> = {
  Stage: ["stage", "crowd"],
  "Kids Zone": ["kids", "entertainment"],
  "F&B": ["F&B", "hospitality"],
  "Traditional Games": ["games", "activation"],
  "Registration & Scanning": ["registration", "scanning"],
  "Info Desk": ["info desk", "VIP hosting"],
};

/**
 * Deterministic bench candidates. Emails use the .invalid TLD (RFC 2606) so an offer can never
 * be delivered to a real mailbox by accident.
 */
export function generateBench(brief: EventBrief, count: number, startIndex = 1): SeedUsher[] {
  const areas = brief.positions.map((p) => String(p.area));
  const out: SeedUsher[] = [];
  for (let i = 0; i < count; i++) {
    const n = startIndex + i;
    const area = areas[i % areas.length];
    const firstTimer = n % 3 === 0; // every third bench body has never worked an event
    const id = `bench-${String(n).padStart(2, "0")}`;
    out.push({
      id,
      name: `${BENCH_FIRST[n % BENCH_FIRST.length]} ${BENCH_LAST[(n * 3) % BENCH_LAST.length]}`,
      city: BENCH_CITIES[n % BENCH_CITIES.length],
      phone: `+9715${String(1000000 + n * 7919).slice(0, 8)}`,
      email: `${id}@callsheet-demo.invalid`,
      languages: n % 2 === 0 ? ["Arabic", "English"] : ["English", "Hindi"],
      yearsExperience: firstTimer ? 0 : 1 + (n % 3),
      pastEvents: firstTimer ? [] : [`GITEX Global ${2024 + (n % 2)}`],
      skills: [...AREA_SKILLS[area] ?? [area.toLowerCase()], ...(n % 4 === 0 ? ["info desk"] : [])],
      rating: Math.round((3.4 + ((n * 13) % 16) / 10) * 10) / 10,
      reliabilityScore: Math.round((0.68 + ((n * 7) % 30) / 100) * 100) / 100,
      availability: [...brief.dates],
      synthetic: true,
    });
  }
  return out;
}

export interface CrewPool {
  ushers: SeedUsher[];
  seedCount: number;
  benchCount: number;
  slots: number;
}

export async function buildCrewPool(brief: EventBrief): Promise<CrewPool> {
  const seeded = await loadSeedUshers();
  const slots = brief.positions.reduce((n, p) => n + p.needed, 0);
  const usable = seeded.filter((u) => brief.dates.some((d) => u.availability.includes(d)));
  const shortfall = Math.max(0, Math.ceil(slots * 1.25) - usable.length);
  const bench = shortfall > 0 ? generateBench(brief, shortfall) : [];
  return {
    ushers: [...seeded, ...bench],
    seedCount: seeded.length,
    benchCount: bench.length,
    slots,
  };
}
