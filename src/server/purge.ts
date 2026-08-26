import { db } from "@/lib/db";
import { deletePrefix } from "@/lib/s3";

const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** Hard-deletes projects that have been in the trash for more than 7 days. */
export async function purgeExpiredTrash() {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_MS);
  const expired = await db.project.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true, slug: true },
  });
  for (const p of expired) {
    await deletePrefix(`projects/${p.id}/`);
    await db.project.delete({ where: { id: p.id } });
    console.log(`[purge] removed trashed project ${p.slug}`);
  }
  return expired.length;
}
