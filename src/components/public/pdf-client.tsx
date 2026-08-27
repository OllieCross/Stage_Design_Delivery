"use client";

import dynamic from "next/dynamic";

// pdf.js is heavy, so it loads only on the document route.
const PdfViewer = dynamic(() => import("./pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-muted text-sm tracking-widest uppercase">Loading viewer...</p>
    </div>
  ),
});

export function PdfClient({ url }: { url: string }) {
  return <PdfViewer url={url} />;
}
