/**
 * Long-polls Telegram and forwards every update to the local app, so no public webhook URL
 * is needed for the demo.
 * Run: APP_URL=http://localhost:3001 pnpm exec tsx --env-file=.env.local scripts/telegram-poll.ts
 */
import { getUpdates } from "@/lib/integrations/telegram";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

async function main() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is empty: nothing to poll. Set it in .env.local.");
    process.exit(1);
  }
  console.log(`polling Telegram, forwarding to ${APP_URL}/api/telegram`);
  let offset: number | undefined;
  for (;;) {
    try {
      const updates = await getUpdates(offset, 25);
      for (const update of updates) {
        offset = update.update_id + 1;
        const res = await fetch(`${APP_URL}/api/telegram`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
          signal: AbortSignal.timeout(10000),
        });
        const body = await res.text();
        console.log(`update ${update.update_id} -> ${res.status} ${body.slice(0, 160)}`);
      }
    } catch (err) {
      console.error(`poll error: ${(err as Error).message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main();
