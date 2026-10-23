import { z } from "zod";
import { NODE_ROLES, TONES } from "../diagram.js";
import { NODE_SHAPES } from "../shapes.js";
import { ICON_NAMES } from "../icons.js";
import { edgeSceneItems } from "../diagram-scene.js";
import type { SceneItem } from "../scene.js";
import { MAX_WIDTH, boxItem, boxNeeds, buildScene, curve, figureBase, parseFigure, slug, tooWide } from "./base.js";

/**
 * Hierarchy and mind map: one recursive node type, two layouts.
 *
 * `tree` is a hierarchy (an org chart, a taxonomy, a file tree): the root at one end, its
 * children laid out beside or below it, each parent centred over its children. `mindmap`
 * puts the centre in the middle and shares the branches between its two sides.
 */

export const MAX_TREE_NODES = 40;
export const MAX_TREE_DEPTH = 5;

export type TreeNodeInput = {
  id: string;
  label: string;
  sublabel?: string;
  role?: (typeof NODE_ROLES)[number];
  tone?: (typeof TONES)[number];
  shape?: (typeof NODE_SHAPES)[number];
  icon?: (typeof ICON_NAMES)[number];
  children?: TreeNodeInput[];
};

export const treeNodeSchema: z.ZodType<TreeNodeInput> = z.lazy(() =>
  z.object({
    id: slug,
    label: z.string().min(1).max(48, "a node label is at most 48 characters; it must fit its box"),
    sublabel: z.string().max(60).optional(),
    role: z.enum(NODE_ROLES).optional(),
    tone: z.enum(TONES).optional(),
    shape: z.enum(NODE_SHAPES).optional(),
    icon: z.enum(ICON_NAMES).optional(),
    children: z.array(treeNodeSchema).optional(),
  })
);

function walk(node: TreeNodeInput, visit: (n: TreeNodeInput, depth: number, parent?: TreeNodeInput) => void, depth = 0, parent?: TreeNodeInput) {
  visit(node, depth, parent);
  node.children?.forEach((c) => walk(c, visit, depth + 1, node));
}

function checkTree(roots: TreeNodeInput[], ctx: z.RefinementCtx, extra: number) {
  const ids = new Set<string>();
  let count = extra;
  let deepest = 0;
  for (const r of roots) {
    walk(r, (n, depth) => {
      if (ids.has(n.id)) ctx.addIssue({ code: "custom", message: `duplicate node id "${n.id}"` });
      ids.add(n.id);
      count++;
      deepest = Math.max(deepest, depth);
    });
  }
  if (count > MAX_TREE_NODES) ctx.addIssue({ code: "custom", message: `a figure has at most ${MAX_TREE_NODES} nodes; split it` });
  if (deepest + 1 > MAX_TREE_DEPTH) ctx.addIssue({ code: "custom", message: `a hierarchy is at most ${MAX_TREE_DEPTH} levels deep; split it` });
}

// ---- layout ---------------------------------------------------------------------------

type Placed = { node: TreeNodeInput; depth: number; parent?: TreeNodeInput; along: number; across: number; w: number; h: number };

/**
 * Lays a forest out along one axis (`along`, the direction depth grows) and across it.
 * Each parent is centred over its children and siblings never overlap. `size` gives the
 * box at a depth in (along, across) terms. The forest is centred on across = 0.
 */
function layoutForest(
  roots: TreeNodeInput[],
  size: (depth: number) => { along: number; across: number },
  gap: { along: number; across: number },
  w: (depth: number) => number,
  h: (depth: number) => number
): { placed: Placed[]; alongExtent: number; acrossExtent: number } {
  const extent = (n: TreeNodeInput, depth: number): number => {
    const own = size(depth).across;
    if (!n.children?.length) return own;
    const kids = n.children.reduce((sum, c) => sum + extent(c, depth + 1), 0) + gap.across * (n.children.length - 1);
    return Math.max(own, kids);
  };
  const maxDepth = Math.max(...roots.map((r) => { let d = 0; walk(r, (_, k) => (d = Math.max(d, k))); return d; }));
  const alongAt: number[] = [];
  let cursor = 0;
  for (let d = 0; d <= maxDepth; d++) {
    alongAt.push(cursor);
    cursor += size(d).along + gap.along;
  }
  const placed: Placed[] = [];
  const place = (n: TreeNodeInput, depth: number, start: number, parent?: TreeNodeInput): number => {
    const room = extent(n, depth);
    let center = start + room / 2;
    if (n.children?.length) {
      let at = start + (room - (n.children.reduce((s, c) => s + extent(c, depth + 1), 0) + gap.across * (n.children.length - 1))) / 2;
      const centers: number[] = [];
      for (const c of n.children) {
        centers.push(place(c, depth + 1, at, n));
        at += extent(c, depth + 1) + gap.across;
      }
      center = (centers[0] + centers[centers.length - 1]) / 2;
    }
    placed.push({ node: n, depth, parent, along: alongAt[depth], across: center, w: w(depth), h: h(depth) });
    return center;
  };
  let at = 0;
  for (const r of roots) {
    place(r, 0, at);
    at += extent(r, 0) + gap.across;
  }
  const acrossExtent = at - gap.across;
  return { placed, alongExtent: cursor - gap.along, acrossExtent };
}

// ---- tree -----------------------------------------------------------------------------

export const treeSpecSchema = z
  .object({
    ...figureBase,
    kind: z.literal("tree"),
    /** `ttb`: root on top, children below (an org chart). `ltr`: root at the left (an outline). */
    direction: z.enum(["ttb", "ltr"]).default("ttb"),
    root: treeNodeSchema,
  })
  .superRefine((spec, ctx) => checkTree([spec.root], ctx, 0));

export type TreeSpecInput = z.input<typeof treeSpecSchema>;

const T = { w: 150, h: 64, gapAlong: 52, gapAcross: 16, pad: 40 };

/** Every node in a figure walked once, with its depth. */
const nodesOf = (roots: TreeNodeInput[]) => {
  const out: { node: TreeNodeInput; depth: number }[] = [];
  roots.forEach((r) => walk(r, (node, depth) => out.push({ node, depth })));
  return out;
};

export function treeToScene(input: TreeSpecInput) {
  const spec = parseFigure(treeSpecSchema, input, "tree");
  const ttb = spec.direction === "ttb";
  // One height for every box, tall enough for the one with the most words.
  const boxH = Math.max(T.h, ...nodesOf([spec.root]).map(({ node }) => boxNeeds(node, T.w)));
  const { placed, alongExtent, acrossExtent } = layoutForest(
    [spec.root],
    () => ({ along: ttb ? boxH : T.w, across: ttb ? T.w : boxH }),
    { along: T.gapAlong, across: T.gapAcross },
    () => T.w,
    () => boxH
  );
  const width = (ttb ? acrossExtent : alongExtent) + 2 * T.pad;
  const height = (ttb ? alongExtent : acrossExtent) + 2 * T.pad;
  if (width > MAX_WIDTH) {
    tooWide("tree", spec.id, width, ttb ? 'Use direction "ltr", or fewer siblings on one level.' : "Use fewer levels, or split the tree.");
  }
  const at = new Map<string, { x: number; y: number }>();
  const items: SceneItem[] = [];
  const seqOf = new Map<string, number>();
  for (const p of [...placed].sort((a, b) => a.depth - b.depth)) seqOf.set(p.node.id, p.depth);
  for (const p of placed) {
    const x = T.pad + (ttb ? p.across - p.w / 2 : p.along);
    const y = T.pad + (ttb ? p.along : p.across - p.h / 2);
    at.set(p.node.id, { x, y });
    items.push(
      boxItem({
        id: p.node.id,
        label: p.node.label,
        sublabel: p.node.sublabel,
        role: p.node.role ?? (p.depth === 0 ? "emphasis" : "step"),
        tone: p.node.tone,
        shape: p.node.shape,
        icon: p.node.icon,
        x,
        y,
        w: p.w,
        h: p.h,
        seq: p.depth,
        touches: [p.parent?.id, ...(p.node.children ?? []).map((c) => c.id)].filter((v): v is string => !!v),
      })
    );
  }
  for (const p of placed) {
    if (!p.parent) continue;
    const a = at.get(p.parent.id)!;
    const b = at.get(p.node.id)!;
    const from = ttb ? { x: a.x + T.w / 2, y: a.y + boxH } : { x: a.x + T.w, y: a.y + boxH / 2 };
    const to = ttb ? { x: b.x + T.w / 2, y: b.y } : { x: b.x, y: b.y + boxH / 2 };
    const { path, mid } = curve(from, to, ttb ? "y" : "x");
    items.push(...edgeSceneItems({ from: p.parent.id, to: p.node.id, path, mid, style: "solid", arrow: "none" }, `${p.parent.id}>${p.node.id}`, p.depth - 0.5));
  }
  const equivalent = [...placed]
    .sort((a, b) => a.depth - b.depth)
    .map((p) => ({ text: p.node.sublabel ? `${p.node.label}: ${p.node.sublabel}` : p.node.label, detail: p.parent ? `under ${p.parent.label}` : "the top of the hierarchy" }));
  return buildScene({ ...spec, width, height, items, equivalent });
}

// ---- mind map -------------------------------------------------------------------------

export const mindmapSpecSchema = z
  .object({
    ...figureBase,
    kind: z.literal("mindmap"),
    center: z.object({ id: slug, label: z.string().min(1).max(48), sublabel: z.string().max(60).optional(), icon: z.enum(ICON_NAMES).optional() }),
    branches: z.array(treeNodeSchema).min(2),
  })
  .superRefine((spec, ctx) => {
    checkTree(spec.branches, ctx, 1);
    if (spec.branches.some((b) => b.id === spec.center.id)) ctx.addIssue({ code: "custom", message: `duplicate node id "${spec.center.id}"` });
  });

export type MindmapSpecInput = z.input<typeof mindmapSpecSchema>;

/** Branches take turns being coloured, so neighbours differ; the words carry the meaning, not the colour. */
const BRANCH_TONES = ["primary", "good", "watch", "warn"] as const;
const M = { center: { w: 190, h: 76 }, sizes: [{ w: 164, h: 56 }, { w: 142, h: 48 }, { w: 128, h: 44 }, { w: 120, h: 42 }], gapAlong: 40, gapAcross: 14, pad: 40 };

const leaves = (n: TreeNodeInput): number => (n.children?.length ? n.children.reduce((s, c) => s + leaves(c), 0) : 1);

export function mindmapToScene(input: MindmapSpecInput) {
  const spec = parseFigure(mindmapSpecSchema, input, "mind map");
  // Share the branches between the sides by leaf count, in order, so each side reads top to bottom.
  const total = spec.branches.reduce((s, b) => s + leaves(b), 0);
  let run = 0;
  const right: TreeNodeInput[] = [];
  const left: TreeNodeInput[] = [];
  for (const b of spec.branches) {
    (run < total / 2 && right.length < spec.branches.length - 1 ? right : left).push(b);
    run += leaves(b);
  }
  // Each level is as tall as its fullest box needs, never shorter than its default.
  const levels = M.sizes.map((base, d) => {
    const here = nodesOf(spec.branches).filter((n) => Math.min(n.depth, M.sizes.length - 1) === d);
    return { w: base.w, h: Math.max(base.h, ...here.map(({ node }) => boxNeeds(node, base.w))) };
  });
  const centerH = Math.max(M.center.h, boxNeeds({ ...spec.center, shape: "pill", role: "emphasis" }, M.center.w));
  const size = (d: number) => levels[Math.min(d, levels.length - 1)];
  const lay = (forest: TreeNodeInput[]) =>
    layoutForest(forest, (d) => ({ along: size(d).w, across: size(d).h }), { along: M.gapAlong, across: M.gapAcross }, (d) => size(d).w, (d) => size(d).h);
  const r = lay(right);
  const l = lay(left);
  const side = Math.max(r.alongExtent, l.alongExtent);
  const width = 2 * (side + M.gapAlong) + M.center.w + 2 * M.pad;
  const height = Math.max(r.acrossExtent, l.acrossExtent, centerH) + 2 * M.pad;
  if (width > MAX_WIDTH) tooWide("mind map", spec.id, width, "Use fewer levels, or split the map.");
  const cx = width / 2;
  const cy = height / 2;
  const toneOf = new Map<string, (typeof BRANCH_TONES)[number]>();
  spec.branches.forEach((b, i) => walk(b, (n) => toneOf.set(n.id, BRANCH_TONES[i % BRANCH_TONES.length])));
  const items: SceneItem[] = [
    boxItem({ id: spec.center.id, label: spec.center.label, sublabel: spec.center.sublabel, icon: spec.center.icon, role: "emphasis", shape: "pill", x: cx - M.center.w / 2, y: cy - centerH / 2, w: M.center.w, h: centerH, seq: 0, touches: spec.branches.map((b) => b.id) }),
  ];
  const at = new Map<string, { x: number; y: number; w: number; h: number }>([[spec.center.id, { x: cx - M.center.w / 2, y: cy - centerH / 2, w: M.center.w, h: centerH }]]);
  const order: Placed[] = [];
  for (const [forest, dir] of [[r, 1], [l, -1]] as const) {
    for (const p of forest.placed) {
      const x = dir === 1 ? cx + M.center.w / 2 + M.gapAlong + p.along : cx - M.center.w / 2 - M.gapAlong - p.along - p.w;
      const y = cy + p.across - forest.acrossExtent / 2 - p.h / 2;
      at.set(p.node.id, { x, y, w: p.w, h: p.h });
      order.push({ ...p, along: dir });
      items.push(
        boxItem({
          id: p.node.id,
          label: p.node.label,
          sublabel: p.node.sublabel,
          role: p.node.role,
          tone: p.node.tone ?? toneOf.get(p.node.id),
          shape: p.node.shape,
          icon: p.node.icon,
          x,
          y,
          w: p.w,
          h: p.h,
          seq: p.depth + 1,
          touches: [p.parent?.id ?? spec.center.id, ...(p.node.children ?? []).map((c) => c.id)],
        })
      );
    }
  }
  for (const p of order) {
    const parentId = p.parent?.id ?? spec.center.id;
    const a = at.get(parentId)!;
    const b = at.get(p.node.id)!;
    const dir = p.along as 1 | -1;
    const from = { x: dir === 1 ? a.x + a.w : a.x, y: a.y + a.h / 2 };
    const to = { x: dir === 1 ? b.x : b.x + b.w, y: b.y + b.h / 2 };
    const { path, mid } = curve(from, to, "x");
    items.push(
      ...edgeSceneItems({ from: parentId, to: p.node.id, path, mid, style: "solid", arrow: "none", ink: toneOf.get(p.node.id), width: p.depth === 0 ? 4 : 2.5 }, `${parentId}>${p.node.id}`, p.depth + 0.5)
    );
  }
  const equivalent = [
    { text: spec.center.label, detail: "the centre of the map" },
    ...[...order].sort((a, b) => a.depth - b.depth).map((p) => ({ text: p.node.sublabel ? `${p.node.label}: ${p.node.sublabel}` : p.node.label, detail: `branch of ${p.parent?.label ?? spec.center.label}` })),
  ];
  return buildScene({ ...spec, width, height, items, equivalent });
}
