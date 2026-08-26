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
