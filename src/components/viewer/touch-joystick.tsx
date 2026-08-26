"use client";

import { useRef, useState } from "react";

const RADIUS = 56; // px travel radius of the stick

/**
 * On-screen joystick for walking on touch devices. Writes a normalized
 * {x, y} vector (-1..1) into the shared ref read by the Movement component.
 */
export function TouchJoystick({
  outputRef,
}: {
  outputRef: React.RefObject<{ x: number; y: number }>;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  function update(clientX: number, clientY: number) {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    let dx = clientX - (rect.left + rect.width / 2);
    let dy = clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    outputRef.current = { x: dx / RADIUS, y: dy / RADIUS };
  }

  function release() {
    pointerId.current = null;
    setKnob({ x: 0, y: 0 });
    outputRef.current = { x: 0, y: 0 };
  }

  return (
    <div
      ref={baseRef}
      onPointerDown={(e) => {
        pointerId.current = e.pointerId;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pointerId.current === e.pointerId) update(e.clientX, e.clientY);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      className="relative h-36 w-36 touch-none rounded-full border border-neutral-600 bg-black/40 backdrop-blur"
      aria-label="Movement joystick"
      role="application"
    >
      <div
        className="absolute top-1/2 left-1/2 h-14 w-14 rounded-full border border-neutral-400 bg-white/20"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
