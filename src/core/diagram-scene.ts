import { GEOMETRY, type DiagramSpec, type Layout, type PlacedEdge, type PlacedNode } from "./diagram.js";
import type { Ink } from "./color.js";
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

function nodeItem(node: PlacedNode, neighbours: Set<string>): SceneItem {
  const tone = node.tone ? TONE_INK[node.tone] : undefined;
  const rx = node.role === "terminal" ? node.h / 2 : 16;
  const prims: Primitive[] = [{ t: "rect", x: node.x, y: node.y, w: node.w, h: node.h, rx, fill: { ink: "background" } }];

  // One tint-and-border rect over the plain fill, so a translucent tint never shows what is behind the box.
  if (tone) {
    prims.push({ t: "rect", x: node.x, y: node.y, w: node.w, h: node.h, rx, fill: { ink: tone, opacity: 0.1 }, stroke: { ink: tone, opacity: 0.3 }, strokeWidth: STROKE.hairline });
  } else if (node.role === "emphasis") {
    prims.push({ t: "rect", x: node.x, y: node.y, w: node.w, h: node.h, rx, fill: { ink: "primary", opacity: SURFACE.medium }, stroke: { ink: "primary", opacity: 0.5 }, strokeWidth: STROKE.primary });
  } else {
    prims.push({ t: "rect", x: node.x, y: node.y, w: node.w, h: node.h, rx, stroke: { ink: "border" }, strokeWidth: STROKE.hairline, dash: node.role === "external" ? EXTERNAL_DASH : undefined });
  }

  const labelLines = wrap(node.label, 15);
  const subLines = node.sublabel ? wrap(node.sublabel, 20) : [];
  const block = labelLines.length * LABEL_LINE + (subLines.length ? 3 + subLines.length * SUB_LINE : 0);
  const top = node.y + (node.h - block) / 2;
  const cx = node.x + node.w / 2;
  prims.push({ t: "text", x: cx, y: top + LABEL_LINE / 2, lines: labelLines, size: LABEL_SIZE, lineHeight: LABEL_LINE, weight: 600, anchor: "middle", fill: { ink: tone ?? "foreground" } });
  if (subLines.length) {
    prims.push({ t: "text", x: cx, y: top + labelLines.length * LABEL_LINE + 3 + SUB_LINE / 2, lines: subLines, size: SUB_SIZE, lineHeight: SUB_LINE, weight: 400, anchor: "middle", fill: { ink: "muted" } });
  }
  return { kind: "node", ref: node.id, seq: node.layer, touches: [node.id, ...neighbours], prims };
}

/** The last two points of a path, to point the arrowhead the way the line is going. */
function endTangent(d: string): { end: [number, number]; dir: [number, number] } {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const end: [number, number] = [n[n.length - 2], n[n.length - 1]];
  let from: [number, number] = [n[n.length - 4], n[n.length - 3]];
  if (from[0] === end[0] && from[1] === end[1]) from = [n[n.length - 6], n[n.length - 5]];
  const dx = end[0] - from[0];
  const dy = end[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  return { end, dir: [dx / len, dy / len] };
}

function arrowhead(d: string): [number, number][] {
  const { end, dir } = endTangent(d);
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
        { t: "poly", points: arrowhead(edge.path), fill: ink },
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

export function diagramToScene(spec: DiagramSpec, layout: Layout, description: string): Scene {
  const neighbours = new Map<string, Set<string>>(spec.nodes.map((n) => [n.id, new Set<string>()]));
  for (const e of spec.edges) {
    neighbours.get(e.from)!.add(e.to);
    neighbours.get(e.to)!.add(e.from);
  }
  const layerOf = new Map(layout.nodes.map((n) => [n.id, n.layer]));

  const items: SceneItem[] = [];
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
