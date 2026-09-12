"use client";

import { personChip, type AreaRow, type Slot, type SlotState } from "@/lib/ui/roster";

const CHIP_BASE =
  "slot-motion inline-flex h-7 max-w-[11rem] items-center overflow-hidden rounded-[3px] border";

const CHIP_STYLE: Record<SlotState, string> = {
  confirmed: "border-olive bg-olive text-paper",
  sent: "border-ink bg-paper",
  proposed: "border-ink-muted bg-paper text-ink-muted",
  declined: "border-rule bg-paper text-ink-muted",
  empty: "w-20 border-rule bg-paper",
};

const TILE_STYLE: Record<SlotState, string> = {
  confirmed: "border-paper/45",
  sent: "border-rule",
  proposed: "border-rule",
  declined: "border-rule",
  empty: "border-transparent",
};

const STATE_WORD: Record<SlotState, string> = {
  empty: "open",
  proposed: "proposed",
  sent: "sent, awaiting reply",
  confirmed: "confirmed",
  declined: "declined",
};

/**
 * The crew pool can hold two different people under one name (bench-06 and
 * bench-54 are both "Reem Rahman"), which on a row of ten reads as a rendering
 * bug rather than a fact. Where a surname collides inside one area, the record
 * number is shown so the two chips are visibly two people.
 */
function collidingLabels(slots: Slot[]): Set<string> {
  const owner = new Map<string, string>();
  const collisions = new Set<string>();
  for (const slot of slots) {
    if (!slot.offer) continue;
    const label = personChip(slot.name ?? slot.offer.usherId).label;
    const first = owner.get(label);
    if (first === undefined) owner.set(label, slot.offer.usherId);
    else if (first !== slot.offer.usherId) collisions.add(label);
  }
  return collisions;
}

function recordRef(usherId: string): string {
  const digits = usherId.match(/(\d+)$/);
  return digits ? digits[1] : usherId;
}

function Chip({
  slot,
  area,
  collisions,
}: {
  slot: Slot;
  area: string;
  collisions: Set<string>;
}) {
  if (!slot.offer) {
    return (
      <span
        className={`${CHIP_BASE} ${CHIP_STYLE.empty}`}
        title={`${area}: open slot`}
        aria-label={`${area}: open slot`}
      />
    );
  }

  const person = personChip(slot.name ?? slot.offer.usherId);
  const ambiguous = collisions.has(person.label);
  const title = `${slot.name}${
    ambiguous ? ` (${slot.offer.usherId})` : ""
  }: ${STATE_WORD[slot.state]}. ${slot.offer.reason}`;

  return (
    <span
      className={`${CHIP_BASE} ${CHIP_STYLE[slot.state]}`}
      title={title}
      aria-label={title}
    >
      {person.initials ? (
        <span
          className={`num flex h-7 w-7 shrink-0 items-center justify-center border-r text-[11px] leading-none no-underline ${TILE_STYLE[slot.state]}`}
        >
          {person.initials}
        </span>
      ) : null}
      <span
        className={`truncate px-2 text-caption leading-none ${
          slot.state === "declined"
            ? "line-through decoration-ink-muted"
            : ""
        }`}
      >
        {person.label}
        {ambiguous ? (
          <span className="num ml-1.5 text-[10px] opacity-70">
            {recordRef(slot.offer.usherId)}
          </span>
        ) : null}
      </span>
      {slot.state === "sent" ? (
        <span
          aria-hidden="true"
          className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink"
        />
      ) : null}
    </span>
  );
}

export function FillGrid({ rows }: { rows: AreaRow[] }) {
  return (
    <div>
      {rows.map((row) => {
        const collisions = collidingLabels(row.slots);
        return (
        <div
          key={row.area}
          className="grid grid-cols-[minmax(140px,180px)_1fr] items-start gap-6 border-t border-rule py-5 first:border-t-0 first:pt-0"
        >
          <div className="min-w-0">
            <h3 className="font-display text-[20px] leading-6 font-semibold">
              {row.area}
            </h3>
            <p className="num mt-1 text-caption text-ink-muted">
              <span className={row.confirmed > 0 ? "text-olive" : undefined}>
                {row.confirmed}
              </span>
              {" / "}
              {row.needed} confirmed
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {row.slots.map((slot) => (
              <Chip
                key={slot.key}
                slot={slot}
                area={row.area}
                collisions={collisions}
              />
            ))}
          </div>
        </div>
        );
      })}
    </div>
  );
}

export function GridSkeleton() {
  const rows = Array.from({ length: 6 });
  const chips = Array.from({ length: 10 });
  return (
    <div aria-hidden="true">
      {rows.map((_, r) => (
        <div
          key={r}
          className="grid grid-cols-[minmax(140px,180px)_1fr] items-start gap-6 border-t border-rule py-5 first:border-t-0 first:pt-0"
        >
          <span className="skeleton-pulse mt-2 block h-3 w-28 bg-rule" />
          <div className="flex flex-wrap gap-1.5">
            {chips.map((__, c) => (
              <span
                key={c}
                className="skeleton-pulse block h-7 w-20 border border-rule"
                style={{ animationDelay: `${(r * 10 + c) * 18}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const LEGEND: { state: SlotState; word: string }[] = [
  { state: "confirmed", word: "confirmed" },
  { state: "sent", word: "sent" },
  { state: "proposed", word: "proposed" },
  { state: "declined", word: "declined" },
  { state: "empty", word: "open" },
];

export function GridLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {LEGEND.map(({ state, word }) => (
        <li key={state} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`inline-flex h-4 w-7 items-center justify-center rounded-[2px] border ${
              state === "confirmed"
                ? "border-olive bg-olive"
                : state === "proposed"
                  ? "border-ink-muted bg-paper"
                  : state === "sent"
                    ? "border-ink bg-paper"
                    : "border-rule bg-paper"
            }`}
          >
            {state === "sent" ? (
              <span className="h-1 w-1 rounded-full bg-ink" />
            ) : state === "declined" ? (
              <span className="h-px w-4 bg-ink-muted" />
            ) : null}
          </span>
          <span className="text-micro text-ink-muted">{word}</span>
        </li>
      ))}
    </ul>
  );
}
