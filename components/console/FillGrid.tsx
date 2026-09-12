"use client";

import type { AreaRow, Slot, SlotState } from "@/lib/ui/roster";

const CELL_BASE =
  "slot-motion relative flex h-11 flex-col justify-between overflow-hidden px-1.5 py-1 text-left";

const CELL_STYLE: Record<SlotState, string> = {
  empty: "bg-paper-deep text-ink-muted",
  proposed: "bg-card text-ink-muted outline outline-dashed outline-1 -outline-offset-1 outline-rule",
  sent: "bg-card text-ink outline outline-1 -outline-offset-1 outline-rule",
  confirmed: "bg-olive text-card",
  declined: "bg-card text-ink-muted line-through decoration-rule",
};

const CELL_LABEL: Record<SlotState, string> = {
  empty: "open",
  proposed: "proposed",
  sent: "sent",
  confirmed: "confirmed",
  declined: "declined",
};

function firstName(name: string | undefined): string {
  if (!name) return "";
  return name.split(" ")[0];
}

function Cell({ slot, area }: { slot: Slot; area: string }) {
  const title = slot.offer
    ? `${slot.name}: ${CELL_LABEL[slot.state]}. ${slot.offer.reason}`
    : `${area} slot ${slot.index + 1}: open`;

  return (
    <div
      className={`${CELL_BASE} ${CELL_STYLE[slot.state]}`}
      title={title}
      aria-label={title}
    >
      <span className="num text-[10px] leading-none opacity-70">
        {String(slot.index + 1).padStart(2, "0")}
      </span>
      <span className="num truncate text-micro leading-none">
        {slot.offer ? firstName(slot.name) : "open"}
      </span>
    </div>
  );
}

export function FillGrid({ rows }: { rows: AreaRow[] }) {
  return (
    <div className="border border-rule bg-rule">
      {rows.map((row) => (
        <div
          key={row.area}
          className="grid grid-cols-[minmax(150px,180px)_1fr] gap-px border-b border-rule last:border-b-0"
        >
          <div className="flex items-center justify-between gap-2 bg-card px-3">
            <span className="text-caption font-medium">{row.area}</span>
            <span className="num text-micro text-ink-muted">
              {row.confirmed}/{row.needed}
            </span>
          </div>
          <div className="grid grid-cols-10 gap-px bg-rule">
            {row.slots.map((slot) => (
              <Cell key={slot.key} slot={slot} area={row.area} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton() {
  const rows = Array.from({ length: 6 });
  const cells = Array.from({ length: 10 });
  return (
    <div className="border border-rule bg-rule" aria-hidden="true">
      {rows.map((_, r) => (
        <div
          key={r}
          className="grid grid-cols-[minmax(150px,180px)_1fr] gap-px border-b border-rule last:border-b-0"
        >
          <div className="flex items-center bg-card px-3">
            <span className="skeleton-pulse h-2.5 w-24 bg-rule" />
          </div>
          <div className="grid grid-cols-10 gap-px bg-rule">
            {cells.map((__, c) => (
              <div key={c} className="h-11 bg-paper-deep">
                <span
                  className="skeleton-pulse mx-1.5 mt-4 block h-2 bg-rule"
                  style={{ animationDelay: `${(r * 10 + c) * 18}ms` }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function GridLegend() {
  const items: SlotState[] = [
    "confirmed",
    "sent",
    "proposed",
    "declined",
    "empty",
  ];
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {items.map((state) => (
        <li key={state} className="flex items-center gap-2">
          <span
            className={`inline-block h-3 w-3 ${
              state === "confirmed"
                ? "bg-olive"
                : state === "empty"
                  ? "bg-paper-deep border border-rule"
                  : state === "proposed"
                    ? "bg-card border border-dashed border-rule"
                    : state === "declined"
                      ? "bg-card border border-rule opacity-50"
                      : "bg-card border border-rule"
            }`}
          />
          <span className="num text-micro text-ink-muted">
            {CELL_LABEL[state]}
          </span>
        </li>
      ))}
    </ul>
  );
}
