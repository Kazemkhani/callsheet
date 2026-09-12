# On camera: the 90-second live run

Two windows: the console at http://localhost:3100/ (or http://172.18.10.253:3100/ from another laptop on the same Wi-Fi) and Omar's phone view at http://localhost:3100/u/usher-01 sized like a phone. A terminal for `scripts/demo.sh` stays off screen.

| Beat | You do | Say |
|---|---|---|
| 1 | Console open, request prefilled. | "This is the crew channel's back office. One line: sixty ushers, two days, six areas." |
| 2 | Click Run Callsheet. Watch the stepper: Research, Crew, Verify, Roster. | "It researches the event with Exa, and corrects the brief: the venue is ADNEC, not ADNOC Centre. It checks who actually worked which events." |
| 3 | Point at the brief band and the fill grid of proposed seats. | "Sixty seats proposed on verified experience. Ten per cent of every area held for first-timers." |
| 4 | Point at the approval bar. Do not click yet. | "Nothing has been sent. This is the human gate." Click Approve. |
| 5 | Switch to the phone view. | "Omar gets the whole offer: dates, hours, rate, training, transport, and his position." Tap I'm in. |
| 6 | Back to the console. Omar's seat turns confirmed; the live feed shows the training task created. | "His seat fills, and a training reminder lands in the agent's own task list in Ambiguous." |
| 7 | Off screen: `scripts/demo.sh replies 23`. Watch the meter climb. | "Replies come in. Declines promote the waitlist. The call sheet writes itself." |
| 8 | Click Open call sheet in the Workspace card. | "Callsheet is a registered coworker in Ambiguous with its own mailbox, CRM, tasks and this document." |

Before recording: `scripts/demo.sh reset` (fresh roster at the approval gate). If anything looks stale, run it again.
Honesty line if asked: the 23 replies in beat 7 are a dev simulation and the log says so.
