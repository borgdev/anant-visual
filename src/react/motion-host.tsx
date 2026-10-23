"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Arms a figure's motion and plays it once, when it first scrolls into view.
 *
 * The server markup is the complete static drawing. This runs only after hydration, and
 * only for a reader who has not asked for reduced motion: it dims the figure's animated
 * parts (`data-armed`) and releases them (`data-play`) when 40% of it is visible. If the
 * script never runs, or the reader declined motion, nothing is ever hidden.
 */
export function MotionHost({ children, className }: { children: ReactNode; className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const svg = host.current?.querySelector<SVGSVGElement>("svg[data-motion]");
    if (!svg || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;
    svg.setAttribute("data-armed", "");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        svg.setAttribute("data-play", "");
        observer.disconnect();
      },
      { threshold: 0.4 }
    );
    observer.observe(svg);
    return () => {
      observer.disconnect();
      svg.removeAttribute("data-armed");
    };
  }, []);

  return (
    <div ref={host} className={className}>
      {children}
    </div>
  );
}
