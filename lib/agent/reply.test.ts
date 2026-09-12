import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentEvent, EventBrief, Offer, RunState } from "@/lib/types";
import type { SeedUsher } from "@/lib/roster/pool";

// Everything outside the agent is stubbed: no disk state (the dev server owns data/state.json),
// no Ambiguous workspace, no Exa. The stubs count calls so idempotency is proved, not assumed.
const h = vi.hoisted(() => {
  const noState = () => {
    throw new Error("test state not initialised");
  };
  return {
    box: { state: null as RunState | null },
    get: (): RunState => h.box.state ?? noState(),
    createTask: vi.fn(async () => `task-${Math.random().toString(16).slice(2, 10)}`),
    createDoc: vi.fn(async () => ({
      id: "8c03b16a-1f44-4a7e-9b0e-2d0c6f1a55aa",
      url: "https://app.ambiguous.ai/nova/documents/8c03b16a-1f44-4a7e-9b0e-2d0c6f1a55aa",
    })),
    updateDoc: vi.fn(async () => undefined),
    ensureProject: vi.fn(async () => "3f9b0c21-7a41-4d0e-8c55-1b2c3d4e5f60"),
    upsertContact: vi.fn(async () => "c1d2e3f4-5a6b-47c8-9d0e-1f2a3b4c5d6e"),
    sendMail: vi.fn(async () => ({ mailId: "aa11bb22-cc33-4d44-8e55-66778899aabb", reused: false })),
  };
});

vi.mock("@/lib/store", () => ({
  getState: async () => h.get(),
  update: async (fn: (s: RunState) => void | RunState) => {
    const current = h.get();
    const returned = fn(current);
    const next = (returned ?? current) as RunState;
    next.updatedAt = new Date().toISOString();
    h.box.state = next;
    return next;
  },
  appendEvent: async (ev: Omit<AgentEvent, "id" | "at">) => {
    const full: AgentEvent = { id: `ev-${h.get().events.length}`, at: new Date().toISOString(), ...ev };
    h.get().events.push(full);
    return full;
  },
  resetState: async () => h.get(),
  stateFilePath: () => "(memory)",
}));

vi.mock("@/lib/integrations/ambiguous", () => ({
  createTask: h.createTask,
  createDoc: h.createDoc,
  updateDoc: h.updateDoc,
  ensureProject: h.ensureProject,
  upsertContact: h.upsertContact,
  sendMail: h.sendMail,
  workspaceSlug: async () => "nova",
  origin: () => "https://app.ambiguous.ai",
  isConfigured: () => true,
  agentEmail: () => "agent@ambiguous.ai",
  projectUrl: (id: string) => `https://app.ambiguous.ai/nova/projects/${id}`,
}));

vi.mock("@/lib/integrations/exa", () => ({
  researchEvent: async () => ({
    verifiedVenue: "ADNEC Centre Abu Dhabi",
    city: "Abu Dhabi",
    organiser: "Informa",
    expectedAttendance: 40000,
    sources: ["https://a.ae", "https://b.ae", "https://c.ae", "https://d.ae", "https://e.ae"],
  }),
  verifyExperience: async (u: { id: string }) => ({
    usherId: u.id,
    verifiedEvents: ["GITEX Global 2025"],
    sources: ["https://gitex.com"],
  }),
  verifyMany: async () => [],
}));

vi.mock("@/lib/integrations/telegram", () => ({
  sendOffer: vi.fn(async () => undefined),
  sendMessage: vi.fn(async () => undefined),
  answerCallback: vi.fn(async () => undefined),
}));

const { approveAndSend, recordReply, startRun, writeCallsheet } = await import("@/lib/agent");

const brief: EventBrief = {
  id: "evt-test",
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
  positions: [{ area: "F&B", needed: 2 }],
};

const noor: SeedUsher = {
  id: "usher-01",
  name: "Noor Haddad",
  city: "Abu Dhabi",
  phone: "+971500000001",
  email: "noor@example.com",
  languages: ["Arabic", "English"],
  yearsExperience: 2,
  pastEvents: ["GITEX Global 2025"],
  skills: ["f&b"],
  rating: 4.2,
  reliabilityScore: 0.8,
  availability: ["2026-10-06", "2026-10-07"],
};

function offer(over: Partial<Offer> & { id: string; usherId: string }): Offer {
  return {
    eventId: brief.id,
    area: "F&B",
    status: "sent",
    channel: ["email"],
    score: 9,
    reason: "F&B: F&B skill, 4.2 rating",
    ...over,
  } as Offer;
}

function seedState(): RunState {
  return {
    runId: "run-test",
    stage: "collecting_replies",
    request: "2 for F&B",
    brief,
    offers: [
      offer({ id: "off-1", usherId: "usher-01" }),
      offer({ id: "off-2", usherId: "usher-02" }), // stays open so the call sheet is not rewritten
    ],
    events: [],
    workspace: { connected: true, projectId: "3f9b0c21-7a41-4d0e-8c55-1b2c3d4e5f60" },
    crew: [noor, { ...noor, id: "usher-02", name: "Karim Nassar", email: "karim@example.com" }],
    waitlist: [],
    unfilled: [],
    updatedAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.box.state = seedState();
});

describe("recordReply idempotency", () => {
  it("creates one training reminder for two identical yes replies", async () => {
    const first = await recordReply("usher-01", "yes");
    const second = await recordReply("usher-01", "yes");

    expect(h.createTask).toHaveBeenCalledTimes(1);
    expect(first?.status).toBe("confirmed");
    expect(first?.idempotent).toBeUndefined();
    expect(second?.status).toBe("confirmed");
    expect(second?.idempotent).toBe(true);
    expect(second?.trainingTaskId).toBe(first?.trainingTaskId);

    const stored = h.get().offers.find((o) => o.id === "off-1");
    expect(stored?.ambiguousTrainingTaskId).toBe(first?.trainingTaskId);
    expect(h.get().workspace.tasks).toBe(1);
  });

  it("reuses a task id already stored on the offer instead of creating another", async () => {
    h.get().offers[0].status = "sent";
    h.get().offers[0].ambiguousTrainingTaskId = "already-there";
    const res = await recordReply("usher-01", "yes");
    expect(h.createTask).not.toHaveBeenCalled();
    expect(res?.status).toBe("confirmed");
    expect(res?.trainingTaskId).toBe("already-there");
  });

  it("does not promote the waitlist twice for a repeated no", async () => {
    h.get().waitlist = [
      { ...offer({ id: "wl-1", usherId: "usher-09" }), status: "waitlisted" },
    ];
    const first = await recordReply("off-1", "no");
    const second = await recordReply("off-1", "no");
    expect(first?.promoted).toBe("usher-09");
    expect(second?.idempotent).toBe(true);
    expect(h.get().offers.filter((o) => o.usherId === "usher-09")).toHaveLength(1);
  });
});

describe("event messages", () => {
  const NO_UUID = /^(?!.*[0-9a-f]{8}-[0-9a-f]{4}-)/i;

  it("keeps raw ids out of every message in the smoke path", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    h.box.state = { ...seedState(), offers: [], crew: [], events: [] };

    const runId = await startRun(
      [
        "60 for AI Everything Summit, 6-7 Oct 2026, 10 each:",
        "Stage, Kids Zone, F&B, Traditional Games, Registration & Scanning, Info Desk.",
        "Training 5 Oct 2h on-site, mandatory. AED 297 / 8.5h. No meals. Transport allowance.",
      ].join(" "),
    );
    await approveAndSend(runId);
    const sent = h.get().offers.find((o) => o.status === "sent");
    await recordReply(sent!.id, "yes");
    await writeCallsheet(h.get());

    const messages = h.get().events.map((e) => e.message);
    expect(messages.length).toBeGreaterThan(6);
    for (const message of messages) {
      expect(message, `raw id leaked into an event: ${message}`).toMatch(NO_UUID);
    }
    vi.unstubAllEnvs();
  });

  it("names the person and the area on the training reminder, ids in data", async () => {
    await recordReply("usher-01", "yes");
    const ev = h.get().events.find((e) => e.message.includes("training reminder"));
    expect(ev?.message).toBe("Ambiguous: training reminder task created for Noor Haddad (F&B)");
    expect(ev?.data?.taskId).toBeTruthy();
    expect(ev?.data?.area).toBe("F&B");
  });

  it("reports the venue Exa resolved with its source count", async () => {
    h.box.state = { ...seedState(), events: [] };
    const { toolResearchEvent } = await import("@/lib/agent");
    await toolResearchEvent("AI Everything Summit", "ADNOC Centre");
    const ev = h.get().events.find((e) => e.tool === "research_event");
    expect(ev?.message).toContain("Exa: venue resolved to ADNEC Centre Abu Dhabi");
    expect(ev?.message).toContain("from 5 sources");
  });
});
