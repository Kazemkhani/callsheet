import type { EventBrief, Offer, Usher } from "@/lib/types";

const TIMEOUT_MS = 5000;

function base(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token.trim() === "") {
    throw new Error("Telegram: TELEGRAM_BOT_TOKEN is empty, offer not sent");
  }
  return `https://api.telegram.org/bot${token}`;
}

async function call(method: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${base()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  // Telegram answers 200 with ok:false, so the body is the proof, not the status.
  if (!res.ok || json.ok !== true) {
    throw new Error(
      `Telegram ${method} failed: ${res.status} ${String(json.description ?? "no description")}`,
    );
  }
  return json.result as Record<string, unknown>;
}

export function offerText(offer: Offer, brief: EventBrief, usher: Usher): string {
  const lines = [
    `*${brief.name}* — offer for ${usher.name.split(" ")[0]}`,
    "",
    `Position: *${offer.area}*`,
    `Venue: ${brief.verifiedVenue ?? brief.venue}, ${brief.city}`,
    `Dates: ${brief.dates.join(", ")}`,
    `Shift: ${brief.shiftStart} to ${brief.shiftEnd} (${brief.hoursPerDay} hours)`,
    `Rate: AED ${brief.rateAedPerHour.toFixed(2)} per hour, AED ${(
      brief.rateAedPerHour * brief.hoursPerDay
    ).toFixed(0)} per day`,
  ];
  if (brief.training) {
    lines.push(
      `Training: ${brief.training.date}, ${brief.training.durationHours} hours, ${
        brief.training.mandatory ? "mandatory" : "optional"
      }, ${brief.training.onSite ? "on site" : "online"}`,
    );
  }
  lines.push(
    `Transport: ${brief.transport}`,
    `Meals: ${brief.meals}`,
    "",
    `Why you: ${offer.reason}`,
    "",
    "Reply using the buttons below.",
  );
  return lines.join("\n");
}

export async function sendOffer(
  chatId: string,
  offer: Offer,
  brief: EventBrief,
  usher: Usher,
): Promise<string> {
  const result = await call("sendMessage", {
    chat_id: chatId,
    text: offerText(offer, brief, usher),
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Yes, I am in", callback_data: `yes:${offer.id}` },
          { text: "No, cannot make it", callback_data: `no:${offer.id}` },
        ],
      ],
    },
  });
  return String(result.message_id ?? "");
}

export async function sendMessage(chatId: string, text: string): Promise<void> {
  await call("sendMessage", { chat_id: chatId, text, parse_mode: "Markdown" });
}

export async function answerCallback(callbackQueryId: string, text: string): Promise<void> {
  await call("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number | string };
    from?: { id: number; first_name?: string; username?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: { id: number; first_name?: string };
    message?: { chat: { id: number | string } };
  };
}

export async function getUpdates(offset?: number, timeoutSeconds = 25): Promise<TelegramUpdate[]> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram: TELEGRAM_BOT_TOKEN is empty, cannot poll");
  const url = new URL(`https://api.telegram.org/bot${token}/getUpdates`);
  url.searchParams.set("timeout", String(timeoutSeconds));
  if (offset !== undefined) url.searchParams.set("offset", String(offset));
  const res = await fetch(url, {
    signal: AbortSignal.timeout((timeoutSeconds + 5) * 1000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || json.ok !== true) {
    throw new Error(`Telegram getUpdates failed: ${res.status} ${String(json.description ?? "")}`);
  }
  return (json.result ?? []) as TelegramUpdate[];
}
