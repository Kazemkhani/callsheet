"use client";

import type { AgentEvent } from "@/lib/types";
import { buildFeed, TOOL_LABEL } from "@/lib/ui/feed";
import { clockTime } from "@/lib/ui/roster";

/**
 * Twelve most recent rows, newest first. Identifiers are stripped and repeated
 * workspace writes are counted, because a wall of UUIDs tells a coordinator
 * nothing about whether the agent is doing its job.
 */
export function LiveFeed({ events }: { events: AgentEvent[] }) {
  const feed = buildFeed(events);

  return (
    <section className="border border-rule bg-card">
      <header className="flex items-baseline justify-between gap-4 border-b border-rule bg-paper-deep px-4 py-3">
        <h2 className="flex items-baseline gap-2 font-display text-lead font-semibold">
          Live
        </h2>
        <span className="num text-micro text-ink-muted">
          {feed.total} events
        </span>
      </header>

      {feed.rows.length === 0 ? (
        <p className="p-3 text-caption text-ink-muted">
          No tool calls yet.
        </p>
      ) : (
        <ol aria-live="polite">
          {feed.rows.map((row) => (
            <li
              key={row.id}
              className="border-b border-rule p-3 last:border-b-0"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={`label-caps ${
                    row.level === "error" ? "text-signal" : "text-ink-muted"
                  }`}
                >
                  {TOOL_LABEL[row.tool]}
                </span>
                <span className="num text-[11px] leading-4 text-ink-muted">
                  {clockTime(row.at)}
                </span>
              </div>
              <p
                className={`mt-1 text-[14px] leading-5 ${
                  row.level === "error" ? "text-signal" : "text-ink"
                }`}
              >
                {row.level === "error" ? "Failed: " : ""}
                {row.message}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
