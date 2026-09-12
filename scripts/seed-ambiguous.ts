/**
 * Seeds the agent's Ambiguous workspace: one project plus a CRM contact per seed usher.
 * Idempotent: contacts are matched by email before being created.
 * Run: pnpm exec tsx --env-file=.env.local scripts/seed-ambiguous.ts
 */
import { ensureProject, projectUrl, upsertContact, agentEmail } from "@/lib/integrations/ambiguous";
import { loadSeedUshers } from "@/lib/roster/pool";

async function main() {
  const ushers = await loadSeedUshers();
  console.log(`agent mailbox: ${agentEmail() ?? "unknown"}`);
  const projectId = await ensureProject("AI Everything Summit 2026 staffing");
  console.log(`project: ${projectId} (${projectUrl(projectId)})`);

  let created = 0;
  let failed = 0;
  const limit = 4;
  let cursor = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (cursor < ushers.length) {
        const u = ushers[cursor++];
        try {
          const id = await upsertContact(u);
          created++;
          console.log(`contact ok: ${u.name} -> ${id}`);
        } catch (err) {
          failed++;
          console.error(`contact FAILED: ${u.name}: ${(err as Error).message}`);
        }
      }
    }),
  );

  console.log(`\nseeded ${created} contacts, ${failed} failed, of ${ushers.length} seed ushers`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
