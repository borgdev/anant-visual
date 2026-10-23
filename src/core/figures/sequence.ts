import { z } from "zod";
import { edgeSceneItems } from "../diagram-scene.js";
import { NODE_SHAPES } from "../shapes.js";
import { ICON_NAMES } from "../icons.js";
import { TONES } from "../diagram.js";
import { STROKE } from "../tokens.js";
import type { SceneItem } from "../scene.js";
import { MAX_WIDTH, boxItem, buildScene, figureBase, parseFigure, slug, tooWide } from "./base.js";

/**
 * A sequence diagram: who talks to whom, in what order. Participants are columns with a
 * lifeline; each message is a row, so the order is the vertical order and also the
 * order the motion plays in.
 */

export const MAX_PARTICIPANTS = 6;
export const MAX_MESSAGES = 24;

export const sequenceSpecSchema = z
  .object({
    ...figureBase,
    kind: z.literal("sequence"),
    participants: z
      .array(
        z.object({
          id: slug,
          label: z.string().min(1).max(28),
          sublabel: z.string().max(40).optional(),
          shape: z.enum(NODE_SHAPES).optional(),
          icon: z.enum(ICON_NAMES).optional(),
          tone: z.enum(TONES).optional(),
        })
      )
      .min(2)
      .max(MAX_PARTICIPANTS, `a sequence has at most ${MAX_PARTICIPANTS} participants; split it`),
    messages: z
      .array(
        z.object({
          from: slug,
          to: slug,
          label: z.string().min(1).max(40),
          /** `solid` a call, `dashed` a reply or an asynchronous message, `emphasis` the one the figure is about. */
          style: z.enum(["solid", "dashed", "emphasis"]).default("solid"),
        })
      )
      .min(1)
      .max(MAX_MESSAGES, `a sequence has at most ${MAX_MESSAGES} messages; split it`),
    /** Number the messages, so the text and the drawing can be talked about by step. */
    numbered: z.boolean().default(true),
  })
  .superRefine((spec, ctx) => {
    const ids = new Set(spec.participants.map((p) => p.id));
    if (ids.size !== spec.participants.length) ctx.addIssue({ code: "custom", message: "duplicate participant id" });
    spec.messages.forEach((m, i) => {
      for (const end of [m.from, m.to]) if (!ids.has(end)) ctx.addIssue({ code: "custom", message: `message ${i + 1} refers to unknown participant "${end}"` });
    });
  });

export type SequenceSpecInput = z.input<typeof sequenceSpecSchema>;

const Q = { col: 200, head: { w: 170, h: 64 }, top: 24, firstRow: 64, row: 54, pad: 40, self: 56 };

export function sequenceToScene(input: SequenceSpecInput) {
  const spec = parseFigure(sequenceSpecSchema, input, "sequence");
  const n = spec.participants.length;
  const width = n * Q.col + 2 * Q.pad - (Q.col - Q.head.w);
  if (width > MAX_WIDTH) tooWide("sequence", spec.id, width, "Use fewer participants.");
  const rowY = (k: number) => Q.top + Q.head.h + Q.firstRow + k * Q.row;
  const height = rowY(spec.messages.length - 1) + Q.row + Q.pad;
  const cx = (id: string) => Q.pad + Q.head.w / 2 + spec.participants.findIndex((p) => p.id === id) * Q.col;
  const items: SceneItem[] = [];

  spec.participants.forEach((p, i) => {
    const x = cx(p.id);
    const box = boxItem({ id: p.id, label: p.label, sublabel: p.sublabel, shape: p.shape, icon: p.icon, tone: p.tone, x: x - Q.head.w / 2, y: Q.top, w: Q.head.w, h: Q.head.h, seq: -1 + i * 0.01, touches: spec.messages.filter((m) => m.from === p.id || m.to === p.id).flatMap((m) => [m.from, m.to]) });
    // The lifeline hangs from the box and belongs to it, so focusing a participant keeps it lit.
    box.prims.unshift({ t: "shape", d: `M${x},${Q.top + Q.head.h} L${x},${height - Q.pad / 2}`, stroke: { ink: "border" }, strokeWidth: STROKE.primary, dash: "6 7" });
    items.push(box);
  });

  spec.messages.forEach((m, k) => {
    const y = rowY(k);
    const a = cx(m.from);
    const b = cx(m.to);
    const label = spec.numbered ? `${k + 1}. ${m.label}` : m.label;
    const self = m.from === m.to;
    const path = self ? `M${a},${y} C${a + Q.self},${y} ${a + Q.self},${y + 26} ${a},${y + 26}` : `M${a},${y} L${b},${y}`;
    const mid = self ? { x: a + Q.self + (label.length * 7.4) / 2 + 10, y: y + 13 } : { x: (a + b) / 2, y: y - 14 };
    items.push(...edgeSceneItems({ from: m.from, to: m.to, path, mid, style: m.style, arrow: "end", label }, `m${k}`, k));
  });

  const name = (id: string) => spec.participants.find((p) => p.id === id)!.label;
  const equivalent = spec.messages.map((m, k) => ({
    text: `${k + 1}. ${name(m.from)} ${m.from === m.to ? "to itself" : `to ${name(m.to)}`}: ${m.label}`,
    detail: m.style === "dashed" ? "a reply or asynchronous" : undefined,
  }));
  return buildScene({ ...spec, width, height, items, equivalent });
}
