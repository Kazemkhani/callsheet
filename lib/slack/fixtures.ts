// Test fixture shared by the Slack unit tests. Mirrors what GET /api/state returns.

import type { Offer, RunStage } from "../types";
import type { StateLike } from "./blocks";

const AREAS = ["Stage", "Kids Zone", "F&B", "Traditional Games", "Registration & Scanning", "Info Desk"];

function offer(index: number, area: string, status: Offer["status"], firstTimer = false): Offer {
  return {
    id: `o-${area}-${index}`,
    eventId: "ev-aie-2026",
    usherId: `u-${area}-${index}`,
    area,
    status,
    channel: ["telegram"],
    score: 100 - index,
    reason: `${index === 0 ? "Two seasons on this exact stage" : "Area skill match and free on both dates"}`,
    firstTimerSlot: firstTimer,
  };
}

export function makeState(overrides: Partial<StateLike> = {}): StateLike {
  const offers: Offer[] = [];
  for (const area of AREAS) {
    for (let i = 0; i < 10; i += 1) offers.push(offer(i, area, "proposed", i === 9));
    offers.push(offer(10, area, "waitlisted"));
    offers.push(offer(11, area, "waitlisted"));
  }

  const ushers = offers.map((o, i) => ({
    id: o.usherId,
    name: i === 0 ? "Omar Tageldin" : `Usher ${i}`,
    verifiedEvents: i % 2 === 0 ? ["GITEX Global 2025"] : [],
  }));

  return {
    runId: "run-123",
    stage: "awaiting_approval" as RunStage,
    request: "60 for AI Everything Summit",
    brief: {
      id: "ev-aie-2026",
      name: "AI Everything Summit",
      venue: "ADNOC Centre",
      verifiedVenue: "ADNEC",
      city: "Abu Dhabi",
      dates: ["2026-10-06", "2026-10-07"],
      hoursPerDay: 8.5,
      shiftStart: "08:30",
      shiftEnd: "18:00",
      rateAedPerHour: 34.9412,
      training: { date: "2026-10-05", durationHours: 2, mandatory: true, onSite: true },
      transport: "allowance",
      meals: "none",
      positions: AREAS.map((area) => ({ area, needed: 10 })),
      organiser: "Tahaluf",
    },
    offers,
    events: [
      { id: "e1", at: "2026-10-01T14:00:12Z", tool: "research_event", level: "info", message: "Exa: 3 sources, venue resolved to ADNEC" },
      { id: "e2", at: "2026-10-01T14:00:40Z", tool: "search_crew", level: "info", message: "CRM: 24 candidates across 6 areas" },
      { id: "e3", at: "2026-10-01T14:01:02Z", tool: "verify_experience", level: "warn", message: "Exa: 2 claimed events unverifiable" },
      { id: "e4", at: "2026-10-01T14:01:30Z", tool: "build_roster", level: "info", message: "60 proposed, 12 waitlisted, 6 first-timer slots" },
    ],
    workspace: {
      connected: true,
      agentEmail: "callsheet@agent.ambiguous.ai",
      callsheetDocUrl: "https://app.ambiguous.ai/docs/callsheet-123",
      contacts: 24,
      tasks: 61,
    },
    updatedAt: "2026-10-01T14:01:30Z",
    ushers,
    ...overrides,
  };
}
