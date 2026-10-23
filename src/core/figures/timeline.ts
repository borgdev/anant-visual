import { z } from "zod";
import { TONES } from "../diagram.js";
import { edgeSceneItems } from "../diagram-scene.js";
import { STROKE, SURFACE } from "../tokens.js";
import type { SceneItem } from "../scene.js";
import { MAX_WIDTH, boxItem, buildScene, figureBase, parseFigure, slug, tooWide } from "./base.js";

/**
 * A timeline: events in order along an axis, cards alternating either side. The spacing
 * is by order, not to scale, and the figure says so rather than imply a measured interval;
 * `when` is a label the author owns ("Q1", "Day 3", "2024"). Phases are bars across a
 * run of events.
 */

export const MAX_EVENTS_ACROSS = 8;
export const MAX_EVENTS_DOWN = 14;

export const timelineSpecSchema = z
  .object({
    ...figureBase,
    kind: z.literal("timeline"),
    direction: z.enum(["ltr", "ttb"]).default("ltr"),
    events: z
      .array(
        z.object({
          id: slug,
          when: z.string().min(1).max(16, "a `when` is at most 16 characters"),
          label: z.string().min(1).max(40),
          detail: z.string().max(80).optional(),
          tone: z.enum(TONES).optional(),
        })
      )
      .min(2),
    phases: z.array(z.object({ id: slug, label: z.string().min(1).max(32), from: slug, to: slug })).default([]),
  })
  .superRefine((spec, ctx) => {
    const ids = new Set(spec.events.map((e) => e.id));
    if (ids.size !== spec.events.length) ctx.addIssue({ code: "custom", message: "duplicate event id" });
    const limit = spec.direction === "ltr" ? MAX_EVENTS_ACROSS : MAX_EVENTS_DOWN;
    if (spec.events.length > limit) ctx.addIssue({ code: "custom", message: `a ${spec.direction === "ltr" ? "horizontal" : "vertical"} timeline has at most ${limit} events; split it` });
    const order = new Map(spec.events.map((e, i) => [e.id, i]));
    for (const p of spec.phases) {
      if (!ids.has(p.from) || !ids.has(p.to)) ctx.addIssue({ code: "custom", message: `phase "${p.id}" refers to an unknown event` });
      else if (order.get(p.from)! > order.get(p.to)!) ctx.addIssue({ code: "custom", message: `phase "${p.id}" ends before it starts` });
    }
  });

export type TimelineSpecInput = z.input<typeof timelineSpecSchema>;

const L = { step: 168, card: { w: 150, h: 92 }, stem: 46, pad: 48, axisGap: 40, phaseH: 28, phaseGap: 10 };
const TONE_OF = { good: "good", watch: "watch", warn: "warn", bad: "bad", primary: "primary", muted: "muted" } as const;

const circle = (cx: number, cy: number, r: number) => `M${cx - r},${cy} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0 Z`;

export function timelineToScene(input: TimelineSpecInput) {
  const spec = parseFigure(timelineSpecSchema, input, "timeline");
  const ltr = spec.direction === "ltr";
  const n = spec.events.length;
  const extent = n * L.step;
  // The axis runs through the middle; each event's card is on one side, alternating.
  const crossHalf = L.stem + (ltr ? L.card.h : L.card.w) + 28;
  const phaseRows = spec.phases.length;
  const width = ltr ? extent + 2 * L.pad : 2 * crossHalf + 2 * L.pad;
  const phaseSpace = phaseRows ? phaseRows * (L.phaseH + L.phaseGap) + 16 : 0;
  const height = (ltr ? 2 * crossHalf + 2 * L.pad : extent + 2 * L.pad) + (ltr ? phaseSpace : 0);
  if (width > MAX_WIDTH) tooWide("timeline", spec.id, width, 'Use direction "ttb", or fewer events.');
  const axis = L.pad + crossHalf; // the cross coordinate of the axis
  const at = (i: number) => L.pad + L.step * i + L.step / 2;
  const P = (along: number, cross: number) => (ltr ? { x: along, y: cross } : { x: cross, y: along });

  const items: SceneItem[] = [];
  const startPoint = P(L.pad / 2, axis);
  const endPoint = P(L.pad + extent + L.pad / 2, axis);
  items.push(
    ...edgeSceneItems(
      { from: "start", to: "end", path: `M${startPoint.x},${startPoint.y} L${endPoint.x},${endPoint.y}`, mid: P((L.pad + extent) / 2, axis), style: "solid", arrow: "end", width: STROKE.emphasis },
      "axis",
      -0.5
    )
  );
  spec.events.forEach((e, i) => {
    const side = i % 2 === 0 ? -1 : 1; // -1: above (or left), 1: below (or right)
    const d = P(at(i), axis);
    const cardW = L.card.w;
    const cardH = L.card.h;
    const from = P(at(i), axis + side * 8);
    const to = P(at(i), axis + side * L.stem);
    const ink = e.tone ? TONE_OF[e.tone] : "primary";
    items.push({
      kind: "node",
      ref: `${e.id}:marker`,
      seq: i,
      touches: [e.id],
      prims: [
        { t: "shape", d: circle(d.x, d.y, 9), fill: { ink: "background" }, stroke: { ink }, strokeWidth: STROKE.emphasis },
        { t: "shape", d: circle(d.x, d.y, 3.5), fill: { ink } },
        { t: "path", d: `M${from.x},${from.y} L${to.x},${to.y}`, stroke: { ink: "border" }, strokeWidth: STROKE.hairline },
      ],
    });
    // The date sits on the other side of the axis from the card, so neither crowds the other.
    const whenAt = ltr ? P(at(i), axis - side * 28) : P(at(i), axis - side * 20);
    items.push({
      kind: "node",
      ref: `${e.id}:when`,
      seq: i,
      touches: [e.id],
      prims: [{ t: "text", x: whenAt.x, y: whenAt.y, lines: [e.when], size: 15, lineHeight: 18, weight: 700, anchor: ltr ? "middle" : side === -1 ? "start" : "end", fill: { ink: e.tone ? TONE_OF[e.tone] : "foreground" } }],
    });
    const edge = P(at(i), axis + side * L.stem);
    const x = ltr ? edge.x - cardW / 2 : side === -1 ? edge.x - cardW : edge.x;
    const y = ltr ? (side === -1 ? edge.y - cardH : edge.y) : edge.y - cardH / 2;
    items.push(boxItem({ id: e.id, label: e.label, sublabel: e.detail, tone: e.tone, x, y, w: cardW, h: cardH, seq: i, touches: [] }));
  });
  // Phases: bars under the figure (beside it, top to bottom), each spanning the events it covers.
  const columnW = 34;
  spec.phases.forEach((p, k) => {
    const a = spec.events.findIndex((e) => e.id === p.from);
    const b = spec.events.findIndex((e) => e.id === p.to);
    const x1 = L.pad + L.step * a + 8;
    const x2 = L.pad + L.step * (b + 1) - 8;
    const rect = ltr
      ? { x: x1, y: height - L.pad / 2 - (phaseRows - k) * (L.phaseH + L.phaseGap) + L.phaseGap, w: x2 - x1, h: L.phaseH }
      : { x: width + 8 + k * columnW, y: x1, w: columnW - 6, h: x2 - x1 };
    items.push({
      kind: "region",
      ref: p.id,
      seq: a,
      touches: [],
      prims: [
        { t: "rect", ...rect, rx: 8, fill: { ink: "primary", opacity: SURFACE.medium } },
        { t: "text", x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, lines: [p.label], size: 14, lineHeight: 17, weight: 600, anchor: "middle", fill: { ink: "muted" }, rotate: ltr ? undefined : 90 },
      ],
    });
  });
  const equivalent = [
    ...spec.events.map((e) => ({ text: `${e.when}: ${e.label}`, detail: e.detail })),
    ...spec.phases.map((p) => ({ text: `Phase: ${p.label}`, detail: `from ${spec.events.find((e) => e.id === p.from)!.label} to ${spec.events.find((e) => e.id === p.to)!.label}` })),
  ];
  return buildScene({ ...spec, width: ltr ? width : width + (phaseRows ? 16 + phaseRows * columnW : 0), height, items, equivalent: [...equivalent, { text: "Events are shown in order, not to scale." }] });
}
