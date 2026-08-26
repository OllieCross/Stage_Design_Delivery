"use client";

import { PointerLockControls, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { Suspense, useRef, useState } from "react";
import { Movement } from "./movement";
import { StageModel } from "./stage-model";
import { EYE_HEIGHT, type Preset, type ViewMode } from "./types";

function Loader() {
  const { progress, active } = useProgress();
  if (!active && progress >= 100) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/80">
      <p className="text-muted text-sm tracking-widest uppercase">
        Loading model… {Math.round(progress)}%
      </p>
    </div>
  );
}

export default function StageViewer({
  modelUrl,
  presets,
  backHref,
  name,
}: {
  modelUrl: string;
  presets: Preset[];
  backHref: string;
  name: string;
}) {
  const [mode, setMode] = useState<ViewMode>("bird");
  const [locked, setLocked] = useState(false);
  const [presetRequest, setPresetRequest] = useState<{ seq: number; preset: Preset | null }>({
    seq: 0,
    preset: null,
  });
  const joystick = useRef({ x: 0, y: 0 });

  const goToPreset = (preset: Preset) => setPresetRequest((r) => ({ seq: r.seq + 1, preset }));

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ fov: 70, near: 0.1, far: 500, position: [0, EYE_HEIGHT, 8] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <hemisphereLight args={[0xffffff, 0x333344, 1.1]} />
        <directionalLight position={[10, 20, 10]} intensity={1.4} />
        <ambientLight intensity={0.25} />
        <Suspense fallback={null}>
          <StageModel url={modelUrl} />
        </Suspense>
        <Movement mode={mode} joystick={joystick} presetRequest={presetRequest} />
        <PointerLockControls
          selector="#viewer-canvas-lock"
          onLock={() => setLocked(true)}
          onUnlock={() => setLocked(false)}
        />
        <gridHelper args={[100, 100, 0x333333, 0x1a1a1a]} />
      </Canvas>

      <Loader />

      {/* Click-to-look target covering the canvas */}
      <div id="viewer-canvas-lock" className="absolute inset-0" aria-hidden />

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4">
        <div className="pointer-events-auto">
          <Link
            href={backHref}
            className="text-muted bg-black/60 px-3 py-2 text-xs tracking-widest uppercase backdrop-blur transition hover:text-white"
          >
            ← Back
          </Link>
        </div>
        <p className="text-muted max-w-[50%] truncate bg-black/60 px-3 py-2 text-xs tracking-widest uppercase backdrop-blur">
          {name}
        </p>
        <div className="pointer-events-auto flex overflow-hidden border border-neutral-700 bg-black/60 backdrop-blur">
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

      {/* Bottom bar: presets + hints */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 p-4">
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
        {!locked && (
          <p className="text-muted bg-black/60 px-3 py-1.5 text-center text-xs backdrop-blur">
            Click to look around · WASD move · Shift sprint
            {mode === "bird" ? " · Space/C up & down" : ""} · Esc release
          </p>
        )}
      </div>
    </div>
  );
}
