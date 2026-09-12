# Ambiguous as the agent's office

Callsheet does not call Ambiguous. Callsheet lives there.

The reasoning loop runs in this repository, on the OpenAI Agents SDK. Everything the agent owns, its identity, its correspondence, its records, its open work and its documents, lives in an Ambiguous workspace under its own name. If this process is killed, the run is still fully legible to a human who has never seen the code.

## The identity

```bash
npx ambiguous@latest auth signup --name "Callsheet" \
  --workspace-name "Callsheet Crew" --human-email novalabshq@gmail.com
```

That one command creates a coworker of type `agent`, status `ACTIVE`, inside the workspace "Callsheet Crew", and writes the key to `./.ambi/config.json`. The agent gets a real mailbox:

```
callsheet@callsheet-workspace.ambi.cc
```

This matters more than it looks. An offer that arrives from a named colleague with a mailbox is a different object from a notification emitted by a script. It can be replied to, forwarded, searched, and filed against a person. The agent is a member of staff with a desk, not an integration.

Everything below is plain REST from [lib/integrations/ambiguous.ts](../lib/integrations/ambiguous.ts). Every request carries:

```
Authorization: Bearer <token>
API-Version: 1
Content-Type: application/json
```

and an `AbortSignal.timeout(8000)`. Bodies are snake_case, which is the same shape the CLI's kebab-case flags map onto, so anything here can be reproduced from a terminal.

## Projects

```http
GET  /api/projects?limit=100
POST /api/projects
{ "name": "AI Everything Summit 2026 staffing",
  "description": "Callsheet agent staffing run",
  "visibility": "workspace" }
```

`ensureProject()` looks for the project by name before creating it, so a re-run on stage does not leave two identical projects behind.

## CRM contacts

```http
POST /api/crm/contacts
{ "type": "person", "name": "Omar Tageldin", "email": "...", "phone": "...",
  "title": "Event usher", "lifecycle_stage": "lead",
  "custom_properties": {
    "callsheet_usher_id": "u-omar",
    "city": "Dubai",
    "skills": "stage, vip hosting",
    "languages": "English, Arabic",
    "years_experience": 3,
    "rating": 4.8,
    "reliability": 0.94,
    "verified_events": "Mubadala World Tennis Championship | ...",
    "claimed_events": "...",
    "telegram_chat_id": ""
  } }
```

`upsertContact()` searches by email first (`GET /api/crm/contacts?q=<email>`) and PATCHes rather than creating a duplicate, falling back to PUT if the API answers 404 or 405 on PATCH. The seed script writes 24 ushers this way. `search_crew` then reads the CRM, so the roster is built from workspace data rather than from a file in the repository.

The split between `claimed_events` and `verified_events` is the anti-wasta mechanism made visible on the record itself. A claim is what the usher said. A verified event is what Exa found. A human can see both and disagree with us.

## Tasks

```http
POST /api/tasks
{ "title": "Confirm Omar Tageldin for Stage", "description": "...",
  "status": "todo", "priority": "high", "due_date": "2026-10-05",
  "project_id": "115c3118-07c9-46ab-b278-bafc79bfd9ff",
  "contact_id": "<crm contact id>" }
```

### Why `project_id` is not optional

A task created without a project in Ambiguous is private to its creator and its assignee. An agent that creates private tasks produces work nobody can see, which is the opposite of the point. So `createTask()` sets `project_id` on every task, and then refuses the response if the project did not come back on the created object:

```ts
if (!task.project_id && !task.projectId) {
  throw new AmbiguousError(
    `Ambiguous: task ${id} came back without project_id, it would stay private`, 200, ...);
}
```

The status code is not the proof. The body is the proof. This is checked by the test "refuses a task that came back without a project, because it would stay private".

Two kinds of task exist in a run. One confirmation task per offer that actually went out, created immediately after the human gate. One training reminder task per usher who confirms, created on their reply. The training task id is stored back on the offer (`ambiguousTrainingTaskId`), which is what makes a repeated yes free of side effects.

## Mail

```http
POST /api/mail/send
Idempotency-Key: offer-u-omar-ai-everything-2026
{ "to": ["..."], "subject": "AI Everything Summit 2026: Stage, 6 to 7 Oct",
  "body_markdown": "...", "contact_id": "<crm contact id>",
  "idempotency_key": "offer-u-omar-ai-everything-2026" }
```

Two flags carry the weight.

`contact_id` links the sent email onto the usher's CRM record. The coordinator opens the contact and sees the offer that was made, with its terms, without leaving the CRM. Nothing has to be copied anywhere.

`Idempotency-Key` is sent both as a header and in the body, and is derived from the usher id and the event id, so it is stable across restarts rather than random per process.

### Why idempotency keys matter on stage

A live demo is a retry machine. The Wi-Fi drops mid-send. A judge asks to see it again. Someone refreshes the console. Without a stable key, each of those is a second offer landing in a real person's inbox with the same shift on it, and an agency's reputation is the product.

With a stable key, the second attempt returns 409, and `sendMail()` treats 409 as success:

```ts
if (err instanceof AmbiguousError && err.status === 409) {
  return { mailId: `idempotent:${input.idempotencyKey}`, reused: true };
}
```

The same reasoning runs through the reply path. `recordReply()` checks the offer's settled status before acting, so a duplicate yes logs "already confirmed, duplicate yes ignored" and creates no second training task, and a duplicate no does not promote two people off one waitlist slot. Three tests cover it in [lib/agent/reply.test.ts](../lib/agent/reply.test.ts).

## Rate limits

```ts
if (res.status === 429 && retryOn429) {
  const wait = Number(res.headers.get("Retry-After") ?? "2");
  await new Promise((r) => setTimeout(r, Math.min(10, Math.max(1, wait)) * 1000));
  return request<T>(route, { ...opts, retryOn429: false });
}
```

`Retry-After` is honoured once, clamped between one and ten seconds so a hostile header cannot stall a demo, and then the error is surfaced. It never loops. Covered by "honours Retry-After once on a 429".

## Documents

```http
POST  /api/documents   { "type": "doc", "title": "Call sheet: ...", "content": "<markdown>", "visibility": "workspace" }
PATCH /api/documents/<id>  { "title": "...", "content": "<markdown>" }
```

The call sheet is created on the first confirmation and rewritten in place afterwards, so the document URL stays constant while the content tracks reality. The human URL is built from the workspace slug read from `GET /api/workspace`, giving `https://app.ambiguous.ai/<slug>/documents/<id>`, which is a link a coordinator can open. The markdown is rendered by [lib/agent/callsheet.ts](../lib/agent/callsheet.ts): areas, names, positions, verification status, training time, and who is still on the waitlist.

## What "the agent's office" means for auditability

After the demo ends and the dev server is stopped, a person with no access to this repository can open the workspace and reconstruct the entire run:

- The CRM says who was considered, what they claimed, and what was independently verified.
- Each contact record carries the offer email that was actually sent to that person, with its terms.
- The project's task board says who was asked to confirm, who confirmed, and who owes a training session.
- The document says who is working which area on the day.

`data/state.json` in this repository is a cache for the console's one second poll. The workspace is the system of record. That asymmetry is deliberate: an agent that makes commitments to real people on real money should leave its evidence somewhere a human already knows how to read.

## Not used yet, and honestly so

- **Notifications watch.** The wake mechanism. An usher emails the agent, `notifications watch` streams the event, the agent reads the mail, parses the CV and creates a CRM contact without anyone running a command. This is the single biggest upgrade available and it is not built.
- **Forms.** `forms create` and `forms publish` give a public applicant intake URL with no frontend work. Omar's real complaint is applying four times to four agencies. One published form is the answer to it.
- **Automations.** The workflow engine, for the parts of the loop that need no model: chase an offer that was opened and not answered, close the confirmation task when the reply lands.
- **Sign** for the staffing contract, and **Sheets** for a live roster with a fill rate chart.

We used four primitives properly rather than nine badly. The four we used are the four the run depends on.
