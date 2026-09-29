"use client";

import { Switch } from "./switch";
import type { HdriSettings } from "./types";

const sliderClass = "mt-1 w-full accent-white";

/** Sky (day/night HDRI) controls, shown as a section of the viewer menu. */
export function HdriSection({
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
  const set = <K extends keyof HdriSettings>(key: K, value: HdriSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-widest uppercase">Sky</span>
        <Switch
          checked={settings.enabled}
          onChange={(v) => set("enabled", v)}
          label="Sky environment"
        />
      </div>

      {hasDay && hasNight && (
        <label className="text-muted mt-2 block text-xs tracking-widest uppercase">
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
            disabled={!settings.enabled}
            onChange={(e) => set("mix", Number(e.target.value))}
            className={sliderClass}
          />
        </label>
      )}

      <label className="text-muted mt-3 block text-xs tracking-widest uppercase">
        Intensity {settings.intensity.toFixed(1)}x
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.1}
          value={settings.intensity}
          disabled={!settings.enabled}
          onChange={(e) => set("intensity", Number(e.target.value))}
          className={sliderClass}
        />
      </label>
    </>
  );
}
