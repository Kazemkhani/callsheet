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

// Two name lists, UAE-diverse (Emirati, Egyptian, Syrian, Jordanian, Lebanese, Indian, Pakistani,
// Filipino). Bench candidates take a full name from them so a coordinator never sees the same
// person twice on screen. First names are allocated globally unique, which also guarantees the
// weaker property the console cares about: no two offers inside one area share a first name.
// Surnames follow the same discipline (see generateBench): unique across the whole bench while
// the list lasts, so a coordinator never sees two "Ezzat"s in one area either.
const BENCH_FIRST = [
  "Alia", "Shamma", "Moza", "Hessa", "Maitha", "Zayed", "Saif", "Rashid",
  "Hamdan", "Sultan", "Mansoor", "Obaid", "Yasmin", "Heba", "Dalia", "Menna",
  "Mostafa", "Sherif", "Amr", "Hossam", "Tamer", "Lina", "Hala", "Rouba",
  "Nisreen", "Bassel", "Ammar", "Ghassan", "Haytham", "Ruba", "Dima", "Areej",
  "Majdi", "Zaid", "Anas", "Mutasem", "Nour", "Carla", "Joelle", "Rita",
  "Charbel", "Elie", "Nadim", "Wissam", "Anjali", "Divya", "Kavya", "Meera",
  "Rohan", "Vikram", "Nikhil", "Aditya", "Zainab", "Iqra", "Mehwish", "Sana",
  "Usman", "Faisal", "Imran", "Adnan", "Grace", "Jasmine", "Kristine", "Liezel",
  "Marilou", "Paolo", "Rommel", "Dennis", "Jomar", "Arnel",
];
const BENCH_LAST = [
  // Emirati
  "Al Suwaidi", "Al Ketbi", "Al Marzooqi", "Al Hammadi", "Al Zaabi",
  "Al Mansoori", "Al Shehhi", "Al Neyadi", "Al Dhaheri", "Al Kaabi",
  // Egyptian
  "Mansour", "Ezzat", "Shokry", "Abdel Aziz", "Fahmy",
  "Gaber", "Nour El-Din", "Hegazy", "Farouk", "Salama",
  // Syrian
  "Darwish", "Kanaan", "Homsi", "Barakat", "Halabi",
  "Naddaf", "Sarraf", "Antar", "Haykal", "Chalhoub",
  // Jordanian
  "Al Masri", "Obeidat", "Rawashdeh", "Tarawneh", "Qudah",
  "Khraisha", "Zoubi", "Shawabkeh", "Nsour", "Hijazi",
  // Lebanese
  "Feghali", "Aoun", "Bou Saab", "Gemayel", "Frangieh",
  "Sfeir", "Chami", "Rahme", "Abou Jaoude", "Matar",
  // Indian
  "Iyer", "Deshpande", "Kulkarni", "Rao", "Pillai",
  "Chowdhury", "Banerjee", "Gupta", "Mehta", "Bhatt",
  // Pakistani
  "Iqbal", "Siddiqui", "Chaudhry", "Farooqi", "Baig",
  "Qureshi", "Sheikh", "Raza", "Awan", "Niazi",
  // Filipino
  "Villanueva", "Dela Cruz", "Bautista", "Aquino", "Mendoza",
  "Torres", "Gonzales", "Ramos", "Domingo", "Castillo",
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
 *
 * Names are allocated greedily but deterministically: the first unused first name from a rotation
 * anchored on the candidate index, then the first surname that keeps the full name unique.
 * `reservedFirstNames` holds the first names already in use by the researched seed crew, so a
 * bench body can never turn up on the roster as a second "Dana" or a second "Reem".
 *
 * Surnames follow the same rule: `reservedLastNames` (the seed crew's surnames) are excluded
 * first, then a candidate is picked that no other bench body has used yet, so no area ever shows
 * two "Ezzat"s. Only once the surname list itself is exhausted does allocation fall back to the
 * weaker guarantee (unique full name only, surnames may repeat).
 */
export function generateBench(
  brief: EventBrief,
  count: number,
  startIndex = 1,
  reservedFirstNames: string[] = [],
  reservedLastNames: string[] = [],
): SeedUsher[] {
  const areas = brief.positions.map((p) => String(p.area));
  const out: SeedUsher[] = [];
  const takenFirst = new Set(reservedFirstNames.map((n) => n.trim().toLowerCase()));
  const reservedLast = new Set(reservedLastNames.map((n) => n.trim().toLowerCase()));
  const takenLast = new Set<string>();
  const takenFull = new Set<string>();
  const firstByArea = new Map<string, Set<string>>();

  for (let i = 0; i < count; i++) {
    const n = startIndex + i;
    const area = areas[i % areas.length] ?? "Info Desk";
    const areaFirsts = firstByArea.get(area) ?? new Set<string>();
    firstByArea.set(area, areaFirsts);

    let first: string | undefined;
    for (let k = 0; k < BENCH_FIRST.length && !first; k++) {
      const candidate = BENCH_FIRST[(n + k) % BENCH_FIRST.length];
      if (!takenFirst.has(candidate.toLowerCase())) first = candidate;
    }
    if (!first) {
      // The global list is exhausted; hold the line that shows on screen (unique inside an area).
      for (let k = 0; k < BENCH_FIRST.length && !first; k++) {
        const candidate = BENCH_FIRST[(n + k) % BENCH_FIRST.length];
        if (!areaFirsts.has(candidate.toLowerCase())) first = candidate;
      }
    }
    if (!first) throw new Error(`bench: no distinct first name left for candidate ${n} in ${area}`);

    let last: string | undefined;
    for (let k = 0; k < BENCH_LAST.length && !last; k++) {
      const candidate = BENCH_LAST[(n * 3 + k) % BENCH_LAST.length];
      const key = candidate.toLowerCase();
      if (reservedLast.has(key) || takenLast.has(key)) continue;
      last = candidate;
    }
    if (!last) {
      // The distinct-surname list is exhausted; fall back to the pre-existing guarantee (unique
      // full name only) rather than throwing, since a bench this large can outrun 80 surnames.
      for (let k = 0; k < BENCH_LAST.length && !last; k++) {
        const candidate = BENCH_LAST[(n * 3 + k) % BENCH_LAST.length];
        if (!takenFull.has(`${first} ${candidate}`.toLowerCase())) last = candidate;
      }
    }
    if (!last) throw new Error(`bench: no distinct surname left for ${first} (candidate ${n})`);

    takenFirst.add(first.toLowerCase());
    areaFirsts.add(first.toLowerCase());
    takenLast.add(last.toLowerCase());
    takenFull.add(`${first} ${last}`.toLowerCase());

    const firstTimer = n % 3 === 0; // every third bench body has never worked an event
    const id = `bench-${String(n).padStart(2, "0")}`;
    out.push({
      id,
      name: `${first} ${last}`,
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
  const bench =
    shortfall > 0
      ? generateBench(
          brief,
          shortfall,
          1,
          seeded.map((u) => u.name.split(" ")[0]),
          seeded.map((u) => u.name.split(" ").slice(1).join(" ")),
        )
      : [];
  return {
    ushers: [...seeded, ...bench],
    seedCount: seeded.length,
    benchCount: bench.length,
    slots,
  };
}
