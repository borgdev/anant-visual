import type { Ink } from "./color.js";

/**
 * The scene: a diagram after layout, as a flat list of positioned drawing primitives.
 *
 * Every renderer reads this and nothing else. A layout engine (today the layered one in
 * `diagram.ts`, later others) turns a spec into a scene; the SVG renderer turns a scene
 * into markup that is identical on a page, in a file, in a PNG and in a deck. Colours
 * are inks, not values, so the host's theme decides on a page and a palette decides in
 * an export.
 */

export type Paint = { ink: Ink; opacity?: number };

export type Primitive =
  | {
      t: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      rx?: number;
      fill?: Paint;
      stroke?: Paint;
      strokeWidth?: number;
      dash?: string;
    }
  | { t: "path"; d: string; stroke: Paint; strokeWidth: number; dash?: string }
  | { t: "poly"; points: [number, number][]; fill: Paint }
  /** A closed outline (a node's silhouette), unlike `path`, which is a line that can be drawn on. */
  | { t: "shape"; d: string; fill?: Paint; stroke?: Paint; strokeWidth?: number; dash?: string }
  /** A built-in icon on a 24-unit grid, drawn at `size`. */
  | { t: "icon"; name: string; x: number; y: number; size: number; stroke: Paint }
  /** A mark that travels along a path. Invisible unless the `flow` motion is playing. */
  | { t: "pulse"; d: string; r: number; fill: Paint }
  | {
      t: "text";
      x: number;
      /** Centre of the first line; further lines follow at `lineHeight`. */
      y: number;
      lines: string[];
      size: number;
      lineHeight: number;
      weight: 400 | 500 | 600 | 700;
      anchor: "start" | "middle" | "end";
      fill: Paint;
      tracking?: number;
      /** Degrees about (x, y); a lane header on a row reads upward. */
      rotate?: number;
    };

/** What an item is, which decides how it is animated and how it responds to the pointer. */
export type ItemKind = "lane" | "region" | "node" | "edge" | "edge-label" | "legend";

export type SceneItem = {
  kind: ItemKind;
  /** The spec id this item came from (an edge uses `from>to>index`). */
  ref: string;
  /** Position in the reading sequence. Motion plays items in this order. */
  seq: number;
  /** Node ids this item belongs with: hovering one of them keeps the item in focus. */
  touches: string[];
  /** True for an edge that can be drawn on (solid); a dashed edge fades in instead. */
  traceable?: boolean;
  prims: Primitive[];
};

export const MOTIONS = ["reveal", "trace", "flow"] as const;
export type Motion = (typeof MOTIONS)[number];

export type Scene = {
  id: string;
  width: number;
  height: number;
  title: string;
  description: string;
  items: SceneItem[];
  motion: Motion[];
  interactive: boolean;
  /**
   * The accessible equivalent, in reading order, for figures that are not a diagram (a diagram
   * builds its own list from the same layout). A renderer shows it as a list beside the drawing.
   */
  equivalent?: { text: string; detail?: string }[];
};
