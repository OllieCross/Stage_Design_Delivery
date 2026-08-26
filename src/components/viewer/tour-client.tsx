"use client";

import dynamic from "next/dynamic";
import type { Preset } from "./types";

// Three.js and the viewer load only on the client, and only on tour pages,
// keeping the rest of the site light.
const StageViewer = dynamic(() => import("./stage-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center">
      <p className="text-muted text-sm tracking-widest uppercase">Loading viewer…</p>
    </div>
  ),
});

export function TourClient(props: {
  modelUrl: string;
  presets: Preset[];
  backHref: string;
  name: string;
}) {
  return <StageViewer {...props} />;
}
