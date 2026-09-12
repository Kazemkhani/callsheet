import { readFileSync } from "node:fs";
import path from "node:path";
import type { Usher } from "@/lib/types";

// REST client for the agent's own Ambiguous workspace.
// Bodies are snake_case (the CLI's kebab-case flags map straight onto them).

const TIMEOUT_MS = 8000;
const API_VERSION = "1";

let cachedToken: string | null = null;
let cachedOrigin: string | null = null;

interface AmbiConfig {
  authToken?: string;
  apiUrl?: string;
  userName?: string;
  userEmail?: string;
}

function config(): AmbiConfig {
  try {
    const raw = readFileSync(path.join(process.cwd(), ".ambi", "config.json"), "utf8");
    return JSON.parse(raw) as AmbiConfig;
  } catch {
    return {};
  }
}

export function origin(): string {
  if (cachedOrigin) return cachedOrigin;
  const cfg = config();
  const fromCfg = cfg.apiUrl?.replace(/\/api\/?$/, "").replace(/\/$/, "");
  cachedOrigin = process.env.AMBI_API_URL ?? fromCfg ?? "https://app.ambiguous.ai";
  return cachedOrigin;
}

function token(): string {
  if (cachedToken) return cachedToken;
  const t = process.env.AMBI_API_TOKEN ?? config().authToken;
  if (!t) throw new Error("Ambiguous: no API token (.ambi/config.json authToken or AMBI_API_TOKEN)");
  cachedToken = t;
  return t;
}

export function agentEmail(): string | undefined {
  return config().userEmail;
}

export function isConfigured(): boolean {
  try {
    token();
    return true;
  } catch {
    return false;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  retryOn429?: boolean;
}

export class AmbiguousError extends Error {
  status: number;
  body: string;
  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "AmbiguousError";
    this.status = status;
    this.body = body;
  }
}

async function request<T = Record<string, unknown>>(
  route: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers = {}, retryOn429 = true } = opts;
  const url = `${origin()}/api${route}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token()}`,
      "API-Version": API_VERSION,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (res.status === 429 && retryOn429) {
    const wait = Number(res.headers.get("Retry-After") ?? "2");
    await new Promise((r) => setTimeout(r, Math.min(10, Math.max(1, wait)) * 1000));
    return request<T>(route, { ...opts, retryOn429: false });
  }

  const text = await res.text();
  if (!res.ok) {
    throw new AmbiguousError(
      `Ambiguous ${method} ${route} failed: ${res.status} ${text.slice(0, 300)}`,
      res.status,
      text,
    );
  }
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AmbiguousError(
      `Ambiguous ${method} ${route}: response was not JSON (${text.slice(0, 120)})`,
      res.status,
      text,
    );
  }
}

// Responses come back either bare or wrapped; pull the record out either way.
function unwrap<T = Record<string, unknown>>(res: unknown, ...keys: string[]): T {
  const r = res as Record<string, unknown>;
  if (r && typeof r === "object") {
    for (const k of [...keys, "data", "result"]) {
      const v = r[k];
      if (v && typeof v === "object") return v as T;
    }
  }
  return res as T;
}

function listOf(res: unknown, ...keys: string[]): Record<string, unknown>[] {
  const r = res as Record<string, unknown>;
  if (Array.isArray(r)) return r as Record<string, unknown>[];
  for (const k of [...keys, "data", "items", "results", "records"]) {
    const v = r?.[k];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  const nested = r?.data as Record<string, unknown> | undefined;
  if (nested) {
    for (const k of keys) {
      const v = nested[k];
      if (Array.isArray(v)) return v as Record<string, unknown>[];
    }
  }
  return [];
}

function idOf(obj: Record<string, unknown>): string {
  const id = obj?.id ?? obj?.uuid ?? (obj?.task as Record<string, unknown>)?.id;
  if (!id) throw new AmbiguousError(`Ambiguous: response carried no id (${JSON.stringify(obj).slice(0, 200)})`, 200, "");
  return String(id);
}

// ---------------------------------------------------------------- projects

export async function ensureProject(name: string): Promise<string> {
  const existing = await request(`/projects?limit=100`);
  const match = listOf(existing, "projects").find(
    (p) => String(p.name ?? "").toLowerCase() === name.toLowerCase(),
  );
  if (match) return idOf(match);
  const created = await request(`/projects`, {
    method: "POST",
    body: { name, description: "Callsheet agent staffing run", visibility: "workspace" },
  });
  return idOf(unwrap(created, "project"));
}

let cachedSlug: string | null = null;

/** The human-openable app origin uses the workspace slug: /<slug>/documents/<id>. */
export async function workspaceSlug(): Promise<string | null> {
  if (cachedSlug) return cachedSlug;
  try {
    const res = await request<{ slug?: string; workspace?: { slug?: string } }>(`/workspace`);
    cachedSlug = res.slug ?? res.workspace?.slug ?? null;
  } catch {
    cachedSlug = null;
  }
  return cachedSlug;
}

export function projectUrl(projectId: string): string {
  return `${origin()}/${cachedSlug ?? "workspace"}/projects/${projectId}`;
}

// ---------------------------------------------------------------- crm

export async function findContactByEmail(email: string): Promise<string | null> {
  const res = await request(`/crm/contacts?q=${encodeURIComponent(email)}&limit=20`);
  const hit = listOf(res, "contacts").find(
    (c) => String(c.email ?? "").toLowerCase() === email.toLowerCase(),
  );
  return hit ? idOf(hit) : null;
}

export async function upsertContact(usher: Usher): Promise<string> {
  const existing = usher.email ? await findContactByEmail(usher.email) : null;
  const customProperties = {
    callsheet_usher_id: usher.id,
    city: usher.city,
    skills: usher.skills.join(", "),
    languages: usher.languages.join(", "),
    years_experience: usher.yearsExperience,
    rating: usher.rating,
    reliability: usher.reliabilityScore,
    verified_events: (usher.verifiedEvents ?? []).join(" | "),
    claimed_events: (usher.pastEvents ?? []).join(" | "),
    telegram_chat_id: usher.telegramChatId ?? "",
  };
  const body = {
    type: "person",
    name: usher.name,
    email: usher.email,
    phone: usher.phone,
    title: "Event usher",
    lifecycle_stage: "lead",
    custom_properties: customProperties,
  };
  if (existing) {
    await request(`/crm/contacts/${existing}`, {
      method: "PATCH",
      body: { phone: usher.phone, custom_properties: customProperties },
    }).catch(async (err: unknown) => {
      if (err instanceof AmbiguousError && (err.status === 404 || err.status === 405)) {
        await request(`/crm/contacts/${existing}`, {
          method: "PUT",
          body: { phone: usher.phone, custom_properties: customProperties },
        });
        return;
      }
      throw err;
    });
    return existing;
  }
  const created = await request(`/crm/contacts`, { method: "POST", body });
  return idOf(unwrap(created, "contact"));
}

// ---------------------------------------------------------------- tasks

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: "urgent" | "high" | "medium" | "low";
  contactId?: string;
}

export async function createTask(input: CreateTaskInput): Promise<string> {
  const created = await request(`/tasks`, {
    method: "POST",
    body: {
      title: input.title,
      description: input.description,
      status: "todo",
      priority: input.priority ?? "medium",
      due_date: input.dueDate,
      project_id: input.projectId, // without this the task stays private to the creator
      contact_id: input.contactId,
    },
  });
  const task = unwrap<Record<string, unknown>>(created, "task");
  const id = idOf(task);
  if (!task.project_id && !task.projectId) {
    // Body is the proof, not the status code.
    throw new AmbiguousError(
      `Ambiguous: task ${id} came back without project_id, it would stay private`,
      200,
      JSON.stringify(task).slice(0, 200),
    );
  }
  return id;
}

// ---------------------------------------------------------------- mail

export interface SendMailInput {
  to: string;
  subject: string;
  bodyMarkdown: string;
  contactId?: string;
  idempotencyKey: string;
}

let mailRoute: string | null = null;
const MAIL_ROUTES = ["/mail/send"];

export async function sendMail(input: SendMailInput): Promise<{ mailId: string; reused: boolean }> {
  const body = {
    to: [input.to],
    subject: input.subject,
    body_markdown: input.bodyMarkdown,
    contact_id: input.contactId,
    idempotency_key: input.idempotencyKey,
  };
  const headers = { "Idempotency-Key": input.idempotencyKey };
  const routes = mailRoute ? [mailRoute] : MAIL_ROUTES;
  let lastErr: unknown;
  for (const route of routes) {
    try {
      const res = await request(route, { method: "POST", body, headers });
      mailRoute = route;
      const mail = unwrap<Record<string, unknown>>(res, "email", "mail", "message");
      return { mailId: idOf(mail), reused: false };
    } catch (err) {
      lastErr = err;
      if (err instanceof AmbiguousError && err.status === 409) {
        // Same idempotency key already sent: that is a success for our purposes.
        return { mailId: `idempotent:${input.idempotencyKey}`, reused: true };
      }
      if (err instanceof AmbiguousError && (err.status === 404 || err.status === 405)) continue;
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Ambiguous: mail send failed");
}

export async function listUnreadMail(limit = 20): Promise<Record<string, unknown>[]> {
  const res = await request(`/mail/inbox?unread=true&limit=${limit}&detail=full`);
  return listOf(res, "emails", "messages", "mail");
}

// ---------------------------------------------------------------- docs

export interface CreateDocInput {
  title: string;
  markdown: string;
}

export async function createDoc(input: CreateDocInput): Promise<{ id: string; url: string }> {
  const res = await request(`/documents`, {
    method: "POST",
    body: {
      type: "doc",
      title: input.title,
      content: input.markdown,
      visibility: "workspace",
    },
  });
  const doc = unwrap<Record<string, unknown>>(res, "document", "doc");
  const id = idOf(doc);
  const slug = await workspaceSlug();
  return { id, url: `${origin()}/${slug ?? "workspace"}/documents/${id}` };
}

export async function updateDoc(id: string, input: CreateDocInput): Promise<void> {
  await request(`/documents/${id}`, {
    method: "PATCH",
    body: { title: input.title, content: input.markdown },
  });
}

export async function whoami(): Promise<{ email?: string; name?: string; origin: string }> {
  const cfg = config();
  return { email: cfg.userEmail, name: cfg.userName, origin: origin() };
}
