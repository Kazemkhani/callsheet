import { describe, expect, it } from "vitest";
import { buildCrewPool, generateBench } from "./pool";
import { buildRoster } from "./build";
import { personChip } from "@/lib/ui/roster";
import type { EventBrief } from "@/lib/types";

// The 60-head brief the console demos: six areas, ten heads each.
const brief: EventBrief = {
  id: "evt-ai-everything-2026",
  name: "AI Everything Summit",
  venue: "ADNEC",
  city: "Abu Dhabi",
  dates: ["2026-10-06", "2026-10-07"],
  hoursPerDay: 8.5,
  shiftStart: "08:30",
  shiftEnd: "18:00",
  rateAedPerHour: 35,
  training: { date: "2026-10-05", durationHours: 2, mandatory: true, onSite: true },
  transport: "allowance",
  meals: "none",
  positions: [
    { area: "Stage", needed: 10 },
    { area: "Kids Zone", needed: 10 },
    { area: "F&B", needed: 10 },
    { area: "Traditional Games", needed: 10 },
    { area: "Registration & Scanning", needed: 10 },
    { area: "Info Desk", needed: 10 },
  ],
};

function firstName(full: string): string {
  return full.split(" ")[0].toLowerCase();
}

describe("bench candidate names", () => {
  it("gives a 60 slot roster distinct full names and no repeated first name inside an area", async () => {
    const pool = await buildCrewPool(brief);
    expect(pool.benchCount).toBeGreaterThan(0); // the seed alone cannot fill 60 slots
    const byId = new Map(pool.ushers.map((u) => [u.id, u]));

    const { offers } = buildRoster(brief, pool.ushers);
    expect(offers.length).toBe(60);

    const fullNames = offers.map((o) => byId.get(o.usherId)!.name);
    expect(new Set(fullNames.map((n) => n.toLowerCase())).size).toBe(fullNames.length);

    const firstsByArea = new Map<string, string[]>();
    for (const offer of offers) {
      const area = String(offer.area);
      const list = firstsByArea.get(area) ?? [];
      list.push(firstName(byId.get(offer.usherId)!.name));
      firstsByArea.set(area, list);
    }
    for (const [area, firsts] of firstsByArea) {
      const duplicates = firsts.filter((f, i) => firsts.indexOf(f) !== i);
      expect(duplicates, `${area} repeats a first name: ${duplicates.join(", ")}`).toEqual([]);
    }

    const surnamesByArea = new Map<string, string[]>();
    for (const offer of offers) {
      const area = String(offer.area);
      const list = surnamesByArea.get(area) ?? [];
      list.push(personChip(byId.get(offer.usherId)!.name).label.toLowerCase());
      surnamesByArea.set(area, list);
    }
    for (const [area, surnames] of surnamesByArea) {
      const duplicates = surnames.filter((s, i) => surnames.indexOf(s) !== i);
      expect(duplicates, `${area} repeats a surname: ${duplicates.join(", ")}`).toEqual([]);
    }
  });

  it("keeps every full name in the whole pool distinct, bench and seed together", async () => {
    const pool = await buildCrewPool(brief);
    const names = pool.ushers.map((u) => u.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    const firsts = pool.ushers.map((u) => firstName(u.name));
    expect(new Set(firsts).size).toBe(firsts.length);
  });

  it("still flags bench bodies synthetic with undeliverable demo addresses", () => {
    const bench = generateBench(brief, 40);
    expect(bench).toHaveLength(40);
    expect(bench.every((b) => b.synthetic === true)).toBe(true);
    expect(bench.every((b) => b.email.endsWith("@callsheet-demo.invalid"))).toBe(true);
  });

  it("never reuses a first name already held by the researched crew", () => {
    const bench = generateBench(brief, 30, 1, ["Dana", "Omar", "Layla"]);
    const firsts = bench.map((b) => firstName(b.name));
    expect(firsts).not.toContain("dana");
    expect(firsts).not.toContain("omar");
    expect(firsts).not.toContain("layla");
  });

  it("is deterministic: the same brief yields the same names", () => {
    expect(generateBench(brief, 25).map((b) => b.name)).toEqual(
      generateBench(brief, 25).map((b) => b.name),
    );
  });
});
