"use client";

import type { RunState } from "@/lib/types";

/** Splits at the @ so a long mailbox wraps there and nowhere else. */
function Mailbox({ address }: { address: string }) {
  const at = address.indexOf("@");
  if (at === -1) return <span className="mailbox text-[13px]">{address}</span>;
  return (
    <span className="mailbox text-[13px] leading-5">
      {address.slice(0, at + 1)}
      <wbr />
      {address.slice(at + 1)}
    </span>
  );
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function WorkspaceCard({
  workspace,
}: {
  workspace: RunState["workspace"];
}) {
  const counts: string[] = [];
  if (workspace.contacts) counts.push(plural(workspace.contacts, "contact"));
  if (workspace.tasks) counts.push(plural(workspace.tasks, "task"));

  return (
    <section className="border border-rule bg-card px-4 py-4">
      <h2 className="font-display text-lead font-semibold">Agent workspace</h2>

      <p className="mt-3 text-caption text-ink-muted">
        Ambiguous coworker:{" "}
        <span className="text-ink">Callsheet</span>,{" "}
        {workspace.connected ? "active" : "not connected"}
      </p>

      <p className="mt-2 text-ink-muted">
        {workspace.agentEmail ? (
          <Mailbox address={workspace.agentEmail} />
        ) : (
          <span className="text-caption">Mailbox not provisioned yet.</span>
        )}
      </p>

      {workspace.callsheetDocUrl ? (
        <p className="mt-4">
          <a
            className="text-body underline decoration-rule underline-offset-4 hover:decoration-ink"
            href={workspace.callsheetDocUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open call sheet
          </a>
        </p>
      ) : null}

      {counts.length > 0 ? (
        <p className="num mt-4 text-micro text-ink-muted">
          {counts.join(", ")}
        </p>
      ) : null}

      {workspace.lastSyncError ? (
        <p className="mt-3 text-caption text-signal">
          Last sync failed: {workspace.lastSyncError}
        </p>
      ) : null}
    </section>
  );
}
