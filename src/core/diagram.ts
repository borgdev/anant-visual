import { z } from "zod";
import { MOTIONS } from "./scene.js";
import { ICON_NAMES } from "./icons.js";
import { NODE_SHAPES, SHAPE_TEXT, type NodeShape } from "./shapes.js";
import { wrap } from "./text.js";

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
/** The `technical` profile is for documentation, where a reader may pan and zoom; see `figure-authoring.md`. */
export const MAX_NODES_TECHNICAL = 80;
export const MAX_WIDTH_TECHNICAL = 3200;
export const PROFILES = ["marketing", "technical"] as const;
/** Longest text that fits a node box at the diagram's type size (about three lines). */
export const MAX_LABEL = 48;
export const MAX_SUBLABEL = 60;
export const MAX_EDGE_LABEL = 24;
export const MAX_LANE_LABEL = 32;

export const NODE_ROLES = ["step", "emphasis", "external", "terminal"] as const;
export const EDGE_STYLES = ["solid", "dashed", "emphasis"] as const;
export const NODE_SIZES = ["sm", "md", "lg"] as const;
export const ARROWS = ["end", "start", "both", "none"] as const;
/** What a legend entry can show: a role, a shape, an edge style or a tone. */
export const LEGEND_SWATCHES = [
  "emphasis",
  "external",
  "terminal",
  ...NODE_SHAPES.filter((s) => s !== "box" && s !== "pill"),
  "dashed",
  "emphasis-edge",
  "good",
  "watch",
  "warn",
  "bad",
  "primary",
  "muted",
] as const;
export const MAX_LEGEND = 8;
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
    /**
     * How edges run between neighbouring layers: `curved` (default) in smooth curves, or
     * `orthogonal` in straight runs with rounded right-angle bends, the look of an
     * architecture or circuit diagram. An edge that skips layers or loops back is unchanged.
     */
    routing: z.enum(["curved", "orthogonal"]).default("curved"),
    /**
     * `marketing` (default) keeps a figure small enough to read at a glance: 25 nodes, a width
     * its type can survive. `technical` is for documentation: up to 80 nodes and a drawing
     * three times as wide, which the page lets a reader pan and zoom, with the list always at hand.
     */
    profile: z.enum(PROFILES).default("marketing"),
    nodes: z
      .array(
        z.object({
          id: idSchema,
          label: z.string().min(1).max(MAX_LABEL, `a node label is at most ${MAX_LABEL} characters; it must fit its box`),
          sublabel: z.string().max(MAX_SUBLABEL, `a sublabel is at most ${MAX_SUBLABEL} characters`).optional(),
          /** Shape carries meaning, so it survives greyscale: see the renderer. */
          role: z.enum(NODE_ROLES).default("step"),
          tone: z.enum(TONES).optional(),
          /** The silhouette. A `terminal` role is a `pill` unless a shape says otherwise. */
          shape: z.enum(NODE_SHAPES).optional(),
          /** `sm` and `lg` scale the box; text still wraps to fit it. */
          size: z.enum(NODE_SIZES).default("md"),
          /** A built-in icon above the label. It accompanies the words and never replaces them. */
          icon: z.enum(ICON_NAMES).optional(),
          group: idSchema.optional(),
          /** The swimlane the node sits in. Required for every node once the spec has lanes. */
          lane: idSchema.optional(),
          /** Hand placement in layer/row units, for the rare node auto-layout gets wrong. */
          position: z.object({ layer: z.number().int().min(0), row: z.number().int().min(0) }).optional(),
        })
      )
      .min(2)
      .max(MAX_NODES_TECHNICAL, `a technical diagram has at most ${MAX_NODES_TECHNICAL} nodes; split it`),
    edges: z.array(
      z.object({
        from: idSchema,
        to: idSchema,
        label: z.string().max(MAX_EDGE_LABEL, `an edge label is at most ${MAX_EDGE_LABEL} characters`).optional(),
        style: z.enum(EDGE_STYLES).default("solid"),
        /** Where the arrowhead goes: the target (`end`, default), the source, both, or neither. */
        arrow: z.enum(ARROWS).default("end"),
      })
    ),
    /**
     * A key under the figure. Shape, dash and tone carry meaning, and a reader should not have
     * to guess it: each entry shows one swatch and says what it stands for.
     */
    legend: z
      .array(z.object({ swatch: z.enum(LEGEND_SWATCHES), label: z.string().min(1).max(40) }))
      .max(MAX_LEGEND, `a legend has at most ${MAX_LEGEND} entries`)
      .default([]),
    /**
     * Swimlanes: bands that run with the reading direction (rows left to right, columns top
     * to bottom), one per actor, system or tier. Flow still reads along the layers; the lane
     * says who or what does each step. Listed in the order they are drawn.
     */
    lanes: z.array(z.object({ id: idSchema, label: z.string().min(1).max(MAX_LANE_LABEL, `a lane label is at most ${MAX_LANE_LABEL} characters`) })).default([]),
    /** A group may sit inside another: set `parent`. A node's `group` is its innermost one. */
    groups: z.array(z.object({ id: idSchema, label: z.string().min(1), parent: idSchema.optional() })).default([]),
  })
  .superRefine((spec, ctx) => {
    if (spec.profile === "marketing" && spec.nodes.length > MAX_NODES) {
      ctx.addIssue({ code: "custom", path: ["nodes"], message: `a diagram has at most ${MAX_NODES} nodes; split it (or set profile "technical" for documentation)` });
    }
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
    for (const g of spec.groups) {
      if (g.parent && !groups.has(g.parent)) ctx.addIssue({ code: "custom", message: `group "${g.id}" is inside unknown group "${g.parent}"` });
    }
    const parentOf = new Map(spec.groups.map((g) => [g.id, g.parent]));
    for (const g of spec.groups) {
      const seen = new Set<string>([g.id]);
      for (let cur = g.parent; cur; cur = parentOf.get(cur)) {
        if (seen.has(cur)) {
          ctx.addIssue({ code: "custom", message: `group "${g.id}" is inside itself` });
          break;
        }
        seen.add(cur);
      }
    }
    for (const node of spec.nodes) {
      if (node.group && !groups.has(node.group)) {
        ctx.addIssue({ code: "custom", message: `node "${node.id}" is in unknown group "${node.group}"` });
      }
    }
    const lanes = new Set(spec.lanes.map((l) => l.id));
    if (lanes.size !== spec.lanes.length) ctx.addIssue({ code: "custom", message: "duplicate lane id" });
    for (const node of spec.nodes) {
      if (node.lane && !lanes.has(node.lane)) ctx.addIssue({ code: "custom", message: `node "${node.id}" is in unknown lane "${node.lane}"` });
      if (node.lane && !lanes.size) ctx.addIssue({ code: "custom", message: `node "${node.id}" names a lane, but the diagram has no lanes` });
      if (!node.lane && lanes.size) ctx.addIssue({ code: "custom", message: `node "${node.id}" is in no lane, and every node must be in one when a diagram has lanes` });
    }
    // A group sits inside one lane: its box would otherwise cut across the lane borders.
    const laneOfGroup = new Map<string, string>();
    const groupParent = new Map(spec.groups.map((g) => [g.id, g.parent]));
    for (const node of spec.nodes) {
      // `climbed` stops a group cycle (reported above) from looping here.
      const climbed = new Set<string>();
      for (let g = node.group; g && !climbed.has(g); g = groupParent.get(g)) {
        climbed.add(g);
        const seen = laneOfGroup.get(g);
        if (seen && node.lane && seen !== node.lane) {
          ctx.addIssue({ code: "custom", message: `group "${g}" spans lanes "${seen}" and "${node.lane}"; a group sits inside one lane` });
        }
        if (node.lane && !seen) laneOfGroup.set(g, node.lane);
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
  /** Swimlane header: a strip on the left (rows) or across the top (columns). */
  laneHead: 44,
  laneHeadTop: 38,
  laneMargin: 10,
  /** Room inside a lane, above and below its nodes. */
  lanePad: 22,
  /** Units one lane-label character takes, so a header is never shorter than its words. */
  laneLabelChar: 8.4,
  /** The legend: swatch width, label width per character, space between entries, and its rows. */
  legendSwatch: 34,
  legendChar: 7.4,
  legendGap: 26,
  legendTop: 14,
  legendRow: 32,
} as const;

export type PlacedNode = DiagramNode & { x: number; y: number; w: number; h: number; layer: number; row: number };
export type PlacedEdge = DiagramEdge & {
  path: string;
  /** Midpoint, for the edge label. */
  mid: { x: number; y: number };
  /** True when the edge runs against the reading direction, so it loops around. */
  back: boolean;
};
export type PlacedGroup = { id: string; label: string; parent?: string; depth: number; x: number; y: number; w: number; h: number };
export type PlacedLane = {
  id: string;
  label: string;
  /** The whole band, including its header. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** The header strip, which holds the label. */
  head: { x: number; y: number; w: number; h: number };
  /** True for columns (top to bottom), whose header is across the top and reads horizontally. */
  vertical: boolean;
};
export type PlacedLegendItem = { swatch: (typeof LEGEND_SWATCHES)[number]; label: string; x: number; y: number };
export type Layout = {
  width: number;
  height: number;
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  groups: PlacedGroup[];
  lanes: PlacedLane[];
  /** The key under the figure, with each entry positioned. Empty when the spec has no legend. */
  legend: PlacedLegendItem[];
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
/** Room an icon takes above the label: its height and the gap under it. */
export const ICON_ROOM = 28;

/** How the node's `size` scales the box. */
export const SIZE_SCALE = { sm: { w: 0.72, h: 0.8 }, md: { w: 1, h: 1 }, lg: { w: 1.32, h: 1.24 } } as const;

type Sized = Pick<DiagramNode, "role" | "shape" | "size" | "icon" | "label" | "sublabel">;

/** The silhouette a node is drawn as: its `shape`, else a pill for a terminal, else a box. */
export function shapeOf(node: Pick<DiagramNode, "role" | "shape">): NodeShape {
  return node.shape ?? (node.role === "terminal" ? "pill" : "box");
}

/** Characters that fit a line of the label and of the sublabel in a node of this width and shape. */
export function lineBudget(node: Pick<DiagramNode, "role" | "shape">, width: number): { label: number; sub: number } {
  const room = width * SHAPE_TEXT[shapeOf(node)].wide;
  return {
    label: Math.max(5, Math.floor((room / GEOMETRY.nodeW) * LABEL_CHARS_PER_LINE)),
    sub: Math.max(7, Math.floor((room / GEOMETRY.nodeW) * SUBLABEL_CHARS_PER_LINE)),
  };
}

/** Height a node needs for its text at a given width, from the lines it will actually wrap to. */
export function textHeightAt(n: Pick<DiagramNode, "role" | "shape" | "icon" | "label" | "sublabel">, width: number): number {
  const budget = lineBudget(n, width);
  const label = wrap(n.label, budget.label).length * LABEL_LINE;
  const sub = n.sublabel ? wrap(n.sublabel, budget.sub).length * SUBLABEL_LINE + 3 : 0;
  return NODE_PADDING + label + sub + (n.icon ? ICON_ROOM : 0) + SHAPE_TEXT[shapeOf(n)].spare;
}

function heightNeeded(n: Sized): number {
  return textHeightAt(n, GEOMETRY.nodeW * SIZE_SCALE[n.size].w);
}

/**
 * One base height for the diagram, tall enough that every node, at its own size, holds its
 * text. A `sm` or `lg` node is this height scaled, so a figure stays one visual rhythm.
 */
export function nodeHeight(spec: DiagramSpec): number {
  const needed = spec.nodes.map((n) => heightNeeded(n) / SIZE_SCALE[n.size].h);
  return Math.max(GEOMETRY.nodeH, Math.ceil(Math.max(...needed)));
}

/**
 * The breakpoint from which the drawing replaces the list. A diagram is shown only
 * where its type renders at 10px or more: roughly 18 units scaled to the figure's
 * width, which is at most 840px of the page's widest column.
 */
export function showDrawingFrom(width: number, direction: "ltr" | "ttb", profile: "marketing" | "technical" = "marketing"): "sm" | "md" | "lg" {
  // A technical figure is always drawn: the reader pans and zooms it instead.
  if (direction === "ttb" || profile === "technical") return "sm";
  return width <= 1130 ? "md" : "lg";
}

export function layoutDiagram(spec: DiagramSpec): Layout {
  const { nodeW: W, layerGap, rowGap, pad } = GEOMETRY;
  const H = nodeHeight(spec);
  const dim = new Map(spec.nodes.map((n) => [n.id, { w: Math.round(W * SIZE_SCALE[n.size].w), h: Math.round(H * SIZE_SCALE[n.size].h) }]));
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

  // A node's chain is its groups from the outermost in, so nested groups can be kept whole.
  const parentOf = new Map(spec.groups.map((g) => [g.id, g.parent]));
  const chainOf = (gid?: string): string[] => {
    const out: string[] = [];
    for (let cur = gid; cur; cur = parentOf.get(cur)) out.unshift(cur);
    return out;
  };
  const chains = new Map(spec.nodes.map((n) => [n.id, chainOf(n.group)]));
  const maxDepth = Math.max(0, ...[...chains.values()].map((c) => c.length));
  const laneIndex = new Map(spec.lanes.map((l, i) => [l.id, i]));
  const laneOf = new Map(spec.nodes.map((n) => [n.id, n.lane ?? ""]));
  const laneRank = (id: string) => laneIndex.get(laneOf.get(id)!) ?? 0;
  // Ordering keys: the lane first, then the groups, so a lane's nodes stay together too.
  const orderKeys = new Map(spec.nodes.map((n) => [n.id, [...(n.lane ? [`lane:${n.lane}`] : []), ...chains.get(n.id)!]]));
  // Puts the members of every group, at every depth, next to each other, keeping the order
  // the sweeps chose for the blocks themselves. Without it a sweep can split a group.
  const regroup = (layer: string[]) => {
    const place = (ids: string[], depth: number): string[] => {
      const out: string[] = [];
      const seen = new Set<string>();
      for (const id of ids) {
        const g = orderKeys.get(id)![depth];
        if (g === undefined) out.push(id);
        else if (!seen.has(g)) {
          seen.add(g);
          out.push(...place(ids.filter((x) => orderKeys.get(x)![depth] === g), depth + 1));
        }
      }
      return out;
    };
    layer.splice(0, layer.length, ...place(layer, 0));
  };

  // 2. Initial order: declaration order, with members of a group kept together.
  const groupRank = new Map(spec.groups.map((g, i) => [g.id, i]));
  const declared = new Map(spec.nodes.map((n, i) => [n.id, i]));
  const layerCount = Math.max(...layerOf.values()) + 1;
  const layers: string[][] = Array.from({ length: layerCount }, () => []);
  [...spec.nodes]
    .sort((a, b) => {
      const ga = a.group ? groupRank.get(a.group)! : -1;
      const gb = b.group ? groupRank.get(b.group)! : -1;
      return laneRank(a.id) - laneRank(b.id) || ga - gb || declared.get(a.id)! - declared.get(b.id)!;
    })
    .forEach((n) => layers[layerOf.get(n.id)!].push(n.id));

  layers.forEach(regroup);

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
    layer.sort((a, b) => laneRank(a) - laneRank(b) || score.get(a)! - score.get(b)! || declared.get(a)! - declared.get(b)!);
    regroup(layer);
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
  const acrossOf = (id: string) => (ttb ? dim.get(id)!.w : dim.get(id)!.h);
  const alongOf = (id: string) => (ttb ? dim.get(id)!.h : dim.get(id)!.w);
  // A layer is as deep as its biggest node; the rest are centred on it.
  const layerSize = layers.map((layer) => Math.max(...layer.map(alongOf)));
  const nodeLayer = new Map<string, number>();
  layers.forEach((layer, li) => layer.forEach((id) => nodeLayer.set(id, li)));
  // Each nesting level takes room at both ends of a layer, so deeper nesting widens every gap.
  const nestRoom = Math.max(0, maxDepth - 1) * 2 * GEOMETRY.groupPad;
  // The gap after each layer. Left to right, a labelled edge needs a gap its label fits
  // in; top to bottom the label sits in the gap's height, so a fixed gap serves.
  const gaps = layers.map((_, li) => {
    if (ttb) return 56 + nestRoom;
    const longest = Math.max(
      0,
      ...spec.edges
        .filter((e) => nodeLayer.get(e.from) === li && nodeLayer.get(e.to) === li + 1)
        .map((e) => e.label?.length ?? 0)
    );
    return (longest ? Math.max(layerGap, 28 + longest * GEOMETRY.edgeLabelChar) : layerGap) + nestRoom;
  });
  // Room a group's border takes beyond the canvas margin, so the outermost box stays inside it.
  const side = Math.max(0, maxDepth * GEOMETRY.groupPad - 24);
  const alongPad = pad + side;
  const headRoom = spec.lanes.length ? (ttb ? GEOMETRY.laneHeadTop : GEOMETRY.laneHead) + GEOMETRY.laneMargin : 0;
  const alongStart = layers.map(
    (_, li) => alongPad + headRoom + layerSize.slice(0, li).reduce((a, b) => a + b, 0) + gaps.slice(0, li).reduce((a, b) => a + b, 0)
  );

  // A group label that will wrap to two lines needs room above, so reserve it up front.
  const inGroup = (id: string, gid: string) => chains.get(id)!.includes(gid);
  const labelHeight = new Map<string, number>();
  for (const g of spec.groups) {
    const members = spec.nodes.filter((n) => inGroup(n.id, g.id)).map((n) => nodeLayer.get(n.id)!);
    if (!members.length) continue;
    const lo = Math.min(...members);
    const hi = Math.max(...members);
    const span = ttb ? W : alongStart[hi] + layerSize[hi] - alongStart[lo];
    const room = span + 2 * GEOMETRY.groupPad - 28;
    labelHeight.set(g.id, g.label.length * GEOMETRY.groupLabelChar > room ? GEOMETRY.groupLabelTall : GEOMETRY.groupLabel);
  }
  const labelOf = (gid: string) => labelHeight.get(gid) ?? GEOMETRY.groupLabel;
  // Everything a node's groups need above it, so the topmost box does not leave the canvas.
  const needAbove = Math.max(0, ...spec.nodes.map((n) => chains.get(n.id)!.reduce((sum, g) => sum + GEOMETRY.groupPad + labelOf(g), 0)));
  // With lanes each lane reserves its own headroom, so nothing is shifted.
  const top = spec.lanes.length ? 0 : Math.max(0, needAbove - pad);

  // The gap between neighbours in a layer grows where a group's border runs between them.
  const crossGap = (p: string, q: string) => {
    const a = chains.get(p)!;
    const b = chains.get(q)!;
    let k = 0;
    while (k < a.length && k < b.length && a[k] === b[k]) k++;
    const leaving = (a.length - k) * GEOMETRY.groupPad;
    const entering = b.slice(k).reduce((sum, g) => sum + GEOMETRY.groupPad + (ttb ? 0 : labelOf(g)), 0);
    return rowGap + Math.max(0, leaving + entering - rowGap);
  };
  // Lanes stack on the across axis. Without lanes there is one unnamed lane and nothing is added.
  const hasLanes = spec.lanes.length > 0;
  const lanes = hasLanes ? spec.lanes : [{ id: "", label: "" }];
  const inLane = (laneId: string) => layers.map((layer) => layer.filter((id) => laneOf.get(id) === laneId));
  const extentOf = (ids: string[]) => {
    const pos: number[] = [];
    let cur = 0;
    ids.forEach((id, i) => {
      if (i > 0) cur += crossGap(ids[i - 1], id);
      pos.push(cur);
      cur += acrossOf(id);
    });
    return { pos, extent: cur };
  };
  const laneLayers = lanes.map((l) => inLane(l.id).map(extentOf));
  // Content a lane must hold: its fullest layer, and at least as long as its own label.
  const contentOf = lanes.map((l, li) =>
    Math.max(...laneLayers[li].map((o) => o.extent), hasLanes ? l.label.length * GEOMETRY.laneLabelChar + 16 : 0)
  );
  const lanePadTop = hasLanes ? GEOMETRY.lanePad + needAbove : 0;
  const lanePadBottom = hasLanes ? GEOMETRY.lanePad + maxDepth * GEOMETRY.groupPad : 0;
  const acrossExtent = Math.max(...contentOf);
  const crossOrigin = hasLanes ? GEOMETRY.laneMargin : alongPad;
  const laneTop: number[] = [];
  let crossCursor = crossOrigin;
  lanes.forEach((_, li) => {
    laneTop.push(crossCursor);
    crossCursor += (hasLanes ? lanePadTop + contentOf[li] + lanePadBottom : acrossExtent);
  });
  const crossEnd = crossCursor;
  const placed = new Map<string, PlacedNode>();
  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  lanes.forEach((_, li) => {
    layers.forEach((layer, layerIndex) => {
      const { pos, extent } = laneLayers[li][layerIndex];
      const ids = inLane(lanes[li].id)[layerIndex];
      const base = laneTop[li] + (hasLanes ? lanePadTop : 0) + ((hasLanes ? contentOf[li] : acrossExtent) - extent) / 2;
      ids.forEach((id, ri) => {
        const cross = base + pos[ri];
        placed.set(id, {
          ...byId.get(id)!,
          x: ttb ? cross : alongStart[layerIndex] + (layerSize[layerIndex] - dim.get(id)!.w) / 2,
          y: (ttb ? alongStart[layerIndex] + (layerSize[layerIndex] - dim.get(id)!.h) / 2 : cross) + top,
          w: dim.get(id)!.w,
          h: dim.get(id)!.h,
          layer: layerIndex,
          row: layer.indexOf(id),
        });
      });
    });
  });

  const nodes = spec.nodes.map((n) => placed.get(n.id)!);
  const right = Math.max(...nodes.map((n) => n.x + n.w));
  const nodesBottom = Math.max(...nodes.map((n) => n.y + n.h));
  // With lanes the drawing ends where the lanes end, which is past the lowest node.
  const bottom = hasLanes && !ttb ? crossEnd : nodesBottom;
  const hasBack = back.size > 0;
  // Each loop-back edge gets its own lane below (or beside) the drawing, so they do not overlap.
  const backOrder = [...back].sort((a, b) => a - b);
  const backRoom = GEOMETRY.backEdgeRoom + 14 * Math.max(0, back.size - 1);
  const backLane = (i: number) => 14 * backOrder.indexOf(i);
  const endPad = hasLanes ? GEOMETRY.laneMargin + 18 : alongPad;
  const baseWidth = (hasLanes && ttb ? crossEnd + GEOMETRY.laneMargin : right + endPad) + (ttb && hasBack ? backRoom : 0);
  const baseHeight = (hasLanes && !ttb ? crossEnd + GEOMETRY.laneMargin : nodesBottom + endPad) + (!ttb && hasBack ? backRoom : 0);
  // The legend sits under the drawing and wraps to as many rows as its width needs.
  const legend: PlacedLegendItem[] = [];
  let legendRows = 0;
  if (spec.legend.length) {
    const room = baseWidth - 2 * GEOMETRY.laneMargin - 2 * 14;
    let cx = 0;
    let row = 0;
    for (const entry of spec.legend) {
      const w = GEOMETRY.legendSwatch + 10 + entry.label.length * GEOMETRY.legendChar + GEOMETRY.legendGap;
      if (cx > 0 && cx + w > room) {
        cx = 0;
        row++;
      }
      legend.push({ ...entry, x: GEOMETRY.laneMargin + 14 + cx, y: baseHeight + GEOMETRY.legendTop + row * GEOMETRY.legendRow });
      cx += w;
    }
    legendRows = row + 1;
  }
  const width = baseWidth;
  const height = baseHeight + (legendRows ? GEOMETRY.legendTop + legendRows * GEOMETRY.legendRow : 0);
  const widthLimit = spec.profile === "technical" ? MAX_WIDTH_TECHNICAL : GEOMETRY.maxWidth;
  if (width > widthLimit) {
    throw new Error(
      `Invalid diagram "${spec.id}": it is ${Math.round(width)} units wide, and its text would render too small to read. ` +
        `Use direction "ttb", or fewer steps in a row (at most about ${Math.floor((widthLimit - 2 * pad + layerGap) / (W + layerGap))} layers left to right${spec.profile === "marketing" ? `, or set profile "technical"` : ""}).`
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
        const low = bottom + GEOMETRY.backEdgeRoom * 0.6 + backLane(i);
        path = `M${ax},${ay} C${ax},${low} ${bx},${low} ${bx},${by}`;
        // Cubic midpoint at t = 0.5: (P0 + 3·P1 + 3·P2 + P3) / 8.
        mid = { x: (ax + bx) / 2, y: 0.75 * low + 0.125 * (ay + by) };
      } else {
        const ay = a.y + a.h / 2;
        const by = b.y + b.h / 2;
        const ax = a.x + a.w;
        const bx = b.x + b.w;
        const far = (hasLanes ? crossEnd : right) + GEOMETRY.backEdgeRoom * 0.6 + backLane(i);
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
      // Between neighbouring layers an orthogonal edge runs straight, bends twice and runs straight again.
      if (spec.routing === "orthogonal" && b.layer - a.layer === 1 && c0 !== c1) {
        const m = (a0 + a1) / 2;
        const sa = Math.sign(a1 - a0) || 1;
        const sc = Math.sign(c1 - c0);
        const r = Math.min(12, Math.abs(c1 - c0) / 2, Math.abs(a1 - a0) / 2);
        path =
          `M${f(P(a0, c0))} L${f(P(m - r * sa, c0))} Q${f(P(m, c0))} ${f(P(m, c0 + r * sc))} ` +
          `L${f(P(m, c1 - r * sc))} Q${f(P(m, c1))} ${f(P(m + r * sa, c1))} L${f(P(a1, c1))}`;
      } else if (spec.routing === "orthogonal" && b.layer - a.layer === 1) {
        path = `M${f(P(a0, c0))} L${f(P(a1, c1))}`;
      }

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

  // 6. Groups: the padded bounding box of their members and of the groups inside them,
  // built from the innermost out so a parent always encloses its children.
  const depthOf = (gid: string) => chainOf(gid).length - 1;
  const boxes = new Map<string, { x1: number; y1: number; x2: number; y2: number }>();
  const byDepth = [...spec.groups].sort((a, b) => depthOf(b.id) - depthOf(a.id));
  for (const g of byDepth) {
    const parts = [
      ...nodes.filter((n) => n.group === g.id).map((n) => ({ x1: n.x, y1: n.y, x2: n.x + n.w, y2: n.y + n.h })),
      ...spec.groups.filter((c) => c.parent === g.id && boxes.has(c.id)).map((c) => boxes.get(c.id)!),
    ];
    if (!parts.length) continue;
    const box = {
      x1: Math.min(...parts.map((p) => p.x1)) - GEOMETRY.groupPad,
      y1: Math.min(...parts.map((p) => p.y1)) - GEOMETRY.groupPad - labelOf(g.id),
      x2: Math.max(...parts.map((p) => p.x2)) + GEOMETRY.groupPad,
      y2: Math.max(...parts.map((p) => p.y2)) + GEOMETRY.groupPad,
    };
    boxes.set(g.id, box);
    for (const other of nodes) {
      if (inGroup(other.id, g.id)) continue;
      const overlaps = other.x < box.x2 && other.x + other.w > box.x1 && other.y < box.y2 && other.y + other.h > box.y1;
      if (overlaps) {
        throw new Error(
          `Invalid diagram "${spec.id}": group "${g.id}" would cover node "${other.id}", which is not a member. ` +
            `Put the members next to each other, or add "${other.id}" to the group.`
        );
      }
    }
  }
  const groups: PlacedGroup[] = spec.groups
    .filter((g) => boxes.has(g.id))
    .map((g) => {
      const b = boxes.get(g.id)!;
      return { id: g.id, label: g.label, parent: g.parent, depth: depthOf(g.id), x: b.x1, y: b.y1, w: b.x2 - b.x1, h: b.y2 - b.y1 };
    });
  // Two groups that are not inside one another must not overlap.
  for (const a of groups) {
    for (const b of groups) {
      if (a.id >= b.id || chainOf(a.id).includes(b.id) || chainOf(b.id).includes(a.id)) continue;
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
        throw new Error(`Invalid diagram "${spec.id}": groups "${a.id}" and "${b.id}" overlap. Keep their members apart, or nest one in the other.`);
      }
    }
  }
  groups.sort((a, b) => a.depth - b.depth);

  // 7. Lane bands. They run the length of the drawing, with a header strip for the label.
  const placedLanes: PlacedLane[] = hasLanes
    ? spec.lanes.map((l, li) => {
        const size = lanePadTop + contentOf[li] + lanePadBottom;
        const m = GEOMETRY.laneMargin;
        return ttb
          ? { id: l.id, label: l.label, x: laneTop[li], y: m, w: size, h: baseHeight - 2 * m, vertical: true, head: { x: laneTop[li], y: m, w: size, h: GEOMETRY.laneHeadTop } }
          : { id: l.id, label: l.label, x: m, y: laneTop[li], w: width - 2 * m, h: size, vertical: false, head: { x: m, y: laneTop[li], w: GEOMETRY.laneHead, h: size } };
      })
    : [];

  return { width, height, nodes, edges, groups, lanes: placedLanes, legend };
}

/**
 * The accessible equivalent, generated from the same layout as the drawing so the
 * two cannot disagree. Reading order is layer, then row.
 */
export function describeDiagram(
  spec: DiagramSpec,
  layout: Layout
): { id: string; text: string; leadsTo: string[]; group?: string; lane?: string }[] {
  const label = new Map(spec.nodes.map((n) => [n.id, n.label]));
  const laneLabel = new Map(spec.lanes.map((l) => [l.id, l.label]));
  const parentOf = new Map(spec.groups.map((g) => [g.id, g.parent]));
  const groupLabel = new Map(
    spec.groups.map((g) => {
      const path: string[] = [];
      for (let cur: string | undefined = g.id; cur; cur = parentOf.get(cur)) path.unshift(spec.groups.find((x) => x.id === cur)!.label);
      return [g.id, path.join(" › ")] as const;
    })
  );
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
        lane: node.lane ? laneLabel.get(node.lane) : undefined,
      };
    });
}
