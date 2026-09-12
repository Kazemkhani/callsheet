# Architecture

## Components

- **Next.js 16 app (single App Router app, no monorepo)**
  - `/`: coordinator console; focal point is the call sheet fill grid.
  - `/u/[usherId]`: usher phone view, mirrors what Telegram shows.
  - `/api/agent`: `POST { request }` runs the agent through to `awaiting_approval`.
  - `/api/agent/approve`: `POST { runId }`, the single approval boundary; triggers `send_offers`.
  - `/api/telegram`: Telegram webhook target, feeds `record_reply`.
  - `/api/state`: `GET`, current `RunState` (`lib/types.ts`), polled by the console every 1s.
  - `/api/simulate`: dev-only, fakes N usher replies for rehearsal.
- **`scripts/slack-worker.ts`**: Bolt app in Socket Mode; owns the coordinator's side: the `/staff` command, the approval button, and posting the agent's event log into the Slack thread.
- **`scripts/telegram-poll.ts`**: polls `getUpdates` and forwards replies to `/api/telegram`.
- **`lib/agent/`**: the OpenAI Agents SDK (TypeScript) agent and its tools: `research_event`, `search_crew`, `verify_experience`, `build_roster`, `send_offers`, `record_reply`, `write_callsheet`. OpenRouter is wired as a fallback model provider in Chat Completions mode.
- **`lib/roster/`**: pure, unit-tested scoring and fairness (10 percent first-timer reservation, waitlist depth).
- **`lib/integrations/`**: `exa.ts`, `ambiguous.ts`, `telegram.ts`; fetch-only, explicit timeout on every call.
- **`lib/store/`**: JSON file store (`data/state.json`) with an in-memory cache; deliberately favours demo reliability over durability.
- **Ambiguous workspace** (`callsheet@callsheet-workspace.ambi.cc`): CRM, Tasks, Mail, Docs; the external system of record.

## Data flow

1. Coordinator posts a request in Slack → `slack-worker.ts` → `POST /api/agent`.
2. Agent runs `research_event` (Exa) → `search_crew` (CRM) → `verify_experience` (Exa) → `build_roster` (lib/roster). Each tool call is streamed into the Slack thread as an event log line.
3. Run sits in `awaiting_approval`. Nothing downstream fires until the coordinator taps Approve.
4. `POST /api/agent/approve` → `send_offers`: Telegram DM per usher, Ambiguous mail for agencies on email, one Ambiguous task per pending confirmation.
5. Usher replies in Telegram → `telegram-poll.ts` → `POST /api/telegram` → `record_reply` updates the offer (`confirmed` / `declined` → waitlist promotion).
6. `write_callsheet` keeps the Ambiguous Doc and training tasks in sync with every reply.
7. The console polls `GET /api/state` once a second and redraws the fill grid; the usher's own view mirrors the same state.

## Approval boundary

There is exactly one gate: `POST /api/agent/approve`, callable only from the Slack button tap the coordinator controls. Every send-side effect (Telegram DMs, Ambiguous mail, tasks created because an offer went out) sits behind it. A run can stay in `awaiting_approval` indefinitely with zero external side effects. This is deliberate: the agent proposes, a person disposes.

## Failure modes and what the user sees

| Failure | Timeout | What happens | What the user sees |
|---|---|---|---|
| Exa unreachable/slow | 8s | `research_event` or `verify_experience` fails; the run continues without that result | Red "tool failed" row in the event log; venue shown as unverified, or the usher's badge withheld |
| Ambiguous unreachable | 8s | Call sheet still renders from local state; CRM/task writes retried, not blocking sends | "Workspace sync pending" badge in the console |
| Ambiguous rate limit (429) | n/a | `Retry-After` honoured before retrying | Offer marked "queued", retried after the header's delay |
| Ambiguous idempotency key reused with a different payload | n/a | Request rejected with 409, not silently retried | Error row in the event log naming the conflicting offer |
| Telegram unreachable | 5s | Send fails, error attached to the offer | Offer marked "queued" with the error, a retry button in the console |
| Any other unhandled tool error | n/a | Surfaced, never swallowed | Error row in both the Slack thread and the console event log |

No failure is silent: every external call fails into a visible state (`error`, `queued`, a badge) rather than a blank retry loop or a crash.

## Why Ambiguous is the system of record

`data/state.json` is a cache for the console's live view, rebuilt every run. The durable facts (an usher's verified event history, the offer thread with its idempotency key, the open confirmation and training tasks, the call sheet document) live in Ambiguous under the agent's own identity, reachable by a human (the coordinator, the agency, a judge) after the demo ends and after the local process stops. If the JSON store were lost, the CRM, Mail, Tasks and Docs in Ambiguous still describe exactly who was offered what, who verified, and who confirmed.
