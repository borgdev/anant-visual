import { INK_VAR, resolveInk, type Ink, type Theme } from "./color.js";
import type { Paint, Primitive, Scene, SceneItem } from "./scene.js";

/**
 * Scene to SVG, as a string. Pure, with no React and no DOM, so it runs in a build
 * script, a CLI or a server and gives the same bytes everywhere.
 *
 * Two modes. `inline` is for a page: colours are `var(--token)` so the host's theme
 * (light, dark, a brand) applies, the drawing is hidden from assistive technology
 * (the generated list is the accessible equivalent) and motion waits for the host to
 * arm it. `standalone` is for a file, a PNG or a deck: colours are literal, the SVG
 * carries a title and description, and any motion plays on load.
 */

export type RenderOptions = {
  mode?: "inline" | "standalone";
  /** Standalone only. */
  theme?: Theme;
  /** Standalone only: override the brand inks. */
  palette?: Partial<Record<Ink, string>>;
  /** Standalone only: fill behind the drawing. `none` leaves the PNG transparent. */
  background?: "card" | "background" | "none";
  fontFamily?: string;
  /** Unique within the page, so two diagrams do not share CSS or ids. */
  scope?: string;
  /** Standalone only: let the `flow` motion repeat forever (a deck), not twice (a page). */
  loop?: boolean;
};

/** Motion timings in milliseconds. Named after the vocabulary in `theme.css`. */
export const TIMING = {
  step: 300,
  reveal: 450,
  trace: 600,
  head: 200,
  pulse: 1400,
} as const;

const KIND_ORDER = { lane: 0, region: 1, edge: 2, node: 3, "edge-label": 4 } as const;

const n = (v: number) => String(Math.round(v * 100) / 100);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Ctx = { standalone: boolean; resolve: (ink: Ink) => string };

function color(ctx: Ctx, ink: Ink): string {
  return ctx.standalone ? ctx.resolve(ink) : `var(${INK_VAR[ink]})`;
}

/**
 * Fill and stroke. In a file they are presentation attributes; on a page they are a
 * `style` declaration, because a `var()` is CSS and not every renderer accepts it as an
 * attribute value. Opacity is always an attribute.
 */
function ink(ctx: Ctx, fill?: Paint, stroke?: Paint, extra = "", css = ""): string {
  const op =
    (fill?.opacity !== undefined ? ` fill-opacity="${n(fill.opacity)}"` : "") +
    (stroke?.opacity !== undefined ? ` stroke-opacity="${n(stroke.opacity)}"` : "");
  if (ctx.standalone) {
    const attrs = ` fill="${fill ? color(ctx, fill.ink) : "none"}"${stroke ? ` stroke="${color(ctx, stroke.ink)}"` : ""}${op}${extra}`;
    return css ? `${attrs} style="${css}"` : attrs;
  }
  const decl = `fill:${fill ? color(ctx, fill.ink) : "none"}${stroke ? `;stroke:${color(ctx, stroke.ink)}` : ""}${css ? `;${css}` : ""}`;
  return ` style="${decl}"${op}${extra}`;
}

function primitive(ctx: Ctx, p: Primitive): string {
  switch (p.t) {
    case "rect": {
      const extra = (p.stroke ? ` stroke-width="${n(p.strokeWidth ?? 1)}"` : "") + (p.dash ? ` stroke-dasharray="${p.dash}"` : "");
      return `<rect x="${n(p.x)}" y="${n(p.y)}" width="${n(p.w)}" height="${n(p.h)}" rx="${n(p.rx ?? 0)}"${ink(ctx, p.fill, p.stroke, extra)}/>`;
    }
    case "path": {
      // `pathLength` rescales dash lengths too, so only a solid line (which is drawn on) gets it.
      const extra = ` stroke-width="${n(p.strokeWidth)}" stroke-linecap="round"${p.dash ? ` stroke-dasharray="${p.dash}"` : ` pathLength="1"`}`;
      return `<path class="line" d="${p.d}"${ink(ctx, undefined, p.stroke, extra)}/>`;
    }
    case "poly": {
      const pts = p.points.map(([x, y]) => `${n(x)},${n(y)}`).join(" ");
      return `<polygon class="head" points="${pts}"${ink(ctx, p.fill)}/>`;
    }
    case "pulse":
      return `<circle class="pulse" r="${n(p.r)}"${ink(ctx, p.fill, undefined, "", `offset-path:path('${p.d}')`)}/>`;
    case "text": {
      const fill = ctx.standalone ? `fill="${color(ctx, p.fill.ink)}"` : `style="fill:${color(ctx, p.fill.ink)}"`;
      const track = p.tracking ? ` letter-spacing="${n(p.tracking)}"` : "";
      const turn = p.rotate ? ` transform="rotate(${n(p.rotate)} ${n(p.x)} ${n(p.y)})"` : "";
      return p.lines
        .map(
          (line, i) =>
            `<text x="${n(p.x)}" y="${n(p.y + i * p.lineHeight + p.size * 0.35)}" text-anchor="${p.anchor}" font-size="${n(p.size)}" font-weight="${p.weight}"${track}${turn} ${fill}>${esc(line)}</text>`
        )
        .join("");
    }
  }
}

function css(scope: string, scene: Scene, ctx: Ctx, loop: boolean): string {
  const S = `.${scope}`;
  const out: string[] = [];
  out.push(`${S} text{font-family:var(--av-font,inherit)}`);
  out.push(`${S} .pulse{opacity:0}`);

  if (scene.motion.length) {
    const reveal = scene.motion.includes("reveal");
    const trace = scene.motion.includes("trace");
    const flow = scene.motion.includes("flow");
    const play = ctx.standalone ? S : `${S}[data-play]`;
    const m: string[] = [];
    // The dimmed starting state only exists once the host has armed the figure, so a page
    // that never runs the script (or a reader who declined motion) shows the whole drawing.
    if (!ctx.standalone) m.push(`${S}[data-armed]:not([data-play]) .m{opacity:0}`);
    if (reveal) {
      m.push(`${play} .node.m,${play} .lane.m,${play} .region.m,${play} .edge-label.m{animation:av-reveal ${TIMING.reveal}ms var(--ease-standard,ease-out) var(--d) backwards}`);
      m.push(`@keyframes av-reveal{from{opacity:0;transform:translateY(8px)}}`);
    }
    if (trace) {
      m.push(`${play} .edge.trace .line{stroke-dasharray:1;animation:av-trace ${TIMING.trace}ms var(--ease-standard,ease-out) var(--d) backwards}`);
      m.push(`@keyframes av-trace{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}`);
      m.push(`${play} .edge.trace .head{animation:av-reveal ${TIMING.head}ms ease-out calc(var(--d) + ${TIMING.trace}ms) backwards}`);
      m.push(`${play} .edge.trace.m{animation:none}`);
    }
    if (reveal || trace) {
      m.push(`${play} .edge.m:not(.trace){animation:av-reveal ${TIMING.reveal}ms var(--ease-standard,ease-out) var(--d) backwards}`);
    }
    if (flow) {
      m.push(`${play} .pulse{animation:av-pulse ${TIMING.pulse}ms linear var(--fd) ${loop ? "infinite" : "2"} backwards}`);
      m.push(`@keyframes av-pulse{0%{offset-distance:0%;opacity:0}12%{opacity:.9}88%{opacity:.9}100%{offset-distance:100%;opacity:0}}`);
    }
    // A reader who asks for no motion gets the static drawing: nothing here applies to them.
    out.push(`@media (prefers-reduced-motion:no-preference){${m.join("")}}`);
  }

  if (scene.interactive) {
    const rules = [`${S} :where(.node,.edge,.edge-label){transition:opacity var(--motion-flip,300ms) ease}`];
    for (const item of scene.items.filter((i) => i.kind === "node")) {
      const id = item.ref;
      rules.push(`${S}:has(.node[data-id="${id}"]:hover) :where(.node,.edge,.edge-label):not([data-t~="${id}"]){opacity:.22}`);
    }
    out.push(`@media (hover:hover) and (prefers-reduced-motion:no-preference){${rules.join("")}}`);
  }
  return out.join("");
}

function item(ctx: Ctx, it: SceneItem, scene: Scene, flowDelay: number): string {
  const traced = it.kind === "edge" && it.traceable === true && scene.motion.includes("trace");
  const reveals = scene.motion.includes("reveal") || scene.motion.includes("trace");
  // Only what an animation will act on is marked, so a flow-only figure is never dimmed first.
  const moves = it.kind === "edge" ? traced || reveals : reveals;
  const cls = [it.kind, traced ? "trace" : "", moves ? "m" : ""].filter(Boolean).join(" ");
  const touch = it.touches.length ? ` data-t="${it.touches.join(" ")}"` : "";
  const id = it.kind === "node" ? ` data-id="${it.ref}"` : "";
  const style = scene.motion.length ? ` style="--d:${Math.round(Math.max(0, it.seq) * TIMING.step)}ms;--fd:${flowDelay}ms"` : "";
  return `<g class="${cls}"${id}${touch}${style}>${it.prims.map((p) => primitive(ctx, p)).join("")}</g>`;
}

export function renderSvg(scene: Scene, options: RenderOptions = {}): string {
  const standalone = options.mode === "standalone";
  const theme = options.theme ?? "light";
  const ctx: Ctx = { standalone, resolve: (ink) => resolveInk(ink, theme, options.palette) };
  const scope = options.scope ?? `av-${scene.id}`;
  const animated = scene.motion.length > 0;
  const maxSeq = Math.max(0, ...scene.items.map((i) => i.seq));
  const flowStart = Math.round((maxSeq + 1) * TIMING.step + TIMING.trace + 200);
  const ordered = [...scene.items].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
  const body = ordered
    .map((it) => item(ctx, it, scene, flowStart + Math.round(Math.max(0, it.seq) * TIMING.step)))
    .join("");

  const attrs = [
    `xmlns="http://www.w3.org/2000/svg"`,
    `viewBox="0 0 ${n(scene.width)} ${n(scene.height)}"`,
    `class="${scope}"`,
    standalone ? `width="${n(scene.width)}" height="${n(scene.height)}" role="img"` : `aria-hidden="true" focusable="false"`,
    animated && standalone ? `data-play=""` : "",
    animated ? `data-motion="${scene.motion.join(" ")}"` : "",
    !standalone ? `style="width:100%;height:auto;display:block"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const font = options.fontFamily ? `.${scope}{--av-font:${options.fontFamily}}` : standalone ? `.${scope}{--av-font:Inter,system-ui,sans-serif}` : "";
  const ground = options.background ?? "card";
  const background =
    standalone && ground !== "none" ? `<rect width="${n(scene.width)}" height="${n(scene.height)}" fill="${color(ctx, ground)}"/>` : "";
  const title = standalone ? `<title>${esc(scene.title)}</title><desc>${esc(scene.description)}</desc>` : "";
  return `<svg ${attrs}>${title}<style>${font}${css(scope, scene, ctx, options.loop ?? false)}</style>${background}${body}</svg>`;
}
