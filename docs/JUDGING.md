# Judging, criterion by criterion

**Theme.** "Agents are leaving the chatbox. Build an agent for a place people already work, talk, or live, then make it meaningfully more useful because of that context."

Four criteria, as published: Core Requirements and Functionality, Innovation and Theme Alignment, Technical Execution and Integration, Usefulness and Agentic Experience. Each section below quotes the rubric's own "what they look for" text and its level 5 descriptor, then gives what we built, our evidence and our known gaps.

Everything under "Evidence" is a file, a test name or a line from a real run log, and everything under "Known gaps" is a thing a judge would otherwise find on their own.

Verified on build day: 45 unit tests passing across 6 files, `tsc --noEmit` clean, `eslint` clean, and one end to end run whose log is quoted in the [README](../README.md).

---

## 1. Core Requirements and Functionality

**What they look for.** "Does the project deliver a working agent inside a place where people already work, talk, or live? Does the core workflow function end to end?"

**Level 5.** "The project is robust, reliable, and fully functional within its intended environment."

**What we built.** One request goes in and a staffed call sheet comes out. Nine steps: parse, research, search, verify, roster, human approval, send, reply, document. Sixty slots across six areas, with a waitlist and per area shortfall reporting. Replies confirm, decline, or promote from the waitlist, and the document is rewritten each time.

**Evidence.**

- The run log in the README: 60 offers across 6 areas, 6 newcomer slots reserved, 12 waitlisted, 0 areas short.
- Real external calls in that same run: Exa returned 5 sources and corrected the venue, Ambiguous accepted 6 emails from the agent's mailbox, 6 confirmation tasks and a training reminder task were created under project `115c3118-...`, and the call sheet document exists at a URL in the log.
- `pnpm exec vitest run`: 45 tests, 6 files, all passing.
- Entry points: [app/api/agent/route.ts](../app/api/agent/route.ts), [app/api/agent/approve/route.ts](../app/api/agent/approve/route.ts), [app/api/telegram/route.ts](../app/api/telegram/route.ts), [app/api/state/route.ts](../app/api/state/route.ts).

**Known gaps.**

- Telegram and Slack were not exercised live. No bot tokens were available on build day. Both workers are written and unit tested, and the Telegram message builder and failure path are covered in [lib/integrations/telegram.test.ts](../lib/integrations/telegram.test.ts), but a judge should read them as tested code rather than as a demonstrated channel.
- Of the 60 offers in the run, 6 were sent as real email and 54 were queued with a stated reason. That is the demo mail cap and the synthetic bench, not a failure, and the log says which.

---

## 2. Innovation and Theme Alignment

**What they look for.** "Does the project explore a compelling new place or interaction for agents? Does the environment materially improve what the agent can do?"

**Level 5.** "The project reveals a surprising new agent pattern whose central value could not be reproduced in a standalone chatbox."

**What we built.** Three things a chatbox cannot do.

First, one to many allocation. Sixty offers, sixty replies and one shared waitlist move at the same time in the channel the crew is already in. The value is concurrency and fairness, neither of which exists in a 1:1 window.

Second, the agent holds a seat rather than a session. It is a coworker of type `agent` with status `ACTIVE` and its own mailbox in a real workspace. Its correspondence, records, tasks and documents outlive the process. See [docs/AMBIGUOUS.md](AMBIGUOUS.md).

Third, fairness is a property of the code, not a promise in a reply. Ten per cent of every area's slots are reserved for first-timers, rounded up, and released back to the general ranking only if no newcomer is available. This is the structural answer to wasta: a newcomer with no connections gets a slot because the allocator holds one, and the ranking above them runs on verified history rather than on who called whom.

**Evidence.**

- `buildRoster()` in [lib/roster/build.ts](../lib/roster/build.ts), with tests "reserves 10 percent of each area for newcomers, rounded up" and "releases the newcomer slot when no newcomer is available".
- Verification as the anti-wasta mechanism: `verify_experience` writes `verifiedEvents` as a subset of `pastEvents`, and the scorer only pays for verified ones. See `scoreCandidate()` in the same file, and the run log line "21 past events confirmed".
- The problem is documented, not assumed: [docs/research/industry.md](research/industry.md) carries Liveforce's one way job board, the four agencies our teammate holds profiles with, UAE usher rates of AED 50 to 200 per hour, and a 500 plus crew deployment for one Formula 1 weekend, each with sources.

**Known gaps.**

- The strongest environment story available in Ambiguous, an usher applying by emailing the agent and becoming a CRM contact with no human in the loop, needs the notifications watch stream. It is not built.
- The UAE framing rests on our own experience plus desk research. We have not run this inside an agency's production channel.

---

## 3. Technical Execution and Integration

**What they look for.** "Consider the code, architecture, reliability, tool use, data handling, and depth of integration with the selected environment."

**Level 5.** "The project demonstrates exceptional engineering, including robust orchestration, thoughtful failure handling, and a deeply integrated architecture."

**What we built.** Four integrations, each used at the point where it is the right tool. Exa for research and verification. Ambiguous as the workspace and system of record. The OpenAI Agents SDK for the tool calling loop, with OpenRouter wired as a fallback provider in chat completions mode. Telegram for the crew's side and Slack Bolt in socket mode for the coordinator's.

The engineering position is that a failure must become visible state. Every external call has an explicit timeout. Every failure lands in the event log at `warn` or `error` and marks the affected offer `queued` with the reason on it. Nothing retries silently and nothing is dropped.

**Evidence.**

- Timeouts: `AbortSignal.timeout(8000)` in [lib/integrations/ambiguous.ts](../lib/integrations/ambiguous.ts), and the per service table in [docs/ARCHITECTURE.md](ARCHITECTURE.md).
- 429 handling, honoured once through `Retry-After` and then surfaced: test "honours Retry-After once on a 429".
- Idempotency: mail keyed on usher and event, sent as both header and body, with 409 treated as already sent. Tests "treats a 409 on a reused idempotency key as already sent" and "posts mail to /mail/send with the idempotency key on the header and the body".
- Body over status code: `createTask()` rejects a task that returns without `project_id`, because it would be invisible to the workspace. Test "refuses a task that came back without a project, because it would stay private".
- Errors surfaced, not swallowed: test "surfaces a server error instead of swallowing it", and "fails loudly when the bot token is missing, so the offer can be queued with a reason", and "treats ok:false on a 200 as a failure" for Telegram's habit of returning 200 on failure.
- Reply idempotency: "creates one training reminder for two identical yes replies", "reuses a task id already stored on the offer instead of creating another", "does not promote the waitlist twice for a repeated no".
- Determinism where determinism belongs: the roster is pure code with a deterministic tie break, so the same brief produces the same roster. Test "is deterministic: the same brief yields the same names".
- Clean gates: `pnpm exec tsc --noEmit` exits 0, `pnpm lint` exits 0, `pnpm exec vitest run` reports 45 passed.

**Known gaps.**

- The LLM planner path is implemented in `runWithLlm()` in [lib/agent/index.ts](../lib/agent/index.ts) but no run used it: no model key was available on build day, so every run took the scripted planner. The log's first line says `planner: scripted mode (no LLM key configured)` rather than hiding it. The tool implementations are the same either way, which is why the run is real regardless.
- The store is a JSON file with an in memory cache. It is a demo cache, chosen for reliability on stage. The durable record is the workspace.
- OpenRouter fallback is wired and not exercised.

---

## 4. Usefulness and Agentic Experience

**What they look for.** "Does the project create clear value for its intended users? Is the agent intuitive, effective, and appropriate for the environment in which it operates?"

**Level 5.** "The project unlocks substantial value through an agent experience designed specifically for its environment, using context intelligently while remaining clear and controllable."

**What we built.** The agent proposes and a person disposes, through exactly one gate. `POST /api/agent/approve` is the only path to a send side effect. A run can sit in `awaiting_approval` indefinitely with zero external consequences. The gate is an API boundary rather than an instruction in a prompt, which means it cannot be talked past.

Either side of that gate, nobody has to learn anything new. The coordinator works in Slack or a single console screen whose focal point is the fill grid. The usher gets a complete offer in Telegram, with dates, hours, rate, training, transport, meals and the exact position, and answers with one tap. The agency's paperwork appears in a CRM, a task board and a document, which are tools an ops person already uses.

Two details worth a judge's attention. The event log is written in mechanism, not vibe: "Exa: 5 sources, venue resolved to ADNEC Centre Abu Dhabi", not "researching the event". And it names people, not identifiers: two tests exist purely to keep raw ids out of human facing messages.

**Evidence.**

- The gate: `approveAndSend()` in [lib/agent/index.ts](../lib/agent/index.ts) and [app/api/agent/approve/route.ts](../app/api/agent/approve/route.ts). The run log line "coordinator approved 60 offers, human gate passed" appears before any send line.
- Message quality: tests "keeps raw ids out of every message in the smoke path", "names the person and the area on the training reminder, ids in data", "reports the venue Exa resolved with its source count".
- Offer completeness: test "puts every term of the offer in the message" for the Telegram card, and `offerBody()` in [lib/agent/index.ts](../lib/agent/index.ts) for the emailed version.
- The coordinator's view: [components/console/FillGrid.tsx](../components/console/FillGrid.tsx) and [components/console/EventLog.tsx](../components/console/EventLog.tsx). The usher's view: [components/usher/PhoneView.tsx](../components/usher/PhoneView.tsx).
- The Slack surface, including the approval buttons and the per area roster summary: [lib/slack/blocks.ts](../lib/slack/blocks.ts), tested in [lib/slack/blocks.test.ts](../lib/slack/blocks.test.ts).

**Known gaps.**

- The approval is binary today. A coordinator can approve or reject a roster, but cannot swap one name for another before approving. That is the first thing a real agency would ask for.
- Consent. Seed addresses are research data, not people who agreed to be emailed, so offers are delivered to the agent's own mailbox with the intended recipient named in the body unless `OFFER_MAIL_TO` is set. The send is real either way. We would rather explain this than quietly mail strangers.
- No authentication on the console. Out of scope for a hackathon build, and it would be the first thing to add before anyone else touched it.
