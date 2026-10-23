import { describe, expect, test } from "vitest";
import { describeDiagram, layoutDiagram, parseDiagram, sceneFromDiagram, diagramToSvg, type DiagramSpecInput } from "../src/core";

const CAPTION = "A caption long enough to state the concept the figure makes, as the contract requires of every figure.";
const n = (id: string, group?: string) => ({ id, label: id.toUpperCase(), ...(group ? { group } : {}) });
const contains = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x <= b.x && a.y <= b.y && a.x + a.w >= b.x + b.w && a.y + a.h >= b.y + b.h;
const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const nested: DiagramSpecInput = {
  id: "cloud",
  label: "A cloud",
  caption: CAPTION,
  nodes: [n("user"), n("lb", "vpc"), n("api", "private"), n("db", "private"), n("audit")],
  edges: [
    { from: "user", to: "lb" },
    { from: "lb", to: "api" },
    { from: "api", to: "db" },
    { from: "audit", to: "lb" },
  ],
  groups: [
    { id: "cloud", label: "Cloud" },
    { id: "vpc", label: "VPC", parent: "cloud" },
    { id: "private", label: "Private subnet", parent: "vpc" },
  ],
};

describe("nested groups", () => {
  const spec = parseDiagram(nested);
  const layout = layoutDiagram(spec);
  const box = (id: string) => layout.groups.find((g) => g.id === id)!;
  const node = (id: string) => layout.nodes.find((x) => x.id === id)!;

  test("a parent encloses its child with room to spare, and a child encloses its members", () => {
    expect(contains(box("cloud"), box("vpc"))).toBe(true);
    expect(contains(box("vpc"), box("private"))).toBe(true);
    expect(contains(box("private"), node("api"))).toBe(true);
    expect(box("vpc").x).toBeGreaterThan(box("cloud").x);
    expect(box("private").x).toBeGreaterThan(box("vpc").x);
  });

  test("a group with no direct members is still drawn, because its children are inside it", () => {
    expect(layout.groups.map((g) => g.id).sort()).toEqual(["cloud", "private", "vpc"]);
    expect(box("cloud").depth).toBe(0);
    expect(box("private").depth).toBe(2);
    expect(box("private").parent).toBe("vpc");
  });

  test("groups are listed outermost first, so an inner one is drawn on top", () => {
    expect(layout.groups.map((g) => g.depth)).toEqual([0, 1, 2]);
  });

  test("a node outside every group is not covered, and the drawing stays inside the canvas", () => {
    for (const g of layout.groups) expect(overlap(g, node("user"))).toBe(false);
    for (const g of layout.groups) expect(overlap(g, node("audit"))).toBe(false);
    for (const g of layout.groups) {
      expect(g.x).toBeGreaterThanOrEqual(0);
      expect(g.y).toBeGreaterThanOrEqual(0);
      expect(g.x + g.w).toBeLessThanOrEqual(layout.width);
      expect(g.y + g.h).toBeLessThanOrEqual(layout.height);
    }
  });

  test("the text equivalent names the whole path", () => {
    const api = describeDiagram(spec, layout).find((i) => i.id === "api")!;
    expect(api.group).toBe("Cloud › VPC › Private subnet");
  });

  test("the scene draws regions outermost first, and the file says so in its description", () => {
    const regions = sceneFromDiagram(nested).items.filter((i) => i.kind === "region").map((i) => i.ref);
    expect(regions).toEqual(["cloud", "vpc", "private"]);
    expect(diagramToSvg(nested)).toContain("PRIVATE SUBNET");
  });

  test("works top to bottom too", () => {
    const l = layoutDiagram(parseDiagram({ ...nested, direction: "ttb" }));
    const find = (id: string) => l.groups.find((g) => g.id === id)!;
    expect(contains(find("cloud"), find("private"))).toBe(true);
  });
});

describe("group-aware ordering", () => {
  test("a sweep does not split a group around an outsider", () => {
    // Crossing-reduction alone would order t1, t2, t3, putting t2 inside the group {t1, t3}.
    const spec = parseDiagram({
      id: "split",
      label: "Split",
      caption: CAPTION,
      nodes: [n("s1"), n("s2"), n("s3"), n("t1", "g"), n("t2"), n("t3", "g")],
      edges: [
        { from: "s1", to: "t1" },
        { from: "s2", to: "t2" },
        { from: "s3", to: "t3" },
      ],
      groups: [{ id: "g", label: "Group" }],
    });
    const layout = layoutDiagram(spec);
    const g = layout.groups[0];
    expect(overlap(g, layout.nodes.find((x) => x.id === "t2")!)).toBe(false);
    const rows = ["t1", "t3"].map((id) => layout.nodes.find((x) => x.id === id)!.row);
    expect(Math.abs(rows[0] - rows[1])).toBe(1);
  });

  test("room is made between a group and its neighbours so the border fits", () => {
    const spec = parseDiagram({
      id: "gap",
      label: "Gap",
      caption: CAPTION,
      nodes: [n("a"), n("b", "g"), n("c", "g"), n("d"), n("e", "h"), n("f", "h")],
      edges: [{ from: "a", to: "b" }, { from: "a", to: "c" }, { from: "a", to: "d" }, { from: "a", to: "e" }, { from: "a", to: "f" }],
      groups: [{ id: "g", label: "G" }, { id: "h", label: "H" }],
    });
    const [g, h] = layoutDiagram(spec).groups;
    expect(overlap(g, h)).toBe(false);
  });
});

describe("group validation", () => {
  test("a group inside an unknown group is refused", () => {
    expect(() => parseDiagram({ ...nested, groups: [{ id: "vpc", label: "VPC", parent: "nowhere" }] })).toThrow(/unknown group "nowhere"/);
  });

  test("a group inside itself, directly or round a loop, is refused", () => {
    const base = { ...nested, nodes: [n("a", "x"), n("b")], edges: [{ from: "a", to: "b" }] };
    expect(() => parseDiagram({ ...base, groups: [{ id: "x", label: "X", parent: "x" }] })).toThrow(/inside itself/);
    expect(() =>
      parseDiagram({ ...base, groups: [{ id: "x", label: "X", parent: "y" }, { id: "y", label: "Y", parent: "x" }] })
    ).toThrow(/inside itself/);
  });

  test("a group that would cover a non-member still fails the build and names it", () => {
    const spec = parseDiagram({
      id: "cover",
      label: "Cover",
      caption: CAPTION,
      nodes: [n("a", "g"), n("b"), n("c", "g")],
      edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }],
      groups: [{ id: "g", label: "G" }],
    });
    expect(() => layoutDiagram(spec)).toThrow(/would cover node "b"/);
  });
});
