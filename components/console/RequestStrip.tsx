"use client";

/**
 * Before a run this is the only thing to do, so it is a full editor. After a
 * run the call sheet is what the coordinator came for, so the request folds to
 * one line and gives its space back.
 */
export function RequestStrip({
  request,
  onChange,
  onRun,
  running,
  editing,
  onEdit,
  onCancel,
  hasRun,
}: {
  request: string;
  onChange: (value: string) => void;
  onRun: () => void;
  running: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  hasRun: boolean;
}) {
  if (!editing) {
    return (
      <div className="flex items-baseline gap-6 border-b border-rule pb-4">
        <span className="label-caps shrink-0 text-ink-muted">Request</span>
        <p className="min-w-0 flex-1 truncate text-caption text-ink-muted">
          {request}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 text-caption underline decoration-rule underline-offset-4 hover:decoration-ink"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-rule pb-6">
      <label className="label-caps text-ink-muted" htmlFor="request">
        Staffing request
      </label>
      <textarea
        id="request"
        value={request}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="mt-3 w-full resize-y rounded-control border border-rule bg-card px-4 py-3 text-body placeholder:text-ink-muted"
        placeholder="Say what you need, in the words you would use in the group."
      />
      <div className="mt-4 flex flex-wrap items-center gap-5">
        <button
          type="button"
          onClick={onRun}
          disabled={running || request.trim().length === 0}
          className={
            hasRun
              ? "rounded-control border border-ink px-5 py-2.5 text-body font-medium disabled:opacity-60"
              : "rounded-control bg-signal px-5 py-2.5 text-body font-medium text-card disabled:opacity-60"
          }
        >
          {running ? "Running" : hasRun ? "Run again" : "Run Callsheet"}
        </button>
        {hasRun ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-caption underline decoration-rule underline-offset-4 hover:decoration-ink"
          >
            Cancel
          </button>
        ) : null}
        <span className="num text-micro text-ink-muted">
          {request.trim().length} characters
        </span>
      </div>
    </div>
  );
}
