"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Self-hosted worker: no external CDN, so the viewer works offline-ish and
// under a strict origin policy.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export default function PdfViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [width, setWidth] = useState(0);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Render pages at the container's width so A3 plots fill the screen.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-center gap-4 border-b border-neutral-800 px-4 py-2">
        <button
          onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
          className="text-muted text-xs tracking-widest uppercase transition hover:text-white"
          aria-label="Zoom out"
        >
          -
        </button>
        <span className="text-muted text-xs tabular-nums">{Math.round(scale * 100)}%</span>
        <button
          onClick={() => setScale((s) => Math.min(4, s + 0.25))}
          className="text-muted text-xs tracking-widest uppercase transition hover:text-white"
          aria-label="Zoom in"
        >
          +
        </button>
        {pageCount > 0 && (
          <span className="text-muted ml-4 text-xs">
            {pageCount} page{pageCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto px-2 py-4">
        {error ? (
          <p className="text-muted py-12 text-center text-sm">{error}</p>
        ) : (
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => setPageCount(numPages)}
            onLoadError={(e) => setError(e.message || "This PDF could not be displayed.")}
            loading={
              <p className="text-muted py-12 text-center text-sm tracking-widest uppercase">
                Loading document...
              </p>
            }
            className="flex flex-col items-center gap-4"
          >
            {Array.from({ length: pageCount }, (_, i) => (
              <Page
                key={i}
                pageNumber={i + 1}
                width={width ? width * scale : undefined}
                className="max-w-full shadow-lg"
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            ))}
          </Document>
        )}
      </div>
    </div>
  );
}
