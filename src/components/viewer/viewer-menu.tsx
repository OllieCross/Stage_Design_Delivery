"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  canvasToJpeg,
  captureBaseName,
  chooseSaveTarget,
  saveBlob,
  showPrintPage,
} from "./capture";
import type { CaptureFn } from "./capture-bridge";
import { Switch } from "./switch";
import { PERSON_HEIGHT_MAX, PERSON_HEIGHT_MIN, type ViewMode } from "./types";

type Busy = "render" | "print" | null;

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="border-t border-neutral-800 px-4 py-3 first:border-t-0">
      {title && <h3 className="text-muted mb-1 text-[10px] tracking-widest uppercase">{title}</h3>}
      {children}
    </section>
  );
}

/**
 * The tour's single options menu: view mode (Bird/Person switch), person
 * height, sky, lights, gyro, and the Render / Print exports. Sections that
 * don't apply (no HDRI uploaded, no fixtures, not a touch device) are passed
 * as null and simply don't render.
 */
export function ViewerMenu({
  mode,
  onModeChange,
  personHeight,
  onPersonHeightChange,
  gyro,
  sky,
  lights,
  capture,
  name,
  canPrint,
}: {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  personHeight: number;
  onPersonHeightChange: (height: number) => void;
  /** Touch devices only. */
  gyro: { enabled: boolean; onToggle: () => void } | null;
  sky: ReactNode;
  lights: ReactNode;
  capture: () => CaptureFn | null;
  name: string;
  /** Print is desktop-only. */
  canPrint: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Close on a click/tap anywhere outside the menu, or on Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function takeCapture() {
    const fn = capture();
    if (!fn) throw new Error("The viewer isn't ready yet");
    return fn();
  }

  async function handleRender() {
    setError(null);
    setBusy("render");
    try {
      const filename = `${captureBaseName(name, new Date())}.jpg`;
      // Ask where to save first, while the click still counts as a user
      // gesture - the save dialog can't be opened after a long render.
      const target = await chooseSaveTarget(filename);
      if (!target) return;
      const blob = await canvasToJpeg(takeCapture());
      await saveBlob(blob, filename, target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Render failed");
    } finally {
      setBusy(null);
    }
  }

  async function handlePrint() {
    setError(null);
    // Opened synchronously on the click, or pop-up blockers stop it.
    const win = window.open("", "_blank");
    if (!win) {
      setError("Allow pop-ups for this site to print.");
      return;
    }
    win.document.title = "Preparing print...";
    win.document.body.textContent = "Rendering...";
    setBusy("print");
    try {
      const blob = await canvasToJpeg(takeCapture());
      const now = new Date();
      showPrintPage(
        win,
        URL.createObjectURL(blob),
        `White Production · ${name} · ${now.toLocaleString()}`,
        captureBaseName(name, now),
      );
    } catch (e) {
      win.close();
      setError(e instanceof Error ? e.message : "Print failed");
    } finally {
      setBusy(null);
    }
  }

  const actionClass =
    "flex min-h-11 flex-1 items-center justify-center border border-neutral-700 px-3 text-xs font-semibold tracking-widest uppercase transition hover:border-white hover:text-white disabled:opacity-40";

  return (
    <div ref={rootRef} className="relative">
      <div className="overflow-hidden border border-neutral-700 bg-black/60 backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={panelId}
          className={`flex min-h-11 items-center gap-2 px-3 text-xs font-semibold tracking-widest uppercase transition ${
            open ? "bg-white text-black" : "text-muted hover:text-white"
          }`}
        >
          Menu
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            aria-hidden
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 mt-2 max-h-[calc(100dvh-7rem)] w-72 overflow-y-auto border border-neutral-700 bg-black/85 backdrop-blur"
        >
          <Section title="View">
            <div className="flex items-center justify-between gap-2 text-xs tracking-widest uppercase">
              <button
                type="button"
                onClick={() => onModeChange("bird")}
                className={`min-h-11 ${mode === "bird" ? "text-white" : "text-muted hover:text-white"}`}
              >
                Bird
              </button>
              <Switch
                checked={mode === "person"}
                onChange={(person) => onModeChange(person ? "person" : "bird")}
                label="Person view"
              />
              <button
                type="button"
                onClick={() => onModeChange("person")}
                className={`min-h-11 ${mode === "person" ? "text-white" : "text-muted hover:text-white"}`}
              >
                Person
              </button>
            </div>

            <label className="text-muted mt-2 block text-xs tracking-widest uppercase">
              Person height {personHeight.toFixed(2)} m
              <input
                type="range"
                min={PERSON_HEIGHT_MIN}
                max={PERSON_HEIGHT_MAX}
                step={0.01}
                value={personHeight}
                onChange={(e) => onPersonHeightChange(Number(e.target.value))}
                className="mt-1 w-full accent-white"
              />
            </label>

            {gyro && (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs tracking-widest uppercase">Gyro look</span>
                <Switch checked={gyro.enabled} onChange={gyro.onToggle} label="Gyro look" />
              </div>
            )}
          </Section>

          {sky && <Section>{sky}</Section>}
          {lights && <Section>{lights}</Section>}

          <Section title="Export 4K">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRender}
                disabled={busy !== null}
                className={actionClass}
              >
                {busy === "render" ? "Rendering..." : "Render"}
              </button>
              {canPrint && (
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={busy !== null}
                  className={actionClass}
                >
                  {busy === "print" ? "Rendering..." : "Print"}
                </button>
              )}
            </div>
            <p className="text-muted mt-2 text-[10px] leading-relaxed">
              3840 × 2160 of the current view.{" "}
              {canPrint ? "Render saves a JPEG; Print opens your print dialog." : "Saves a JPEG."}
            </p>
            {error && (
              <p role="alert" className="mt-2 text-xs text-red-400">
                {error}
              </p>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
