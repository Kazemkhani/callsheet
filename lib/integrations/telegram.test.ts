import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { offerText, sendOffer } from "./telegram";
import type { EventBrief, Offer, Usher } from "@/lib/types";

const brief: EventBrief = {
  id: "evt-1",
  name: "AI Everything Summit 2026",
  venue: "ADNOC Centre",
  verifiedVenue: "ADNEC Centre Abu Dhabi",
  city: "Abu Dhabi",
  dates: ["2026-10-06", "2026-10-07"],
  hoursPerDay: 8.5,
  shiftStart: "08:30",
  shiftEnd: "18:00",
  rateAedPerHour: 34.94,
  training: { date: "2026-10-05", durationHours: 2, mandatory: true, onSite: true },
  transport: "allowance",
  meals: "none",
  positions: [{ area: "Stage", needed: 10 }],
};

const offer: Offer = {
  id: "off-evt-1-usher-01",
  eventId: "evt-1",
  usherId: "usher-01",
  area: "Stage",
  status: "queued",
  channel: ["telegram"],
  score: 11.4,
  reason: "Stage: verified Mubadala World Tennis Championship 2025, 3.9 rating, Abu Dhabi",
};

const usher = { id: "usher-01", name: "Omar Tageldin" } as Usher;

const ORIGINAL = process.env.TELEGRAM_BOT_TOKEN;

afterEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = ORIGINAL;
  vi.unstubAllGlobals();
});

describe("telegram", () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
  });

  it("puts every term of the offer in the message", () => {
    const text = offerText(offer, brief, usher);
    expect(text).toContain("Stage");
    expect(text).toContain("2026-10-06, 2026-10-07");
    expect(text).toContain("08:30 to 18:00");
    expect(text).toContain("AED 34.94 per hour");
    expect(text).toContain("mandatory");
    expect(text).toContain("Transport: allowance");
    expect(text).toContain("Meals: none");
    expect(text).toContain("ADNEC Centre Abu Dhabi");
  });

  it("attaches a yes/no keyboard carrying the offer id", async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), { status: 200 });
    });
    const id = await sendOffer("123", offer, brief, usher);
    expect(id).toBe("42");
    const keyboard = (body.reply_markup as { inline_keyboard: { callback_data: string }[][] }).inline_keyboard;
    expect(keyboard[0][0].callback_data).toBe("yes:off-evt-1-usher-01");
    expect(keyboard[0][1].callback_data).toBe("no:off-evt-1-usher-01");
  });

  it("fails loudly when the bot token is missing, so the offer can be queued with a reason", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "";
    await expect(sendOffer("123", offer, brief, usher)).rejects.toThrow(
      /TELEGRAM_BOT_TOKEN is empty/,
    );
  });

  it("treats ok:false on a 200 as a failure", async () => {
    vi.stubGlobal("fetch", async () =>
      new Response(JSON.stringify({ ok: false, description: "chat not found" }), { status: 200 }),
    );
    await expect(sendOffer("123", offer, brief, usher)).rejects.toThrow(/chat not found/);
  });
});
