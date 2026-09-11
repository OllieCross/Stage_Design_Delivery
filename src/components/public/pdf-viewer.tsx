"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Self-hosted worker: no external CDN, so the viewer works offline-ish and
// under a strict origin policy.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// How far outside the viewport a page is mounted (and unmounted) at. Large
// enough that scrolling feels instant, small enough that a 60-page pack
// never has more than a handful of canvases live at once.
const ROOT_MARGIN = "800px 0px";

export default function PdfViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelsRef = useRef(new Map<number, HTMLDivElement>());
  const [pageCount, setPageCount] = useState(0);
  // Natural (scale-1) aspect ratio per page, so an unmounted page can still
  // reserve its correct height and the scrollbar doesn't jump around.
  const [pageRatios, setPageRatios] = useState<number[]>([]);
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const [width, setWidth] = useState(0);
  // Documents open at 75%: an A3 plot fits on screen without immediate zooming.
  const [scale, setScale] = useState(0.75);
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

  const onLoadSuccess = useCallback(async (pdf: PDFDocumentProxy) => {
    setPageCount(pdf.numPages);
    const pages = await Promise.all(
      Array.from({ length: pdf.numPages }, (_, i) => pdf.getPage(i + 1)),
    );
    setPageRatios(
      pages.map((page) => {
        const vp = page.getViewport({ scale: 1 });
        return vp.height / vp.width;
      }),
    );
  }, []);

  // Mount only pages within ROOT_MARGIN of the viewport; unmount the rest so
  // a long document never holds more than a few rendered canvases at once.
  useEffect(() => {
    if (pageCount === 0) return;
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            const n = Number((entry.target as HTMLElement).dataset.page);
            if (entry.isIntersecting) next.add(n);
            else next.delete(n);
          }
          return next;
        });
      },
      { root, rootMargin: ROOT_MARGIN },
    );
    for (const el of sentinelsRef.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [pageCount]);

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
            onLoadSuccess={onLoadSuccess}
            onLoadError={(e) => setError(e.message || "This PDF could not be displayed.")}
            loading={
              <p className="text-muted py-12 text-center text-sm tracking-widest uppercase">
                Loading document...
              </p>
            }
            className="flex flex-col items-center gap-4"
          >
            {Array.from({ length: pageCount }, (_, i) => {
              const pageNumber = i + 1;
              const renderedWidth = width ? width * scale : undefined;
              const ratio = pageRatios[i];
              const height = renderedWidth && ratio ? renderedWidth * ratio : undefined;
              return (
                <div
                  key={pageNumber}
                  data-page={pageNumber}
                  ref={(el) => {
                    if (el) sentinelsRef.current.set(pageNumber, el);
                    else sentinelsRef.current.delete(pageNumber);
                  }}
                  style={height ? { minHeight: height } : undefined}
                  className="flex max-w-full justify-center"
                >
                  {visible.has(pageNumber) && (
                    <Page
                      pageNumber={pageNumber}
                      width={renderedWidth}
                      className="max-w-full shadow-lg"
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                    />
                  )}
                </div>
              );
            })}
          </Document>
        )}
      </div>
    </div>
  );
}
