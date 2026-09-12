"use client";

import type { EventBrief } from "@/lib/types";
import { dateRange, sentenceCase, shortDate, venueCheck } from "@/lib/ui/roster";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-l border-rule pl-4 first:border-l-0 first:pl-0">
      <dt className="label-caps text-ink-muted">{label}</dt>
      <dd className="mt-1 text-body">{value}</dd>
    </div>
  );
}

function trainingLine(brief: EventBrief): string {
  const t = brief.training;
  if (!t) return "None";
  const parts = [
    shortDate(t.date),
    `${t.durationHours}h`,
    t.onSite ? "on site" : "remote",
  ];
  if (t.mandatory) parts.push("mandatory");
  return parts.join(", ");
}

/**
 * The brief is the agent's argument for itself: what it read, what it corrected
 * and the terms every offer will quote. It sits under the event name because a
 * coordinator checks the terms before looking at a single name.
 */
export function BriefBand({ brief }: { brief: EventBrief }) {
  const venue = venueCheck(brief);

  return (
    <div>
      {venue.corrected ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border-y border-rule bg-paper-deep px-4 py-3">
          <p className="min-w-0 text-body">
            <span className="label-caps mr-3 text-ink-muted">
              Venue corrected
            </span>
            <span className="text-ink-muted line-through decoration-ink-muted">
              {venue.stated}
            </span>
            <span className="mx-2 text-ink-muted">verified as</span>
            <span className="font-medium">{venue.resolved}</span>
          </p>
          <p className="num shrink-0 text-caption text-ink-muted">
            {venue.sources} sources
          </p>
        </div>
      ) : venue.sources > 0 ? (
        <p className="text-caption text-ink-muted">
          <span className="label-caps mr-3">Venue verified</span>
          {venue.resolved}, against{" "}
          <span className="num">{venue.sources}</span> sources
        </p>
      ) : null}

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-6">
        <Field label="Dates" value={dateRange(brief.dates)} />
        <Field
          label="Hours"
          value={`${brief.shiftStart} to ${brief.shiftEnd}, ${brief.hoursPerDay}h`}
        />
        <Field
          label="Rate"
          value={`AED ${brief.rateAedPerHour.toFixed(2)} per hour`}
        />
        <Field label="Training" value={trainingLine(brief)} />
        <Field label="Transport" value={sentenceCase(brief.transport)} />
        <Field label="Meals" value={sentenceCase(brief.meals)} />
      </dl>
    </div>
  );
}
