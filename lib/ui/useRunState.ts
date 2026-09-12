"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { demoState } from "@/lib/fixtures/demo-state";
import type { RunState } from "@/lib/types";

const POLL_MS = 1000;
const TIMEOUT_MS = 3000;

function subscribeNothing(): () => void {
  return () => {};
}

function readDemoFlag(): boolean {
  return new URLSearchParams(window.location.search).get("demo") === "1";
}

export interface RunStateFeed {
  /** Live state when the API answers, the fixture when it does not. */
  state: RunState;
  live: boolean;
  offline: boolean;
  offlineReason: string | null;
  /** ?demo=1 pins the fixture on screen for filming. Always announced. */
  fixtureMode: boolean;
  firstLoad: boolean;
  refresh: () => void;
}

/**
 * Polls GET /api/state every second. A non-200 or a throw flips `offline`,
 * which the console announces in a banner: the fixture is never shown silently.
 */
export function useRunState(): RunStateFeed {
  const [state, setState] = useState<RunState | null>(null);
  const [offlineReason, setOfflineReason] = useState<string | null>(null);
  const [firstLoad, setFirstLoad] = useState(true);
  const alive = useRef(true);

  // Client-only read of ?demo=1. useSyncExternalStore keeps the server snapshot
  // (false) during hydration, so there is no mismatch and no setState in effect.
  const fixtureMode = useSyncExternalStore(
    subscribeNothing,
    readDemoFlag,
    () => false,
  );

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/state", {
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`GET /api/state returned ${res.status}`);
      const data = (await res.json()) as RunState;
      if (!alive.current) return;
      setState(data);
      setOfflineReason(null);
    } catch (err) {
      if (!alive.current) return;
      setState(null);
      setOfflineReason(err instanceof Error ? err.message : "state fetch failed");
    } finally {
      if (alive.current) setFirstLoad(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    if (fixtureMode) return;
    // First poll is scheduled rather than run inline so the effect itself does
    // no state work; the interval carries every poll after it.
    const first = setTimeout(() => void poll(), 0);
    const id = setInterval(() => void poll(), POLL_MS);
    return () => {
      alive.current = false;
      clearTimeout(first);
      clearInterval(id);
    };
  }, [poll, fixtureMode]);

  return {
    state: fixtureMode ? demoState : (state ?? demoState),
    live: !fixtureMode && state !== null,
    offline: !fixtureMode && offlineReason !== null,
    offlineReason,
    fixtureMode,
    firstLoad: fixtureMode ? false : firstLoad,
    refresh: () => {
      if (!fixtureMode) void poll();
    },
  };
}

export async function postJson(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const text = (await res.text().catch(() => "")).slice(0, 160);
      return {
        ok: false,
        error: `POST ${path} returned ${res.status}${text ? `: ${text}` : ""}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: `POST ${path} failed: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}
