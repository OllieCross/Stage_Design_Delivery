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
