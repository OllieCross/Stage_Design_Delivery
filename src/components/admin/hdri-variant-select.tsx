"use client";

import { setHdriVariant } from "@/server/actions";

export function HdriVariantSelect({
  file,
}: {
  file: { id: string; hdriVariant: "DAY" | "NIGHT" | null };
}) {
  return (
    <form action={setHdriVariant}>
      <input type="hidden" name="id" value={file.id} />
      <select
        name="variant"
        defaultValue={file.hdriVariant ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-neutral-700 bg-transparent px-2 py-1 text-xs uppercase outline-none focus:border-neutral-400"
      >
        <option value="">Unused</option>
        <option value="DAY">Day</option>
        <option value="NIGHT">Night</option>
      </select>
    </form>
  );
}
