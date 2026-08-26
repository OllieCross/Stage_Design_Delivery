"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type Item = { id: string; name: string; size: number };

export function ImageGallery({ images }: { images: Item[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (delta: number) => {
      setOpenIndex((i) => (i === null ? null : (i + delta + images.length) % images.length));
    },
    [images.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex, close, step]);

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setOpenIndex(i)}
            className="group relative aspect-square overflow-hidden border border-neutral-800 bg-neutral-900"
            title={img.name}
          >
            {/* Thumbnails come from the sharp-backed thumb endpoint. */}
            <Image
              src={`/api/files/${img.id}/thumb`}
              alt={img.name}
              fill
              unoptimized
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-muted truncate text-sm">{images[openIndex].name}</span>
            <div className="flex shrink-0 items-center gap-5">
              <a
                href={`/api/files/${images[openIndex].id}/download`}
                onClick={(e) => e.stopPropagation()}
                className="text-muted text-xs tracking-widest uppercase hover:text-white"
              >
                Download
              </a>
              <button
                className="text-muted text-xl leading-none hover:text-white"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
          <div className="relative flex-1">
            {/* Full-size view uses the raw endpoint. */}
            <Image
              src={`/api/files/${images[openIndex].id}/raw`}
              alt={images[openIndex].name}
              fill
              unoptimized
              className="object-contain p-4"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {images.length > 1 && (
            <div className="flex justify-center gap-8 px-6 py-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="text-muted text-xs tracking-widest uppercase hover:text-white"
              >
                ← Prev
              </button>
              <span className="text-muted text-xs">
                {openIndex + 1} / {images.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="text-muted text-xs tracking-widest uppercase hover:text-white"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
