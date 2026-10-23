/**
 * Node shapes. Each is a distinct silhouette that means one thing, so the distinction
 * survives greyscale and a figure is read by shape before it is read by colour.
 *
 * | Shape | Reads as |
 * |---|---|
 * | `box` | An ordinary step or component |
 * | `pill` | Where a flow starts or ends |
 * | `cylinder` | A store of data |
 * | `diamond` | A decision |
 * | `hexagon` | A service or a boundary component |
 * | `queue` | A queue or a stream |
 * | `document` | An artefact: a file, a report, a record |
 * | `cloud` | Something outside, elastic or someone else's |
 * | `stack` | Many of the same (instances, replicas) |
 */
export const NODE_SHAPES = ["box", "pill", "cylinder", "diamond", "hexagon", "queue", "document", "cloud", "stack"] as const;
export type NodeShape = (typeof NODE_SHAPES)[number];

/** The share of the box's width the text may use, and the height the outline takes from it. */
export const SHAPE_TEXT: Record<NodeShape, { wide: number; spare: number }> = {
  box: { wide: 1, spare: 0 },
  pill: { wide: 0.88, spare: 0 },
  cylinder: { wide: 1, spare: 30 },
  diamond: { wide: 0.6, spare: 20 },
  hexagon: { wide: 0.82, spare: 0 },
  queue: { wide: 0.76, spare: 0 },
  document: { wide: 1, spare: 18 },
  cloud: { wide: 0.7, spare: 16 },
  stack: { wide: 1, spare: 14 },
};

export type ShapeGeometry = {
  /** Outlines drawn behind the main one, back to front. */
  behind: string[];
  outline: string;
  /** Strokes inside the outline that finish the shape (the front of a cylinder's lid). */
  details: string[];
  /** Where the words go. */
  text: { x: number; y: number; w: number; h: number };
};

const f = (v: number) => String(Math.round(v * 100) / 100);

/** Geometry for the shapes that are not a plain rounded rectangle. */
export function shapeGeometry(shape: Exclude<NodeShape, "box" | "pill">, x: number, y: number, w: number, h: number): ShapeGeometry {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const right = x + w;
  const bottom = y + h;
  const textBox = (wide: number, top: number, spare: number) => ({ x: cx - (w * wide) / 2, y: y + top, w: w * wide, h: h - spare });
  switch (shape) {
    case "cylinder": {
      const ry = Math.min(16, Math.max(10, h * 0.16));
      const rx = w / 2;
      return {
        behind: [],
        outline: `M${f(x)},${f(y + ry)} A${f(rx)},${f(ry)} 0 0 1 ${f(right)},${f(y + ry)} L${f(right)},${f(bottom - ry)} A${f(rx)},${f(ry)} 0 0 1 ${f(x)},${f(bottom - ry)} Z`,
        details: [`M${f(x)},${f(y + ry)} A${f(rx)},${f(ry)} 0 0 0 ${f(right)},${f(y + ry)}`],
        text: textBox(1, ry * 1.8, ry * 2.8),
      };
    }
    case "diamond":
      return {
        behind: [],
        outline: `M${f(cx)},${f(y)} L${f(right)},${f(cy)} L${f(cx)},${f(bottom)} L${f(x)},${f(cy)} Z`,
        details: [],
        text: textBox(0.6, 10, 20),
      };
    case "hexagon": {
      const i = Math.min(h / 2, 30);
      return {
        behind: [],
        outline: `M${f(x + i)},${f(y)} L${f(right - i)},${f(y)} L${f(right)},${f(cy)} L${f(right - i)},${f(bottom)} L${f(x + i)},${f(bottom)} L${f(x)},${f(cy)} Z`,
        details: [],
        text: textBox(0.82, 0, 0),
      };
    }
    case "queue": {
      const r = 12;
      const gap = 22;
      return {
        behind: [],
        outline: `M${f(x + r)},${f(y)} H${f(right - r)} A${r},${r} 0 0 1 ${f(right)},${f(y + r)} V${f(bottom - r)} A${r},${r} 0 0 1 ${f(right - r)},${f(bottom)} H${f(x + r)} A${r},${r} 0 0 1 ${f(x)},${f(bottom - r)} V${f(y + r)} A${r},${r} 0 0 1 ${f(x + r)},${f(y)} Z`,
        details: [`M${f(x + gap)},${f(y)} V${f(bottom)}`, `M${f(right - gap)},${f(y)} V${f(bottom)}`],
        text: textBox(0.76, 0, 0),
      };
    }
    case "document":
      return {
        behind: [],
        outline: `M${f(x)},${f(y)} H${f(right)} V${f(bottom - 10)} C${f(x + w * 0.75)},${f(bottom - 22)} ${f(x + w * 0.62)},${f(bottom + 2)} ${f(cx)},${f(bottom - 10)} C${f(x + w * 0.38)},${f(bottom - 22)} ${f(x + w * 0.25)},${f(bottom + 2)} ${f(x)},${f(bottom - 10)} Z`,
        details: [],
        text: textBox(1, 0, 18),
      };
    case "cloud":
      return {
        behind: [],
        outline:
          `M${f(x + w * 0.25)},${f(y + h * 0.88)} C${f(x - w * 0.04)},${f(y + h * 0.88)} ${f(x - w * 0.02)},${f(y + h * 0.42)} ${f(x + w * 0.22)},${f(y + h * 0.42)} ` +
          `C${f(x + w * 0.2)},${f(y + h * 0.08)} ${f(x + w * 0.52)},${f(y - h * 0.02)} ${f(x + w * 0.6)},${f(y + h * 0.26)} ` +
          `C${f(x + w * 0.7)},${f(y + h * 0.06)} ${f(x + w * 1.0)},${f(y + h * 0.16)} ${f(x + w * 0.92)},${f(y + h * 0.5)} ` +
          `C${f(x + w * 1.06)},${f(y + h * 0.56)} ${f(x + w * 1.02)},${f(y + h * 0.88)} ${f(x + w * 0.78)},${f(y + h * 0.88)} Z`,
        details: [],
        text: { x: cx - (w * 0.7) / 2, y: y + h * 0.1, w: w * 0.7, h: h * 0.8 },
      };
    case "stack": {
      const back = (d: number) => `M${f(x + d)},${f(y - d)} H${f(right + d - 4)} Q${f(right + d)},${f(y - d)} ${f(right + d)},${f(y - d + 4)} V${f(bottom - d - 8)}`;
      return {
        behind: [back(16), back(8)],
        outline: `M${f(x + 12)},${f(y)} H${f(right - 12)} A12,12 0 0 1 ${f(right)},${f(y + 12)} V${f(bottom - 12)} A12,12 0 0 1 ${f(right - 12)},${f(bottom)} H${f(x + 12)} A12,12 0 0 1 ${f(x)},${f(bottom - 12)} V${f(y + 12)} A12,12 0 0 1 ${f(x + 12)},${f(y)} Z`,
        details: [],
        text: textBox(1, 0, 14),
      };
    }
  }
}
