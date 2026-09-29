"use client";

import { Switch } from "./switch";
import type { LightSettings } from "./types";

const sliderClass = "mt-1 w-full accent-white";

/** Beam (MVR fixture) controls, shown as a section of the viewer menu. */
export function LightSection({
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
  const set = <K extends keyof LightSettings>(key: K, value: LightSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-widest uppercase">
          Lights <span className="text-muted">({fixtureCount})</span>
        </span>
        <Switch checked={settings.enabled} onChange={(v) => set("enabled", v)} label="Beams" />
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
        Beams follow each fixture&apos;s rigged position and aim from the MVR. Optics come from the
        fixture type; MVR carries no DMX levels, so the look is set here.
      </p>
    </>
  );
}
