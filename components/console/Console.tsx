"use client";

import { useMemo, useRef, useState } from "react";
import type { AgentEvent } from "@/lib/types";
import { buildGrid, rosterTotals, STAGE_LABEL } from "@/lib/ui/roster";
import { postJson, useRunState } from "@/lib/ui/useRunState";
import { FillGrid, GridLegend, GridSkeleton } from "./FillGrid";
import { EventLog } from "./EventLog";
import { BriefCard, WorkspaceCard } from "./SideCards";

const DEFAULT_REQUEST =
  "60 for AI Everything Summit, 6-7 Oct, 10 each: Stage, Kids Zone, F&B, Traditional Games, Registration & Scanning, Info Desk. Training 5 Oct 2h on-site, mandatory. AED 297 per 8.5h. No meals. Transport allowance.";

export function Console() {
  const feed = useRunState();
  const { state } = feed;

  const [request, setRequest] = useState(DEFAULT_REQUEST);
  const [running, setRunning] = useState(false);
  const [approving, setApproving] = useState(false);
  const [localEvents, setLocalEvents] = useState<AgentEvent[]>([]);
  const localSeq = useRef(0);

  const rows = useMemo(() => buildGrid(state), [state]);
  const totals = useMemo(() => rosterTotals(state), [state]);
  const fill = totals.needed > 0 ? totals.confirmed / totals.needed : 0;
  const awaitingApproval = state.stage === "awaiting_approval";
  const hasBrief = state.brief !== null;

  function note(level: AgentEvent["level"], tool: AgentEvent["tool"], message: string) {
    localSeq.current += 1;
    setLocalEvents((prev) => [
      ...prev,
      {
        id: `local-${localSeq.current}`,
        at: new Date().toISOString(),
        tool,
        level,
        message,
      },
    ]);
  }

  async function runCallsheet() {
    if (running || request.trim().length === 0) return;
    setRunning(true);
    note("info", "system", "POST /api/agent: request submitted");
    const result = await postJson("/api/agent", { request });
    if (!result.ok) note("error", "system", result.error);
    else feed.refresh();
    setRunning(false);
  }

  async function approve() {
    if (approving) return;
    setApproving(true);
    note("info", "approve_roster", "POST /api/agent/approve: roster approved");
    const result = await postJson("/api/agent/approve", { runId: state.runId });
    if (!result.ok) note("error", "approve_roster", result.error);
    else feed.refresh();
    setApproving(false);
  }

  const logEvents = useMemo(
    () => [...state.events, ...localEvents],
    [state.events, localEvents],
  );

  return (
    <div className="flex min-h-screen flex-col">
      {feed.offline ? (
        <div className="border-b border-signal bg-paper-deep px-6 py-1.5">
          <p className="num text-micro text-signal">
            API offline, showing fixture data. {feed.offlineReason}
          </p>
        </div>
      ) : feed.fixtureMode ? (
        <div className="border-b border-rule bg-paper-deep px-6 py-1.5">
          <p className="num text-micro text-ink-muted">
            Fixture mode (?demo=1). Nothing on this screen is live.
          </p>
        </div>
      ) : null}

      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rule px-6 py-4">
        <div className="flex items-baseline gap-4">
          <span className="font-display text-sub font-bold tracking-tight">
            Callsheet
          </span>
          <span className="text-caption text-ink-muted">
            Staffing coordinator for live events
          </span>
        </div>
        <div className="num flex items-center gap-4 text-micro text-ink-muted">
          <span>{feed.live ? "live" : "fixture"}</span>
          <span>stage: {STAGE_LABEL[state.stage] ?? state.stage}</span>
          <span>run: {state.runId ?? "none"}</span>
        </div>
      </header>

      <main className="grid flex-1 grid-cols-1 items-start gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-8">
          <section>
            <label
              className="text-micro uppercase tracking-wide text-ink-muted"
              htmlFor="request"
            >
              Staffing request
            </label>
            <textarea
              id="request"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              rows={4}
              className="mt-2 w-full resize-y rounded-control border border-rule bg-card px-3 py-2 text-body text-ink placeholder:text-ink-muted"
              placeholder="Say what you need, in the words you would use in the group."
            />
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => void runCallsheet()}
                disabled={running || request.trim().length === 0}
                className={
                  awaitingApproval
                    ? "rounded-control border border-ink px-5 py-2.5 text-body font-medium text-ink disabled:opacity-50"
                    : "rounded-control bg-signal px-5 py-2.5 text-body font-medium text-card disabled:opacity-50"
                }
              >
                {running ? "Running" : "Run Callsheet"}
              </button>
              <span className="num text-micro text-ink-muted">
                {request.trim().length} characters
              </span>
            </div>
          </section>

          {awaitingApproval ? (
            <section className="border border-ink bg-card px-5 py-5">
              <p className="text-micro uppercase tracking-wide text-ink-muted">
                Human gate
              </p>
              <h2 className="mt-1 font-display text-title font-semibold">
                Roster ready: {totals.proposed} proposed, {totals.waitlisted}{" "}
                waitlisted, {totals.firstTimer} first-timer slots
              </h2>
              <p className="mt-2 max-w-2xl text-caption text-ink-muted">
                Nothing has left the building. Approving sends one offer per
                person on Telegram and email, with dates, hours, rate, training,
                transport and meals stated in full.
              </p>
              <button
                type="button"
                onClick={() => void approve()}
                disabled={approving}
                className="mt-4 rounded-control bg-signal px-5 py-2.5 text-body font-medium text-card disabled:opacity-50"
              >
                {approving ? "Sending" : "Approve and send offers"}
              </button>
            </section>
          ) : null}

          <section>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h1 className="font-display text-headline font-bold tracking-tight">
                Call sheet
              </h1>
              <p className="num text-sub">
                {totals.confirmed}
                <span className="text-ink-muted"> / {totals.needed}</span>
                <span className="ml-2 text-micro uppercase tracking-wide text-ink-muted">
                  confirmed
                </span>
              </p>
            </div>

            <div className="mt-3 h-2 w-full bg-rule">
              <div
                className="slot-motion h-2 bg-signal"
                style={{ width: `${Math.round(fill * 100)}%` }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={totals.needed}
                aria-valuenow={totals.confirmed}
                aria-label="Confirmed slots"
              />
            </div>

            <div className="mt-6">
              {feed.firstLoad ? (
                <GridSkeleton />
              ) : hasBrief ? (
                <FillGrid rows={rows} />
              ) : (
                <div className="border border-rule bg-card px-6 py-12 text-center">
                  <p className="font-display text-title font-semibold">
                    No request yet
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-caption text-ink-muted">
                    Paste the staffing message you would normally broadcast to
                    the group. The agent researches the event, verifies past
                    experience, builds the roster and waits for your approval.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <GridLegend />
              <p className="num text-micro text-ink-muted">
                {totals.sent} awaiting reply, {totals.declined} declined,{" "}
                {totals.waitlisted} on the waitlist
              </p>
            </div>
          </section>
        </div>

        <aside className="flex w-full flex-col gap-6">
          <div className="flex h-[26rem] flex-col">
            <EventLog events={logEvents} />
          </div>
          <WorkspaceCard workspace={state.workspace} />
          <BriefCard brief={state.brief} />
        </aside>
      </main>
    </div>
  );
}
