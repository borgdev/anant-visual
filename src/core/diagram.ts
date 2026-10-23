import { z } from "zod";
import { MOTIONS } from "./scene.js";

/**
 * Diagram class: a spec in, a laid-out graph out.
 *
 * `docs/visual-language.md` §3 and §4.5. The spec is plain data, validated when the
 * page is built, so a diagram that breaks a rule (no caption, too many nodes, an
 * edge to nowhere) fails the build rather than reaching a reader. Layout is computed
 * here, at build time, because the site is a static export: nothing in this file
 * ships to the browser.
 *
 * The layout is a small layered (Sugiyama-style) pass: longest-path layering,
 * barycentre ordering, then straight columns. It is written for the diagrams this
 * site draws (up to MAX_NODES nodes), not for arbitrary graphs.
 *
 * An edge that spans several layers and would pass behind an intermediate node is
 * routed around it, above or below, whichever is shorter. A group is the bounding
 * box of its members; if that box would cover a node that is not a member the
 * build fails and says which, rather than drawing a group that lies. A `position`
 * override exists for the rare diagram that needs a hand-placed node.
 */

export const MAX_NODES = 25;
/** Longest text that fits a node box at the diagram's type size (about three lines). */
export const MAX_LABEL = 48;
export const MAX_SUBLABEL = 60;
export const MAX_EDGE_LABEL = 24;

export const NODE_ROLES = ["step", "emphasis", "external", "terminal"] as const;
export const EDGE_STYLES = ["solid", "dashed", "emphasis"] as const;
export const TONES = ["good", "watch", "warn", "bad", "primary", "muted"] as const;

const idSchema = z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/, "ids are lowercase slugs");

export const diagramSpecSchema = z
  .object({
    id: idSchema,
    /** Uppercase label above the figure. */
    label: z.string().min(1),
    /** Required, and long enough to carry the concept (matches the signature rule). */
    caption: z.string().min(60, "a caption must state the concept (60+ characters)"),
    direction: z.enum(["ltr", "ttb"]).default("ltr"),
    /**
     * Motion that plays once when the figure first scrolls into view, for readers who accept
     * motion: `reveal` brings the nodes in reading order, `trace` draws the solid edges on,
     * `flow` sends a pulse along each edge afterwards. The static drawing is complete without it.
     */
    motion: z.array(z.enum(MOTIONS)).default([]),
    /** Hovering a node keeps it, its neighbours and their edges in focus and quiets the rest. */
    interactive: z.boolean().default(false),
    nodes: z
      .array(
        z.object({
          id: idSchema,
          label: z.string().min(1).max(MAX_LABEL, `a node label is at most ${MAX_LABEL} characters; it must fit its box`),
          sublabel: z.string().max(MAX_SUBLABEL, `a sublabel is at most ${MAX_SUBLABEL} characters`).optional(),
          /** Shape carries meaning, so it survives greyscale: see the renderer. */
          role: z.enum(NODE_ROLES).default("step"),
          tone: z.enum(TONES).optional(),
          group: idSchema.optional(),
          /** Hand placement in layer/row units, for the rare node auto-layout gets wrong. */
          position: z.object({ layer: z.number().int().min(0), row: z.number().int().min(0) }).optional(),
        })
      )
      .min(2)
      .max(MAX_NODES, `a diagram has at most ${MAX_NODES} nodes; split it`),
    edges: z.array(
      z.object({
        from: idSchema,
        to: idSchema,
        label: z.string().max(MAX_EDGE_LABEL, `an edge label is at most ${MAX_EDGE_LABEL} characters`).optional(),
        style: z.enum(EDGE_STYLES).default("solid"),
      })
    ),
    groups: z.array(z.object({ id: idSchema, label: z.string().min(1) })).default([]),
  })
  .superRefine((spec, ctx) => {
    const ids = new Set<string>();
    for (const node of spec.nodes) {
      if (ids.has(node.id)) ctx.addIssue({ code: "custom", message: `duplicate node id "${node.id}"` });
      ids.add(node.id);
    }
    for (const edge of spec.edges) {
      for (const end of [edge.from, edge.to]) {
        if (!ids.has(end)) ctx.addIssue({ code: "custom", message: `edge refers to unknown node "${end}"` });
      }
    }
    const groups = new Set(spec.groups.map((g) => g.id));
    for (const node of spec.nodes) {
      if (node.group && !groups.has(node.group)) {
        ctx.addIssue({ code: "custom", message: `node "${node.id}" is in unknown group "${node.group}"` });
      }
    }
    // The text equivalent says how each node relates to the rest, by an edge or by the
    // group it sits in, so a node with neither is a defect.
    const touched = new Set(spec.edges.flatMap((e) => [e.from, e.to]));
    for (const node of spec.nodes) {
      if (!touched.has(node.id) && !node.group) {
        ctx.addIssue({ code: "custom", message: `node "${node.id}" has no edges and is in no group` });
      }
    }
  });

export type DiagramSpecInput = z.input<typeof diagramSpecSchema>;
export type DiagramSpec = z.output<typeof diagramSpecSchema>;
export type DiagramNode = DiagramSpec["nodes"][number];
export type DiagramEdge = DiagramSpec["edges"][number];

/** Artboard geometry, in the same units the stroke scale uses. */
export const GEOMETRY = {
  nodeW: 190,
  nodeH: 76,
  layerGap: 70,
  rowGap: 28,
  pad: 48,
  groupPad: 16,
  groupLabel: 26,
  /** A group label that wraps to a second line needs this much more room above its members. */
  groupLabelTall: 46,
  /** Artboard units one uppercase group-label character takes, for deciding whether it wraps. */
  groupLabelChar: 8.6,
  /** Units per edge-label character, so a labelled edge gets a gap its label fits in. */
  edgeLabelChar: 7.6,
  /** Wider than this and the text would render below about 10px at the page's widest figure. */
  maxWidth: 1400,
  backEdgeRoom: 44,
} as const;

export type PlacedNode = DiagramNode & { x: number; y: number; w: number; h: number; layer: number; row: number };
export type PlacedEdge = DiagramEdge & {
  path: string;
  /** Midpoint, for the edge label. */
  mid: { x: number; y: number };
  /** True when the edge runs against the reading direction, so it loops around. */
  back: boolean;
};
export type PlacedGroup = { id: string; label: string; x: number; y: number; w: number; h: number };
export type Layout = {
  width: number;
  height: number;
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  groups: PlacedGroup[];
};

export function parseDiagram(input: DiagramSpecInput): DiagramSpec {
  const result = diagramSpecSchema.safeParse(input);
  if (!result.success) {
    const detail = result.error.issues.map((i) => `${i.path.join(".") || "spec"}: ${i.message}`).join("; ");
    throw new Error(`Invalid diagram "${(input as { id?: string }).id ?? "?"}": ${detail}`);
  }
  return result.data;
}

/** Finds edges that close a cycle, so layering sees a DAG. */
function backEdgeSet(spec: DiagramSpec): Set<number> {
  const out = new Map<string, { to: string; i: number }[]>();
  spec.nodes.forEach((n) => out.set(n.id, []));
  spec.edges.forEach((e, i) => out.get(e.from)!.push({ to: e.to, i }));
  const state = new Map<string, 0 | 1 | 2>();
  const back = new Set<number>();
  const visit = (id: string) => {
    state.set(id, 1);
    for (const { to, i } of out.get(id)!) {
      const s = state.get(to) ?? 0;
      if (s === 1) back.add(i);
      else if (s === 0) visit(to);
    }
    state.set(id, 2);
  };
  spec.nodes.forEach((n) => {
    if (!state.get(n.id)) visit(n.id);
  });
  return back;
}

/**
 * Rendered text is measured here, not in the browser, because layout runs at build
 * time. These are the widths of the type the renderer uses (18 units, bold, for the
 * label; 14 units for the sublabel) inside the box's padding. They are estimates
 * and err on the large side; `e2e/functional-figures.spec.ts` measures the real
 * thing and fails if a box still overflows.
 */
const LABEL_CHARS_PER_LINE = 15;
const SUBLABEL_CHARS_PER_LINE = 20;
const LABEL_LINE = 22.5;
const SUBLABEL_LINE = 18;
const NODE_PADDING = 22;

/** One height for every node in a diagram, tall enough for the node with the most text. */
export function nodeHeight(spec: DiagramSpec): number {
  const needed = spec.nodes.map((n) => {
    const label = Math.ceil(n.label.length / LABEL_CHARS_PER_LINE) * LABEL_LINE;
    const sub = n.sublabel ? Math.ceil(n.sublabel.length / SUBLABEL_CHARS_PER_LINE) * SUBLABEL_LINE + 3 : 0;
    return NODE_PADDING + label + sub;
  });
  return Math.max(GEOMETRY.nodeH, Math.ceil(Math.max(...needed)));
}

/**
 * The breakpoint from which the drawing replaces the list. A diagram is shown only
 * where its type renders at 10px or more: roughly 18 units scaled to the figure's
 * width, which is at most 840px of the page's widest column.
 */
export function showDrawingFrom(width: number, direction: "ltr" | "ttb"): "sm" | "md" | "lg" {
  if (direction === "ttb") return "sm";
  return width <= 1130 ? "md" : "lg";
}

export function layoutDiagram(spec: DiagramSpec): Layout {
  const { nodeW: W, layerGap, rowGap, pad } = GEOMETRY;
  const H = nodeHeight(spec);
  const ttb = spec.direction === "ttb";
  const back = backEdgeSet(spec);
  const forward = spec.edges.filter((_, i) => !back.has(i));

  // 1. Longest-path layering over the acyclic edges.
  const preds = new Map<string, string[]>();
  const succs = new Map<string, string[]>();
  spec.nodes.forEach((n) => {
    preds.set(n.id, []);
    succs.set(n.id, []);
  });
  forward.forEach((e) => {
    preds.get(e.to)!.push(e.from);
    succs.get(e.from)!.push(e.to);
  });
  const layerOf = new Map<string, number>();
  const resolve = (id: string): number => {
    const known = layerOf.get(id);
    if (known !== undefined) return known;
    const value = preds.get(id)!.length ? Math.max(...preds.get(id)!.map(resolve)) + 1 : 0;
    layerOf.set(id, value);
    return value;
  };
  spec.nodes.forEach((n) => resolve(n.id));
  spec.nodes.forEach((n) => {
    if (n.position) layerOf.set(n.id, n.position.layer);
  });

  // 2. Initial order: declaration order, with members of a group kept together.
  const groupRank = new Map(spec.groups.map((g, i) => [g.id, i]));
  const declared = new Map(spec.nodes.map((n, i) => [n.id, i]));
  const layerCount = Math.max(...layerOf.values()) + 1;
  const layers: string[][] = Array.from({ length: layerCount }, () => []);
  [...spec.nodes]
    .sort((a, b) => {
      const ga = a.group ? groupRank.get(a.group)! : -1;
      const gb = b.group ? groupRank.get(b.group)! : -1;
      return ga - gb || declared.get(a.id)! - declared.get(b.id)!;
    })
    .forEach((n) => layers[layerOf.get(n.id)!].push(n.id));

  // 3. Barycentre sweeps reduce crossings. Hand-placed nodes keep their row.
  const pinned = new Map(spec.nodes.filter((n) => n.position).map((n) => [n.id, n.position!.row]));
  const indexIn = (layer: string[], id: string) => layer.indexOf(id);
  const reorder = (layer: string[], neighbours: (id: string) => string[], ref: string[]) => {
    const score = new Map(
      layer.map((id) => {
        const ns = neighbours(id).map((n) => indexIn(ref, n)).filter((i) => i >= 0);
        return [id, ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : indexIn(layer, id)] as const;
      })
    );
    layer.sort((a, b) => score.get(a)! - score.get(b)! || declared.get(a)! - declared.get(b)!);
  };
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i < layers.length; i++) reorder(layers[i], (id) => preds.get(id)!, layers[i - 1]);
    for (let i = layers.length - 2; i >= 0; i--) reorder(layers[i], (id) => succs.get(id)!, layers[i + 1]);
  }
  pinned.forEach((row, id) => {
    const layer = layers[layerOf.get(id)!];
    layer.splice(layer.indexOf(id), 1);
    layer.splice(Math.min(row, layer.length), 0, id);
  });

  // 4. Coordinates. `along` runs with the reading direction, `across` is the other axis.
  const across = ttb ? W : H;
  const alongSize = ttb ? H : W;
  const acrossGap = rowGap;
  const nodeLayer = new Map<string, number>();
  layers.forEach((layer, li) => layer.forEach((id) => nodeLayer.set(id, li)));
  // The gap after each layer. Left to right, a labelled edge needs a gap its label fits
  // in; top to bottom the label sits in the gap's height, so a fixed gap serves.
  const gaps = layers.map((_, li) => {
    if (ttb) return 56;
    const longest = Math.max(
      0,
      ...spec.edges
        .filter((e) => nodeLayer.get(e.from) === li && nodeLayer.get(e.to) === li + 1)
        .map((e) => e.label?.length ?? 0)
    );
    return longest ? Math.max(layerGap, 28 + longest * GEOMETRY.edgeLabelChar) : layerGap;
  });
  const alongStart = layers.map((_, li) => pad + li * alongSize + gaps.slice(0, li).reduce((a, b) => a + b, 0));

  // A group label that will wrap to two lines needs room above, so reserve it up front.
  const labelHeight = new Map<string, number>();
  for (const g of spec.groups) {
    const members = spec.nodes.filter((n) => n.group === g.id).map((n) => nodeLayer.get(n.id)!);
    if (!members.length) continue;
    const lo = Math.min(...members);
    const hi = Math.max(...members);
    const span = ttb ? W : alongStart[hi] + W - alongStart[lo];
    const room = span + 2 * GEOMETRY.groupPad - 28;
    labelHeight.set(g.id, g.label.length * GEOMETRY.groupLabelChar > room ? GEOMETRY.groupLabelTall : GEOMETRY.groupLabel);
  }
  const top = Math.max(0, ...[...labelHeight.values()].map((h) => h - GEOMETRY.groupLabel));

  const widest = Math.max(...layers.map((l) => l.length));
  const acrossExtent = widest * across + (widest - 1) * acrossGap;
  const placed = new Map<string, PlacedNode>();
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  layers.forEach((layer, li) => {
    const colExtent = layer.length * across + (layer.length - 1) * acrossGap;
    const offset = pad + (acrossExtent - colExtent) / 2;
    layer.forEach((id, ri) => {
      const along = alongStart[li];
      const cross = offset + ri * (across + acrossGap);
      placed.set(id, {
        ...byId.get(id)!,
        x: ttb ? cross : along,
        y: (ttb ? along : cross) + top,
        w: W,
        h: H,
        layer: li,
        row: ri,
      });
    });
  });

  const nodes = spec.nodes.map((n) => placed.get(n.id)!);
  const right = Math.max(...nodes.map((n) => n.x + n.w));
  const bottom = Math.max(...nodes.map((n) => n.y + n.h));
  const hasBack = back.size > 0;
  const width = right + pad + (ttb && hasBack ? GEOMETRY.backEdgeRoom : 0);
  const height = bottom + pad + (!ttb && hasBack ? GEOMETRY.backEdgeRoom : 0);
  if (width > GEOMETRY.maxWidth) {
    throw new Error(
      `Invalid diagram "${spec.id}": it is ${Math.round(width)} units wide, and its text would render too small to read. ` +
        `Use direction "ttb", or fewer steps in a row (at most about ${Math.floor((GEOMETRY.maxWidth - 2 * pad + layerGap) / (W + layerGap))} layers left to right).`
    );
  }

  // 5. Edges.
  const edges: PlacedEdge[] = spec.edges.map((edge, i) => {
    const a = placed.get(edge.from)!;
    const b = placed.get(edge.to)!;
    const isBack = back.has(i);
    let path: string;
    let mid: { x: number; y: number };
    if (isBack) {
      if (!ttb) {
        const ax = a.x + a.w / 2;
        const bx = b.x + b.w / 2;
        const ay = a.y + a.h;
        const by = b.y + b.h;
        const low = bottom + GEOMETRY.backEdgeRoom * 0.6;
        path = `M${ax},${ay} C${ax},${low} ${bx},${low} ${bx},${by}`;
        // Cubic midpoint at t = 0.5: (P0 + 3·P1 + 3·P2 + P3) / 8.
        mid = { x: (ax + bx) / 2, y: 0.75 * low + 0.125 * (ay + by) };
      } else {
        const ay = a.y + a.h / 2;
        const by = b.y + b.h / 2;
        const ax = a.x + a.w;
        const bx = b.x + b.w;
        const far = right + GEOMETRY.backEdgeRoom * 0.6;
        path = `M${ax},${ay} C${far},${ay} ${far},${by} ${bx},${by}`;
        mid = { x: 0.75 * far + 0.125 * (ax + bx), y: (ay + by) / 2 };
      }
    } else {
      // Work in (along, across): along runs with the reading direction.
      const P = (al: number, cr: number) => (ttb ? { x: cr, y: al } : { x: al, y: cr });
      const a0 = ttb ? a.y + a.h : a.x + a.w;
      const c0 = ttb ? a.x + a.w / 2 : a.y + a.h / 2;
      const a1 = ttb ? b.y : b.x;
      const c1 = ttb ? b.x + b.w / 2 : b.y + b.h / 2;
      const da = (a1 - a0) / 2;
      const f = (p: { x: number; y: number }) => `${p.x},${p.y}`;
      path = `M${f(P(a0, c0))} C${f(P(a0 + da, c0))} ${f(P(a1 - da, c1))} ${f(P(a1, c1))}`;
      mid = P((a0 + a1) / 2, (c0 + c1) / 2);

      const between = nodes.filter((n) => n.layer > a.layer && n.layer < b.layer);
      if (between.length) {
        const hits = (t: number) => {
          const u = 1 - t;
          const al = u * u * u * a0 + 3 * u * u * t * (a0 + da) + 3 * u * t * t * (a1 - da) + t * t * t * a1;
          const cr = u * u * u * c0 + 3 * u * u * t * c0 + 3 * u * t * t * c1 + t * t * t * c1;
          const p = P(al, cr);
          return between.some((n) => p.x > n.x - 6 && p.x < n.x + n.w + 6 && p.y > n.y - 6 && p.y < n.y + n.h + 6);
        };
        let blocked = false;
        for (let t = 0.1; t <= 0.9; t += 0.05) blocked ||= hits(t);
        if (blocked) {
          // Route through the channel just outside the intermediate nodes, on the
          // side that is shorter for this edge.
          const lo = Math.min(...between.map((n) => (ttb ? n.x : n.y))) - 20;
          const hi = Math.max(...between.map((n) => (ttb ? n.x + n.w : n.y + n.h))) + 20;
          const ch = Math.abs(c0 - lo) + Math.abs(c1 - lo) <= Math.abs(c0 - hi) + Math.abs(c1 - hi) ? lo : hi;
          const run = (ttb ? 28 : GEOMETRY.layerGap / 2);
          const k = run * 0.55;
          path =
            `M${f(P(a0, c0))} C${f(P(a0 + k, c0))} ${f(P(a0 + k, ch))} ${f(P(a0 + run, ch))} ` +
            `L${f(P(a1 - run, ch))} C${f(P(a1 - k, ch))} ${f(P(a1 - k, c1))} ${f(P(a1, c1))}`;
          mid = P((a0 + a1) / 2, ch);
        }
      }
    }
    return { ...edge, path, mid, back: isBack };
  });

  // 6. Groups: the padded bounding box of their members.
  const groups: PlacedGroup[] = spec.groups.flatMap((g) => {
    const members = nodes.filter((n) => n.group === g.id);
    if (!members.length) return [];
    const x1 = Math.min(...members.map((n) => n.x)) - GEOMETRY.groupPad;
    const y1 = Math.min(...members.map((n) => n.y)) - GEOMETRY.groupPad - (labelHeight.get(g.id) ?? GEOMETRY.groupLabel);
    const x2 = Math.max(...members.map((n) => n.x + n.w)) + GEOMETRY.groupPad;
    const y2 = Math.max(...members.map((n) => n.y + n.h)) + GEOMETRY.groupPad;
    for (const other of nodes) {
      if (other.group === g.id) continue;
      const overlaps = other.x < x2 && other.x + other.w > x1 && other.y < y2 && other.y + other.h > y1;
      if (overlaps) {
        throw new Error(
          `Invalid diagram "${spec.id}": group "${g.id}" would cover node "${other.id}", which is not a member. ` +
            `Put the members next to each other, or add "${other.id}" to the group.`
        );
      }
    }
    return [{ id: g.id, label: g.label, x: x1, y: y1, w: x2 - x1, h: y2 - y1 }];
  });

  return { width, height, nodes, edges, groups };
}

/**
 * The accessible equivalent, generated from the same layout as the drawing so the
 * two cannot disagree. Reading order is layer, then row.
 */
export function describeDiagram(
  spec: DiagramSpec,
  layout: Layout
): { id: string; text: string; leadsTo: string[]; group?: string }[] {
  const label = new Map(spec.nodes.map((n) => [n.id, n.label]));
  const groupLabel = new Map(spec.groups.map((g) => [g.id, g.label]));
  return [...layout.nodes]
    .sort((a, b) => a.layer - b.layer || a.row - b.row)
    .map((node) => {
      const leadsTo = spec.edges
        .filter((e) => e.from === node.id)
        .map((e) => `${label.get(e.to)}${e.label ? ` (${e.label})` : ""}`);
      return {
        id: node.id,
        text: node.sublabel ? `${node.label}: ${node.sublabel}` : node.label,
        leadsTo,
        group: node.group ? groupLabel.get(node.group) : undefined,
      };
    });
}
