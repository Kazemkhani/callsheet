import { NextResponse } from "next/server";
import { linkTelegramChat, recordReply } from "@/lib/agent";
import { appendEvent, getState } from "@/lib/store";
import { answerCallback, sendMessage, type TelegramUpdate } from "@/lib/integrations/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function reply(chatId: string, text: string) {
  try {
    await sendMessage(chatId, text);
  } catch (err) {
    await appendEvent({
      tool: "system",
      level: "warn",
      message: `Telegram reply to ${chatId} failed: ${(err as Error).message}`,
    });
  }
}

export async function POST(req: Request) {
  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  if (!update) return NextResponse.json({ error: "body must be JSON" }, { status: 400 });

  if (update.callback_query) {
    const data = update.callback_query.data ?? "";
    const [answer, offerId] = data.split(":");
    const chatId = String(update.callback_query.message?.chat.id ?? "");
    if (answer !== "yes" && answer !== "no") {
      return NextResponse.json({ ok: true, ignored: "unknown callback" });
    }
    const result = await recordReply(offerId, answer);
    try {
      await answerCallback(update.callback_query.id, result ? `Recorded: ${answer}` : "Offer not found");
    } catch (err) {
      await appendEvent({
        tool: "system",
        level: "warn",
        message: `Telegram answerCallbackQuery failed: ${(err as Error).message}`,
      });
    }
    if (chatId && result) {
      await reply(
        chatId,
        answer === "yes"
          ? "You are confirmed. Training and call time follow in this chat."
          : "Noted, the slot goes to the next person on the waitlist.",
      );
    }
    return NextResponse.json({ ok: true, result });
  }

  const message = update.message;
  if (!message?.text) return NextResponse.json({ ok: true, ignored: "no text" });
  const chatId = String(message.chat.id);
  const text = message.text.trim();

  if (text.startsWith("/start")) {
    const arg = text.slice("/start".length).trim() || message.from?.first_name || "";
    const usher = arg ? await linkTelegramChat(arg, chatId) : null;
    if (!usher) {
      await reply(chatId, "Send /start followed by your usher id or full name, for example /start usher-01.");
      return NextResponse.json({ ok: true, linked: false });
    }
    await reply(chatId, `Linked. You are ${usher.name}. Offers for you arrive in this chat.`);
    return NextResponse.json({ ok: true, linked: usher.id });
  }

  const answer = /^(y|yes|yalla|confirm|i am in)/i.test(text)
    ? "yes"
    : /^(n|no|cannot|can't|decline)/i.test(text)
      ? "no"
      : null;
  if (!answer) {
    const state = await getState();
    const brief = state.brief;
    if (brief && /transport|meal|food|rate|pay|training|time|venue/i.test(text)) {
      await reply(
        chatId,
        `Venue ${brief.verifiedVenue ?? brief.venue}, ${brief.shiftStart} to ${brief.shiftEnd}, AED ${brief.rateAedPerHour.toFixed(2)} per hour, transport ${brief.transport}, meals ${brief.meals}.`,
      );
      return NextResponse.json({ ok: true, answered: "brief" });
    }
    await reply(chatId, "Reply YES to confirm or NO to decline.");
    return NextResponse.json({ ok: true, ignored: "unrecognised text" });
  }

  const state = await getState();
  const usher = (state.crew ?? []).find((u) => u.telegramChatId === chatId);
  if (!usher) {
    await reply(chatId, "This chat is not linked yet. Send /start followed by your usher id.");
    return NextResponse.json({ ok: true, linked: false });
  }
  const result = await recordReply(usher.id, answer);
  await reply(chatId, answer === "yes" ? "You are confirmed." : "Noted, the slot is released.");
  return NextResponse.json({ ok: true, result });
}
