"use client";

import { useState } from "react";
import { renameVersion } from "@/server/actions";

export function VersionName({ version }: { version: { id: string; label: string } }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title="Rename version"
        className="text-lg font-bold uppercase underline-offset-8 transition hover:underline"
      >
        {version.label}
      </button>
    );
  }

  return (
    <form action={renameVersion} className="flex items-center gap-2">
      <input type="hidden" name="id" value={version.id} />
      <input
        name="label"
        defaultValue={version.label}
        autoFocus
        required
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        className="w-32 border border-neutral-700 bg-transparent px-2 py-1 text-sm uppercase outline-none focus:border-neutral-400"
      />
      <button className="text-xs tracking-widest uppercase underline-offset-4 hover:underline">
        Save
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-muted text-xs tracking-widest uppercase hover:text-white"
      >
        Cancel
      </button>
    </form>
  );
}
