"use client";

import { useState } from "react";
import { createPreset, deletePreset } from "@/server/actions";

type Preset = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
};

const inputClass =
  "w-20 rounded-md border border-neutral-700 bg-transparent px-2 py-1 text-xs outline-none focus:border-neutral-400";

export function PresetEditor({ file, presets }: { file: { id: string }; presets: Preset[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="text-muted text-xs tracking-wide uppercase hover:text-white"
      >
        {open ? "Hide" : "Show"} camera presets ({presets.length})
      </button>

      {open && (
        <div className="mt-3 rounded-md border border-neutral-800 p-3">
          {presets.length > 0 && (
            <ul className="mb-3 space-y-1">
              {presets.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-xs">
                  <span>
                    {p.name}
                    <span className="text-muted ml-2">
                      ({p.x}, {p.y}, {p.z}) yaw {p.yaw} pitch {p.pitch}
                    </span>
                  </span>
                  <form action={deletePreset}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-red-400 uppercase hover:text-red-300">Remove</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={createPreset} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="fileId" value={file.id} />
            <label className="text-muted flex flex-col gap-1 text-xs">
              Name
              <input name="name" placeholder="FOH" className={`${inputClass} w-28`} />
            </label>
            {(["x", "y", "z", "yaw", "pitch"] as const).map((axis) => (
              <label key={axis} className="text-muted flex flex-col gap-1 text-xs uppercase">
                {axis}
                <input
                  name={axis}
                  type="number"
                  step="any"
                  defaultValue={0}
                  className={inputClass}
                />
              </label>
            ))}
            <button className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-black uppercase transition hover:bg-neutral-200">
              Add
            </button>
          </form>
          <p className="text-muted mt-2 text-xs">
            Coordinates in meters (X right, Y up, Z toward viewer). Yaw/pitch in degrees.
          </p>
        </div>
      )}
    </div>
  );
}
