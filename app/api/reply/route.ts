import { NextResponse } from "next/server";
import { recordReply } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { usherId?: string; offerId?: string; answer?: string };
  const key = body.offerId ?? body.usherId;
  const answer = body.answer === "yes" || body.answer === "no" ? body.answer : null;
  if (!key || !answer) {
    return NextResponse.json({ error: "usherId (or offerId) and answer yes|no are required" }, { status: 400 });
  }
  const result = await recordReply(key, answer);
  if (!result) return NextResponse.json({ error: "no open offer for that usher" }, { status: 404 });
  return NextResponse.json({ ok: true, ...result });
}
