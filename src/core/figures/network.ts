import { z } from "zod";
import { TONES } from "../diagram.js";
import { TONE_INK, edgeSceneItems, wrap } from "../diagram-scene.js";
import { STROKE } from "../tokens.js";
import type { SceneItem } from "../scene.js";
import { buildScene, figureBase, parseFigure, slug } from "./base.js";

/**
 * A network: things and the links between them, with no reading order. The layout is a
 * force simulation, but a seeded one that runs to a fixed number of steps, so the same
 * spec always gives the same picture and the build is reproducible.
 */

export const MAX_NETWORK_NODES = 40;

export const networkSpecSchema = z
  .object({
    ...figureBase,
    kind: z.literal("network"),
    nodes: z
      .array(
        z.object({
          id: slug,
          label: z.string().min(1).max(28),
          /** How much it matters, 1 to 5; it sets the size of the node. */
          weight: z.number().min(1).max(5).default(2),
          tone: z.enum(TONES).optional(),
          /** Nodes of one cluster are drawn near each other. */
          cluster: slug.optional(),
        })
      )
      .min(3)
      .max(MAX_NETWORK_NODES, `a network has at most ${MAX_NETWORK_NODES} nodes; split it`),
    links: z.array(
      z.object({
        from: slug,
        to: slug,
        label: z.string().max(24).optional(),
        directed: z.boolean().default(false),
        style: z.enum(["solid", "dashed", "emphasis"]).default("solid"),
      })
    ),
  })
  .superRefine((spec, ctx) => {
    const ids = new Set<string>();
    for (const n of spec.nodes) {
      if (ids.has(n.id)) ctx.addIssue({ code: "custom", message: `duplicate node id "${n.id}"` });
      ids.add(n.id);
    }
    const linked = new Set<string>();
    for (const l of spec.links) {
      for (const end of [l.from, l.to]) {
        if (!ids.has(end)) ctx.addIssue({ code: "custom", message: `link refers to unknown node "${end}"` });
        linked.add(end);
      }
    }
    for (const n of spec.nodes) if (!linked.has(n.id)) ctx.addIssue({ code: "custom", message: `node "${n.id}" has no links` });
  });

export type NetworkSpecInput = z.input<typeof networkSpecSchema>;

const N = { width: 1000, height: 680, pad: 70, minR: 22, maxR: 40, iterations: 320 };

/** A small seeded generator, so a layout never depends on `Math.random`. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

export type NetworkPlacement = { id: string; x: number; y: number; r: number };

/** Fruchterman-Reingold, started with each cluster in its own sector, then spread until no two nodes touch. */
export function layoutNetwork(spec: z.output<typeof networkSpecSchema>): NetworkPlacement[] {
  const rand = seeded(hash(spec.id));
  const clusters = [...new Set(spec.nodes.map((n) => n.cluster ?? ""))];
  const radius = (w: number) => N.minR + ((w - 1) / 4) * (N.maxR - N.minR);
  const nodes = spec.nodes.map((n) => {
    const sector = (clusters.indexOf(n.cluster ?? "") / clusters.length) * Math.PI * 2;
    const spread = 0.9 + rand() * 0.6;
    return { id: n.id, r: radius(n.weight), x: Math.cos(sector + rand() * 0.8) * 200 * spread, y: Math.sin(sector + rand() * 0.8) * 160 * spread, dx: 0, dy: 0 };
  });
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const area = (N.width - 2 * N.pad) * (N.height - 2 * N.pad);
  const k = Math.sqrt(area / nodes.length) * 0.85;
  let temp = N.width / 8;
  for (let step = 0; step < N.iterations; step++) {
    for (const n of nodes) { n.dx = 0; n.dy = 0; }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[i].x - nodes[j].x;
        let dy = nodes[i].y - nodes[j].y;
        const d = Math.max(Math.hypot(dx, dy), 0.01);
        const f = (k * k) / d;
        dx /= d; dy /= d;
        nodes[i].dx += dx * f; nodes[i].dy += dy * f;
        nodes[j].dx -= dx * f; nodes[j].dy -= dy * f;
      }
    }
    for (const l of spec.links) {
      const a = nodes[index.get(l.from)!];
      const b = nodes[index.get(l.to)!];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      const d = Math.max(Math.hypot(dx, dy), 0.01);
      const f = (d * d) / k;
      dx /= d; dy /= d;
      a.dx -= dx * f; a.dy -= dy * f;
      b.dx += dx * f; b.dy += dy * f;
    }
    for (const n of nodes) {
      const d = Math.max(Math.hypot(n.dx, n.dy), 0.01);
      const m = Math.min(d, temp);
      n.x += (n.dx / d) * m;
      n.y += (n.dy / d) * m;
    }
    temp *= 0.985;
  }
  // Nodes that still touch are pushed apart, with room for a label under each.
  for (let pass = 0; pass < 80; pass++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const d = Math.max(Math.hypot(dx, dy), 0.01);
        const need = nodes[i].r + nodes[j].r + 44;
        if (d < need) {
          const push = (need - d) / 2;
          nodes[i].x -= (dx / d) * push; nodes[i].y -= (dy / d) * push;
          nodes[j].x += (dx / d) * push; nodes[j].y += (dy / d) * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  // Fit the whole thing to the canvas, keeping its shape.
  const minX = Math.min(...nodes.map((n) => n.x - n.r));
  const maxX = Math.max(...nodes.map((n) => n.x + n.r));
  const minY = Math.min(...nodes.map((n) => n.y - n.r));
  const maxY = Math.max(...nodes.map((n) => n.y + n.r + 34));
  const scale = Math.min((N.width - 2 * N.pad) / (maxX - minX), (N.height - 2 * N.pad) / (maxY - minY), 1.6);
  return nodes.map((n) => ({
    id: n.id,
    r: n.r,
    x: N.pad + (n.x - minX) * scale + ((N.width - 2 * N.pad) - (maxX - minX) * scale) / 2,
    y: N.pad + (n.y - minY) * scale + ((N.height - 2 * N.pad) - (maxY - minY) * scale) / 2,
  }));
}

export function networkToScene(input: NetworkSpecInput) {
  const spec = parseFigure(networkSpecSchema, input, "network");
  const place = new Map(layoutNetwork(spec).map((p) => [p.id, p]));
  const neighbours = new Map(spec.nodes.map((n) => [n.id, new Set<string>()]));
  for (const l of spec.links) { neighbours.get(l.from)!.add(l.to); neighbours.get(l.to)!.add(l.from); }
  const items: SceneItem[] = [];
  spec.links.forEach((l, i) => {
    const a = place.get(l.from)!;
    const b = place.get(l.to)!;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / d;
    const uy = (b.y - a.y) / d;
    const r = (v: number) => Math.round(v * 100) / 100;
    const from = { x: a.x + ux * a.r, y: a.y + uy * a.r };
    const to = { x: b.x - ux * (b.r + 2), y: b.y - uy * (b.r + 2) };
    items.push(
      ...edgeSceneItems(
        { from: l.from, to: l.to, path: `M${r(from.x)},${r(from.y)} L${r(to.x)},${r(to.y)}`, mid: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, style: l.style, arrow: l.directed ? "end" : "none" },
        `${l.from}>${l.to}>${i}`,
        0.5
      )
    );
  });
  spec.nodes.forEach((n) => {
    const p = place.get(n.id)!;
    const ink = n.tone ? TONE_INK[n.tone]! : ("primary" as const);
    const circle = `M${p.x - p.r},${p.y} a${p.r},${p.r} 0 1 0 ${2 * p.r},0 a${p.r},${p.r} 0 1 0 ${-2 * p.r},0 Z`;
    const lines = wrap(n.label, 16);
    items.push({
      kind: "node",
      ref: n.id,
      seq: 0,
      touches: [n.id, ...neighbours.get(n.id)!],
      prims: [
        { t: "shape", d: circle, fill: { ink: "background" } },
        { t: "shape", d: circle, fill: { ink, opacity: 0.14 }, stroke: { ink }, strokeWidth: STROKE.primary },
        { t: "text", x: p.x, y: p.y + p.r + 18, lines, size: 15, lineHeight: 18, weight: 600, anchor: "middle", fill: { ink: "foreground" } },
      ],
    });
  });
  const name = (id: string) => spec.nodes.find((n) => n.id === id)!.label;
  const equivalent = spec.nodes.map((n) => ({
    text: n.label,
    detail: `linked to ${[...neighbours.get(n.id)!].map(name).join(", ")}`,
  }));
  return buildScene({ ...spec, width: N.width, height: N.height, items, equivalent });
}
