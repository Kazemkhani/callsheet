# Callsheet — design spec (hackathon build, 2026-09-12)

## One line
An AI staffing coordinator that lives inside the broadcast group event agencies already run,
and keeps its own office (inbox, CRM, tasks, call-sheet documents) in Ambiguous, so 60 ushers
get placed on verified experience in minutes instead of by wasta over weeks.

## Why the environment matters (Innovation 5/5 argument)
- Agencies already talk to staff through ONE-WAY broadcast posts (Liveforce chat, WhatsApp).
  Staff cannot reply. Placement happens off-channel via phone calls to people the supervisor knows.
- Callsheet turns that broadcast into a two-way, 1-to-many allocation loop: 200 replies arrive in
  the group; the agent scores, allocates, waitlists and confirms every one of them by name.
- A 1:1 chatbox cannot do this: the value is concurrency + fairness + a shared live roster.
- The agent's OWN workspace (Ambiguous) is where the paperwork lives: applications arrive as email
  with CVs, ushers become CRM contacts with Exa-verified event history, each unfilled slot and
  each pending confirmation is a task, and the call sheet is a living document the organiser can open.

## Personas in the demo
1. Coordinator (agency ops): posts a staffing request in the group / dashboard. Approves the roster.
2. Usher (Omar Tageldin): receives a complete offer in Telegram, replies "yes", gets a position.

## Core loop (what runs end to end)
1. Request in: "60 for AI Everything Summit, 6-7 Oct, 10 each: Stage, Kids Zone, F&B,
   Traditional Games, Registration & Scanning, Info Desk. Training 5 Oct 2h on-site, mandatory.
   AED 297 / 8.5h. No meals. Transport allowance."
2. research_event (Exa): resolves venue, dates, organiser, footfall; flags mismatches
   (e.g. "ADNOC Centre" -> ADNEC). Writes a brief.
3. search_crew (CRM): candidates by area skill, availability, city, languages.
4. verify_experience (Exa): claimed past events checked for existence/date plausibility ->
   "verified" badge. This is the anti-wasta mechanism.
5. build_roster (deterministic code): score + fairness (10% of slots reserved for first-timers so
   newcomers can "prove themselves"), waitlist depth 20%.
6. HUMAN GATE: coordinator approves roster (one tap). Nothing leaves before this.
7. send_offers: Telegram DM per usher with dates, hours, rate, training, transport, meals,
   position; Ambiguous email for agencies that use email; Ambiguous task per pending confirmation.
8. Replies stream in (Telegram webhook): "yes" -> confirmed + assigned; "no" -> next on waitlist;
   questions ("is there transport?") answered from the brief.
9. write_callsheet (Ambiguous document): live call sheet; training reminder tasks created.
10. Dashboard shows the fill meter 0 -> 60 live.

## Architecture (single Next.js 16 app, TypeScript)
- apps: one Next.js App Router app at repo root (no monorepo; no time).
- /                    Coordinator console. Focal point: the call sheet fill grid.
- /u/[usherId]         Usher phone view (mirrors what Telegram shows; used in video).
- /api/agent           POST: run the agent on a request; streams tool events (SSE).
- /api/telegram        POST: Telegram webhook -> record_reply -> allocation update.
- /api/state           GET: current roster/state for the console (poll 1s).
- /api/copilotkit      CopilotKit runtime (organiser copilot; generative UI for roster) — only if
                       the sponsor-stack brief says it is a 15-minute wire; else cut.
- lib/agent/           OpenAI Agents SDK (TS) agent + tools.
- lib/integrations/    exa.ts, ambiguous.ts, telegram.ts (fetch only, explicit timeouts).
- lib/roster/          scoring + fairness (pure, unit-tested).
- lib/store/           JSON file store (data/state.json) with an in-memory cache. Deliberate: demo
                       reliability over durability.
- data/seed.json       agencies, events, 24 ushers (from research).

## Failure handling (no silent failures)
- Every external call: explicit timeout (Exa 8s, Ambiguous 8s, Telegram 5s); errors surface in the
  console event stream as red "tool failed" rows; the loop continues without that tool's result and
  says so ("venue unverified").
- Telegram unreachable -> offers marked "queued", UI shows it, retry button.
- Ambiguous unreachable -> the call sheet is still rendered locally; badge "workspace sync pending".

## Design tokens (no brand doc exists; proposed here, used everywhere)
- Surfaces: paper #F4F1EA (page), card #FBF9F4, ink #1A1917, ink-muted #5C574F, rule #D9D3C7
- Anchor accent: signal #C8401F on paper (contrast ~5.4:1); use once per screen (the CTA / fill bar)
- Confirmed: olive #4F6D3A on paper (~5.9:1). Pending: ink-muted. Failed: signal.
- Type: Fraunces (display 600/700, opsz) + IBM Plex Sans (body 16) + IBM Plex Mono (call sheet
  tables, tabular numbers). Scale x1.25 from 16.
- Spacing: 8-grid, 4 half-step. Radius: 4 on controls, 0 on the call sheet (it is a document).
- Motion: only state changes (slot fills, message arrives): 180ms ease-out; respects reduced-motion.
- Focal points: console = fill grid; usher view = the offer card + one large "I'm in".
- States: skeleton for roster load, quiet empty state ("No request yet"), red inline errors.

## Testing (bun test / vitest)
- lib/roster: scoring order, fairness reservation, waitlist promotion on "no".
- lib/integrations: timeout + error surfacing with mocked fetch.
- Smoke: POST /api/agent with seed request -> state.json has 60 offers.

## Cut lines (in order, if time runs out)
1. CopilotKit sidebar  2. Ambiguous email send (keep CRM+doc+tasks)  3. Exa verify_experience
(keep research_event)  4. Usher web view (Telegram alone carries it).

## Sponsor usage map
Exa: research_event + verify_experience + agency job discovery (usher side, roadmap).
Ambiguous: CRM (ushers), inbox (applications in, offers out), tasks (slots/confirmations/training),
documents (call sheet, brief). OpenAI Agents SDK: the agent loop + tools. OpenRouter: model routing
fallback. CopilotKit: coordinator copilot with generative roster UI (if time). n8n: WhatsApp bridge
if the teammate's instance has a credential (probe pending). Auth0: not used (stated).

## Ambiguous AI — concrete plan (from verified brief, research/ambiguous.md)
Setup (creates the agent identity + workspace, key lands in ./.ambi/config.json):
  npx ambiguous@latest auth signup --name "Callsheet" --workspace-name "Callsheet Crew" --human-email novalabshq@gmail.com
  npx ambiguous@latest whoami --json     # note the agent's OWN email address; it goes in the video
Transport for the app: REST https://app.ambiguous.ai/api/... with Authorization: Bearer <key>, API-Version: 1
(exact paths: grep research/raw/catalog.txt and the OpenAPI dump). CLI for one-off setup/seed only.

Priority order (build in this order; each is demoable alone):
1. CRM: seed 24 ushers as contacts with custom properties (skills, verifiedEvents, reliability, city,
   telegramChatId). The agent's search_crew reads CRM, not the JSON file, when the key is present.
2. Tasks: project "AI Everything Summit 2026 — staffing"; one task per area ("Stage: 10 needed"),
   one task per pending confirmation, one training-reminder task per confirmed usher. MUST set
   project_id or tasks stay private. `tasks workload` proves nobody is double-booked.
3. Mail: offers sent from the agent's own mailbox with --contact-id (logs onto CRM record) and
   --idempotency-key offer-<usher>-<event> (safe to re-run on stage). Inbox poll (mail inbox --unread)
   ingests "yes/no" replies AND new applications with CVs -> new CRM contact. A judge can email the
   agent from their phone and watch a contact appear.
4. Docs: the Call Sheet document created at the end of the run (export --format pdf for the video).
5. Stretch: Sheets live roster + Forms public applicant form ("apply once, not four times").
Gotchas honoured: exit code 0 is not proof (check body); 429 -> Retry-After; idempotency key reuse
with a different payload -> 409; notifications watch is the wake mechanism, not MCP.

## Seed data: research/seed.json (4 agencies, 3 real events with verified dates, 24 ushers incl. Omar)
Facts: AI Everything Summit 6-7 Oct 2026, ADNEC Abu Dhabi (the brief's "ADNOC Centre" is the
common misnomer the Exa research step corrects on camera). Liveforce = real platform (liveforce.co),
one-way job board confirmed, has a GraphQL API (docs.liveforce.co) -> credible "extends the platform".
