import Papa from "papaparse";
import { db } from "@/lib/db";
import { resolveS3Key } from "@/lib/files";
import { getObjectStream } from "@/lib/s3";

async function readCsv(fileId: string): Promise<string[][] | null> {
  const file = await db.file.findUnique({ where: { id: fileId } });
  if (!file) return null;
  const body = await getObjectStream(resolveS3Key(file.s3Key));
  if (!body) return null;
  const text = await new Response(body as BodyInit).text();
  const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  return parsed.data;
}

export async function CsvTable({ fileId }: { fileId: string }) {
  const rows = await readCsv(fileId);
  if (!rows || rows.length === 0) {
    return <p className="text-muted mt-4 text-sm">Table could not be loaded.</p>;
  }
  const [header, ...data] = rows;

  return (
    <div className="mt-4 overflow-x-auto border border-neutral-800">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-700 bg-neutral-900">
            {header.map((cell, i) => (
              <th
                key={i}
                className="text-muted px-4 py-3 text-xs font-bold tracking-widest whitespace-nowrap uppercase"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {data.map((row, r) => (
            <tr key={r} className="transition hover:bg-neutral-900">
              {row.map((cell, c) => (
                <td key={c} className="px-4 py-2.5 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
