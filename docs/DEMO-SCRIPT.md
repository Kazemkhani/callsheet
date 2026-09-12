# Callsheet demo script (2:00)

Judging criteria referenced in the Criterion column: **Core** = Core Requirements & Functionality, **Innovation** = Innovation & Theme Alignment, **Technical** = Technical Execution & Integration, **Usefulness** = Usefulness & Agentic Experience.

## Shot list

| Time | On screen | Voiceover | Window / device | Pre-staged | Criterion |
|---|---|---|---|---|---|
| 0:00–0:12 | Motion-graphic opener (pre-rendered `opener.mp4`) | "Four agencies. Four profiles. One month waiting for an interview." / "Job posts you can't reply to." / "Hired by who you know, not what you've done." / "Meet Callsheet. The staffing coordinator that lives in your crew's group chat, and runs its own office." | N/A, video file | `opener.mp4` rendered and playable, volume checked | Innovation |
| 0:12–0:18 | Slack, `#staffing` channel | "This is the crew channel the agency already runs, on Slack." | Slack desktop app | Slack window focused on `#staffing`, zoomed for legibility, notification badges cleared | Usefulness |
| 0:18–0:25 | Ambiguous workspace: inbox tab, then CRM tab | "And this is Callsheet's own office, in Ambiguous: its inbox, its CRM, its tasks, its call sheet. No separate app to check, no separate login for the crew." | Browser, `app.ambiguous.ai` | Logged in as the agent's identity; inbox and CRM tabs open in order; agent email `callsheet@callsheet-workspace.ambi.cc` visible | Innovation, Usefulness |
| 0:25–0:35 | Slack, `/staff` request typed and sent | "The coordinator posts a plain request: sixty ushers, two days, six areas, for the AI Everything Summit." | Slack | Request text ready to paste or type live; channel scrolled to bottom | Core |
| 0:35–0:50 | Slack thread, agent event log: `research_event` running, venue correction appears | "Callsheet researches the event with Exa, and corrects a mistake in the brief: the venue is ADNEC, not ADNOC Centre." | Slack thread | Run started early enough that this step resolves on cue; brief pre-loaded with "ADNOC Centre" | Technical, Innovation |
| 0:50–1:00 | Split: Slack thread (`search_crew`, `verify_experience`) + Ambiguous CRM (verified badges) | "It searches its own CRM for ushers with the right skills, and verifies their claimed experience actually happened, not just claimed." | Slack + browser (CRM tab) | Seeded ushers, including Omar, already carry `pastEvents`; CRM tab pinned on his contact record | Technical, Innovation |
| 1:00–1:05 | Slack, roster summary + fairness note + Approve button | "Ten per cent of every area is held for first-timers, so newcomers get a real chance. One tap approves it. That is the human gate: nothing is sent until a person says go." | Slack | Approve button visible, cursor hovering, click on cue | Usefulness |
| 1:05–1:15 | iPhone screen: Telegram DM with full offer card | "Omar gets the whole offer on Telegram: dates, hours, rate, training, transport, and the exact position he is matched to." | iPhone, mirrored via QuickTime USB | Phone paired, unlocked, Telegram foregrounded, notification not yet delivered | Usefulness |
| 1:15–1:25 | iPhone: Omar taps "I'm in" | "He taps 'I'm in'. That is the entire application process." | iPhone, mirrored | Same device; tap rehearsed once beforehand | Core |
| 1:25–1:35 | Ambiguous: call sheet doc updates, training task appears | "In Ambiguous, the call sheet fills in against his name, and a training reminder task is created, automatically." | Browser, Docs tab then Tasks tab | Call sheet doc open in one tab, Tasks board in an adjacent tab or split window | Technical, Usefulness |
| 1:35–1:44 | Coordinator console, fill meter climbing | "Twenty-four more replies land in the following minutes, and the fill meter climbs toward sixty of sixty." | Browser, `localhost:3000` | Meter reset to a partial state beforehand; batch of simulated replies queued to fire on cue | Core, Technical |
| 1:44–1:50 | Console: a decline promotes the waitlist; quick cut to an architecture card | "A decline promotes the next name off the waitlist, in the same second. And if a channel goes down, Callsheet does not fail silently: it queues the offer and says so, in the log." | Browser + architecture still | One scripted "no" reply ready to fire; architecture still image ready to cut to | Core, Technical |
| 1:50–2:00 | Wordmark + repo URL | "Sixty ushers, placed on verified experience, in minutes, not by wasta over weeks. Callsheet." | Title card | Closing card rendered with the correct repo URL | Innovation |

## Voiceover script (full, for 1:48 of narration from 0:12 to 2:00)

This is the crew channel the agency already runs, on Slack. And this is Callsheet's own office, in Ambiguous: its inbox, its CRM, its tasks, its call sheet. No separate app to check, no separate login for the crew.

The coordinator posts a plain request: sixty ushers, two days, six areas, for the AI Everything Summit.

Callsheet researches the event with Exa, and corrects a mistake in the brief: the venue is ADNEC, not ADNOC Centre.

It searches its own CRM for ushers with the right skills, and verifies their claimed experience actually happened, not just claimed.

Ten per cent of every area is held for first-timers, so newcomers get a real chance. One tap from the coordinator approves the roster. That is the human gate: nothing is sent, on Telegram or by email, until a person says go.

Omar gets the whole offer on Telegram: dates, hours, rate, training, transport, and the exact position he is matched to.

He taps "I'm in". That is the entire application process.

In Ambiguous, the call sheet fills in against his name, and a training reminder task is created, automatically.

Twenty-four more replies land in the following minutes, and the fill meter climbs toward sixty of sixty.

A decline promotes the next name off the waitlist, in the same second. And if a channel goes down, Callsheet does not fail silently: it queues the offer and says so, in the log.

Every step ran through one agent, in the channel the crew already uses, keeping its own paperwork in order the whole time.

Sixty ushers, placed on verified experience, in minutes, not by wasta over weeks.

Callsheet.

## Pre-flight checklist

- [ ] `pnpm dev` running, `localhost:3000` loads the coordinator console
- [ ] `scripts/slack-worker.ts` running and connected (Socket Mode "app started" in its log)
- [ ] `scripts/telegram-poll.ts` running and polling
- [ ] Omar's phone paired via QuickTime USB mirroring, unlocked, Telegram foregrounded, sound on
- [ ] Ambiguous tabs open and logged in as the agent: inbox, CRM, the call sheet Doc, Tasks board
- [ ] `data/state.json` reset to idle and Slack `#staffing` cleared of prior test runs
- [ ] `opener.mp4` rendered and plays cleanly at full volume
- [ ] Narration recorded (or live mic checked) against the script above
- [ ] Screen recording set to 1920x1080, 60fps, correct display selected
- [ ] Network check: Exa, OpenAI/OpenRouter, Ambiguous and Telegram all reachable, no VPN interference
