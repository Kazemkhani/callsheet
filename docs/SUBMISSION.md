# Callsheet submission

## Project name
Callsheet

## Tagline (under 12 words)
An AI staffing coordinator that lives inside the crew channel.

## Description (150–200 words)
Event agencies in the UAE staff crews through one-way broadcast posts: Liveforce, WhatsApp, group chats where staff read but cannot reply. Ushers apply to four or five agencies at once, wait weeks for an interview, and are usually placed through personal connections rather than verified experience.

Callsheet is an AI staffing coordinator that lives inside the same crew channel agencies already run, on Slack, and keeps its own office in Ambiguous: an inbox, a CRM, tasks and a call sheet document. A coordinator posts a plain-English request. Callsheet researches the event with Exa, correcting mistakes in the brief (ADNOC Centre becomes ADNEC), searches its CRM for ushers by skill and city, and verifies their claimed event history actually happened before granting a badge. It builds a roster that reserves 10 percent of every area for first-timers, waits for the coordinator's approval, then sends each usher a complete offer by Telegram. Replies stream back, confirming, waitlisting or promoting in real time, while the call sheet and training tasks update in Ambiguous automatically. Nothing is sent before a human approves it.

## Environment chosen
Slack (coordinator) + Telegram (ushers) + the agent's own workspace in Ambiguous (inbox, CRM, tasks, docs).

## Sponsor tools used

- **Ambiguous**: the agent's own office. CRM for usher contacts and verified badges, Tasks for open slots, confirmations and training reminders, Mail for offers sent from the agent's own address, and a Doc for the live call sheet.
- **Exa**: resolves and corrects the event brief (`research_event`) and checks that a claimed past event actually happened (`verify_experience`).
- **OpenAI Agents SDK (TypeScript)**: runs the tool-calling agent loop end to end.
- **OpenRouter**: fallback model routing if the primary OpenAI key or model is unavailable.
- **Slack (Bolt, Socket Mode)**: the coordinator's console. The `/staff` command, the approval button, the event log.
- **Telegram (Bot API)**: the usher's console: the offer DM and the yes/no reply.

Not used: Auth0 and CopilotKit Channels were scoped and cut for time.

## What is working end to end
Slack request → Exa event research and correction → CRM search against seeded ushers → experience verification → fair roster build (10 percent first-timer reservation, waitlist) → Slack approval gate → Telegram offer send → reply handling (confirm / decline / waitlist promotion) → call sheet and tasks updated in Ambiguous. Every external call has an explicit timeout, and failures are surfaced in the event log rather than swallowed.

## Team
Amir Hossein Kazemkhani, Omar Tageldin.

## Repo URL
https://github.com/Kazemkhani/callsheet

## Video URL
[add after upload]
