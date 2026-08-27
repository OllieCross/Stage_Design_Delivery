"use client";

import { useState } from "react";
import type { LightSettings } from "./types";

const sliderClass = "w-full accent-white";

export function LightPanel({
  settings,
  onChange,
  fixtureCount,
  kindCounts,
}: {
  settings: LightSettings;
  onChange: (next: LightSettings) => void;
  fixtureCount: number;
  kindCounts: Array<[string, number]>;
}) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof LightSettings>(key: K, value: LightSettings[K]) =>
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
        Lights
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 border border-neutral-700 bg-black/85 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-muted text-xs tracking-widest uppercase">
              {fixtureCount} fixtures
            </span>
            <button
              onClick={() => set("enabled", !settings.enabled)}
              className="text-xs tracking-widest uppercase underline-offset-4 hover:underline"
            >
              {settings.enabled ? "Turn off" : "Turn on"}
            </button>
          </div>

          <label className="text-muted mt-4 block text-xs tracking-widest uppercase">
            Intensity {settings.intensity.toFixed(1)}x
            <input
              type="range"
              min={0.1}
              max={2}
              step={0.1}
              value={settings.intensity}
              onChange={(e) => set("intensity", Number(e.target.value))}
              className={sliderClass}
            />
          </label>

          <label className="text-muted mt-3 block text-xs tracking-widest uppercase">
            Beam spread {settings.angleScale.toFixed(1)}x
            <input
              type="range"
              min={0.4}
              max={2.5}
              step={0.1}
              value={settings.angleScale}
              onChange={(e) => set("angleScale", Number(e.target.value))}
              className={sliderClass}
            />
          </label>

          <label className="text-muted mt-3 block text-xs tracking-widest uppercase">
            Throw {settings.lengthScale.toFixed(1)}x
            <input
              type="range"
              min={0.3}
              max={2.5}
              step={0.1}
              value={settings.lengthScale}
              onChange={(e) => set("lengthScale", Number(e.target.value))}
              className={sliderClass}
            />
          </label>

          <ul className="text-muted mt-4 space-y-0.5 text-[10px] uppercase">
            {kindCounts.map(([kind, count]) => (
              <li key={kind} className="flex justify-between">
                <span>{kind}</span>
                <span className="tabular-nums">{count}</span>
              </li>
            ))}
          </ul>

          <p className="text-muted mt-3 text-[10px] leading-relaxed">
            Beams follow each fixture&apos;s rigged position and aim from the MVR. Optics come from
            the fixture type; MVR carries no DMX levels, so the look is set here.
          </p>
        </div>
      )}
    </div>
  );
}
