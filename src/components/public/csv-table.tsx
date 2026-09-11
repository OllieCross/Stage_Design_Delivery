import { unstable_cache } from "next/cache";
import Papa from "papaparse";
import { db } from "@/lib/db";
import { resolveS3Key } from "@/lib/files";
import { getObjectStream } from "@/lib/s3";
import { CsvTableClient } from "./csv-table-client";

/** Rendered up front; the rest is one click away via the "show all" toggle. */
const INITIAL_ROW_LIMIT = 200;

// Files are effectively immutable once uploaded (a change means a new
// file record, hence a new fileId), so caching the parse for an hour turns
// "re-parse the whole export on every page view" into a rare cost.
const readCsv = unstable_cache(
  async (fileId: string): Promise<string[][] | null> => {
    const file = await db.file.findUnique({ where: { id: fileId } });
    if (!file) return null;
    const body = await getObjectStream(resolveS3Key(file.s3Key));
    if (!body) return null;
    const text = await new Response(body as BodyInit).text();
    const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
    return parsed.data;
  },
  ["csv-rows"],
  { revalidate: 3600 },
);

export async function CsvTable({ fileId }: { fileId: string }) {
  const rows = await readCsv(fileId);
  if (!rows || rows.length === 0) {
    return <p className="text-muted mt-4 text-sm">Table could not be loaded.</p>;
  }
  const [header, ...data] = rows;

  return <CsvTableClient header={header} rows={data} initialLimit={INITIAL_ROW_LIMIT} />;
}
