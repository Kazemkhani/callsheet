# Sponsor Stack Cheat Sheet — UAE Event Staffing Coordinator Agent

Confirmed live versions (npm view, run just now):
`@openai/agents@0.18.0` · `@copilotkit/react-core@1.71.1` · `@copilotkit/react-ui@1.71.1` · `@copilotkit/runtime@1.71.1` · `exa-js@2.19.0` · `zod@4.6.2` · `@auth0/ai@6.0.2`

Note: zod is now v4 by default on npm — Agents SDK docs say it expects Zod v4 schemas, so no downgrade needed.

---

## 1. OpenAI Agents SDK (TypeScript) + OpenRouter

Install:
```bash
pnpm add @openai/agents zod openai
```

Minimal agent with tools:
```ts
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

const findUshers = tool({
  name: 'find_ushers',
  description: 'Find available ushers for an event in a UAE emirate',
  parameters: z.object({ emirate: z.string(), count: z.number() }),
  execute: async ({ emirate, count }) => `Found ${count} ushers in ${emirate}`,
});

const notifyStaff = tool({
  name: 'notify_staff',
  description: 'Send a Telegram message to a staff member',
  parameters: z.object({ chatId: z.string(), message: z.string() }),
  execute: async ({ chatId, message }) => {
    // call sendMessage helper (see section 5)
    return `sent to ${chatId}`;
  },
});

const agent = new Agent({
  name: 'Staffing Coordinator',
  instructions: 'You coordinate event staffing for UAE events.',
  tools: [findUshers, notifyStaff],
});

const result = await run(agent, 'Staff 5 ushers for the Dubai expo this Friday');
console.log(result.finalOutput);
```

Streaming:
```ts
const stream = await run(agent, 'Staff the event', { stream: true });
stream.toTextStream({ compatibleWithNodeStreams: true }).pipe(process.stdout);
// or: for await (const event of stream) { ... }
```

### OpenRouter integration — verdict: works, with caveats. Do it.
OpenRouter only speaks the Chat Completions format, not OpenAI's Responses API. The Agents SDK defaults to Responses API, so you must force Chat Completions mode. Cleanest path (global default client):

```ts
import { Agent, run, setDefaultOpenAIClient, setOpenAIAPI, setTracingDisabled } from '@openai/agents';
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});
setDefaultOpenAIClient(client);
setOpenAIAPI('chat_completions'); // OpenRouter doesn't support the Responses API
setTracingDisabled(true); // you have no OpenAI key, tracing export would fail/error

const agent = new Agent({
  name: 'Staffing Coordinator',
  model: 'openai/gpt-4.1-mini', // OpenRouter model slug
  instructions: '...',
});
```

If you need to mix providers (some calls direct OpenAI, some OpenRouter) instead of a global default, use a custom `ModelProvider` + `OpenAIChatCompletionsModel(client, modelName)` passed per-Runner — see `github.com/openai/openai-agents-js` `examples/model-providers/custom-example-provider.ts`. For a 70-minute build, **use the global setDefaultOpenAIClient approach above** — it's 4 lines and works with all your existing `Agent`/`tool()` code unchanged.

Fallback if OpenRouter tool-calling misbehaves under time pressure: call OpenAI directly (`OPENAI_API_KEY`, no client override) — zero risk, same code otherwise.

---

## 2. CopilotKit in Next.js App Router (targeting "Best Use of CopilotKit")

Install:
```bash
pnpm add @copilotkit/react-core @copilotkit/react-ui @copilotkit/runtime openai
```

Runtime route — `app/api/copilotkit/route.ts` (this is the stable v1.x pattern matching the installed 1.71.1):
```ts
import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const serviceAdapter = new OpenAIAdapter({ openai });
const runtime = new CopilotRuntime();

export const POST = async (req: Request) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });
  return handleRequest(req);
};
```

Provider + Sidebar — wrap layout/page (client component):
```tsx
'use client';
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <CopilotSidebar defaultOpen labels={{ title: 'Staffing Coordinator' }}>
        {children}
      </CopilotSidebar>
    </CopilotKit>
  );
}
```

Generative UI in chat — `useCopilotAction` with `render`, renders a roster card component instead of plain text:
```tsx
'use client';
import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';

useCopilotReadable({
  description: 'Current event roster',
  value: roster, // your app state array
});

useCopilotAction({
  name: 'showRoster',
  description: 'Display the staffing roster as cards',
  parameters: [{ name: 'ushers', type: 'object[]', description: 'list of ushers assigned' }],
  render: ({ args }) => (
    <div className="grid gap-2">
      {args.ushers?.map((u: any) => (
        <div key={u.name} className="rounded border p-2">{u.name} — {u.role}</div>
      ))}
    </div>
  ),
  handler: async ({ ushers }) => `Rendered ${ushers.length} ushers`,
});
```

Note: there is also a newer `@copilotkit/runtime/v2` API (`CopilotRuntime` + `InMemoryAgentRunner` + `createCopilotRuntimeHandler`) shown in current docs for agent-native/AG-UI setups — skip it, it's a different mental model and not worth the risk with your remaining time. The `OpenAIAdapter` pattern above is the fast, proven path for a chat+actions demo.

### CopilotKit Channels (Slack/Teams) — verdict: SKIP
Real product (`@copilotkit/channels`, current version ships `0.6.1`), lets one agent run natively in Slack/Teams/Discord/Telegram via managed or direct adapters. Requires provisioning a CopilotKit Intelligence connection or your own provider socket/webhook — not a 1-hour add-on. Stick to the in-app CopilotSidebar for the demo; mention Channels verbally as "roadmap" if judges ask.

---

## 3. Exa API (`exa-js`)

Install:
```bash
pnpm add exa-js
```
Client:
```ts
import Exa from 'exa-js';
const exa = new Exa(process.env.EXA_API_KEY);
```

(a) Research an event by name → venue/dates/attendance:
```ts
const { answer, citations } = await exa.answer(
  'What venue, dates, and expected attendance does the GITEX Global 2026 Dubai event have?'
);
```
Or with more control (raw sources to parse yourself):
```ts
const r = await exa.search('GITEX Global 2026 Dubai venue dates attendance', {
  type: 'auto',
  numResults: 5,
  contents: { summary: true, text: { maxCharacters: 2000 } },
});
```

(b) Verify a person's claimed work history:
```ts
const r = await exa.search(
  '"Mubadala World Tennis Championship" ushers 2025 staff hired',
  { type: 'auto', numResults: 5, contents: { highlights: true, text: { maxCharacters: 1500 } } }
);
```

(c) Find UAE event staffing agencies hiring now:
```ts
const r = await exa.search('UAE event staffing agency hiring ushers promoters 2026', {
  type: 'auto',
  numResults: 8,
  contents: { text: { maxCharacters: 1000 } },
});
```

`findSimilar` (find agencies/events similar to a known URL):
```ts
const r = await exa.findSimilar('https://example-staffing-agency.ae', { numResults: 5 });
```

`answer` (direct Q&A with citations, fastest for a demo):
```ts
const { answer, citations } = await exa.answer('Best UAE staffing agencies for large expo events');
```

Research/Websets (async, multi-step, structured output) — real product at `https://api.exa.ai/websets/v0`, `exa.websets.create({ search: { query }, enrichments: [...] })` then poll — **too slow for live-demo latency (results stream in over time)**. Skip websets; use `search`/`answer` for anything shown live on stage.

---

## 4. Auth0 for AI Agents — verdict: SKIP (unless you have 30+ spare minutes)
- Real, current feature: **async authorization via CIBA** — agent requests user approval via push/SMS/email without blocking the session; **Token Vault** stores/exchanges tokens the agent uses to call downstream APIs on the user's behalf.
- Quickstart exists: `https://auth0.com/ai/docs/get-started/asynchronous-authorization` (LangGraph.js + Next.js or Vercel AI SDK + Next.js sample apps — clone from `auth0-samples/auth0-ai-samples`, path `asynchronous-authorization/vercel-ai-next-js`).
- Needs: an Auth0 tenant, a CIBA-enabled application, a configured push/guardian setup — non-trivial provisioning under a hackathon clock.
- If you want a token-effort integration to legitimately claim the sponsor: install `@auth0/ai` (v6.0.2) and stub a single "approve high-cost booking" CIBA call using their sample repo as scaffolding, rather than building from scratch. Otherwise skip and say so in your pitch.

---

## 5. Telegram Bot API (no library, `fetch` only)

```ts
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE = `https://api.telegram.org/bot${TOKEN}`;

async function sendMessage(chatId: string | number, text: string) {
  const res = await fetch(`${BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
  return res.json();
}

// Simple polling (fine for a hackathon demo; use webhook for prod)
async function getUpdates(offset?: number) {
  const url = new URL(`${BASE}/getUpdates`);
  if (offset) url.searchParams.set('offset', String(offset));
  const res = await fetch(url);
  return (await res.json()).result; // array of updates
}
```
Webhook alternative (better with a Next.js route handler): set with
`POST ${BASE}/setWebhook?url=https://yourapp.com/api/telegram/webhook`, then handle `POST` in that route the same way as any Next.js route handler.

---

## 6. Gotchas

- **Next.js 15 route handler streaming**: return a `Response` wrapping a `ReadableStream` (SSE-style) or use `stream.toTextStream()` piped into a `TransformStream`; App Router route handlers support streaming natively, no extra config, but you must NOT `await` the whole body before returning — return the `Response(stream)` immediately. Add `export const runtime = 'nodejs'` if you use Node-only APIs (the OpenAI/Agents SDK needs Node, not edge).
- **Fetch timeouts**: Node's global `fetch` (undici) has no request timeout by default — a hung OpenRouter/Exa call can hang your whole demo. Wrap calls with `AbortSignal.timeout(10_000)` on every external fetch (Telegram, Exa raw calls, OpenRouter) as a safety net.
- **OpenRouter + Agents SDK tracing**: if you don't call `setTracingDisabled(true)`, the SDK will try to export traces to OpenAI's platform using your (nonexistent/invalid) OpenAI key and log noisy errors — harmless but ugly on stage, disable it.
- **CopilotKit + Agents SDK together**: don't run two separate LLM loops fighting for the same UI — either let CopilotKit's `OpenAIAdapter` drive the whole conversation and call your Agents-SDK agent as a `useCopilotAction` handler (agent-as-tool pattern), or keep them as two separate demo surfaces. The action-handler approach is the one worth showing judges since it's genuinely both sponsors working together.
- **zod version**: Agents SDK wants Zod v4 (installed `zod@4.6.2` is fine); CopilotKit's `parameters` array format (not full zod schema) sidesteps zod version conflicts entirely, so no cross-library breakage expected.
