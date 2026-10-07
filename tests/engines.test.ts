import { describe, expect, test } from "vitest";
import {
  GEOMETRY,
  MAX_NODES,
  nodeHeight,
  showDrawingFrom,
  describeDiagram,
  layoutDiagram,
  parseDiagram,
  type DiagramSpecInput,
} from "../src/core/diagram";
import { axisMax, formatValue, niceMax, parseChart, ticks, type ChartSpecInput } from "../src/core/chart";

/**
 * The diagram and chart engines as pure functions. No browser: these are the
 * invariants a layout must keep whatever a page feeds it, and the build-time
 * refusals that stop a malformed figure reaching a reader.
 */
const CAPTION = "A caption long enough to state the concept the figure makes, as the contract requires of every figure.";

const node = (id: string, extra: Record<string, unknown> = {}) => ({ id, label: id.toUpperCase(), ...extra });
const chain = (ids: string[]): DiagramSpecInput => ({
  id: "chain",
  label: "A chain",
  caption: CAPTION,
  nodes: ids.map((id) => node(id)),
  edges: ids.slice(1).map((id, i) => ({ from: ids[i], to: id })),
});

const overlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe("diagram layout", () => {
  test("a chain reads left to right, in order, inside the canvas", () => {
    const spec = parseDiagram(chain(["a", "b", "c", "d"]));
    const l = layoutDiagram(spec);
    const xs = l.nodes.map((n) => n.x);
    expect(xs).toEqual([...xs].sort((p, q) => p - q));
    for (const n of l.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x + n.w).toBeLessThanOrEqual(l.width);
      expect(n.y + n.h).toBeLessThanOrEqual(l.height);
    }
  });

  test("a diagram too wide to read fails the build and says what to do", () => {
    const ids = ["a", "b", "c", "d", "e", "f", "g"];
    expect(() => layoutDiagram(parseDiagram(chain(ids)))).toThrow(/too small to read[\s\S]*ttb/);
    expect(() => layoutDiagram(parseDiagram({ ...chain(ids), direction: "ttb" }))).not.toThrow();
  });

  test("a labelled edge gets a gap its label fits in", () => {
    const plain = layoutDiagram(parseDiagram(chain(["a", "b"])));
    const labelled = layoutDiagram(parseDiagram({ ...chain(["a", "b"]), edges: [{ from: "a", to: "b", label: "could not be mapped" }] }));
    const gap = (l: typeof plain) => l.nodes[1].x - (l.nodes[0].x + l.nodes[0].w);
    expect(gap(labelled)).toBeGreaterThan(gap(plain));
    expect(gap(labelled)).toBeGreaterThanOrEqual(19 * 7);
  });

  test("a long group label gets room for two lines, and stays inside the canvas", () => {
    const l = layoutDiagram(
      parseDiagram({
        ...chain(["a", "b"]),
        nodes: [node("a", { group: "g" }), node("b")],
        groups: [{ id: "g", label: "A group label that is far too long for one line" }],
      })
    );
    const g = l.groups[0];
    expect(g.y).toBeGreaterThanOrEqual(0);
    expect(l.nodes[0].y - g.y).toBeGreaterThanOrEqual(GEOMETRY.groupPad + GEOMETRY.groupLabelTall);
  });

  test("node height grows with the text it must hold, and never shrinks below the minimum", () => {
    const short = parseDiagram(chain(["a", "b"]));
    const long = parseDiagram({
      ...chain(["a", "b"]),
      nodes: [node("a", { label: "A label long enough to wrap onto three lines", sublabel: "A sublabel long enough to wrap onto three lines as well, too" }), node("b")],
    });
    expect(nodeHeight(short)).toBe(GEOMETRY.nodeH);
    expect(nodeHeight(long)).toBeGreaterThan(GEOMETRY.nodeH);
    expect(layoutDiagram(long).nodes[0].h).toBe(nodeHeight(long));
  });

  test("a wide diagram switches from the list to the drawing later than a narrow one", () => {
    expect(showDrawingFrom(900, "ltr")).toBe("md");
    expect(showDrawingFrom(1326, "ltr")).toBe("lg");
    expect(showDrawingFrom(330, "ttb")).toBe("sm");
  });

  test("a top-to-bottom diagram reads downwards", () => {
    const l = layoutDiagram(parseDiagram({ ...chain(["a", "b", "c"]), direction: "ttb" }));
    expect(l.nodes.map((n) => n.y)).toEqual([...l.nodes.map((n) => n.y)].sort((p, q) => p - q));
    expect(l.width).toBeLessThan(l.height);
  });

  test("no two nodes overlap, in a branching diagram", () => {
    const spec = parseDiagram({
      id: "branch",
      label: "Branches",
      caption: CAPTION,
      nodes: ["s", "a", "b", "c", "d", "e"].map((id) => node(id)),
      edges: [
        { from: "s", to: "a" }, { from: "s", to: "b" }, { from: "s", to: "c" },
        { from: "a", to: "d" }, { from: "b", to: "d" }, { from: "c", to: "e" }, { from: "d", to: "e" },
      ],
    });
    const { nodes } = layoutDiagram(spec);
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) expect(overlap(nodes[i], nodes[j])).toBe(false);
  });

  test("a cycle is laid out, and the closing edge is drawn as a loop", () => {
    const spec = parseDiagram({ ...chain(["a", "b", "c"]), edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "a" }] });
    const l = layoutDiagram(spec);
    expect(l.edges.filter((e) => e.back)).toHaveLength(1);
    expect(l.edges.find((e) => e.back)!.from).toBe("c");
    expect(l.nodes.map((n) => n.layer)).toEqual([0, 1, 2]);
  });

  test("an edge that would cross an intermediate node is routed around it", () => {
    const spec = parseDiagram({
      ...chain(["a", "b", "c"]),
      edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "a", to: "c" }],
    });
    const l = layoutDiagram(spec);
    const long = l.edges.find((e) => e.from === "a" && e.to === "c")!;
    const direct = l.edges.find((e) => e.from === "a" && e.to === "b")!;
    expect(long.path, "detoured through a channel").toContain("L");
    expect(direct.path, "an adjacent edge stays a single curve").not.toContain("L");
    // The channel is outside the intermediate node.
    const b = l.nodes.find((n) => n.id === "b")!;
    expect(long.mid.y < b.y || long.mid.y > b.y + b.h).toBe(true);
  });

  test("a group whose box would cover a non-member fails the build", () => {
    const spec = {
      ...chain(["a", "b", "c"]),
      nodes: [node("a", { group: "g" }), node("b"), node("c", { group: "g" })],
      groups: [{ id: "g", label: "Group" }],
    };
    expect(() => layoutDiagram(parseDiagram(spec))).toThrow(/group "g" would cover node "b"/);
  });

  test("a group around adjacent members is a box around them", () => {
    const spec = parseDiagram({
      ...chain(["a", "b", "c"]),
      nodes: [node("a", { group: "g" }), node("b", { group: "g" }), node("c")],
      groups: [{ id: "g", label: "Group" }],
    });
    const l = layoutDiagram(spec);
    const g = l.groups[0];
    for (const id of ["a", "b"]) expect(overlap(g, l.nodes.find((n) => n.id === id)!)).toBe(true);
    expect(overlap(g, l.nodes.find((n) => n.id === "c")!)).toBe(false);
  });

  test("the text equivalent lists every node once, in reading order, with where it leads", () => {
    const spec = parseDiagram({ ...chain(["a", "b", "c"]), edges: [{ from: "a", to: "b", label: "then" }, { from: "b", to: "c" }] });
    const items = describeDiagram(spec, layoutDiagram(spec));
    expect(items.map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(items[0].leadsTo).toEqual(["B (then)"]);
    expect(items[2].leadsTo).toEqual([]);
  });

  test("layout is deterministic", () => {
    const spec = parseDiagram(chain(["a", "b", "c", "d"]));
    expect(JSON.stringify(layoutDiagram(spec))).toBe(JSON.stringify(layoutDiagram(spec)));
  });

  test("geometry is large enough for the stroke scale to read (node boxes, gaps)", () => {
    expect(GEOMETRY.nodeW).toBeGreaterThanOrEqual(150);
    expect(GEOMETRY.layerGap).toBeGreaterThanOrEqual(60);
  });
});

describe("diagram validation", () => {
  const bad = (patch: Partial<DiagramSpecInput> & Record<string, unknown>) => () => parseDiagram({ ...chain(["a", "b"]), ...patch } as DiagramSpecInput);

  test("refuses a short caption", () => expect(bad({ caption: "Too short." })).toThrow(/caption/));
  test("refuses an edge to nowhere", () => expect(bad({ edges: [{ from: "a", to: "zzz" }] })).toThrow(/unknown node "zzz"/));
  test("refuses duplicate ids", () => expect(bad({ nodes: [node("a"), node("a")] })).toThrow(/duplicate node id/));
  test("refuses a node nobody can reach", () =>
    expect(bad({ nodes: [node("a"), node("b"), node("c")], edges: [{ from: "a", to: "b" }] })).toThrow(/no edges and is in no group/));
  test("a node with no edges is allowed if it sits in a group, and the text equivalent says which", () => {
    const spec = parseDiagram({
      id: "contain",
      label: "Containment",
      caption: CAPTION,
      nodes: [
        node("a", { group: "g", position: { layer: 0, row: 0 } }),
        node("b", { group: "g", position: { layer: 0, row: 1 } }),
        node("c", { group: "h", position: { layer: 1, row: 0 } }),
      ],
      edges: [],
      groups: [{ id: "g", label: "Group G" }, { id: "h", label: "Group H" }],
    });
    const l = layoutDiagram(spec);
    expect(l.groups).toHaveLength(2);
    expect(describeDiagram(spec, l).map((i) => i.group)).toEqual(["Group G", "Group G", "Group H"]);
  });
  test("refuses an unknown group", () => expect(bad({ nodes: [node("a", { group: "nope" }), node("b")] })).toThrow(/unknown group/));
  test("refuses a label too long for its box", () => expect(bad({ nodes: [node("a", { label: "x".repeat(60) }), node("b")] })).toThrow(/at most/));
  test(`refuses more than ${MAX_NODES} nodes`, () => {
    const ids = Array.from({ length: MAX_NODES + 1 }, (_, i) => `n${i}`);
    expect(() => parseDiagram(chain(ids))).toThrow(/at most/);
  });
  test("names the diagram in the error, so the build log is actionable", () => expect(bad({ caption: "x" })).toThrow(/Invalid diagram "chain"/));
});

const chart = (patch: Record<string, unknown> = {}): ChartSpecInput =>
  ({
    id: "c",
    label: "A chart",
    caption: CAPTION,
    type: "bar",
    basis: "illustrative",
    categories: [{ label: "one" }, { label: "two" }],
    series: [{ id: "s", label: "S", values: [3, 7] }],
    ...patch,
  }) as ChartSpecInput;

describe("chart engine", () => {
  test("a valid chart parses, with the not-measured text defaulted", () => {
    expect(parseChart(chart()).notMeasuredText).toBe("Not measured");
  });
  test("a measured chart must name its source", () => {
    expect(() => parseChart(chart({ basis: "measured" }))).toThrow(/source/);
    expect(parseChart(chart({ basis: "measured", source: "the platform benchmark" })).source).toBe("the platform benchmark");
  });
  test("basis is required, never inferred", () => {
    const { basis: _basis, ...rest } = chart() as Record<string, unknown>;
    void _basis;
    expect(() => parseChart(rest as ChartSpecInput)).toThrow();
  });
  test("a series must have one value per category", () => {
    expect(() => parseChart(chart({ series: [{ id: "s", label: "S", values: [1] }] }))).toThrow(/values for 2 categories/);
  });
  test("a bar cannot be negative", () => {
    expect(() => parseChart(chart({ series: [{ id: "s", label: "S", values: [-1, 2] }] }))).toThrow(/negative/);
  });
  test("a value above a fixed axis maximum fails the build, so a bar is never silently clipped", () => {
    expect(() => parseChart(chart({ max: 5 }))).toThrow(/above the axis maximum/);
    expect(parseChart(chart({ max: 7 })).max).toBe(7);
  });
  test("a line may go negative", () => {
    expect(parseChart(chart({ type: "line", series: [{ id: "s", label: "S", values: [-1, 2] }] })).type).toBe("line");
  });
  test("at most four series", () => {
    const series = Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, label: `S${i}`, values: [1, 2] }));
    expect(() => parseChart(chart({ series }))).toThrow();
  });
  test("niceMax rounds up to a readable number", () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(83)).toBe(100);
    expect(niceMax(0.34)).toBe(0.5);
    expect(niceMax(1200)).toBe(2000);
  });
  test("the axis maximum uses a fixed max, else the data", () => {
    expect(axisMax(parseChart(chart({ max: 50 })))).toBe(50);
    expect(axisMax(parseChart(chart()))).toBe(10);
    expect(axisMax(parseChart(chart({ series: [{ id: "s", label: "S", values: [null, null] }] })))).toBe(1);
  });
  test("ticks run from zero to the maximum", () => {
    expect(ticks(100)).toEqual([0, 25, 50, 75, 100]);
  });
  test("a null value is text, never zero", () => {
    expect(formatValue(null, "ms", "Not measured")).toBe("Not measured");
    expect(formatValue(0, "ms", "Not measured")).toBe("0 ms");
    expect(formatValue(2.5, undefined, "n/a")).toBe("2.5");
  });
});

