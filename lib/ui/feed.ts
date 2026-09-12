import type { AgentEvent } from "@/lib/types";

/**
 * The console feed is read at a glance during a live run, so the raw tool
 * messages get two passes: identifiers a human cannot act on are removed, and
 * consecutive workspace writes are counted rather than listed one by one.
 */

const UUID =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

export const TOOL_LABEL: Record<AgentEvent["tool"], string> = {
  research_event: "Research",
  search_crew: "Crew",
  verify_experience: "Verify",
  build_roster: "Roster",
  approve_roster: "Approve",
  send_offers: "Offers",
  record_reply: "Reply",
  write_callsheet: "Call sheet",
  sync_workspace: "Workspace",
  system: "System",
};

/** Drops UUIDs and the trailing "created" that every workspace write repeats. */
export function cleanMessage(raw: string): string {
  return raw
    .replace(UUID, "")
    .replace(/\s+created\b\.?\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.:;])/g, "$1")
    .trim();
}

/** "Ambiguous: training reminder task" + 3 -> "Ambiguous: 3 training reminder tasks created". */
function countedMessage(clean: string, count: number): string {
  const shape = clean.match(
    /^([^:]+):\s*(.+?)\s+(task|contact|document|message|reminder)$/i,
  );
  if (shape) {
    return `${shape[1]}: ${count} ${shape[2]} ${shape[3].toLowerCase()}s created`;
  }
  return `${clean}, ${count} times`;
}

export interface FeedRow {
  id: string;
  at: string;
  tool: AgentEvent["tool"];
  level: AgentEvent["level"];
  message: string;
  count: number;
}

export interface Feed {
  rows: FeedRow[];
  total: number;
}

/**
 * Newest first, capped. `total` is the honest event count, not the row count,
 * so the header never implies the run did less work than it did.
 */
export function buildFeed(events: AgentEvent[], limit = 12): Feed {
  const grouped: FeedRow[] = [];

  for (const event of events) {
    const previous = grouped[grouped.length - 1];
    const collapsible =
      previous !== undefined &&
      previous.tool === "sync_workspace" &&
      event.tool === "sync_workspace" &&
      previous.level === event.level;

    if (collapsible) {
      previous.count += 1;
      previous.at = event.at;
      continue;
    }

    grouped.push({
      id: event.id,
      at: event.at,
      tool: event.tool,
      level: event.level,
      message: cleanMessage(event.message),
      count: 1,
    });
  }

  const rows = grouped
    .map((row) =>
      row.count > 1
        ? { ...row, message: countedMessage(row.message, row.count) }
        : row,
    )
    .reverse()
    .slice(0, limit);

  return { rows, total: events.length };
}
