import { describe, expect, it } from "vitest";
import { buildRoster } from "./build";
import type { EventBrief, Usher } from "@/lib/types";

const brief: EventBrief = {
  id: "evt-test",
  name: "Test Summit",
  venue: "ADNEC",
  city: "Abu Dhabi",
  dates: ["2026-10-06", "2026-10-07"],
  hoursPerDay: 8.5,
  shiftStart: "08:30",
  shiftEnd: "18:00",
  rateAedPerHour: 35,
  transport: "allowance",
  meals: "none",
  positions: [
    { area: "Stage", needed: 10 },
    { area: "Info Desk", needed: 10 },
  ],
};

function usher(over: Partial<Usher> & { id: string }): Usher {
  return {
    name: `Usher ${over.id}`,
    city: "Abu Dhabi",
    phone: "+971500000000",
    email: `${over.id}@example.com`,
    languages: ["English"],
    yearsExperience: 2,
    pastEvents: ["GITEX Global 2025"],
    skills: ["stage"],
    rating: 4,
    reliabilityScore: 0.8,
    availability: ["2026-10-06", "2026-10-07"],
    ...over,
  } as Usher;
}

describe("buildRoster", () => {
  it("ranks a verified, local, high-rated usher above an unverified one", () => {
    const strong = usher({ id: "a", verifiedEvents: ["GITEX Global 2025"], rating: 4.8 });
    const weak = usher({ id: "b", rating: 3.2, city: "Sharjah", reliabilityScore: 0.7 });
    const { offers } = buildRoster({ ...brief, positions: [{ area: "Stage", needed: 2 }] }, [weak, strong]);
    expect(offers[0].usherId).toBe("a");
    expect(offers[0].score).toBeGreaterThan(offers[1].score);
    expect(offers[0].reason).toContain("Stage");
  });

  it("gives one usher exactly one slot across areas", () => {
    const crew = [usher({ id: "a", skills: ["stage", "info desk"] }), usher({ id: "b", skills: ["stage", "info desk"] })];
    const { offers } = buildRoster(brief, crew);
    const ids = offers.map((o) => o.usherId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("reserves 10 percent of each area for newcomers, rounded up", () => {
    const veterans = Array.from({ length: 12 }, (_, i) =>
      usher({ id: `v${i}`, rating: 5, verifiedEvents: ["GITEX Global 2025"] }),
    );
    const newcomer = usher({ id: "new", yearsExperience: 0, pastEvents: [], rating: 3 });
    const { offers } = buildRoster({ ...brief, positions: [{ area: "Stage", needed: 10 }] }, [
      ...veterans,
      newcomer,
    ]);
    const reserved = offers.filter((o) => o.firstTimerSlot);
    expect(reserved).toHaveLength(1);
    expect(reserved[0].usherId).toBe("new");
    expect(reserved[0].reason).toContain("first event");
  });

  it("releases the newcomer slot when no newcomer is available", () => {
    const veterans = Array.from({ length: 12 }, (_, i) => usher({ id: `v${i}` }));
    const { offers } = buildRoster({ ...brief, positions: [{ area: "Stage", needed: 10 }] }, veterans);
    expect(offers).toHaveLength(10);
    expect(offers.filter((o) => o.firstTimerSlot)).toHaveLength(0);
  });

  it("waitlists the next 20 percent by score and reports the shortfall", () => {
    const crew = Array.from({ length: 8 }, (_, i) => usher({ id: `u${i}`, rating: 5 - i * 0.1 }));
    const { offers, waitlist, unfilled } = buildRoster(
      { ...brief, positions: [{ area: "Stage", needed: 5 }] },
      crew,
    );
    expect(offers).toHaveLength(5);
    expect(waitlist).toHaveLength(1); // ceil(5 * 0.2)
    expect(waitlist[0].status).toBe("waitlisted");
    expect(unfilled).toHaveLength(0);
  });

  it("filters on availability, strictly when asked", () => {
    const partial = usher({ id: "partial", availability: ["2026-10-06"] });
    const full = usher({ id: "full" });
    const loose = buildRoster({ ...brief, positions: [{ area: "Stage", needed: 5 }] }, [partial, full]);
    expect(loose.offers.map((o) => o.usherId).sort()).toEqual(["full", "partial"]);
    expect(loose.offers.find((o) => o.usherId === "partial")?.reason).toContain("1 of 2 days");

    const strict = buildRoster(
      { ...brief, positions: [{ area: "Stage", needed: 5 }] },
      [partial, full],
      { availabilityMode: "all" },
    );
    expect(strict.offers.map((o) => o.usherId)).toEqual(["full"]);
    expect(strict.unfilled[0]).toEqual({ area: "Stage", needed: 5, filled: 1 });
  });

  it("normalises a 0-100 reliability score without inflating the ranking", () => {
    const hundredScale = usher({ id: "a", reliabilityScore: 80 });
    const unitScale = usher({ id: "b", reliabilityScore: 0.8 });
    const { offers } = buildRoster({ ...brief, positions: [{ area: "Stage", needed: 2 }] }, [
      hundredScale,
      unitScale,
    ]);
    expect(offers[0].score).toBe(offers[1].score);
  });
});
