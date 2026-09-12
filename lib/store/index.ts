import { promises as fs } from "node:fs";
import path from "node:path";
import type { AgentEvent, RunState } from "@/lib/types";

const STATE_PATH = path.join(process.cwd(), "data", "state.json");

function emptyState(): RunState {
  return {
    runId: null,
    stage: "idle",
    request: null,
    brief: null,
    offers: [],
    events: [],
    workspace: { connected: false },
    updatedAt: new Date().toISOString(),
  };
}

let cache: RunState | null = null;
let loading: Promise<RunState> | null = null;
// Single write queue: every persist is chained so two updates never interleave on disk.
let writeQueue: Promise<void> = Promise.resolve();

async function load(): Promise<RunState> {
  if (cache) return cache;
  if (loading) return loading;
  loading = (async () => {
    try {
      const raw = await fs.readFile(STATE_PATH, "utf8");
      cache = JSON.parse(raw) as RunState;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        // Corrupt or unreadable state must be visible, not silently reset.
        console.error(`store: could not read ${STATE_PATH}: ${(err as Error).message}`);
      }
      cache = emptyState();
    }
    loading = null;
    return cache;
  })();
  return loading;
}

function persist(next: RunState): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
    await fs.writeFile(STATE_PATH, JSON.stringify(next, null, 2), "utf8");
  });
  return writeQueue;
}

export async function getState(): Promise<RunState> {
  return load();
}

export async function update(fn: (state: RunState) => void | RunState): Promise<RunState> {
  const current = await load();
  const returned = fn(current);
  const next = (returned ?? current) as RunState;
  next.updatedAt = new Date().toISOString();
  cache = next;
  await persist(next);
  return next;
}

export async function appendEvent(ev: Omit<AgentEvent, "id" | "at">): Promise<AgentEvent> {
  const full: AgentEvent = {
    id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    ...ev,
  };
  await update((s) => {
    s.events.push(full);
  });
  const tag = full.level === "error" ? "ERROR" : full.level === "warn" ? "WARN " : "info ";
  console.log(`[${tag}] ${full.tool}: ${full.message}`);
  return full;
}

export async function resetState(): Promise<RunState> {
  cache = emptyState();
  await persist(cache);
  return cache;
}

export function stateFilePath(): string {
  return STATE_PATH;
}
