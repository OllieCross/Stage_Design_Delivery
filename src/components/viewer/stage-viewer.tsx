"use client";

import { PointerLockControls, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { Suspense, useMemo, useRef, useState } from "react";
import { Beams } from "./beams";
import { DragLook } from "./drag-look";
import { GyroLook } from "./gyro-look";
import { LightPanel } from "./light-panel";
import { Movement } from "./movement";
import { StageModel } from "./stage-model";
import { TouchJoystick } from "./touch-joystick";
import {
  DEFAULT_LIGHT_SETTINGS,
  EYE_HEIGHT,
  type Fixture,
  type LightSettings,
  type Preset,
  type ViewMode,
} from "./types";

const LOCK_TARGET_ID = "viewer-canvas-lock";

function Loader() {
  const { progress, active } = useProgress();
  if (!active && progress >= 100) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/80">
      <p className="text-muted text-sm tracking-widest uppercase">
        Loading model... {Math.round(progress)}%
      </p>
    </div>
  );
}

async function requestGyroPermission(): Promise<boolean> {
  const doe = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  if (typeof doe.requestPermission === "function") {
    try {
      return (await doe.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }
  return typeof DeviceOrientationEvent !== "undefined";
}

export default function StageViewer({
  modelUrl,
  presets,
  fixtures,
  backHref,
  name,
}: {
  modelUrl: string;
  presets: Preset[];
  fixtures: Fixture[];
  backHref: string;
  name: string;
}) {
  const [lights, setLights] = useState<LightSettings>(DEFAULT_LIGHT_SETTINGS);
  const kindCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of fixtures) counts.set(f.kind, (counts.get(f.kind) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [fixtures]);
  const [mode, setMode] = useState<ViewMode>("bird");
  const [locked, setLocked] = useState(false);
  // Rendered client-only (dynamic import with ssr: false), so window exists.
  const [isTouch] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );
  const [gyro, setGyro] = useState(false);
  const [presetRequest, setPresetRequest] = useState<{ seq: number; preset: Preset | null }>({
    seq: 0,
    preset: null,
  });
  const joystick = useRef({ x: 0, y: 0 });

  const goToPreset = (preset: Preset) => setPresetRequest((r) => ({ seq: r.seq + 1, preset }));

  async function toggleGyro() {
    if (gyro) {
      setGyro(false);
      return;
    }
    setGyro(await requestGyroPermission());
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <Canvas
        dpr={isTouch ? [1, 1.5] : [1, 1.75]}
        camera={{ fov: 70, near: 0.1, far: 500, position: [0, EYE_HEIGHT, 8] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <hemisphereLight args={[0xffffff, 0x333344, 1.1]} />
        <directionalLight position={[10, 20, 10]} intensity={1.4} />
        <ambientLight intensity={0.25} />
        <Suspense fallback={null}>
          <StageModel url={modelUrl} />
        </Suspense>
        <Beams fixtures={fixtures} settings={lights} />
        <Movement mode={mode} joystick={joystick} presetRequest={presetRequest} />
        {!isTouch && (
          <PointerLockControls
            selector={`#${LOCK_TARGET_ID}`}
            onLock={() => setLocked(true)}
            onUnlock={() => setLocked(false)}
          />
        )}
        {isTouch && <GyroLook enabled={gyro} />}
        {isTouch && <DragLook enabled={!gyro} targetId={LOCK_TARGET_ID} />}
        <gridHelper args={[100, 100, 0x333333, 0x1a1a1a]} />
      </Canvas>

      <Loader />

      {/* Look-control target covering the canvas (pointer lock on desktop, drag on touch) */}
      <div id={LOCK_TARGET_ID} className="absolute inset-0 touch-none" aria-hidden />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-4">
        <div className="pointer-events-auto">
          <Link
            href={backHref}
            className="text-muted bg-black/60 px-3 py-2 text-xs tracking-widest uppercase backdrop-blur transition hover:text-white"
          >
            Back
          </Link>
        </div>
        <p className="text-muted hidden max-w-[40%] truncate bg-black/60 px-3 py-2 text-xs tracking-widest uppercase backdrop-blur sm:block">
          {name}
        </p>
        <div className="pointer-events-auto flex items-center gap-2">
          {fixtures.length > 0 && (
            <LightPanel
              settings={lights}
              onChange={setLights}
              fixtureCount={fixtures.length}
              kindCounts={kindCounts}
            />
          )}
          {isTouch && (
            <button
              onClick={toggleGyro}
              className={`border px-3 py-2 text-xs font-semibold tracking-widest uppercase backdrop-blur transition ${
                gyro
                  ? "border-white bg-white text-black"
                  : "text-muted border-neutral-700 bg-black/60 hover:text-white"
              }`}
            >
              Gyro
            </button>
          )}
          <div className="flex overflow-hidden border border-neutral-700 bg-black/60 backdrop-blur">
            {(["bird", "person"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-2 text-xs font-semibold tracking-widest uppercase transition ${
                  mode === m ? "bg-white text-black" : "text-muted hover:text-white"
                }`}
              >
                {m === "bird" ? "Bird" : "Person"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar: presets + hints, joystick on touch */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 p-4">
        {presets.length > 0 && (
          <div className="pointer-events-auto flex flex-wrap justify-center gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => goToPreset(p)}
                className="text-muted border border-neutral-700 bg-black/60 px-3 py-1.5 text-xs tracking-widest uppercase backdrop-blur transition hover:border-white hover:text-white"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {isTouch ? (
          <div className="pointer-events-auto self-start pb-2 pl-2">
            <TouchJoystick outputRef={joystick} />
          </div>
        ) : (
          !locked && (
            <p className="text-muted self-center bg-black/60 px-3 py-1.5 text-center text-xs backdrop-blur">
              Click to look around · WASD move · Shift sprint
              {mode === "bird" ? " · Space/C up & down" : ""} · Esc release
            </p>
          )
        )}
      </div>
    </div>
  );
}
