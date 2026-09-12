# n8n Cloud MCP Server Probe

Instance: `https://hasan-1.app.n8n.cloud/mcp-server/http` (n8n MCP Server v1.1.0)
Owner/project: "Hasan  <sales@sterk.systems>" (personal project, teamProjectsEnabled=true)
Probed read-only, 2026-09-12. No workflows created/modified/executed.

## 1. Handshake

- `initialize` with `protocolVersion: 2025-03-26` succeeded on the first try (HTTP 200, SSE `event: message` / `data: {...}` framing). No `Mcp-Session-Id` response header was ever issued — server is stateless per-request, no session header needed on follow-up calls.
- `notifications/initialized` → HTTP 202 (no body).
- `tools/list` → HTTP 200, 39 tools.

## 2. Tool inventory (39 tools)

This is n8n's full **workflow-builder** MCP surface, not a narrow task-runner. Grouped:

**Workflow lifecycle**: `search_workflows`, `get_workflow_details`, `get_workflow_history`, `get_workflow_version`, `get_workflow_versions_diff`, `create_workflow_from_code`, `update_workflow`, `publish_workflow`, `unpublish_workflow`, `archive_workflow`, `restore_workflow_version`
**Execution**: `execute_workflow` (fire-and-forget by ID), `get_workflow_execution`, `search_workflow_executions`, `test_workflow` (pin-data dry run), `prepare_workflow_pin_data`
**Build-time helpers (required-before-build per server `instructions`)**: `get_workflow_sdk_reference`, `get_workflow_best_practices`, `search_nodes`, `get_node_types`, `explore_node_resources`, `validate_workflow`, `validate_node_config`, `list_n8n_gateway_services`
**Org/data**: `list_credentials`, `search_projects`, `search_folders`, `create_folder`, `update_folder`, `move_workflows_to_folder`, `list_workflow_tags`
**Data Tables** (n8n's built-in key/value store, used heavily by the existing workflows as "memory"/"playbook" state): `search_data_tables`, `create_data_table`, `rename_data_table`, `add_data_table_column`, `delete_data_table_column`, `rename_data_table_column`, `add_data_table_rows`, `get_data_table_rows`

Input schemas are straightforward (workflowId/name/limit/query style params); full JSON saved at `research/tools_parsed.txt` if needed.

## 3. Existing workflows (read-only `search_workflows` + `get_workflow_details`)

**This is a live, shared, already-populated instance** — 4 workflows, all `active: true`:

| Workflow | Nodes | Triggers | Purpose (inferred) |
|---|---|---|---|
| **Self-Improving Multi-Channel Agent** | 39 | Webhook (`/webhook/agent-chat`), Slack Trigger (disabled), LangChain Chat Trigger, Telegram Webhook Trigger, Vapi Webhook Trigger | Multi-channel (voice/Slack/chat/Telegram/Vapi) support agent using a LangChain `agent` node + Gemini LLM + Data Table tools (`search_knowledge`, `get_playbook_rules`, `save_knowledge`) + custom tool-code nodes (`dispatch_robot_command`, `manage_calendar_events`, `run_outreach_campaign`, `share_to_slack`, `watch_youtube_video`) |
| **Autonomous Scraper & Outreach Engine** | 16 | Webhook (`/webhook/run-outreach`), Webhook (`/webhook/inbound-reply`), also callable as sub-workflow | Scrapes a target site, drafts outreach via Gemini, classifies inbound replies, logs feedback |
| **Agent Self-Improvement Engine** | 31 | Schedule (daily 02:00), Webhook (`/webhook/improve-now`), Webhook (`/webhook/get-playbook` style API), Webhook (save-memory), Webhook (log-turn), also callable as sub-workflow | Nightly (or on-demand) self-improvement loop: reads feedback/conversations, distills with Gemini, upserts "playbook rules" and "knowledge" into Data Tables |
| **Universal Robot & Hardware Webhook API** | 8 | Webhook (`/webhook/robot-action`), also callable as sub-workflow | Normalizes a hardware/robot command, checks it against Data Table "safety rules", responds — clearly a hackathon demo stub |

All four are wired together (`executeWorkflow` / `executeWorkflowTrigger` nodes cross-call each other) — this looks like one team's in-progress hackathon submission, not a blank sandbox.

## 4. Channel capability assessment

- **Telegram**: Partially wired. "Self-Improving Multi-Channel Agent" has an active `Telegram Webhook Trigger` (raw `n8n-nodes-base.webhook`, not n8n's native Telegram node) and a `Send Telegram Reply (Cloud)` **Code node** that presumably calls the Telegram Bot API directly over HTTP with a token embedded in code/env — not via a stored n8n credential (none shows up in `list_credentials`). Cannot confirm the token is live/valid without reading node code, which risks pulling a secret into this report — not done.
- **WhatsApp** (Cloud API or Twilio): **No evidence anywhere** — no credential, no node, no workflow reference.
- **Gmail / SMTP**: **No evidence anywhere** — no credential, no Gmail/SMTP node in any of the 4 workflows.
- **Slack**: Outbound only, via raw `httpRequest` nodes posting to what are almost certainly Slack Incoming Webhook URLs (no credential needed for those, hence `creds=[]`). One native `n8n-nodes-base.slackTrigger` and one native `n8n-nodes-base.slack` node exist but are both `disabled: true`.
- **Receiving webhooks**: Yes, extensively proven — 4 workflows expose 9 distinct active webhook URLs on `hasan-1.app.n8n.cloud/webhook/...`, all "no credentials required" (n8n webhooks are open URLs unless you add your own auth node).

**Credentials on the instance**: exactly **one** stored credential — `Notion account` (`notionApi`). Nothing else.

**Gateway Credits** (n8n's own managed/free-tier keys, usable with zero credential setup): `openAiApi`, `anthropicApi`, `googlePalmApi` (Gemini), `moonshotApi`, `minimaxApi`, `alibabaCloudApi`, `browserbaseApi`, `firecrawlApi`, `pdfcoApi`, `braveSearchApi`, `llamaParseApi` — i.e. LLM calls, web scraping (Firecrawl/Browserbase), search (Brave), and PDF/LlamaParse are all usable on this instance **right now with no credential setup**. This explains how "Generate Outreach with Gemini" and "Distill Improvements with Gemini" run with `creds: []`.

## 5. Verdict — fastest real use for an event-staffing agent demo (next hour)

**Fastest path: Webhook → build/send a Telegram "offer" message, cloned from the existing working pattern**, not a from-scratch integration:
1. `create_workflow_from_code` a new workflow: `Webhook trigger` (staffing app POSTs shift/offer details) → format message → a `Code` node doing the same raw Telegram Bot API `sendMessage` HTTP call as the existing "Send Telegram Reply (Cloud)" node.
2. This reuses a pattern already proven active on this instance and needs **no new n8n credential object** — but it does need the actual Telegram bot token/chat-id, which is presumably already known to whoever built "Send Telegram Reply (Cloud)". **We need the teammate to confirm/hand over that bot token** (or confirm we can point at the same bot), since it's not stored as an inspectable n8n credential.
3. LLM-assisted parts (e.g. drafting the offer text, or classifying staff replies) can ride on Gateway Credits (OpenAI/Anthropic/Gemini) with zero extra setup.

**If the demo needs WhatsApp or Gmail/SMTP specifically**: not possible as-is — **the teammate must add a credential** (Twilio or WhatsApp Cloud API for WhatsApp; a Gmail OAuth2 or SMTP credential for email) before any workflow here can use those channels. There is currently zero infrastructure for either.

**Caveat to flag to the team before building anything**: this is a **shared, already-active** n8n project with 4 live workflows and real webhook URLs/Data Tables in use (`Hasan <sales@sterk.systems>`) — not an empty scratch instance. A new workflow should be additive (its own webhook path, its own Data Table) rather than editing the existing 4, to avoid breaking whatever else is being demoed on this same account. Also noted: Cloudflare rate limit on the MCP endpoint is 100 req / window (99 remaining after ~10 calls) — worth pacing bulk calls during the hackathon.

## Raw artifacts (this session's scratchpad)
- `../probe.sh`, `../probe2.sh` .. `../probe5.sh` — the curl scripts used
- `../init_body.txt`, `../tools_body.txt`, `../search_workflows_body.txt`, `../list_credentials_body.txt`, `../wf_<id>.txt` — raw MCP responses
- `tools_parsed.txt`, `workflow_nodes.txt` — parsed summaries
