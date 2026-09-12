// Shared contract between the coordinator console (UI), the agent core and the store.
// Owned by the orchestrator. UI and agent-core agents may ADD fields but must not rename or remove.

export type Area =
  | "Stage"
  | "Kids Zone"
  | "F&B"
  | "Traditional Games"
  | "Registration & Scanning"
  | "Info Desk";

export interface Agency {
  id: string;
  name: string;
  website?: string;
}

export interface PositionNeed {
  area: Area | string;
  needed: number;
}

export interface EventBrief {
  id: string;
  name: string;
  venue: string;            // as stated by the coordinator
  verifiedVenue?: string;   // as resolved by Exa (may differ, e.g. "ADNOC Centre" -> "ADNEC")
  city: string;
  dates: string[];          // ISO dates
  hoursPerDay: number;
  shiftStart: string;       // "08:30"
  shiftEnd: string;         // "18:00"
  rateAedPerHour: number;
  training?: { date: string; durationHours: number; mandatory: boolean; onSite: boolean };
  transport: "allowance" | "provided" | "none";
  meals: "provided" | "none";
  positions: PositionNeed[];
  organiser?: string;
  expectedAttendance?: number;
  sources?: string[];       // URLs from Exa
}

export interface Usher {
  id: string;
  name: string;
  city: string;
  phone: string;
  email: string;
  telegramChatId?: string;  // set once the usher messages the bot
  languages: string[];
  yearsExperience: number;
  pastEvents: string[];
  verifiedEvents?: string[]; // subset of pastEvents confirmed by Exa
  skills: string[];          // maps to Area names (lowercase tokens allowed)
  rating: number;            // 1-5
  reliabilityScore: number;  // 0-1
  availability: string[];    // ISO dates
  ambiguousContactId?: string;
}

export type OfferStatus =
  | "proposed"    // in the roster draft, not yet approved
  | "queued"      // approved, send pending / failed (retryable)
  | "sent"        // delivered to Telegram and/or email
  | "confirmed"   // usher replied yes
  | "declined"    // usher replied no
  | "waitlisted";

export interface Offer {
  id: string;
  eventId: string;
  usherId: string;
  area: Area | string;
  status: OfferStatus;
  channel: ("telegram" | "email")[];
  score: number;
  reason: string;            // one line: why this usher for this area (shown in UI)
  firstTimerSlot?: boolean;  // fairness reservation
  sentAt?: string;
  respondedAt?: string;
  ambiguousTaskId?: string;
  ambiguousTrainingTaskId?: string; // set once a training reminder exists, so a repeat yes reuses it
  ambiguousMailId?: string;
  error?: string;            // surfaced, never swallowed
}

export type RunStage =
  | "idle"
  | "researching"
  | "searching_crew"
  | "verifying"
  | "building_roster"
  | "awaiting_approval"
  | "sending_offers"
  | "collecting_replies"
  | "complete"
  | "failed";

export interface AgentEvent {
  id: string;
  at: string;                // ISO
  tool:
    | "research_event"
    | "search_crew"
    | "verify_experience"
    | "build_roster"
    | "approve_roster"
    | "send_offers"
    | "record_reply"
    | "write_callsheet"
    | "sync_workspace"
    | "system";
  level: "info" | "warn" | "error";
  message: string;           // mechanism, not vibe ("Exa: 3 sources, venue resolved to ADNEC")
  data?: Record<string, unknown>;
}

export interface RunState {
  runId: string | null;
  stage: RunStage;
  request: string | null;    // the coordinator's raw message
  brief: EventBrief | null;
  offers: Offer[];
  events: AgentEvent[];
  workspace: {
    connected: boolean;
    agentEmail?: string;
    callsheetDocUrl?: string;
    callsheetDocId?: string;   // added by agent-core: lets the doc be refreshed in place
    projectId?: string;
    contacts?: number;         // CRM contacts seeded into the workspace by this run
    tasks?: number;            // workspace tasks created by this run (confirmations + training)
    lastSyncError?: string;
  };
  // Added by agent-core (additive, nothing renamed):
  crew?: Usher[];            // the pool the roster was built from; the UI needs names per offer
  waitlist?: Offer[];        // next in line per area, promoted on a decline
  unfilled?: { area: string; needed: number; filled: number }[];
  updatedAt: string;
}

// API surface
// POST /api/agent        { request: string }            -> 202 { runId }  (runs to awaiting_approval)
// POST /api/agent/approve { runId }                     -> 200 { ok }     (sends offers)
// GET  /api/state                                       -> RunState
// POST /api/telegram     Telegram Update                -> 200
// POST /api/simulate     { replies: number }            -> 200 (dev only: fake N usher replies)
