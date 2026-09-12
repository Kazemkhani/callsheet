"use client";

import { useEffect, useRef } from "react";
import type { AgentEvent } from "@/lib/types";
import { clockTime } from "@/lib/ui/roster";

const LEVEL_STYLE: Record<AgentEvent["level"], string> = {
  info: "text-ink",
  warn: "text-ink-muted",
  error: "text-signal",
};

export function EventLog({ events }: { events: AgentEvent[] }) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  return (
    <section className="flex h-full min-h-0 flex-col border border-rule bg-card">
      <header className="flex items-baseline justify-between border-b border-rule px-4 py-3">
        <h2 className="font-display text-lead font-semibold">Agent log</h2>
        <span className="num text-micro text-ink-muted">
          {events.length} events
        </span>
      </header>
      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
        aria-live="polite"
      >
        {events.length === 0 ? (
          <p className="num text-micro text-ink-muted">
            waiting for the first tool call
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {events.map((event) => (
              <li key={event.id} className="num text-micro leading-4">
                <span className="text-ink-muted">{clockTime(event.at)}</span>
                <span className="mx-2 text-ink-muted">{event.tool}</span>
                <span className={LEVEL_STYLE[event.level]}>
                  {event.level === "error" ? "failed: " : ""}
                  {event.message}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
