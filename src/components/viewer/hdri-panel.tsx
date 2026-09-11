"use client";

import { useState } from "react";
import type { HdriSettings } from "./types";

export function HdriPanel({
  settings,
  onChange,
  hasDay,
  hasNight,
}: {
  settings: HdriSettings;
  onChange: (next: HdriSettings) => void;
  hasDay: boolean;
  hasNight: boolean;
}) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof HdriSettings>(key: K, value: HdriSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`border px-3 py-2 text-xs font-semibold tracking-widest uppercase backdrop-blur transition ${
          settings.enabled
            ? "border-white bg-white text-black"
            : "text-muted border-neutral-700 bg-black/60 hover:text-white"
        }`}
      >
        Sky
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 border border-neutral-700 bg-black/85 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-muted text-xs tracking-widest uppercase">Environment</span>
            <button
              onClick={() => set("enabled", !settings.enabled)}
              className="text-xs tracking-widest uppercase underline-offset-4 hover:underline"
            >
              {settings.enabled ? "Turn off" : "Turn on"}
            </button>
          </div>

          {hasDay && hasNight && (
            <label className="text-muted mt-4 block text-xs tracking-widest uppercase">
              <span className="flex justify-between">
                <span>Day</span>
                <span>Night</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={settings.mix}
                onChange={(e) => set("mix", Number(e.target.value))}
                className="w-full accent-white"
              />
            </label>
          )}

          <label className="text-muted mt-4 block text-xs tracking-widest uppercase">
            Intensity {settings.intensity.toFixed(1)}x
            <input
              type="range"
              min={0.1}
              max={3}
              step={0.1}
              value={settings.intensity}
              onChange={(e) => set("intensity", Number(e.target.value))}
              className="w-full accent-white"
            />
          </label>
        </div>
      )}
    </div>
  );
}
