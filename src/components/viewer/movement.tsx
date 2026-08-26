"use client";

/* eslint-disable react-hooks/immutability -- react-three-fiber controls the
   camera imperatively; mutating it per frame is the intended pattern. */

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { EYE_HEIGHT, type Preset, type ViewMode } from "./types";
import { useKeys } from "./use-keys";

const WALK_SPEED = 3; // m/s
const FLY_SPEED = 6;
const SPRINT_FACTOR = 2.5;

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const move = new THREE.Vector3();

/**
 * Free movement driven by keyboard (and an optional external joystick
 * vector for touch devices). Bird mode flies along the look direction;
 * person mode walks on the ground plane at eye height.
 */
export function Movement({
  mode,
  joystick,
  presetRequest,
}: {
  mode: ViewMode;
  joystick?: React.RefObject<{ x: number; y: number }>;
  presetRequest: { seq: number; preset: Preset | null };
}) {
  const camera = useThree((s) => s.camera);
  const keys = useKeys();

  // Teleport to a preset when requested.
  useEffect(() => {
    const p = presetRequest.preset;
    if (!p) return;
    camera.position.set(p.x, mode === "person" ? EYE_HEIGHT : p.y, p.z);
    camera.rotation.order = "YXZ";
    camera.rotation.set(
      THREE.MathUtils.degToRad(p.pitch),
      THREE.MathUtils.degToRad(p.yaw),
      0,
      "YXZ",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- retrigger only per request
  }, [presetRequest.seq]);

  // Snap to eye height when switching into person mode.
  useEffect(() => {
    if (mode === "person") camera.position.y = EYE_HEIGHT;
  }, [mode, camera]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const k = keys.current;
    const joy = joystick?.current ?? { x: 0, y: 0 };

    let ahead =
      Number(k.has("KeyW") || k.has("ArrowUp")) - Number(k.has("KeyS") || k.has("ArrowDown"));
    let side =
      Number(k.has("KeyD") || k.has("ArrowRight")) - Number(k.has("KeyA") || k.has("ArrowLeft"));
    ahead += -joy.y;
    side += joy.x;
    const vertical =
      Number(k.has("Space") || k.has("KeyE")) - Number(k.has("KeyC") || k.has("KeyQ"));

    if (ahead === 0 && side === 0 && (mode === "person" || vertical === 0)) return;

    const sprint = k.has("ShiftLeft") || k.has("ShiftRight") ? SPRINT_FACTOR : 1;
    const speed = (mode === "person" ? WALK_SPEED : FLY_SPEED) * sprint;

    camera.getWorldDirection(forward);
    if (mode === "person") {
      forward.y = 0;
      forward.normalize();
    }
    right.crossVectors(forward, camera.up).normalize();

    move.set(0, 0, 0).addScaledVector(forward, ahead).addScaledVector(right, side);
    if (mode === "bird") move.y += vertical;
    if (move.lengthSq() > 1) move.normalize();

    camera.position.addScaledVector(move, speed * delta);
    if (mode === "person") camera.position.y = EYE_HEIGHT;
  });

  return null;
}
