"use client";

import type { EventBrief, RunState } from "@/lib/types";
import { dateRange } from "@/lib/ui/roster";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule py-2 last:border-b-0">
      <dt className="text-micro uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd className="num text-caption text-right">{children}</dd>
    </div>
  );
}

export function WorkspaceCard({ workspace }: { workspace: RunState["workspace"] }) {
  return (
    <section className="border border-rule bg-card px-4 py-3">
      <h2 className="font-display text-lead font-semibold">Workspace</h2>
      <dl className="mt-2">
        <Row label="Ambiguous">
          {workspace.connected ? "connected" : "not connected"}
        </Row>
        <Row label="Agent email">
          {workspace.agentEmail ?? "not provisioned"}
        </Row>
        <Row label="Call sheet">
          {workspace.callsheetDocUrl ? (
            <a
              className="underline underline-offset-2 decoration-rule hover:decoration-ink"
              href={workspace.callsheetDocUrl}
              target="_blank"
              rel="noreferrer"
            >
              open document
            </a>
          ) : (
            "not written yet"
          )}
        </Row>
      </dl>
      {workspace.lastSyncError ? (
        <p className="num mt-2 text-micro text-signal">
          last sync error: {workspace.lastSyncError}
        </p>
      ) : null}
    </section>
  );
}

export function BriefCard({ brief }: { brief: EventBrief | null }) {
  if (!brief) {
    return (
      <section className="border border-rule bg-card px-4 py-3">
        <h2 className="font-display text-lead font-semibold">Brief</h2>
        <p className="mt-1 text-caption text-ink-muted">
          No brief yet. The research step writes it from your request.
        </p>
      </section>
    );
  }

  const corrected =
    brief.verifiedVenue !== undefined && brief.verifiedVenue !== brief.venue;

  return (
    <section className="border border-rule bg-card px-4 py-3">
      <h2 className="font-display text-lead font-semibold">Brief</h2>
      <p className="mt-1 text-caption text-ink-muted">{brief.name}</p>

      {corrected ? (
        <div className="mt-2 border border-rule bg-paper-deep px-3 py-2">
          <p className="num text-micro text-ink">
            Venue corrected: {brief.venue} {"->"} {brief.verifiedVenue}
          </p>
          <p className="num mt-1 text-micro text-ink-muted">
            {brief.sources?.length ?? 0} sources
          </p>
        </div>
      ) : null}

      <dl className="mt-2">
        <Row label="Venue">{brief.verifiedVenue ?? brief.venue}</Row>
        <Row label="Dates">{dateRange(brief.dates)}</Row>
        <Row label="Shift">
          {brief.shiftStart} to {brief.shiftEnd}, {brief.hoursPerDay}h
        </Row>
        <Row label="Rate">AED {brief.rateAedPerHour.toFixed(2)} per hour</Row>
        <Row label="Training">
          {brief.training
            ? `${dateRange([brief.training.date])}, ${brief.training.durationHours}h${
                brief.training.mandatory ? ", mandatory" : ""
              }`
            : "none"}
        </Row>
        <Row label="Transport">{brief.transport}</Row>
        <Row label="Meals">{brief.meals}</Row>
      </dl>
    </section>
  );
}
