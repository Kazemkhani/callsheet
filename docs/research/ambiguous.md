# Ambiguous AI — integration brief (verified 2026-09-12)

## 1. What it actually is

Ambiguous is a **full productivity workspace (17 apps) where every feature has both a human UI and an
agent endpoint**. Docs, Sheets, Slides, Wiki, Mail, Chat, Forms, Sign, Tasks, Calendar, CRM, Drive,
Identity, Admin, Automations. The pitch: "Each agent has its own identity and works in the same apps
and on the same data as the rest of your team. You can send it an email, message it in chat, assign it
a task, or @mention it in a comment." Teams of up to five get all 17 apps free.
Sources: https://ambiguous.ai/llms.txt · https://www.ambiguous.ai/

**This is not a toy.** The live OpenAPI spec has **939 paths**; the CLI catalog exposes **952 commands
across 40 modules** (verified by running it). Your agent is a first-class workspace member with its own
mailbox and email address, not a bot calling an API.

> **NAME COLLISION — do not mix these up.** `ambiguous.**io**` is a *different* product ("AI Coworkers"
> that provision a Google Workspace account). The hackathon sponsor is `ambiguous.**ai**`. Use `.ai`.

## 2. Auth — fastest path (~60 seconds)

**No hackathon-specific signup page was found.** The generic free tier is the path. Two options:

**A. Agent self-signup (FASTEST — one command, no browser):**
```bash
npx ambiguous@latest auth signup \
  --name "Usher Ops Agent" \
  --workspace-name "UAE Event Staffing" \
  --human-email "novalabshq@gmail.com"
```
Creates the workspace + agent identity and **writes the API key to `./.ambi/config.json` automatically**.
The agent works IMMEDIATELY; the human email claim only unlocks invites/billing/extra agents.
If `human.claim_token_sent: false`, ignore it and carry on — the credential is still valid.

**B. Already have a key:** `npx ambiguous@latest auth login --token ak_xxxx`

Verify either with: `npx ambiguous@latest whoami --json`
Token precedence: `AMBI_API_TOKEN` env > nearest `./.ambi/config.json` > `~/.ambi/config.json`.

**Zero-auth sandbox** (tasks CRUD only, synthetic data, 1hr): `POST https://app.ambiguous.ai/sandbox/session`
→ returns `sb_` bearer. Docs: https://www.ambiguous.ai/sandbox.md. Mail/CRM/MCP NOT in sandbox — so for
this build, sign up properly.

Full auth doc: https://www.ambiguous.ai/auth.md

## 3. Integration surfaces (all four exist)

| Surface | How | Notes |
|---|---|---|
| **CLI** | `npx ambiguous@latest <module> <cmd>` | Best for a hackathon. Dynamic shell over the live OpenAPI — every endpoint is a subcommand. Guide: https://www.ambiguous.ai/skill |
| **MCP** | `https://app.ambiguous.ai/mcp` — Streamable HTTP + OAuth | Guide: https://www.ambiguous.ai/agents/mcp |
| **REST** | `https://app.ambiguous.ai/api/...`, `Authorization: Bearer <tok>`, `API-Version: 1` | OpenAPI 3.1: https://app.ambiguous.ai/api/openapi.json (939 paths) |
| **Plugins** | https://github.com/ambiguous-ai/plugins | Official Claude Code + Codex plugins |

**Claude Code MCP one-liner:**
```bash
claude mcp add --transport http ambiguous https://app.ambiguous.ai/mcp
```

**CLI discovery — the single most useful command:**
```bash
npx ambiguous@latest catalog          # all 952 commands
npx ambiguous@latest catalog crm      # scope to one module
```
**The one syntax rule:** a path id is the ONLY positional; every other field is a kebab-case flag.
`tasks create --title "x" --priority high`, `docs get <id>`, `tasks update <id> --status done`.
Arrays are comma-separated. Piped JSON on stdin merges over flags (use this for multiline bodies).
`--json` forces JSON output. Exit codes: 0 ok, 1 error, **2 = auth**.

## 4. Primitives (all verified present in the live catalog)

### Mail — YES, the agent has its own real mailbox and address
Receive: `mail inbox`, `mail get <id>`, `mail search`, `mail threads`, plus SES-backed delivery.
```bash
npx ambiguous@latest mail inbox --unread --detail full --json
npx ambiguous@latest mail get <id> --detail full --json     # full Markdown body + attachments
npx ambiguous@latest mail search --q "from:applicant subject:usher" --json
npx ambiguous@latest mail send --to "a@b.com" --subject "Offer: Gitex Day 1" \
  --body-markdown "You're confirmed..." --idempotency-key "offer-<usherid>-<eventid>" \
  --contact-id <crm_contact_id> --scheduled-at "2026-09-13T06:00:00Z"
```
Body is written in **Markdown and auto-converted to formatted HTML**. Killer flags:
`--contact-id` / `--deal-id` (**links the email straight onto the CRM record**), `--idempotency-key`,
`--scheduled-at`, `--in-reply-to` / `--thread-id`, `--undo-send-seconds`, `--request-read-receipt`.
Also: `mail opens <id>` gives **open-tracking events** (did the usher read the offer?),
`mail forwarding add --address`, `mail send-as`, `mail drafts create|update|send`, `mail bulk`.

### CRM — contacts, companies, deals, pipelines, activities, lead scoring
```bash
npx ambiguous@latest crm contacts create --type person --name "Aisha K" \
  --email a@x.com --phone "+9715..." --lifecycle-stage lead --title "Usher"
npx ambiguous@latest crm contacts list --q "arabic" --lifecycle-stage lead --json
npx ambiguous@latest crm activities create --type call --contact-id <id> --subject "Screening call"
npx ambiguous@latest crm deals create --title "Gitex 2026 — 40 ushers" --amount 120000 --currency AED
npx ambiguous@latest crm contacts score <id>     # lead score + which rules matched
npx ambiguous@latest crm contacts import         # CSV multipart import
```
Contacts support **custom properties**, `--company-id`, contact-groups, merge, bulk-update, bulk-export.

### Tasks
```bash
npx ambiguous@latest tasks create --title "Confirm Aisha for Gitex Day 1" \
  --status todo --priority high --assignee-id <userid> --due-date 2026-09-14 --project-id <pid>
npx ambiguous@latest tasks update <id> --status done
npx ambiguous@latest tasks list --assignee-id <id> --status todo --json
npx ambiguous@latest tasks workload --capacity-hours 8   # aggregates by assignee — REAL rostering value
```
Also subtasks, `tasks by-key WS-123`, archive, analytics/burndown, attachments from Drive.

### Docs / Sheets / Slides
```bash
npx ambiguous@latest docs create --type doc --title "Gitex Roster v1" --content "..."
npx ambiguous@latest docs share-invite <id> --email client@x.com --role viewer
npx ambiguous@latest sheets create --title "Roster" --content @roster.json
npx ambiguous@latest sheets cells update <id> --updates @cells.json
npx ambiguous@latest sheets charts create <id> --type bar --title "Fill rate" --data-range @r.json
npx ambiguous@latest docs export <id> --format pdf
```

### Calendar, Chat, Forms, Sign, Drive
- `calendar events list --start ... --end ...` / create — shift scheduling.
- `chat messages send <channel-id> --content "..."`, `chat reactions add <ch> <msg> --emoji 👀`.
- **`forms create ... && forms publish <id>`** → a **public URL** accepting responses, with
  `forms responses list <id> --submitted-after ...` and per-field analytics. This is your applicant
  intake form with zero frontend work.
- **`sign`** module exists — e-signature for staffing contracts (commands not enumerated; run `catalog sign`).
- `drive` — CV file storage, attachable to tasks.

### Agents / Coworkers
`coworkers list`, `coworkers dispatch <id> --event ... --payload ... --playbook <id> --idempotency-key`,
`coworkers playbooks create <id> --title --objective --instructions --subtasks --trigger-types`.
`agents api-keys create <id> --name` mints scoped keys. Multi-agent orchestration is native.

## 5. Events / webhooks / triggers — three mechanisms

1. **`notifications watch`** — streams JSON lines for @mentions, DMs, task assignments, doc shares.
   Replays unread on every connect. **In Claude Code, arm it with `Monitor`** (from the official guide):
   ```
   Monitor({ command: "npx ambiguous@latest notifications watch", description: "Ambiguous events", persistent: true })
   ```
   Or `npx ambiguous@latest notifications setup claude --session <uuid>` to auto-wire it.
   **Critical protocol:** `notifications mark-read <id>` immediately before acting, and **act only if
   `was_unread: true`** — otherwise two listeners double-process one DM. Marking read removes it from replay.
2. **Webhooks** — `webhooks create --url <your-endpoint> --events <csv>`, `webhooks event-types`
   (includes a `*` wildcard), plus `webhooks/{id}/deliveries`, `rotate-secret`, `revoke-previous-secret`.
3. **Automations** — a full n8n-style workflow engine: `automations create --name --workflow @wf.json`,
   node types = "ten hand-coded primitives (5 triggers + 5 DAG-control) plus every registered route
   carrying `x-tool.expose`". So **almost every API route is usable as an automation action node**.
   `automations import --source n8n` imports n8n workflows directly. `automations test <id> --payload`
   dry-runs with action nodes stubbed. Run headlessly: `POST /api/automations/{id}/runs` → 202 with
   `run_id` + `status_url`; poll until success/filtered/failed/cancelled/depth_exceeded.

## 6. Rate limits & gotchas

- 429 returns `RateLimit`, `RateLimit-Policy`, `Retry-After` headers — honour them. No fixed public number.
- Mail sends accept `Idempotency-Key` (≤255 chars); conflicting payloads on a reused key → **409**.
- Send `API-Version: 1`; unsupported version → 400.
- **Exit code 0 is not proof the change happened** — the guide says so explicitly; check the response body.
- **A task with no `project_id` is private to creator+assignee.** Use a project so teammates/judges can see it.
- `workspace.domain` from signup is an **email domain, not a website hostname** — don't build links from it.
  Task links are `<app origin>/tasks/<task-id>`.
- Two checkouts = two identities; `auth login` writes to `./.ambi/config.json` in the cwd.
- Sandbox: 8,192-byte requests, 120 calls/min/IP, 10 sessions/hr/IP, 100 records, 1hr expiry, tasks only.
- Free tier = teams up to 5.
- **No MCP push wakes your agent** — the protocol's server→client messages reach the client but none
  starts a model turn. Use `notifications watch` + Monitor, or webhooks.

## 7. Three ideas to make Ambiguous the CORE of the usher-ops agent

**Idea 1 — "The agent with its own inbox" (the demo that wins the ambiguity prize).**
The agent has a REAL email address. Have ushers apply by emailing `usher-ops@<workspace domain>` with a
CV attached. `notifications watch` + Monitor wakes the Claude session on arrival → `mail get --detail full`
pulls the Markdown body + attachment → the model parses the CV (languages, height, Gitex experience, visa
status) → `crm contacts create` with custom properties + `crm contacts score` → `mail send --in-reply-to
--contact-id` replies in-thread and logs the reply onto the CRM record automatically. **Nothing is
simulated** — a judge can email the agent from their phone and watch a CRM contact appear on screen.
This is the single strongest "ambiguous input → structured workspace state" story available.

**Idea 2 — Roster as a live Sheet + fill-rate chart, offers as tracked mail, confirmations as tasks.**
`sheets create` the roster (columns: usher, shift, venue, language, status). For each open slot the agent
`mail send`s an offer with `--idempotency-key "offer-<usher>-<shift>"` (safe to retry on stage) and
`--scheduled-at` for a 06:00 Dubai send. Then `mail opens <id>` shows who READ the offer but didn't reply
— the agent chases only those. Each acceptance becomes `tasks create --assignee-id --due-date` and flips a
`sheets cells update`. Finish with `sheets charts create --type bar` for fill-rate and `tasks workload
--capacity-hours` to prove nobody is double-booked. **`tasks workload` is a genuine rostering primitive
most teams won't find** — it turns a demo into an ops tool.

**Idea 3 — Forms intake + Automations + Sign, so the whole loop runs with no code you wrote.**
`forms create` the applicant form (with `show_if` conditional fields for visa/language) → `forms publish`
gives a public URL instantly: that's your applicant-facing frontend, free. An `automations create` workflow
triggers on submission and chains `create_task` + `send_email` action nodes (remember: every route with
`x-tool.expose` is an available node), and `automations import --source n8n` means you can paste an
existing n8n flow. For the close, the **`sign`** module sends the staffing contract for e-signature.
Pitch line: "one agent identity runs intake → screening → roster → offer → contract, inside one workspace,
and a human can take over any single step because it's all in normal apps."

**Why this wins "Best Use of Ambiguous AI":** the prize rewards *giving your agent a workspace*. Most teams
will call two REST endpoints. Ideas 1+2 use the agent's own **email identity**, the **event stream**, the
**CRM**, **Sheets**, and **Tasks** as one coherent operating surface — which is exactly the product thesis
in their llms.txt ("send it an email, message it in chat, assign it a task").

## 8. STALENESS / UNVERIFIED FLAGS

- **NOT VERIFIED — the exact webhook event names.** `GET /api/webhooks/event-types` returned
  `401 unauthorized`. Run `npx ambiguous@latest webhooks event-types` right after signup.
- **NOT VERIFIED — the 5 automation trigger node types.** `GET /api/automations/node-types` also 401'd.
  I could NOT confirm an "on new email received" trigger exists as an automation node. The `notifications
  watch` stream IS confirmed and is the reliable email-wake path — build on that, not on an assumed trigger.
  Verify with `npx ambiguous@latest automations node-types list`.
- **NOT VERIFIED — no hackathon-specific signup/promo URL found.** Searched Exa; only the generic free tier
  surfaced. The three link titles in the hackathon resources page map to:
  getting-started → https://www.ambiguous.ai/ , agent-readable developer guide → https://ambiguous.ai/llms.txt ,
  CLI setup guide → https://www.ambiguous.ai/skill . **Ask the sponsor rep on-site for a hackathon tier/code.**
- **NOT VERIFIED — the `sign` and `calendar` exact flags.** Modules confirmed present in the catalog; I did
  not enumerate their commands. Run `npx ambiguous@latest catalog sign` / `catalog calendar`.
- **NOT VERIFIED — numeric rate limits** for the production API (only sandbox limits are published).
- **NOT RUN — `auth signup`.** I deliberately did not create a workspace in Amir's name. That is action #1.
- Raw evidence saved: `scratchpad/hack/raw/{llms.txt,skill.txt,auth.md.txt,sandbox.md.txt,catalog.txt}`
  (`catalog.txt` = all 952 commands, grep it rather than re-fetching).
