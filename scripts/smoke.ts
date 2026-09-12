/**
 * End to end smoke test against the REAL Exa and Ambiguous APIs.
 * Run: pnpm exec tsx --env-file=.env.local scripts/smoke.ts
 */
import { approveAndSend, recordReply, startRun, writeCallsheet } from "@/lib/agent";
import { getState, resetState } from "@/lib/store";

const REQUEST = [
  "60 for AI Everything Summit, 6-7 Oct 2026, 10 each:",
  "Stage, Kids Zone, F&B, Traditional Games, Registration & Scanning, Info Desk.",
  "Training 5 Oct 2h on-site, mandatory. AED 297 / 8.5h. No meals. Transport allowance.",
].join(" ");

function check(label: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: ${detail}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  await resetState();
  console.log(`planner mode: ${process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY ? "llm" : "scripted"}`);
  const started = Date.now();
  const runId = await startRun(REQUEST);
  console.log(`run ${runId} reached stage in ${((Date.now() - started) / 1000).toFixed(1)}s`);

  let state = await getState();
  check("stage", state.stage === "awaiting_approval", state.stage);
  const slots = state.brief?.positions.reduce((n, p) => n + p.needed, 0) ?? 0;
  check("slots parsed", slots === 60, `${slots} slots across ${state.brief?.positions.length} areas`);
  check("offers proposed", state.offers.length === 60, `${state.offers.length} offers`);
  const firstTimers = state.offers.filter((o) => o.firstTimerSlot).length;
  check("first timer slots", firstTimers >= 1, `${firstTimers} reserved`);
  console.log(`venue: stated "${state.brief?.venue}" verified "${state.brief?.verifiedVenue ?? "unverified"}"`);

  const send = await approveAndSend(runId);
  console.log(`approve: ${send.sent} sent, ${send.queued} queued, ${send.tasks} tasks created`);
  state = await getState();
  const bad = state.offers.filter(
    (o) => !(o.status === "sent" || (o.status === "queued" && Boolean(o.error))),
  );
  check("every offer sent or queued with a visible error", bad.length === 0, `${bad.length} offers in a silent state`);
  check("at least one real send", send.sent >= 1, `${send.sent} sent`);

  const omar = (state.crew ?? []).find((u) => u.name.startsWith("Omar"));
  const omarOffer = state.offers.find((o) => o.usherId === omar?.id);
  console.log(`Omar offer: ${omarOffer ? `${omarOffer.area} (${omarOffer.status})` : "none"}`);
  if (omarOffer) {
    await recordReply(omar!.id, "yes");
    state = await getState();
    const after = state.offers.find((o) => o.id === omarOffer.id);
    check("Omar confirmed", after?.status === "confirmed", `${after?.status} on ${after?.area}`);
  } else {
    check("Omar has an offer", false, "Omar was not allocated");
  }

  const doc = await writeCallsheet(await getState());
  check("call sheet document", Boolean(doc), doc ? doc.url : "not written");
  state = await getState();
  console.log(`\nAmbiguous project: ${state.workspace.projectId}`);
  console.log(`Ambiguous call sheet: ${state.workspace.callsheetDocUrl}`);
  console.log(`tasks created: ${state.offers.filter((o) => o.ambiguousTaskId).length}`);
  console.log(`agent mailbox: ${state.workspace.agentEmail}`);
  const errs = state.events.filter((e) => e.level !== "info");
  console.log(`\nnon-info events (${errs.length}):`);
  for (const e of errs) console.log(`  [${e.level}] ${e.tool}: ${e.message}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
