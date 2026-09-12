"use client";

import { useMemo, useRef, useState } from "react";
import type { AgentEvent } from "@/lib/types";
import { buildGrid, rosterTotals, venueCheck } from "@/lib/ui/roster";
import { postJson, useRunState } from "@/lib/ui/useRunState";
import { ApprovalBar } from "./ApprovalBar";
import { BriefBand } from "./BriefBand";
import { FillGrid, GridLegend, GridSkeleton } from "./FillGrid";
import { LiveFeed } from "./EventLog";
import { RequestStrip } from "./RequestStrip";
import { StageStepper } from "./StageStepper";
import { WorkspaceCard } from "./SideCards";

const DEFAULT_REQUEST =
  "60 for AI Everything Summit, 6-7 Oct, 10 each: Stage, Kids Zone, F&B, Traditional Games, Registration & Scanning, Info Desk. Training 5 Oct 2h on-site, mandatory. AED 297 per 8.5h. No meals. Transport allowance.";

export function Console() {
  const feed = useRunState();
  const { state } = feed;

  const [request, setRequest] = useState(DEFAULT_REQUEST);
  const [editing, setEditing] = useState(false);
  const [running, setRunning] = useState(false);
  const [approving, setApproving] = useState(false);
  const [localEvents, setLocalEvents] = useState<AgentEvent[]>([]);
  const localSeq = useRef(0);

  const rows = useMemo(() => buildGrid(state), [state]);
  const totals = useMemo(() => rosterTotals(state), [state]);
  const fill = totals.needed > 0 ? totals.confirmed / totals.needed : 0;
  const awaitingApproval = state.stage === "awaiting_approval";
  const brief = state.brief;
  // Signal is spent once per screen. Before anything is sent the approval
  // button owns it, so the meter stays ink until there are replies to track.
  const offersOut = totals.sent + totals.confirmed + totals.declined > 0;
  const showEditor = editing || brief === null;

  function note(
    level: AgentEvent["level"],
    tool: AgentEvent["tool"],
    message: string,
  ) {
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
    note("info", "system", "Request submitted to the agent");
    const result = await postJson("/api/agent", { request });
    if (!result.ok) note("error", "system", result.error);
    else {
      setEditing(false);
      feed.refresh();
    }
    setRunning(false);
  }

  async function approve() {
    if (approving) return;
    setApproving(true);
    note("info", "approve_roster", "Roster approved by the coordinator");
    const result = await postJson("/api/agent/approve", { runId: state.runId });
    if (!result.ok) note("error", "approve_roster", result.error);
    else feed.refresh();
    setApproving(false);
  }

  const logEvents = useMemo(
    () => [...state.events, ...localEvents],
    [state.events, localEvents],
  );

  const venue = brief ? venueCheck(brief) : null;
  const place =
    brief && venue
      ? venue.resolved.toLowerCase().includes(brief.city.toLowerCase())
        ? venue.resolved
        : `${venue.resolved}, ${brief.city}`
      : null;

  return (
    <div className="flex min-h-screen flex-col">
      {feed.offline ? (
        <div className="flex items-center gap-2 border-b border-rule bg-paper-deep px-8 py-2">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal"
          />
          <p className="text-micro">
            The API is not answering, so this is fixture data.{" "}
            <span className="text-ink-muted">{feed.offlineReason}</span>
          </p>
        </div>
      ) : feed.fixtureMode ? (
        <div className="flex items-center gap-2 border-b border-rule bg-paper-deep px-8 py-2">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-muted"
          />
          <p className="text-micro text-ink-muted">
            Fixture mode (?demo=1). Nothing on this screen is live.
          </p>
        </div>
      ) : null}

      <header className="border-b border-rule">
        <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-8 py-5">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-[1.5rem] leading-7 font-bold tracking-tight">
              Callsheet
            </span>
            <span className="text-caption text-ink-muted">
              Staffing coordinator for live events
            </span>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-rule px-3 py-1">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                feed.live ? "bg-olive" : "bg-ink-muted"
              }`}
            />
            <span className="label-caps text-ink-muted">
              {feed.live ? "Live" : "Fixture"}
            </span>
          </span>
        </div>
      </header>

      <main
        className={`mx-auto w-full max-w-[1360px] flex-1 px-8 pt-8 ${
          awaitingApproval ? "pb-12" : "pb-20"
        }`}
      >
        <RequestStrip
          request={showEditor ? request : (state.request ?? request)}
          onChange={setRequest}
          onRun={() => void runCallsheet()}
          running={running}
          editing={showEditor}
          hasRun={brief !== null}
          onEdit={() => {
            setRequest(state.request ?? request);
            setEditing(true);
          }}
          onCancel={() => setEditing(false)}
        />

        <section className="mt-16">
          <h1 className="font-display text-headline font-bold tracking-tight text-balance">
            {brief ? brief.name : "No request yet"}
          </h1>
          {brief && place ? (
            <p className="mt-2 text-body text-ink-muted">
              {place}
              {brief.organiser ? `. Organised by ${brief.organiser}.` : "."}
            </p>
          ) : (
            <p className="mt-4 max-w-2xl text-body text-ink-muted">
              Paste the staffing message you would normally broadcast to the
              group. The agent researches the event, verifies past experience,
              builds the roster and then waits for you.
            </p>
          )}

          {brief ? (
            <div className="mt-6">
              <BriefBand brief={brief} />
            </div>
          ) : null}
        </section>

        <div className="mt-10">
          <StageStepper stage={state.stage} />
        </div>

        <div className="mt-16 grid grid-cols-1 items-start gap-x-12 gap-y-16 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <div>
                <p className="label-caps text-ink-muted">Call sheet</p>
                <p className="mt-2 font-display text-meter font-bold tracking-tight tabular-nums">
                  {totals.confirmed}
                  <span className="text-ink-muted"> / {totals.needed}</span>
                </p>
                <p className="label-caps mt-1 text-ink-muted">confirmed</p>
              </div>
              <p className="text-caption text-ink-muted">
                <span className="num">{totals.sent}</span> awaiting reply,{" "}
                <span className="num">{totals.declined}</span> declined,{" "}
                <span className="num">{totals.waitlisted}</span> on the waitlist
              </p>
            </div>

            <div className="mt-6 h-1.5 w-full bg-rule">
              <div
                className={`slot-motion h-1.5 ${
                  offersOut ? "bg-signal" : "bg-ink-muted"
                }`}
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
              ) : brief ? (
                <FillGrid rows={rows} />
              ) : (
                <p className="text-caption text-ink-muted">
                  The grid fills in once the roster is built.
                </p>
              )}
            </div>

            <div className="mt-6 border-t border-rule pt-4">
              <GridLegend />
            </div>
          </section>

          <aside className="flex w-full min-w-0 flex-col gap-10">
            <LiveFeed events={logEvents} />
            <WorkspaceCard workspace={state.workspace} />
          </aside>
        </div>
      </main>

      {awaitingApproval ? (
        <ApprovalBar
          totals={totals}
          approving={approving}
          onApprove={() => void approve()}
        />
      ) : null}
    </div>
  );
}
