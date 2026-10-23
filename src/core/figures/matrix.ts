import { z } from "zod";
import { TONES } from "../diagram.js";
import { TONE_INK } from "../diagram-scene.js";
import { STROKE } from "../tokens.js";
import type { SceneItem } from "../scene.js";
import { buildScene, figureBase, parseFigure, slug } from "./base.js";

/**
 * A two-by-two: items placed by two judgements, to show where things sit relative to each
 * other. It is a positioning aid, not a measurement, so positions are 0 to 1 within the
 * plot and the figure says so. A quadrant name states what that corner means.
 */

export const MAX_MATRIX_ITEMS = 16;

const axis = z.object({ label: z.string().min(1).max(32), low: z.string().min(1).max(20), high: z.string().min(1).max(20) });

export const matrixSpecSchema = z
  .object({
    ...figureBase,
    kind: z.literal("matrix"),
    x: axis,
    y: axis,
    /** Top-left, top-right, bottom-left, bottom-right. */
    quadrants: z.tuple([z.string().max(28), z.string().max(28), z.string().max(28), z.string().max(28)]).optional(),
    items: z
      .array(
        z.object({
          id: slug,
          label: z.string().min(1).max(32),
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
          tone: z.enum(TONES).optional(),
        })
      )
      .min(2)
      .max(MAX_MATRIX_ITEMS, `a matrix has at most ${MAX_MATRIX_ITEMS} items; split it`),
  })
  .superRefine((spec, ctx) => {
    const ids = new Set<string>();
    for (const i of spec.items) {
      if (ids.has(i.id)) ctx.addIssue({ code: "custom", message: `duplicate item id "${i.id}"` });
      ids.add(i.id);
    }
  });

export type MatrixSpecInput = z.input<typeof matrixSpecSchema>;

const M = { width: 920, height: 640, left: 120, right: 40, top: 50, bottom: 96, dot: 9, labelChar: 8.6, row: 21 };

export function matrixToScene(input: MatrixSpecInput) {
  const spec = parseFigure(matrixSpecSchema, input, "matrix");
  const px = M.left;
  const py = M.top;
  const pw = M.width - M.left - M.right;
  const ph = M.height - M.top - M.bottom;
  const cx = px + pw / 2;
  const cy = py + ph / 2;
  const items: SceneItem[] = [];

  // The frame: a plane, the two dividers, the quadrant names and the axis words.
  const text = (x: number, y: number, line: string, o: { size?: number; weight?: 400 | 600 | 700; anchor?: "start" | "middle" | "end"; rotate?: number; tracking?: number } = {}) => ({
    t: "text" as const,
    x,
    y,
    lines: [line],
    size: o.size ?? 14,
    lineHeight: 18,
    weight: o.weight ?? 400,
    anchor: o.anchor ?? ("middle" as const),
    fill: { ink: "muted" as const },
    rotate: o.rotate,
    tracking: o.tracking,
  });
  const frame = [
    { t: "rect" as const, x: px, y: py, w: pw, h: ph, rx: 14, fill: { ink: "primary" as const, opacity: 0.03 }, stroke: { ink: "border" as const }, strokeWidth: STROKE.hairline },
    { t: "path" as const, d: `M${cx},${py} L${cx},${py + ph}`, stroke: { ink: "border" as const }, strokeWidth: STROKE.primary, dash: "8 7" },
    { t: "path" as const, d: `M${px},${cy} L${px + pw},${cy}`, stroke: { ink: "border" as const }, strokeWidth: STROKE.primary, dash: "8 7" },
    text(cx, py + ph + 40, spec.x.label.toUpperCase(), { size: 13, weight: 600, tracking: 0.65 }),
    text(px, py + ph + 40, spec.x.low, { anchor: "start" }),
    text(px + pw, py + ph + 40, spec.x.high, { anchor: "end" }),
    text(px - 54, cy, spec.y.label.toUpperCase(), { size: 13, weight: 600, rotate: -90, tracking: 0.65 }),
    text(px - 14, py + ph - 4, spec.y.low, { anchor: "end" }),
    text(px - 14, py + 14, spec.y.high, { anchor: "end" }),
  ];
  if (spec.quadrants) {
    const [tl, tr, bl, br] = spec.quadrants;
    const q = (label: string, x: number, y: number, anchor: "start" | "end") => (label ? [text(x, y, label.toUpperCase(), { size: 12.5, weight: 600, anchor, tracking: 0.6 })] : []);
    frame.push(...q(tl, px + 16, py + 24, "start"), ...q(tr, px + pw - 16, py + 24, "end"), ...q(bl, px + 16, py + ph - 14, "start"), ...q(br, px + pw - 16, py + ph - 14, "end"));
  }
  items.push({ kind: "region", ref: "frame", seq: -1, touches: [], prims: frame });

  // Items. Labels sit beside the dot, on the side with room, and are nudged apart when they collide.
  const placed = spec.items.map((it) => ({ it, x: px + it.x * pw, y: py + (1 - it.y) * ph }));
  const boxes: { x1: number; x2: number; y: number }[] = [];
  const order = [...placed].sort((a, b) => a.y - b.y);
  const labelAt = new Map<string, { x: number; y: number; anchor: "start" | "end" }>();
  for (const p of order) {
    const anchor = p.x > px + pw * 0.72 ? "end" : "start";
    const w = p.it.label.length * M.labelChar;
    const x1 = anchor === "start" ? p.x + M.dot + 8 : p.x - M.dot - 8 - w;
    let y = p.y;
    while (boxes.some((b) => x1 < b.x2 && x1 + w > b.x1 && Math.abs(b.y - y) < M.row)) y += M.row;
    boxes.push({ x1, x2: x1 + w, y });
    labelAt.set(p.it.id, { x: anchor === "start" ? p.x + M.dot + 8 : p.x - M.dot - 8, y, anchor });
  }
  placed.forEach(({ it, x, y }, i) => {
    const ink = it.tone ? TONE_INK[it.tone]! : ("primary" as const);
    const label = labelAt.get(it.id)!;
    items.push({
      kind: "node",
      ref: it.id,
      seq: i,
      touches: [],
      prims: [
        { t: "shape", d: `M${x - M.dot},${y} a${M.dot},${M.dot} 0 1 0 ${2 * M.dot},0 a${M.dot},${M.dot} 0 1 0 ${-2 * M.dot},0 Z`, fill: { ink, opacity: 0.2 }, stroke: { ink }, strokeWidth: STROKE.emphasis },
        { t: "text", x: label.x, y: label.y, lines: [it.label], size: 16, lineHeight: 20, weight: 600, anchor: label.anchor, fill: { ink: "foreground" } },
      ],
    });
  });
  const half = (v: number, lo: string, hi: string) => (v >= 0.5 ? hi : lo);
  const equivalent = spec.items.map((it) => ({
    text: it.label,
    detail: `${half(it.y, spec.y.low, spec.y.high)} ${spec.y.label}, ${half(it.x, spec.x.low, spec.x.high)} ${spec.x.label}`,
  }));
  return buildScene({ ...spec, width: M.width, height: M.height, items, equivalent: [...equivalent, { text: "Positions show relative standing, not measured values." }] });
}
