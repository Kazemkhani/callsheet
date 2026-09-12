"use client";

import { useState } from "react";
import type { Offer } from "@/lib/types";
import { dateRange, shortDate, usherById, usherName } from "@/lib/ui/roster";
import { postJson, useRunState } from "@/lib/ui/useRunState";

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-rule py-2 last:border-b-0">
      <span className="text-micro uppercase tracking-wide text-ink-muted">
        {label}
      </span>
      <span className="num text-caption text-right">{value}</span>
    </div>
  );
}

export function PhoneView({ usherId }: { usherId: string }) {
  const feed = useRunState();
  const { state } = feed;
  const brief = state.brief;

  const offer: Offer | undefined = state.offers.find(
    (o) => o.usherId === usherId,
  );

  const [pending, setPending] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replied, setReplied] = useState<"yes" | "no" | null>(null);

  const answered =
    replied ??
    (offer?.status === "confirmed"
      ? "yes"
      : offer?.status === "declined"
        ? "no"
        : null);

  const person = usherById(usherId, state.crew);
  const name = person?.name ?? usherName(usherId, state.crew);

  async function reply(answer: "yes" | "no") {
    if (pending) return;
    setPending(answer);
    setError(null);
    const result = await postJson("/api/reply", { usherId, answer });
    if (result.ok) {
      setReplied(answer);
      feed.refresh();
    } else {
      setError(result.error);
    }
    setPending(null);
  }

  const venue = brief?.verifiedVenue ?? brief?.venue ?? "venue to confirm";
  const venueShort = venue.split(",")[0];

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-0 py-0 sm:px-4 sm:py-8">
      <div
        className="flex w-[390px] max-w-full flex-col overflow-hidden border border-rule bg-card"
        style={{ height: 844, borderRadius: 28 }}
      >
        {feed.offline ? (
          <p className="num border-b border-signal bg-paper-deep px-4 py-1.5 text-[10px] text-signal">
            API offline, showing fixture data
          </p>
        ) : feed.fixtureMode ? (
          <p className="num border-b border-rule bg-paper-deep px-4 py-1.5 text-[10px] text-ink-muted">
            Fixture mode (?demo=1)
          </p>
        ) : null}

        <header className="flex items-baseline justify-between border-b border-rule px-5 py-3">
          <span className="font-display text-body font-bold">Callsheet</span>
          <span className="num text-[10px] uppercase tracking-wide text-ink-muted">
            Telegram
          </span>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5">
          {!offer ? (
            <div className="my-auto text-center">
              <p className="font-display text-lead font-semibold">
                No offer yet
              </p>
              <p className="mt-2 text-caption text-ink-muted">
                {name}, nothing has been sent to you for this event. Offers go
                out only after the coordinator approves the roster.
              </p>
            </div>
          ) : (
            <>
              <p className="text-micro uppercase tracking-wide text-ink-muted">
                Offer for {name.split(" ")[0]}
              </p>
              <h1 className="mt-1 font-display text-sub font-bold leading-tight">
                {brief?.name ?? "Event"}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="num border border-rule px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink-muted">
                  venue verified
                </span>
                <span className="num text-[10px] text-ink-muted">
                  {brief?.sources?.length ?? 0} sources
                </span>
              </div>

              <p className="mt-3 text-caption text-ink-muted">
                {venue}
              </p>

              <div className="mt-4 border border-rule bg-paper-deep px-3 py-2">
                <p className="text-micro uppercase tracking-wide text-ink-muted">
                  Your position
                </p>
                <p className="font-display text-lead font-semibold">
                  {offer.area}
                </p>
                <p className="num mt-1 text-micro text-ink-muted">
                  {offer.reason}
                </p>
              </div>

              <dl className="mt-4">
                <Line
                  label="Dates"
                  value={brief ? dateRange(brief.dates) : "to confirm"}
                />
                <Line
                  label="Hours"
                  value={
                    brief
                      ? `${brief.shiftStart} to ${brief.shiftEnd}, ${brief.hoursPerDay}h`
                      : "to confirm"
                  }
                />
                <Line
                  label="Rate"
                  value={
                    brief
                      ? `AED ${Math.round(brief.rateAedPerHour * brief.hoursPerDay)} per shift`
                      : "to confirm"
                  }
                />
                <Line
                  label="Training"
                  value={
                    brief?.training
                      ? `${shortDate(brief.training.date)}, ${brief.training.durationHours}h, ${
                          brief.training.mandatory ? "mandatory" : "optional"
                        }`
                      : "none"
                  }
                />
                <Line label="Transport" value={brief?.transport ?? "none"} />
                <Line label="Meals" value={brief?.meals ?? "none"} />
              </dl>

              {answered === "yes" ? (
                <div className="mt-5 border border-olive bg-paper-deep px-4 py-4">
                  <p className="font-display text-lead font-semibold text-olive">
                    {"You're on "}
                    {offer.area}
                  </p>
                  <p className="mt-1 text-caption">
                    Training{" "}
                    {brief?.training
                      ? `${shortDate(brief.training.date)}, ${brief.training.durationHours}h`
                      : "to confirm"}
                    , {venueShort}. Added to your calendar.
                  </p>
                </div>
              ) : answered === "no" ? (
                <div className="mt-5 border border-rule bg-paper-deep px-4 py-4">
                  <p className="font-display text-lead font-semibold">
                    {"Noted, you're out"}
                  </p>
                  <p className="mt-1 text-caption text-ink-muted">
                    The next person on the {offer.area} waitlist has been
                    offered your slot.
                  </p>
                </div>
              ) : (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => void reply("yes")}
                    disabled={pending !== null}
                    className="w-full rounded-control bg-signal px-5 py-4 text-lead font-medium text-card disabled:opacity-50"
                  >
                    {pending === "yes" ? "Sending" : "I'm in"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void reply("no")}
                    disabled={pending !== null}
                    className="mt-3 w-full rounded-control border border-rule px-5 py-2.5 text-caption text-ink-muted disabled:opacity-50"
                  >
                    {pending === "no" ? "Sending" : "Can't make it"}
                  </button>
                </div>
              )}

              {error ? (
                <p className="num mt-3 text-micro text-signal">{error}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
