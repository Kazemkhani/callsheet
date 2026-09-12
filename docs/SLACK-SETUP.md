# Slack setup (10 minutes, once)

Callsheet runs in Slack over Socket Mode, so there is no public URL, no ngrok and no request URL
verification. One process on your laptop holds the websocket.

## 1. Create the app from the manifest

1. Open https://api.slack.com/apps?new_app=1
2. Choose **From a manifest**.
3. Pick the workspace you will demo in, then **Next**.
4. Select the **JSON** tab, delete the sample, and paste the whole contents of `slack-manifest.json`
   from the repo root. **Next**, then **Create**.

The manifest already enables Socket Mode, the `/staff` slash command, interactivity, the
`app_mention` / `message.channels` / `message.im` events and every bot scope the worker needs.

## 2. App-level token (the websocket)

1. **Basic Information** in the left sidebar.
2. Scroll to **App-Level Tokens**, click **Generate Token and Scopes**.
3. Name it `socket`, click **Add Scope**, choose **connections:write**, then **Generate**.
4. Copy the token. It starts with `xapp-`. This is `SLACK_APP_TOKEN`.

## 3. Install and take the bot token

1. **Install App** in the left sidebar, then **Install to Workspace**, then **Allow**.
2. Copy the **Bot User OAuth Token**. It starts with `xoxb-`. This is `SLACK_BOT_TOKEN`.

## 4. Signing secret

**Basic Information** again, **App Credentials**, **Signing Secret**, **Show**, copy it.
This is `SLACK_SIGNING_SECRET`.

## 5. Put the three in `.env.local`

```
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...
APP_URL=http://localhost:3000
```

`APP_URL` is the Next.js app the worker drives. Leave it on localhost for the demo.

## 6. Channel and invite

1. In Slack, create a public channel called `#staffing`.
2. In that channel type `/invite @Callsheet` and send it.

The bot has `chat:write.public`, so it can post in a public channel without an invite, but it cannot
read `@Callsheet` mentions in a channel it is not a member of. Invite it.

## 7. Run it

Start the Next.js app in one terminal:

```
pnpm dev
```

Start the worker in another:

```
pnpm exec tsx --env-file=.env.local scripts/slack-worker.ts
```

You should see: `Callsheet Slack worker connected over Socket Mode. App API base: http://localhost:3000`

If any of the three variables is missing, the worker prints exactly which ones and exits 1.

## 8. Test

In `#staffing`, send:

```
/staff 60 for AI Everything Summit, 6-7 Oct, 10 each: Stage, Kids Zone, F&B, Traditional Games, Registration & Scanning, Info Desk. Training 5 Oct 2h on-site, mandatory. AED 297 per 8.5h. No meals. Transport allowance.
```

The same request works three ways:

- `/staff <request>` anywhere the app is installed
- `@Callsheet <request>` in a channel the bot is a member of
- a direct message to the Callsheet bot, no prefix needed

What you will see, all in one thread:

1. A status message that rewrites itself as the run moves: stage in words, the brief once the
   research step returns, and the last six agent events as mono lines.
2. When the roster is built, a summary with per-area counts, the top three picks per area, and two
   buttons: **Approve and send offers** and **Adjust**. Nothing leaves the building before you press.
3. After approval, a fill line that updates in place: `██████░░░░ 36/60 confirmed`, with each new
   confirmation named underneath.
4. `Call sheet ready.` with the Ambiguous document link and the workspace line.

## Troubleshooting

**`missing_scope` in the worker console.** The app was installed before the manifest was complete.
Open **OAuth & Permissions**, check the bot scopes against `slack-manifest.json`, add what is
missing, then **Reinstall to Workspace**. Scopes only take effect after a reinstall.

**`not_in_channel` or `channel_not_found`.** The bot was never invited. Run `/invite @Callsheet` in
the channel. For a private channel the bot must be invited by a member.

**Mentions do nothing, slash command works.** Event subscriptions did not come through, or the bot
is not in the channel. Open **Event Subscriptions** and confirm `app_mention`, `message.channels`
and `message.im` are all subscribed, then reinstall.

**`Failed to start server` or the worker hangs on start.** Socket Mode is off, or the `xapp-` token
lacks `connections:write`. Open **Socket Mode** and confirm the toggle is on, then regenerate the
app-level token with the right scope.

**`invalid_auth` on start.** The tokens are swapped. `SLACK_BOT_TOKEN` is the `xoxb-` one,
`SLACK_APP_TOKEN` is the `xapp-` one.

**The thread says `POST /api/agent unreachable at http://localhost:3000: ECONNREFUSED`.** The Next.js
app is not running, or `APP_URL` points at the wrong port. Start `pnpm dev` and check the port it
prints, then set `APP_URL` to match and restart the worker.

**The thread says `GET /api/state timed out ... after 4000ms`.** The app is up but a tool call is
blocking the request handler. The worker keeps polling and recovers on its own; the line disappears
on the next successful poll.

**Buttons do nothing.** Interactivity is off. Open **Interactivity & Shortcuts** and confirm the
toggle is on. With Socket Mode there is no request URL to fill in.

**Approve says the worker did not start that run.** The worker was restarted after the roster was
posted. The approval still reaches the app, but this process can no longer stream confirmations into
that thread. Post the request again for a clean run.
