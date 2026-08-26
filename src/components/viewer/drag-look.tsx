"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";

const PITCH_LIMIT = Math.PI / 2 - 0.05;
const SENSITIVITY = 0.005;

/**
 * One-finger drag look for touch devices when the gyroscope is off or
 * unavailable. Listens on the overlay element that covers the canvas.
 */
export function DragLook({ enabled, targetId }: { enabled: boolean; targetId: string }) {
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    if (!enabled) return;
    const target = document.getElementById(targetId);
    if (!target) return;

    let pointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    const euler = new THREE.Euler(0, 0, 0, "YXZ");

    const down = (e: PointerEvent) => {
      if (pointerId !== null) return;
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      target.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      euler.setFromQuaternion(camera.quaternion);
      euler.y -= dx * SENSITIVITY;
      euler.x = THREE.MathUtils.clamp(euler.x - dy * SENSITIVITY, -PITCH_LIMIT, PITCH_LIMIT);
      euler.z = 0;
      camera.quaternion.setFromEuler(euler);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === pointerId) pointerId = null;
    };

    target.addEventListener("pointerdown", down);
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
    return () => {
      target.removeEventListener("pointerdown", down);
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };
  }, [enabled, targetId, camera]);

  return null;
}
