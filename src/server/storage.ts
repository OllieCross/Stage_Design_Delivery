import { db } from "@/lib/db";
import { resolveS3Key } from "@/lib/files";

/**
 * Total bytes held in object storage.
 *
 * Cloned versions share the underlying object and only differ by the
 * "#versionId" suffix on their record key, so sizes are counted once per real
 * object rather than once per file record.
 */
export async function totalStorageBytes(): Promise<number> {
  const files = await db.file.findMany({ select: { s3Key: true, size: true } });
  const byObject = new Map<string, number>();
  for (const f of files) byObject.set(resolveS3Key(f.s3Key), f.size);
  let total = 0;
  for (const size of byObject.values()) total += size;
  return total;
}
