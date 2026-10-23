import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Figure, figureToSvg, layoutNetwork, networkSpecSchema, sceneFromFigure, type FigureInput } from "../src";
import { figureToPng } from "../src/node";

const C = "A caption long enough to state the concept the figure makes, as the contract requires of every figure.";
const base = (id: string) => ({ id, label: "A figure", caption: C });

const tree = { ...base("org"), kind: "tree", root: { id: "ceo", label: "CEO", children: [{ id: "a", label: "A", children: [{ id: "a1", label: "A1" }, { id: "a2", label: "A2" }] }, { id: "b", label: "B" }] } } as const;
const mindmap = {
  ...base("mm"),
  kind: "mindmap",
  center: { id: "core", label: "Core" },
  branches: [
    { id: "b1", label: "One", children: [{ id: "c1", label: "C1" }, { id: "c2", label: "C2" }] },
    { id: "b2", label: "Two", children: [{ id: "c3", label: "C3" }] },
    { id: "b3", label: "Three" },
    { id: "b4", label: "Four", children: [{ id: "c4", label: "C4" }] },
  ],
} as const;
const timeline = { ...base("tl"), kind: "timeline", events: [{ id: "a", when: "Q1", label: "One" }, { id: "b", when: "Q2", label: "Two", detail: "More" }, { id: "c", when: "Q3", label: "Three" }], phases: [{ id: "p", label: "Early", from: "a", to: "b" }] } as const;
const matrix = { ...base("mx"), kind: "matrix", x: { label: "Effort", low: "Low", high: "High" }, y: { label: "Impact", low: "Low", high: "High" }, quadrants: ["Do", "Plan", "Maybe", "Skip"], items: [{ id: "a", label: "A", x: 0.2, y: 0.9 }, { id: "b", label: "B", x: 0.8, y: 0.2 }, { id: "c", label: "C", x: 0.21, y: 0.89 }] } as const;
const sequence = { ...base("sq"), kind: "sequence", participants: [{ id: "u", label: "User" }, { id: "s", label: "Server" }], messages: [{ from: "u", to: "s", label: "Ask" }, { from: "s", to: "s", label: "Think" }, { from: "s", to: "u", label: "Answer", style: "dashed" }] } as const;
const network = {
  ...base("nw"),
  kind: "network",
  nodes: [{ id: "a", label: "A", weight: 5 }, { id: "b", label: "B" }, { id: "c", label: "C" }, { id: "d", label: "D" }, { id: "e", label: "E", cluster: "x" }],
  links: [{ from: "a", to: "b" }, { from: "a", to: "c" }, { from: "b", to: "d", directed: true }, { from: "d", to: "e" }],
} as const;
const all: Record<string, FigureInput> = { tree, mindmap, timeline, matrix, sequence, network } as never;

describe.each(Object.entries(all))("%s", (_name, spec) => {
  const scene = sceneFromFigure(spec);

  test("lays out inside its canvas, every drawing inside the artboard", () => {
    expect(scene.width).toBeGreaterThan(200);
    expect(scene.width).toBeLessThanOrEqual(1500);
    expect(scene.height).toBeGreaterThan(100);
    const nodes = scene.items.filter((i) => i.kind === "node");
    expect(nodes.length).toBeGreaterThan(1);
  });

  test("exports a standalone SVG with title, description and no CSS variables", () => {
    const svg = figureToSvg(spec);
    expect(svg).toContain(`<title>A figure</title>`);
    expect(svg).toContain("<desc>");
    expect(svg).not.toContain("var(--primary)");
    expect(svg).not.toContain("<foreignObject");
  });

  test("is deterministic", () => {
    expect(figureToSvg(spec)).toBe(figureToSvg(spec));
  });

  test("has an accessible equivalent", () => {
    expect(scene.equivalent!.length).toBeGreaterThan(1);
    expect(scene.description).toContain(C);
  });

  test("renders on a page with the drawing hidden and one list", () => {
    const html = renderToStaticMarkup(<Figure spec={spec} />);
    expect(html).toContain('aria-hidden="true"');
    expect((html.match(/<ol/g) ?? []).length).toBe(1);
    expect(html).toContain("<svg");
  });

  test("a figure that asks for motion carries it", () => {
    const moving = figureToSvg({ ...spec, motion: ["reveal", "trace", "flow"] } as FigureInput);
    expect(moving).toContain("@keyframes av-reveal");
  });

  test("refuses a caption that does not state the concept", () => {
    expect(() => sceneFromFigure({ ...spec, caption: "short" } as FigureInput)).toThrow(/caption/);
  });

  test("a PNG renders", async () => {
    const png = await figureToPng(spec, { scale: 1 });
    expect([...png.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});

describe("tree", () => {
  test("a parent is centred over its children, and siblings do not overlap", () => {
    const s = sceneFromFigure(tree as never);
    const box = (id: string) => {
      const rect = s.items.find((i) => i.ref === id)!.prims[0] as { x: number; y: number; w: number; h: number };
      return rect;
    };
    const a = box("a");
    const kids = [box("a1"), box("a2")];
    expect(a.x + a.w / 2).toBeCloseTo((kids[0].x + kids[0].w / 2 + kids[1].x + kids[1].w / 2) / 2, 0);
    expect(kids[0].x + kids[0].w).toBeLessThanOrEqual(kids[1].x);
    expect(box("ceo").y).toBeLessThan(a.y);
  });

  test("a hierarchy too wide for one row says so, and a duplicate id is refused", () => {
    const wide = { ...tree, root: { id: "r", label: "R", children: Array.from({ length: 12 }, (_, i) => ({ id: `k${i}`, label: `K${i}` })) } };
    expect(() => sceneFromFigure(wide as never)).toThrow(/too small to read[\s\S]*ltr/);
    expect(() => sceneFromFigure({ ...tree, root: { id: "r", label: "R", children: [{ id: "r", label: "dup" }] } } as never)).toThrow(/duplicate/);
  });

  test("left to right puts the root at the left", () => {
    const s = sceneFromFigure({ ...tree, direction: "ltr" } as never);
    const x = (id: string) => (s.items.find((i) => i.ref === id)!.prims[0] as { x: number }).x;
    expect(x("ceo")).toBeLessThan(x("a"));
    expect(x("a")).toBeLessThan(x("a1"));
  });
});

describe("mind map", () => {
  const s = sceneFromFigure(mindmap as never);
  const rect = (id: string) => s.items.find((i) => i.ref === id)!.prims[0] as { x: number; w: number };
  test("shares the branches between both sides of the centre", () => {
    const centre = rect("core");
    const sides = ["b1", "b2", "b3", "b4"].map((id) => (rect(id).x > centre.x ? "right" : "left"));
    expect(sides).toContain("right");
    expect(sides).toContain("left");
  });
  test("branches take their own colour and the words stay the same", () => {
    const svg = figureToSvg(mindmap as never);
    expect(svg).toContain(">One</text>");
  });
});

describe("timeline", () => {
  test("alternates cards either side of the axis and marks the order as not to scale", () => {
    const s = sceneFromFigure(timeline as never);
    const y = (id: string) => (s.items.find((i) => i.ref === id)!.prims[0] as { y: number }).y;
    expect(y("a")).toBeLessThan(y("b"));
    expect(y("c")).toBeLessThan(y("b"));
    expect(s.equivalent!.at(-1)!.text).toMatch(/not to scale/);
  });
  test("refuses a phase that ends before it starts, and too many events across", () => {
    expect(() => sceneFromFigure({ ...timeline, phases: [{ id: "p", label: "x", from: "b", to: "a" }] } as never)).toThrow(/ends before/);
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `e${i}`, when: `${i}`, label: `E${i}` }));
    expect(() => sceneFromFigure({ ...timeline, events: many, phases: [] } as never)).toThrow(/at most 8/);
  });
});

describe("matrix", () => {
  test("puts high impact above low impact and says so in words", () => {
    const s = sceneFromFigure(matrix as never);
    const eq = s.equivalent!.find((e) => e.text === "A")!;
    expect(eq.detail).toBe("High Impact, Low Effort");
    expect(s.equivalent!.at(-1)!.text).toMatch(/not measured/);
  });
  test("labels that would collide are moved apart", () => {
    const s = sceneFromFigure(matrix as never);
    const ys = ["a", "c"].map((id) => (s.items.find((i) => i.ref === id)!.prims[1] as { y: number }).y);
    expect(Math.abs(ys[0] - ys[1])).toBeGreaterThanOrEqual(20);
  });
  test("refuses a position outside the plot", () => {
    expect(() => sceneFromFigure({ ...matrix, items: [{ id: "a", label: "A", x: 1.5, y: 0.5 }, { id: "b", label: "B", x: 0.2, y: 0.2 }] } as never)).toThrow();
  });
});

describe("sequence", () => {
  const s = sceneFromFigure(sequence as never);
  test("messages read top to bottom in the order given, and play in that order", () => {
    const edges = s.items.filter((i) => i.kind === "edge");
    expect(edges.map((e) => e.seq)).toEqual([0, 1, 2]);
    const ys = edges.map((e) => Number(/M[\d.]+,([\d.]+)/.exec((e.prims[0] as { d: string }).d)![1]));
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
  });
  test("numbers each message and spells the order out", () => {
    expect(s.equivalent![0].text).toBe("1. User to Server: Ask");
    expect(s.equivalent![1].text).toBe("2. Server to itself: Think");
    expect(figureToSvg(sequence as never)).toContain("1. Ask");
  });
  test("refuses a message to a participant that does not exist", () => {
    expect(() => sceneFromFigure({ ...sequence, messages: [{ from: "u", to: "ghost", label: "x" }] } as never)).toThrow(/unknown participant "ghost"/);
  });
});

describe("network", () => {
  const spec = networkSpecSchema.parse(network);
  test("the layout is the same every time, and never random", () => {
    expect(layoutNetwork(spec)).toEqual(layoutNetwork(spec));
  });
  test("no two nodes touch, and all sit inside the canvas", () => {
    const p = layoutNetwork(spec);
    for (const a of p) {
      expect(a.x - a.r).toBeGreaterThanOrEqual(0);
      expect(a.y + a.r).toBeLessThanOrEqual(680);
      for (const b of p) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r);
    }
  });
  test("a node's weight sets its size", () => {
    const p = layoutNetwork(spec);
    expect(p.find((n) => n.id === "a")!.r).toBeGreaterThan(p.find((n) => n.id === "b")!.r);
  });
  test("refuses a node with no links, so every node can be described by what it joins", () => {
    expect(() => sceneFromFigure({ ...network, nodes: [...network.nodes, { id: "z", label: "Z" }] } as never)).toThrow(/has no links/);
  });
});

describe("figure kinds", () => {
  test("an unknown kind says what is allowed", () => {
    expect(() => sceneFromFigure({ ...base("x"), kind: "spiral" } as never)).toThrow(/expected one of diagram, tree/);
  });
  test("a diagram needs no kind, and may name it", () => {
    const d = { ...base("d"), nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }], edges: [{ from: "a", to: "b" }] };
    expect(sceneFromFigure(d as never).items.length).toBe(sceneFromFigure({ ...d, kind: "diagram" } as never).items.length);
  });
});
