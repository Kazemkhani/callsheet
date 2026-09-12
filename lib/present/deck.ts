/**
 * Deck content. Everything here is plain text the presenter reads out or points
 * at; the visual slides (the flow, the ten seats) live in components/present.
 *
 * The order of `SLIDE_TITLES` is the order of the deck, and its length is what
 * the progress rail and the "04 / 11" counter divide by.
 */

export const SLIDE_TITLES = [
  "Title",
  "The person",
  "The problem",
  "The other side",
  "The idea",
  "Where it lives",
  "The loop",
  "What makes it fair",
  "Live",
  "Under the hood",
  "Close",
] as const;

export const SLIDE_COUNT = SLIDE_TITLES.length;

export const title = {
  eyebrow: "AI Tinkerers, Abu Dhabi",
  wordmark: "Callsheet",
  line: "The AI staffing coordinator that lives where the work already happens.",
  team: "Ai Warriors. Amir Hossein Kazemkhani, Hasan Al Sheikh, Muhammad Talha, Omar Tageldin.",
} as const;

export const person = {
  headline: "Omar works events in Abu Dhabi.",
  lines: [
    "Ushering at Mubadala Tennis, Etihad Airways, ADNOC.",
    "Three years on the floor.",
    "He is sitting in this room.",
  ],
} as const;

export type ProblemStep = { step: string; cost: string };

export const problem = {
  headline: "To get one shift, he does this.",
  steps: [
    { step: "Applies to four agencies, one profile each", cost: "4 x 40 minutes" },
    { step: "Waits for an interview", cost: "1 month" },
    { step: "Gets job posts he cannot reply to", cost: "one way" },
    { step: "Hopes someone inside puts his name forward", cost: "wasta" },
  ] satisfies ProblemStep[],
  footnote: "He has never once been placed through the app.",
} as const;

export type MirrorRow = { label: string; value: string };

export const otherSide = {
  headline: "The coordinator has the mirror image of that problem.",
  rows: [
    { label: "Sixty", value: "staff needed for one summit, across six areas" },
    { label: "Two days", value: "to fill them, plus a mandatory training day" },
    { label: "One channel", value: "a broadcast nobody can answer" },
  ] satisfies MirrorRow[],
  footnote: "So they ring the people they already know. Same names, every event.",
} as const;

export const idea = {
  lines: [
    "Put the agent in the channel.",
    "Give it an office of its own.",
    "Keep a person in the loop.",
  ],
} as const;

export const whereItLives = {
  channel: {
    label: "The channel",
    body: "Slack for the coordinator. Telegram for the crew. The places this industry already talks.",
  },
  office: {
    label: "The office",
    body: "Ambiguous. Callsheet is a registered agent coworker with its own mailbox, CRM, tasks and documents.",
    mailbox: "callsheet@callsheet-workspace.ambi.cc",
  },
  footnote: "The agent does not borrow a human's account. It has its own.",
} as const;

export const loop = {
  headline: "One request in. A staffed event out.",
  steps: [
    "Research",
    "Crew",
    "Verify",
    "Roster",
    "Approve",
    "Offers",
    "Call sheet",
  ],
  gateIndex: 4,
  gateNote: "The human gate. Nothing is sent before a person taps approve.",
} as const;

export const fair = {
  headline: "Ten per cent of every area is reserved for first-timers.",
  lines: [
    "In this industry you cannot get experience without a first shift.",
    "The agent also checks that claimed experience is real, against the open web. Forty three past events confirmed in this run.",
  ],
  caption: "one seat in ten",
} as const;

export const live = {
  headline: "Live.",
  line: "Sixty ushers. Two days. Six areas.",
  where: "localhost:3100",
} as const;

export type SpecRow = { label: string; value: string };

export const underTheHood = {
  headline: "What it is built on.",
  rows: [
    {
      label: "Agent",
      value: "OpenAI Agents SDK, five typed tools, routed through OpenRouter",
    },
    {
      label: "Research",
      value:
        "Exa search with page contents, for the event and for every claimed past event",
    },
    {
      label: "Workspace",
      value:
        "Ambiguous REST: CRM contacts, tasks under a project, mail with idempotency keys and contact linking, the call sheet as a document",
    },
    { label: "Channels", value: "Slack Bolt in Socket Mode, Telegram Bot API" },
    {
      label: "Safety",
      value:
        "Explicit timeout on every external call. A failure becomes a queued offer with its reason in the log. Nothing fails silently.",
    },
    {
      label: "Proof",
      value:
        "47 tests. Roster fairness, waitlist promotion, idempotency, 429 handling, failure surfacing.",
    },
  ] satisfies SpecRow[],
} as const;

export const close = {
  headline: "Sixty ushers, placed on verified experience, in minutes.",
  line: "Not by who they know, over weeks.",
  repo: "github.com/Kazemkhani/callsheet",
} as const;
