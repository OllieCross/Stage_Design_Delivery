"use client";

import { useState } from "react";

export function CsvTableClient({
  header,
  rows,
  initialLimit,
}: {
  header: string[];
  rows: string[][];
  initialLimit: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const truncated = !expanded && rows.length > initialLimit;
  const visible = truncated ? rows.slice(0, initialLimit) : rows;

  return (
    <div className="mt-4">
      <div className="overflow-x-auto border border-neutral-800">
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
            {visible.map((row, r) => (
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

      {truncated && (
        <button
          onClick={() => setExpanded(true)}
          className="text-muted mt-3 text-xs tracking-widest uppercase transition hover:text-white"
        >
          Show all {rows.length} rows
        </button>
      )}
    </div>
  );
}
