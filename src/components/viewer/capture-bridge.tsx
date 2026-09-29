"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { renderViewport } from "./capture";

export type CaptureFn = (width?: number, height?: number) => HTMLCanvasElement;

/**
 * Lives inside <Canvas> so it can reach the renderer, scene and camera, and
 * publishes a capture function for UI outside the canvas (the viewer menu).
 */
export function CaptureBridge({ captureRef }: { captureRef: React.RefObject<CaptureFn | null> }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    captureRef.current = (width, height) => {
      if (!(camera instanceof THREE.PerspectiveCamera)) {
        throw new Error("Capture needs a perspective camera");
      }
      return renderViewport(gl, scene, camera, width, height);
    };
    return () => {
      captureRef.current = null;
    };
  }, [gl, scene, camera, captureRef]);

  return null;
}
