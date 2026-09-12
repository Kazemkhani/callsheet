import { afterEach, describe, expect, it, vi } from "vitest";
import { AmbiguousError, createTask, ensureProject, sendMail, upsertContact } from "./ambiguous";
import type { Usher } from "@/lib/types";

type Call = { url: string; init: RequestInit };

function stubFetch(handler: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", async (url: string | URL, init: RequestInit = {}) => {
    const call = { url: String(url), init };
    calls.push(call);
    return handler(call);
  });
  return calls;
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

const usher: Usher = {
  id: "usher-01",
  name: "Omar Tageldin",
  city: "Abu Dhabi",
  phone: "+971512458591",
  email: "omar@example.com",
  languages: ["Arabic"],
  yearsExperience: 3,
  pastEvents: ["Mubadala World Tennis Championship 2025"],
  skills: ["stage"],
  rating: 3.9,
  reliabilityScore: 0.76,
  availability: ["2026-10-06"],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ambiguous client", () => {
  it("reuses an existing project instead of creating a duplicate", async () => {
    const calls = stubFetch(() => json({ data: [{ id: "p1", name: "AI Everything Summit 2026 staffing" }] }));
    const id = await ensureProject("AI Everything Summit 2026 staffing");
    expect(id).toBe("p1");
    expect(calls).toHaveLength(1);
    expect(calls[0].init.method ?? "GET").toBe("GET");
  });

  it("sends snake_case bodies with the version header", async () => {
    const calls = stubFetch((c) =>
      c.url.includes("?q=") ? json({ data: [] }) : json({ contact: { id: "c1" } }),
    );
    const id = await upsertContact(usher);
    expect(id).toBe("c1");
    const create = calls[1];
    const body = JSON.parse(String(create.init.body));
    expect(body.custom_properties.callsheet_usher_id).toBe("usher-01");
    expect(body.lifecycle_stage).toBe("lead");
    expect((create.init.headers as Record<string, string>)["API-Version"]).toBe("1");
  });

  it("refuses a task that came back without a project, because it would stay private", async () => {
    stubFetch(() => json({ task: { id: "t1" } }));
    await expect(
      createTask({ projectId: "p1", title: "Confirm Omar", dueDate: "2026-10-06" }),
    ).rejects.toThrow(/without project_id/);
  });

  it("accepts a task that carries the project back", async () => {
    const calls = stubFetch(() => json({ task: { id: "t1", project_id: "p1" } }));
    const id = await createTask({ projectId: "p1", title: "Confirm Omar", dueDate: "2026-10-06" });
    expect(id).toBe("t1");
    expect(JSON.parse(String(calls[0].init.body)).project_id).toBe("p1");
  });

  it("honours Retry-After once on a 429", async () => {
    let n = 0;
    stubFetch(() => {
      n++;
      return n === 1
        ? json({ error: "slow down" }, 429, { "Retry-After": "1" })
        : json({ data: [{ id: "p1", name: "x" }] });
    });
    const id = await ensureProject("x");
    expect(id).toBe("p1");
    expect(n).toBe(2);
  }, 10000);

  it("treats a 409 on a reused idempotency key as already sent", async () => {
    stubFetch(() => json({ error: "Idempotency-Key was already used" }, 409));
    const res = await sendMail({
      to: "omar@example.com",
      subject: "Offer",
      bodyMarkdown: "hello",
      idempotencyKey: "offer-usher-01-evt-1",
    });
    expect(res.reused).toBe(true);
  });

  it("surfaces a server error instead of swallowing it", async () => {
    stubFetch(() => json({ error: "boom" }, 500));
    await expect(
      sendMail({ to: "a@b.com", subject: "s", bodyMarkdown: "b", idempotencyKey: "k" }),
    ).rejects.toBeInstanceOf(AmbiguousError);
  });

  it("posts mail to /mail/send with the idempotency key on the header and the body", async () => {
    const calls = stubFetch(() => json({ id: "m1", delivery_status: "pending_undo" }));
    const res = await sendMail({
      to: "omar@example.com",
      subject: "Offer",
      bodyMarkdown: "hello",
      contactId: "c1",
      idempotencyKey: "offer-usher-01-evt-1",
    });
    expect(res.mailId).toBe("m1");
    expect(calls[0].url).toContain("/api/mail/send");
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.body_markdown).toBe("hello");
    expect(body.contact_id).toBe("c1");
    expect((calls[0].init.headers as Record<string, string>)["Idempotency-Key"]).toBe(
      "offer-usher-01-evt-1",
    );
  });
});
