"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A viewer for a figure too big to read at the width of the page: the reader zooms and pans
 * it instead of the figure being shrunk until its words cannot be read.
 *
 * Panning is the browser's own scrolling (so scrollbars, touch and the arrow keys just work);
 * dragging with a mouse scrolls it too. Zoom is by the buttons, by `+` and `-` when the
 * viewer is focused, or by pinch or Ctrl/Cmd + wheel. The controls are real buttons with names,
 * outside the drawing, which stays hidden from assistive technology: the list is the equivalent.
 */
const STEPS = [0.35, 0.5, 0.75, 1, 1.5, 2, 3];

export function PanZoom({ width, height, children, label }: { width: number; height: number; children: ReactNode; label: string }) {
  const view = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(1);

  const apply = useCallback((next: number) => setZoom(Math.min(STEPS[STEPS.length - 1], Math.max(STEPS[0], next))), []);
  const step = (dir: 1 | -1) => {
    const now = zoom;
    const next = dir === 1 ? STEPS.find((s) => s > now + 0.001) ?? now : [...STEPS].reverse().find((s) => s < now - 0.001) ?? now;
    apply(next);
  };

  // Start at the width of the page, but never so small the type is unreadable.
  useEffect(() => {
    const el = view.current;
    if (!el) return;
    const f = Math.min(1, el.clientWidth / width);
    setFit(f);
    apply(Math.max(0.5, f));
  }, [width, apply]);

  useEffect(() => {
    const el = view.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      apply(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [zoom, apply]);

  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const btn = "rounded-md border bg-card px-2.5 py-1 text-sm font-medium hover:bg-muted focus-visible:outline-2";

  return (
    <div role="group" aria-label={`${label}: viewer`}>
      <div className="mb-2 flex items-center justify-end gap-1.5 text-muted-foreground">
        <span className="mr-auto text-xs">{Math.round(zoom * 100)}%</span>
        <button type="button" className={btn} aria-label="Zoom out" onClick={() => step(-1)}>−</button>
        <button type="button" className={btn} aria-label="Zoom in" onClick={() => step(1)}>+</button>
        <button type="button" className={btn} onClick={() => apply(Math.max(0.5, fit))}>Fit</button>
        <button type="button" className={btn} onClick={() => apply(1)}>100%</button>
      </div>
      <div
        ref={view}
        tabIndex={0}
        role="region"
        aria-label={`${label}: scroll to pan, plus and minus to zoom`}
        className="max-h-[75vh] cursor-grab overflow-auto rounded-xl border bg-background active:cursor-grabbing"
        onKeyDown={(e) => {
          if (e.key === "+" || e.key === "=") step(1);
          if (e.key === "-") step(-1);
          if (e.key === "0") apply(1);
        }}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || !view.current) return;
          drag.current = { x: e.clientX, y: e.clientY, left: view.current.scrollLeft, top: view.current.scrollTop };
          view.current.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current || !view.current) return;
          view.current.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
          view.current.scrollTop = drag.current.top - (e.clientY - drag.current.y);
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <div style={{ width: `${width * zoom}px`, height: `${height * zoom}px` }} aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
