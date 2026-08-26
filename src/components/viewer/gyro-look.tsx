"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const zee = new THREE.Vector3(0, 0, 1);
const euler = new THREE.Euler();
const q0 = new THREE.Quaternion();
const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // camera looks out the back of the device

/**
 * Drives camera orientation from device orientation (gyroscope), the same
 * math as three.js's DeviceOrientationControls. Active only while `enabled`.
 */
export function GyroLook({ enabled }: { enabled: boolean }) {
  const camera = useThree((s) => s.camera);
  const event = useRef<DeviceOrientationEvent | null>(null);
  const screenOrientation = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const onOrientation = (e: DeviceOrientationEvent) => {
      event.current = e;
    };
    const onScreen = () => {
      screenOrientation.current = (window.screen.orientation?.angle ?? 0) as number;
    };
    onScreen();
    window.addEventListener("deviceorientation", onOrientation);
    window.screen.orientation?.addEventListener("change", onScreen);
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      window.screen.orientation?.removeEventListener("change", onScreen);
      event.current = null;
    };
  }, [enabled]);

  useFrame(() => {
    const e = event.current;
    if (!enabled || !e || e.alpha === null) return;
    const alpha = THREE.MathUtils.degToRad(e.alpha ?? 0);
    const beta = THREE.MathUtils.degToRad(e.beta ?? 0);
    const gamma = THREE.MathUtils.degToRad(e.gamma ?? 0);
    const orient = THREE.MathUtils.degToRad(screenOrientation.current);

    euler.set(beta, alpha, -gamma, "YXZ");
    camera.quaternion.setFromEuler(euler);
    camera.quaternion.multiply(q1);
    camera.quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
  });

  return null;
}
