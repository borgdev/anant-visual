import { GEOMETRY, ICON_ROOM, lineBudget, shapeOf, type DiagramSpec, type Layout, type PlacedEdge, type PlacedNode } from "./diagram.js";
import type { Ink } from "./color.js";
import { SHAPE_TEXT, shapeGeometry, type NodeShape } from "./shapes.js";
import type { Primitive, Scene, SceneItem } from "./scene.js";
import { SURFACE, STROKE } from "./tokens.js";

/**
 * Turns a laid-out diagram into a scene. The look is the one `FlowDiagram` has always
 * had (role by shape, tone by colour, group as a faint plane), now expressed as
 * primitives so the same drawing can be a page figure, a file or a PNG.
 */

const LABEL_SIZE = 18;
const LABEL_LINE = 22.5;
const SUB_SIZE = 14;
const SUB_LINE = 18;
const EDGE_LABEL_SIZE = 13.3;
const GROUP_LABEL_SIZE = 12.6;
const GROUP_LABEL_LINE = 15.75;
const EDGE_DASH = "10 8";
const EXTERNAL_DASH = "7 6";
const ARROW_LENGTH = 12.8;
const ARROW_HALF = 6.4;

/** Greedy wrap on a character budget, the same estimate the layout sized the box with. */
export function wrap(text: string, perLine: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > perLine) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

const TONE_INK: Record<string, Ink | undefined> = {
  good: "good",
  watch: "watch",
  warn: "warn",
  bad: "bad",
  primary: "primary",
  muted: "muted",
};

/** The ink and line of a node's outline, from its role and tone. */
function nodeStyle(node: PlacedNode) {
  const tone = node.tone ? TONE_INK[node.tone] : undefined;
  if (tone) return { fill: { ink: tone, opacity: 0.1 }, stroke: { ink: tone, opacity: 0.3 }, width: STROKE.hairline, dash: undefined, tone };
  if (node.role === "emphasis") return { fill: { ink: "primary" as const, opacity: SURFACE.medium }, stroke: { ink: "primary" as const, opacity: 0.5 }, width: STROKE.primary, dash: undefined, tone };
  return { fill: undefined, stroke: { ink: "border" as const }, width: STROKE.hairline, dash: node.role === "external" ? EXTERNAL_DASH : undefined, tone };
}

/** The outline of a node: a rect for a box or pill, a path for any other silhouette. */
function outlinePrims(node: PlacedNode): { prims: Primitive[]; text: { x: number; y: number; w: number; h: number } } {
  const shape = shapeOf(node);
  const style = nodeStyle(node);
  const prims: Primitive[] = [];
  if (shape === "box" || shape === "pill") {
    const rx = shape === "pill" ? node.h / 2 : 16;
    const rect = { t: "rect" as const, x: node.x, y: node.y, w: node.w, h: node.h, rx };
    prims.push({ ...rect, fill: { ink: "background" } }, { ...rect, fill: style.fill, stroke: style.stroke, strokeWidth: style.width, dash: style.dash });
    const room = node.w * SHAPE_TEXT[shape].wide;
    return { prims, text: { x: node.x + (node.w - room) / 2, y: node.y, w: room, h: node.h } };
  }
  const g = shapeGeometry(shape, node.x, node.y, node.w, node.h);
  for (const d of g.behind) prims.push({ t: "shape", d, stroke: style.stroke, strokeWidth: style.width, dash: style.dash });
  // The plain fill goes under the tint so a translucent tint never shows what is behind the node.
  prims.push({ t: "shape", d: g.outline, fill: { ink: "background" } });
  prims.push({ t: "shape", d: g.outline, fill: style.fill, stroke: style.stroke, strokeWidth: style.width, dash: style.dash });
  for (const d of g.details) prims.push({ t: "shape", d, stroke: style.stroke, strokeWidth: style.width });
  return { prims, text: g.text };
}

function nodeItem(node: PlacedNode, neighbours: Set<string>): SceneItem {
  const style = nodeStyle(node);
  const { prims, text } = outlinePrims(node);
  const budget = lineBudget(node, node.w);
  const labelLines = wrap(node.label, budget.label);
  const subLines = node.sublabel ? wrap(node.sublabel, budget.sub) : [];
  const iconRoom = node.icon ? ICON_ROOM : 0;
  const block = iconRoom + labelLines.length * LABEL_LINE + (subLines.length ? 3 + subLines.length * SUB_LINE : 0);
  const top = text.y + (text.h - block) / 2;
  const cx = text.x + text.w / 2;
  const ink = style.tone ?? "foreground";
  if (node.icon) prims.push({ t: "icon", name: node.icon, x: cx - 11, y: top, size: 22, stroke: { ink: style.tone ?? "muted" } });
  const labelTop = top + iconRoom;
  prims.push({ t: "text", x: cx, y: labelTop + LABEL_LINE / 2, lines: labelLines, size: LABEL_SIZE, lineHeight: LABEL_LINE, weight: 600, anchor: "middle", fill: { ink } });
  if (subLines.length) {
    prims.push({ t: "text", x: cx, y: labelTop + labelLines.length * LABEL_LINE + 3 + SUB_LINE / 2, lines: subLines, size: SUB_SIZE, lineHeight: SUB_LINE, weight: 400, anchor: "middle", fill: { ink: "muted" } });
  }
  return { kind: "node", ref: node.id, seq: node.layer, touches: [node.id, ...neighbours], prims };
}

/** The end of a path and the way it is heading there; with `atStart`, the start and the way it leaves. */
function tangent(d: string, atStart = false): { end: [number, number]; dir: [number, number] } {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const pts: [number, number][] = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
  const seq = atStart ? [...pts].reverse() : pts;
  const end = seq[seq.length - 1];
  let from = seq[seq.length - 2];
  for (let k = 3; from[0] === end[0] && from[1] === end[1] && seq.length - k >= 0; k++) from = seq[seq.length - k];
  const dx = end[0] - from[0];
  const dy = end[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  return { end, dir: [dx / len, dy / len] };
}

function arrowhead(d: string, atStart = false): [number, number][] {
  const { end, dir } = tangent(d, atStart);
  const [ux, uy] = dir;
  const base: [number, number] = [end[0] - ux * ARROW_LENGTH, end[1] - uy * ARROW_LENGTH];
  return [end, [base[0] - uy * ARROW_HALF, base[1] + ux * ARROW_HALF], [base[0] + uy * ARROW_HALF, base[1] - ux * ARROW_HALF]];
}

function edgeItems(edge: PlacedEdge, index: number, fromLayer: number): SceneItem[] {
  const ref = `${edge.from}>${edge.to}>${index}`;
  const seq = fromLayer + 0.5;
  const emphasis = edge.style === "emphasis";
  const dashed = edge.style === "dashed";
  const ink = { ink: "primary" as const };
  const items: SceneItem[] = [
    {
      kind: "edge",
      ref,
      seq,
      touches: [edge.from, edge.to],
      traceable: !dashed,
      prims: [
        { t: "path", d: edge.path, stroke: ink, strokeWidth: emphasis ? STROKE.emphasis : STROKE.primary, dash: dashed ? EDGE_DASH : undefined },
        ...(edge.arrow === "end" || edge.arrow === "both" ? [{ t: "poly" as const, points: arrowhead(edge.path), fill: ink }] : []),
        ...(edge.arrow === "start" || edge.arrow === "both" ? [{ t: "poly" as const, points: arrowhead(edge.path, true), fill: ink }] : []),
        { t: "pulse", d: edge.path, r: 5.5, fill: ink },
      ],
    },
  ];
  if (edge.label) {
    const w = edge.label.length * EDGE_LABEL_SIZE * 0.56 + 10.6;
    const h = EDGE_LABEL_SIZE * 1.25 + 5;
    items.push({
      kind: "edge-label",
      ref: `${ref}:label`,
      seq,
      touches: [edge.from, edge.to],
      prims: [
        { t: "rect", x: edge.mid.x - w / 2, y: edge.mid.y - h / 2, w, h, rx: 4, fill: { ink: "card" } },
        { t: "text", x: edge.mid.x, y: edge.mid.y, lines: [edge.label], size: EDGE_LABEL_SIZE, lineHeight: EDGE_LABEL_SIZE * 1.25, weight: 500, anchor: "middle", fill: { ink: "muted" } },
      ],
    });
  }
  return items;
}

/** A miniature of what a legend entry stands for, drawn in a box at (x, y - 11), 34 wide and 22 tall. */
function swatch(key: string, x: number, y: number): Primitive[] {
  const w = GEOMETRY.legendSwatch;
  const top = y - 11;
  const box = { t: "rect" as const, x, y: top, w, h: 22, rx: 6 };
  const line = (strokeWidth: number, dash?: string): Primitive[] => [
    { t: "path", d: `M${x},${y} L${x + w - 10},${y}`, stroke: { ink: "primary" }, strokeWidth, dash },
    { t: "poly", points: [[x + w, y], [x + w - 10, y + 5], [x + w - 10, y - 5]], fill: { ink: "primary" } },
  ];
  if (key === "emphasis") return [{ ...box, fill: { ink: "primary", opacity: SURFACE.medium }, stroke: { ink: "primary", opacity: 0.5 }, strokeWidth: STROKE.primary }];
  if (key === "external") return [{ ...box, stroke: { ink: "border" }, strokeWidth: STROKE.hairline, dash: "5 4" }];
  if (key === "terminal") return [{ ...box, rx: 11, stroke: { ink: "border" }, strokeWidth: STROKE.hairline }];
  if (key === "dashed") return line(STROKE.primary, "6 5");
  if (key === "emphasis-edge") return line(STROKE.emphasis);
  const tone = TONE_INK[key];
  if (tone) return [{ ...box, fill: { ink: tone, opacity: 0.1 }, stroke: { ink: tone, opacity: 0.3 }, strokeWidth: STROKE.hairline }];
  const g = shapeGeometry(key as Exclude<NodeShape, "box" | "pill">, x, top, w, 22);
  return [
    ...g.behind.map((d) => ({ t: "shape" as const, d, stroke: { ink: "muted" as const }, strokeWidth: 1.25 })),
    { t: "shape", d: g.outline, fill: { ink: "background" }, stroke: { ink: "muted" }, strokeWidth: 1.5 },
    ...g.details.map((d) => ({ t: "shape" as const, d, stroke: { ink: "muted" as const }, strokeWidth: 1.5 })),
  ];
}

export function diagramToScene(spec: DiagramSpec, layout: Layout, description: string): Scene {
  const neighbours = new Map<string, Set<string>>(spec.nodes.map((n) => [n.id, new Set<string>()]));
  for (const e of spec.edges) {
    neighbours.get(e.from)!.add(e.to);
    neighbours.get(e.to)!.add(e.from);
  }
  const layerOf = new Map(layout.nodes.map((n) => [n.id, n.layer]));

  const items: SceneItem[] = [];
  for (const lane of layout.lanes) {
    const head = lane.head;
    items.push({
      kind: "lane",
      ref: lane.id,
      seq: -2,
      touches: [],
      prims: [
        { t: "rect", x: lane.x, y: lane.y, w: lane.w, h: lane.h, rx: 14, fill: { ink: "muted", opacity: 0.05 }, stroke: { ink: "border" }, strokeWidth: STROKE.hairline },
        { t: "rect", x: head.x, y: head.y, w: head.w, h: head.h, rx: 14, fill: { ink: "muted", opacity: 0.12 } },
        {
          t: "text",
          x: head.x + head.w / 2,
          y: head.y + head.h / 2,
          lines: [lane.label.toUpperCase()],
          size: 13,
          lineHeight: 16,
          weight: 600,
          anchor: "middle",
          fill: { ink: "muted" },
          tracking: 0.65,
          rotate: lane.vertical ? undefined : -90,
        },
      ],
    });
  }
  for (const g of layout.groups) {
    const perLine = Math.max(1, Math.floor((g.w - 28) / GEOMETRY.groupLabelChar));
    items.push({
      kind: "region",
      ref: g.id,
      seq: -1,
      touches: [],
      prims: [
        { t: "rect", x: g.x, y: g.y, w: g.w, h: g.h, rx: 20, fill: { ink: "primary", opacity: SURFACE.faint } },
        { t: "text", x: g.x + 14, y: g.y + 8 + GROUP_LABEL_LINE / 2, lines: wrap(g.label.toUpperCase(), perLine), size: GROUP_LABEL_SIZE, lineHeight: GROUP_LABEL_LINE, weight: 600, anchor: "start", fill: { ink: "muted" }, tracking: 0.63 },
      ],
    });
  }
  layout.edges.forEach((edge, i) => items.push(...edgeItems(edge, i, layerOf.get(edge.from) ?? 0)));
  layout.nodes.forEach((node) => items.push(nodeItem(node, neighbours.get(node.id)!)));
  layout.legend.forEach((entry, i) =>
    items.push({
      kind: "legend",
      ref: `legend:${i}`,
      seq: 0,
      touches: [],
      prims: [
        ...swatch(entry.swatch, entry.x, entry.y),
        { t: "text", x: entry.x + GEOMETRY.legendSwatch + 10, y: entry.y, lines: [entry.label], size: 13.5, lineHeight: 17, weight: 400, anchor: "start", fill: { ink: "muted" } },
      ],
    })
  );

  return {
    id: spec.id,
    width: layout.width,
    height: layout.height,
    title: spec.label,
    description: description || spec.caption,
    items,
    motion: spec.motion,
    interactive: spec.interactive,
  };
}
