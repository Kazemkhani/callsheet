import { NextResponse } from "next/server";
import { recordReply } from "@/lib/agent";
import { appendEvent, getState } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dev only: fakes N usher replies so the fill meter can be demonstrated without 60 phones.
// Every reply it writes is labelled "dev-simulated" in the event stream.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SIMULATE !== "true") {
    return NextResponse.json({ error: "simulate is disabled in production" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { replies?: number };
  const want = Math.max(1, Math.min(200, Number(body.replies ?? 10)));

  const state = await getState();
  const open = state.offers.filter((o) => o.status === "sent" || o.status === "queued");
  const picked = open.slice(0, want);

  let yes = 0;
  let no = 0;
  for (let i = 0; i < picked.length; i++) {
    const answer = i % 7 === 6 ? "no" : "yes"; // roughly one decline in seven
    await recordReply(picked[i].id, answer);
    if (answer === "yes") yes++;
    else no++;
  }

  await appendEvent({
    tool: "record_reply",
    level: "warn",
    message: `dev-simulated: ${picked.length} replies (${yes} yes, ${no} no), requested ${want}`,
  });

  return NextResponse.json({ ok: true, simulated: picked.length, yes, no });
}
