import { NextResponse } from "next/server";
import { startRun } from "@/lib/agent";
import { appendEvent } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { request?: string };
  try {
    body = (await req.json()) as { request?: string };
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }
  const request = body.request?.trim();
  if (!request) return NextResponse.json({ error: "request is required" }, { status: 400 });

  const runId = `run-${Date.now().toString(36)}`;
  // The run keeps going after the response: the console polls /api/state for progress.
  void startRun(request).catch(async (err: unknown) => {
    await appendEvent({
      tool: "system",
      level: "error",
      message: `run aborted: ${(err as Error).message}`,
    });
  });

  return NextResponse.json({ runId }, { status: 202 });
}
