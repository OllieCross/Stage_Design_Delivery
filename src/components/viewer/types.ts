export type Preset = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
};

export type ViewMode = "bird" | "person";

export const EYE_HEIGHT = 1.8;

export type Fixture = {
  id: string;
  name: string;
  kind: string;
  x: number;
  y: number;
  z: number;
  dirX: number;
  dirY: number;
  dirZ: number;
};

/**
 * MVR carries the rig's position and orientation but no live DMX levels, so
 * the look is driven from the viewer. Angle and throw are multipliers on each
 * fixture kind's own optics, so a beam stays tighter than a wash at any setting.
 */
export type LightSettings = {
  enabled: boolean;
  intensity: number;
  angleScale: number;
  lengthScale: number;
};

export const DEFAULT_LIGHT_SETTINGS: LightSettings = {
  enabled: true,
  intensity: 1,
  angleScale: 1,
  lengthScale: 1,
};

/**
 * Day/night sky, driven by the shared Day/Night HDRI pair (see HdriAsset -
 * global, not per-project). `mix` is a continuous 0 (day) to 1 (night)
 * crossfade rather than a hard switch: the visible sky blends smoothly
 * (hdri-sky.tsx's shader), while lighting/reflections snap to whichever side
 * is nearer, since blending two environment maps for IBL isn't cheap and the
 * effect is subtle on stage-truss materials anyway. Off by default so a
 * server with no HDRI uploaded looks exactly as it did before this existed.
 */
export type HdriSettings = {
  enabled: boolean;
  mix: number;
  intensity: number;
};

export const DEFAULT_HDRI_SETTINGS: HdriSettings = {
  enabled: false,
  mix: 0,
  intensity: 1,
};
