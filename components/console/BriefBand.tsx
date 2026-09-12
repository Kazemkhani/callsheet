"use client";

import type { EventBrief } from "@/lib/types";
import { dateRange, sentenceCase, shortDate, venueCheck } from "@/lib/ui/roster";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-l border-ink-rule pl-4 first:border-l-0 first:pl-0">
      <dt className="field-caps text-ink-label">{label}</dt>
      <dd className="mt-1 text-[18px] leading-6">{value}</dd>
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
 * and the terms every offer will quote. It sits on the charcoal band under the
 * event name because a coordinator checks the terms before looking at a name.
 */
export function BriefBand({ brief, place }: { brief: EventBrief; place: string }) {
  const venue = venueCheck(brief);
  const organiser = brief.organiser ? `Organised by ${brief.organiser}. ` : "";

  return (
    <div>
      {venue.corrected ? (
        <p className="mt-2 text-[14px] leading-5 text-ink-label">
          {organiser}Venue corrected from{" "}
          <span className="line-through decoration-ink-label">
            {venue.stated}
          </span>{" "}
          to <span className="text-paper">{venue.resolved}</span>,{" "}
          <span className="num">{venue.sources}</span> sources
        </p>
      ) : (
        <p className="mt-2 text-[14px] leading-5 text-ink-label">
          {place}. {organiser}
          {venue.sources > 0 ? (
            <>
              Venue verified, <span className="num">{venue.sources}</span>{" "}
              sources
            </>
          ) : null}
        </p>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-6">
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
