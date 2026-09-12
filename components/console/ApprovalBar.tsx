"use client";

import type { RosterTotals } from "@/lib/ui/roster";

/**
 * The human gate. Nothing has left the building until this button is pressed,
 * so it holds the floor: full width, on card, and the only signal-coloured
 * element on screen while it is up.
 */
export function ApprovalBar({
  totals,
  onApprove,
  approving,
}: {
  totals: RosterTotals;
  onApprove: () => void;
  approving: boolean;
}) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-ink bg-card">
      <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-8 py-5">
        <p className="min-w-0 text-body">
          Roster ready. <span className="num">{totals.proposed}</span> proposed,{" "}
          <span className="num">{totals.firstTimer}</span> first-timer slots,{" "}
          <span className="num">{totals.waitlisted}</span> waitlisted.{" "}
          <span className="text-ink-muted">Nothing has been sent.</span>
        </p>
        <button
          type="button"
          onClick={onApprove}
          disabled={approving}
          className="shrink-0 rounded-control bg-signal px-6 py-3 text-body font-medium text-card disabled:opacity-60"
        >
          {approving ? "Sending offers" : "Approve and send offers"}
        </button>
      </div>
    </div>
  );
}
