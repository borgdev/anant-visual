import { z } from "zod";
import type { ZodType } from "zod";
import { MOTIONS, type Motion, type Scene, type SceneItem } from "../scene.js";
import { nodeItem } from "../diagram-scene.js";
import { textHeightAt, type PlacedNode } from "../diagram.js";

/**
 * What every figure kind shares: an id, a label, a caption that states the concept, and
 * the motion it may ask for. A kind adds its own fields and a layout that ends in a
 * scene, so it is drawn, exported and animated by the same renderer as a diagram.
 */
export const slug = z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/, "ids are lowercase slugs");

export const figureBase = {
  id: slug,
  /** Uppercase label above the figure. */
  label: z.string().min(1),
  caption: z.string().min(60, "a caption must state the concept (60+ characters)"),
  motion: z.array(z.enum(MOTIONS)).default([]),
  interactive: z.boolean().default(false),
};

/** Artboard width beyond which the type would render too small to read. */
export const MAX_WIDTH = 1400;

export function parseFigure<S extends ZodType>(schema: S, input: unknown, kind: string): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const detail = result.error.issues.map((i) => `${i.path.join(".") || "spec"}: ${i.message}`).join("; ");
    throw new Error(`Invalid ${kind} "${(input as { id?: string })?.id ?? "?"}": ${detail}`);
  }
  return result.data;
}

export function tooWide(kind: string, id: string, width: number, advice: string): never {
  throw new Error(`Invalid ${kind} "${id}": it is ${Math.round(width)} units wide, and its text would render too small to read. ${advice}`);
}

export type BoxSpec = {
  id: string;
  label: string;
  sublabel?: string;
  role?: PlacedNode["role"];
  tone?: PlacedNode["tone"];
  shape?: PlacedNode["shape"];
  icon?: PlacedNode["icon"];
  x: number;
  y: number;
  w: number;
  h: number;
  seq: number;
  touches?: string[];
};

/** The height a box needs to hold its words at its width: what a figure sizes its boxes from. */
export function boxNeeds(b: Pick<BoxSpec, "label" | "sublabel" | "role" | "shape" | "icon">, width: number): number {
  return Math.ceil(textHeightAt({ label: b.label, sublabel: b.sublabel, role: b.role ?? "step", shape: b.shape, icon: b.icon }, width));
}

/**
 * A labelled box as a scene item, drawn exactly as a diagram node is. A box too small for its
 * words fails the build, like every other limit, rather than letting the text run out of it:
 * a figure sizes its boxes from `boxNeeds`, so this only fires on a case it did not foresee.
 */
export function boxItem(b: BoxSpec): SceneItem {
  const need = boxNeeds(b, b.w);
  if (need > b.h + 0.5) {
    throw new Error(`"${b.label}" needs ${need} units of height for its words and its box has ${Math.round(b.h)}; shorten the label or the detail`);
  }
  const node: PlacedNode = {
    id: b.id,
    label: b.label,
    sublabel: b.sublabel,
    role: b.role ?? "step",
    tone: b.tone,
    shape: b.shape,
    icon: b.icon,
    size: "md",
    x: b.x,
    y: b.y,
    w: b.w,
    h: b.h,
    layer: b.seq,
    row: 0,
  };
  const item = nodeItem(node, new Set(b.touches ?? []));
  item.seq = b.seq;
  return item;
}

export function buildScene(args: {
  id: string;
  label: string;
  caption: string;
  width: number;
  height: number;
  items: SceneItem[];
  motion: Motion[];
  interactive: boolean;
  equivalent: { text: string; detail?: string }[];
}): Scene {
  return {
    id: args.id,
    width: args.width,
    height: args.height,
    title: args.label,
    description: `${args.caption} ${args.equivalent.map((e) => (e.detail ? `${e.text} (${e.detail})` : e.text)).join(". ")}`,
    items: args.items,
    motion: args.motion,
    interactive: args.interactive,
    equivalent: args.equivalent,
  };
}

/** A smooth curve between two points that leaves and arrives along `axis`. */
export function curve(a: { x: number; y: number }, b: { x: number; y: number }, axis: "x" | "y"): { path: string; mid: { x: number; y: number } } {
  const r = (v: number) => Math.round(v * 100) / 100;
  if (axis === "x") {
    const m = (a.x + b.x) / 2;
    return { path: `M${r(a.x)},${r(a.y)} C${r(m)},${r(a.y)} ${r(m)},${r(b.y)} ${r(b.x)},${r(b.y)}`, mid: { x: m, y: (a.y + b.y) / 2 } };
  }
  const m = (a.y + b.y) / 2;
  return { path: `M${r(a.x)},${r(a.y)} C${r(a.x)},${r(m)} ${r(b.x)},${r(m)} ${r(b.x)},${r(b.y)}`, mid: { x: (a.x + b.x) / 2, y: m } };
}
