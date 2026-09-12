import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyExperience, verifyMany } from "./exa";
import type { Usher } from "@/lib/types";

// exa-js's own HTTP transport (baseURL/headers/error parsing) isn't what we're
// testing here; we're testing OUR concurrency cap, request spacing, and
// 429-retry logic in lib/integrations/exa.ts. So exa-js is replaced with a
// minimal stand-in whose `search()` calls the global `fetch` directly, and
// each test stubs that `fetch` to prove the throttling behaviour at the true
// network boundary.
vi.mock("exa-js", () => {
  return {
    default: class {
      constructor(_apiKey: string) {}
      async search(query: string, options: unknown) {
        const res = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query, options }),
        });
        if (!res.ok) {
          const err = new Error("Exa request failed") as Error & { statusCode?: number };
          err.statusCode = res.status;
          throw err;
        }
        return res.json();
      }
    },
  };
});

type Call = { url: string; init: RequestInit };

function stubFetch(handler: (call: Call, index: number) => Response | Promise<Response>) {
  const calls: Call[] = [];
  let concurrent = 0;
  let peakConcurrent = 0;
  vi.stubGlobal("fetch", async (url: string | URL, init: RequestInit = {}) => {
    concurrent++;
    peakConcurrent = Math.max(peakConcurrent, concurrent);
    const index = calls.length;
    calls.push({ url: String(url), init });
    try {
      return await handler({ url: String(url), init }, index);
    } finally {
      concurrent--;
    }
  });
  return { calls, peakConcurrent: () => peakConcurrent };
}

function resultsResponse(urls: string[], status = 200) {
  return new Response(
    JSON.stringify({ results: urls.map((url) => ({ title: "t", url, text: "seen" })) }),
    { status, headers: { "content-type": "application/json" } },
  );
}

function usher(id: string, pastEvents: string[]): Usher {
  return {
    id,
    name: `Usher ${id}`,
    city: "Dubai",
    phone: "+971500000000",
    email: `${id}@example.com`,
    languages: ["Arabic"],
    yearsExperience: 2,
    pastEvents,
    skills: ["stage"],
    rating: 4,
    reliabilityScore: 0.8,
    availability: ["2026-10-06"],
  };
}

beforeEach(() => {
  process.env.EXA_API_KEY = "test-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.EXA_API_KEY;
});

describe("Exa rate limit handling", () => {
  it("keeps at most 3 requests in flight across 8 ushers with 3 claimed events each", async () => {
    const { calls, peakConcurrent } = stubFetch(async () => {
      await new Promise((r) => setTimeout(r, 25));
      return resultsResponse([]);
    });

    const ushers = Array.from({ length: 8 }, (_, i) =>
      usher(`u${i}`, [`Big Event A ${i}`, `Big Event B ${i}`, `Big Event C ${i}`]),
    );
    await verifyMany(ushers);

    expect(calls.length).toBe(24); // 8 ushers x 3 claimed events
    expect(peakConcurrent()).toBeLessThanOrEqual(3);
  }, 15000);

  it("retries a single 429 once after backing off, then surfaces it as an error for the caller to warn on", async () => {
    const { calls } = stubFetch(async () => resultsResponse([], 429));

    const start = Date.now();
    await expect(verifyExperience(usher("u1", ["Some Big Conference 2026"]))).rejects.toThrow(
      /rate limit/i,
    );
    const elapsed = Date.now() - start;

    expect(calls.length).toBe(2); // original attempt + exactly one retry
    expect(elapsed).toBeGreaterThanOrEqual(1200);
  }, 10000);
});
