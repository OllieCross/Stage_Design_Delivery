"use client";

import { useGLTF } from "@react-three/drei";

// Local Draco decoders (copied to /public/draco) keep the viewer fully
// self-hosted; meshopt decoding is bundled.
export function StageModel({ url }: { url: string }) {
  const { scene } = useGLTF(url, "/draco/", true);
  return <primitive object={scene} />;
}
