import { useId } from "react";
import { cx as cn } from "./cx.js";
import { FigureFrame } from "./figure-frame.js";
import { STATUS_TONES } from "./styles.js";
import {
  describeDiagram,
  layoutDiagram,
  showDrawingFrom,
  parseDiagram,
  type DiagramNode,
  type DiagramSpecInput,
} from "../core/diagram.js";
import { STROKE, SURFACE } from "../core/tokens.js";

/**
 * Diagram class renderer (`docs/visual-language.md` §4.5).
 *
 * Nodes are HTML boxes laid over an SVG that draws only the edges and group
 * regions, so every word is real text: it reflows, translates and can be selected.
 * The drawing is `aria-hidden`; the ordered list generated from the same layout is
 * the one accessible equivalent. It is visible on narrow screens, where the
 * diagram would be too small to read, and screen-reader-only from `md` up.
 *
 * Shape carries meaning so the distinctions survive greyscale: `emphasis` is the
 * one node the figure is about (heavier border), `external` is outside our control
 * (dashed), `terminal` is where the flow ends (pill).
 */
const ROLE_STYLE: Record<DiagramNode["role"], string> = {
  step: "rounded-xl border bg-background",
  emphasis: "rounded-xl border-2 border-primary/50 bg-primary/[0.12]",
  external: "rounded-xl border border-dashed bg-background",
  terminal: "rounded-full border bg-background",
};

const EDGE_DASH = "10 8";

// Whole class names, so Tailwind can see them.
const SHOW = { sm: "sm:block", md: "md:block", lg: "lg:block" } as const;
const HIDE_LIST = { sm: "sm:sr-only", md: "md:sr-only", lg: "lg:sr-only" } as const;

export function FlowDiagram({ spec: input }: { spec: DiagramSpecInput }) {
  // Validated here, at build time, so a malformed diagram fails the build.
  const spec = parseDiagram(input);
  const layout = layoutDiagram(spec);
  const equivalent = describeDiagram(spec, layout);
  const markerId = useId().replace(/:/g, "");
  const { width, height } = layout;
  const pctX = (x: number) => `${(x / width) * 100}%`;
  const pctY = (y: number) => `${(y / height) * 100}%`;
  // A wide diagram needs more room to stay legible, so it switches to the list later.
  const showAt = showDrawingFrom(width, spec.direction);

  return (
    <FigureFrame label={spec.label} caption={spec.caption} figureProps={{ "data-diagram": spec.id }}>
      <div aria-hidden="true" className={cn("hidden", SHOW[showAt])}>
        {/* The container is a wrapper and the type size sits on its child: a container
            query unit resolves against an ancestor container, never the element that
            declares it, so `cqw` on the same element would fall back to the viewport. */}
        <div
          className="mx-auto w-full"
          style={{ maxWidth: `${spec.direction === "ttb" ? width : Math.max(width, 640)}px`, containerType: "inline-size" }}
        >
        <div
          className="relative w-full"
          style={{
            aspectRatio: `${width} / ${height}`,
            // 18 artboard units of text, scaled with the diagram.
            fontSize: `${(18 / width) * 100}cqw`,
          }}
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 h-full w-full text-primary"
            focusable="false"
          >
            <defs>
              <marker
                id={`${markerId}-arrow`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerUnits="userSpaceOnUse"
                markerWidth="16"
                markerHeight="16"
                orient="auto-start-reverse"
              >
                <path d="M1,1 L9,5 L1,9 Z" fill="currentColor" />
              </marker>
            </defs>

            {layout.groups.map((group) => (
              <rect
                key={group.id}
                x={group.x}
                y={group.y}
                width={group.w}
                height={group.h}
                rx="20"
                fill="currentColor"
                fillOpacity={SURFACE.faint}
              />
            ))}

            {layout.edges.map((edge, i) => (
              <path
                key={i}
                d={edge.path}
                fill="none"
                stroke="currentColor"
                strokeWidth={edge.style === "emphasis" ? STROKE.emphasis : STROKE.primary}
                strokeLinecap="round"
                strokeDasharray={edge.style === "dashed" ? EDGE_DASH : undefined}
                markerEnd={`url(#${markerId}-arrow)`}
              />
            ))}
          </svg>

          {layout.groups.map((group) => (
            <span
              key={group.id}
              className="absolute font-semibold uppercase tracking-wider text-muted-foreground"
              style={{
                left: pctX(group.x + 14),
                top: pctY(group.y + 8),
                maxWidth: `${((group.w - 28) / width) * 100}%`,
                fontSize: "0.7em",
                lineHeight: 1.25,
              }}
            >
              {group.label}
            </span>
          ))}

          {layout.nodes.map((node) => (
            <div
              key={node.id}
              className={cn(
                "absolute flex flex-col items-center justify-center px-[0.6em] text-center leading-tight",
                ROLE_STYLE[node.role],
                node.tone && STATUS_TONES[node.tone]
              )}
              style={{
                left: pctX(node.x),
                top: pctY(node.y),
                width: `${(node.w / width) * 100}%`,
                height: `${(node.h / height) * 100}%`,
              }}
            >
              <span className="font-semibold">{node.label}</span>
              {node.sublabel ? (
                <span className="mt-0.5 text-[0.78em] text-muted-foreground">{node.sublabel}</span>
              ) : null}
            </div>
          ))}

          {layout.edges.map((edge, i) =>
            edge.label ? (
              <span
                key={`l-${i}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded bg-card px-[0.4em] py-[0.1em] text-[0.74em] font-medium text-muted-foreground"
                style={{ left: pctX(edge.mid.x), top: pctY(edge.mid.y) }}
              >
                {edge.label}
              </span>
            ) : null
          )}
        </div>
        </div>
      </div>

      <ol
        aria-label={`${spec.label}, as a list`}
        className={cn(
          "flex flex-col gap-2",
          HIDE_LIST[showAt]
        )}
      >
        {equivalent.map((item) => (
          <li key={item.id} className="rounded-xl border bg-background px-4 py-3 text-sm">
            <span className="font-semibold">{item.text}</span>
            {item.group ? <span className="block text-muted-foreground">In: {item.group}</span> : null}
            {item.leadsTo.length ? (
              <span className="block text-muted-foreground">Leads to: {item.leadsTo.join("; ")}</span>
            ) : null}
          </li>
        ))}
      </ol>
    </FigureFrame>
  );
}
