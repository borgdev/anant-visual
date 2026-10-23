import { describe, expect, test } from "vitest";
import {
  GEOMETRY,
  ICON_NAMES,
  NODE_SHAPES,
  diagramToSvg,
  layoutDiagram,
  nodeHeight,
  parseDiagram,
  sceneFromDiagram,
  shapeGeometry,
  type DiagramSpecInput,
} from "../src/core";

const CAPTION = "A caption long enough to state the concept the figure makes, as the contract requires of every figure.";
const base = (nodes: Record<string, unknown>[], extra: Record<string, unknown> = {}): DiagramSpecInput => ({
  id: "t",
  label: "T",
  caption: CAPTION,
  direction: "ttb",
  nodes: nodes as DiagramSpecInput["nodes"],
  edges: nodes.slice(1).map((n, i) => ({ from: nodes[i].id as string, to: n.id as string })),
  ...extra,
});

describe("shapes", () => {
  test("every shape draws, and the ones that are not plain boxes are outlines", () => {
    for (const shape of NODE_SHAPES) {
      const svg = diagramToSvg(base([{ id: "a", label: "A", shape }, { id: "b", label: "B" }]));
      expect(svg).toContain(">A</text>");
      if (shape !== "box" && shape !== "pill") expect(svg).toMatch(/<path d="M[^"]+Z?"[^>]*fill/);
    }
  });

  test("geometry keeps its text inside the box", () => {
    for (const shape of NODE_SHAPES.filter((s) => s !== "box" && s !== "pill")) {
      const g = shapeGeometry(shape, 100, 50, 190, 90);
      expect(g.text.x).toBeGreaterThanOrEqual(100);
      expect(g.text.x + g.text.w).toBeLessThanOrEqual(290.01);
      expect(g.text.h).toBeGreaterThan(20);
      expect(g.outline.length).toBeGreaterThan(10);
    }
  });

  test("a terminal is a pill unless a shape says otherwise", () => {
    const pill = diagramToSvg(base([{ id: "a", label: "A", role: "terminal" }, { id: "b", label: "B" }]));
    expect(pill).toMatch(/rx="\d+(\.\d+)?"/);
    const l = layoutDiagram(parseDiagram(base([{ id: "a", label: "A", role: "terminal", shape: "cylinder" }, { id: "b", label: "B" }])));
    expect(l.nodes[0].shape).toBe("cylinder");
  });

  test("a diamond wraps its text narrower, and the node grows to hold it", () => {
    const box = parseDiagram(base([{ id: "a", label: "Is the token valid?" }, { id: "b", label: "B" }]));
    const diamond = parseDiagram(base([{ id: "a", label: "Is the token valid?", shape: "diamond" }, { id: "b", label: "B" }]));
    expect(nodeHeight(diamond)).toBeGreaterThan(nodeHeight(box));
  });

  test("an unknown shape or icon is refused", () => {
    expect(() => parseDiagram(base([{ id: "a", label: "A", shape: "blob" }, { id: "b", label: "B" }]))).toThrow(/shape/);
    expect(() => parseDiagram(base([{ id: "a", label: "A", icon: "unicorn" }, { id: "b", label: "B" }]))).toThrow(/icon/);
  });
});

describe("icons", () => {
  test("an icon takes room above the label", () => {
    const plain = parseDiagram(base([{ id: "a", label: "A long enough label here" }, { id: "b", label: "B" }]));
    const withIcon = parseDiagram(base([{ id: "a", label: "A long enough label here", icon: "user" }, { id: "b", label: "B" }]));
    expect(nodeHeight(withIcon)).toBeGreaterThan(nodeHeight(plain));
  });

  test("every icon draws as a stroked path in the node's ink", () => {
    for (const name of ICON_NAMES) {
      const svg = diagramToSvg(base([{ id: "a", label: "A", icon: name }, { id: "b", label: "B" }]));
      expect(svg).toMatch(/<path d="[^"]+" fill="none" stroke="#[0-9a-f]{6}" transform="translate\(/);
    }
  });
});

describe("node size", () => {
  const l = layoutDiagram(parseDiagram(base([{ id: "a", label: "Small", size: "sm" }, { id: "b", label: "Medium" }, { id: "c", label: "Large", size: "lg" }])));
  const [a, b, c] = l.nodes;

  test("sm and lg scale the box about the same base", () => {
    expect(a.w).toBeLessThan(b.w);
    expect(c.w).toBeGreaterThan(b.w);
    expect(a.h).toBeLessThan(b.h);
    expect(c.h).toBeGreaterThan(b.h);
    expect(b.w).toBe(GEOMETRY.nodeW);
  });

  test("a layer is centred on its widest node, so mixed sizes line up", () => {
    const mixed = layoutDiagram(
      parseDiagram({
        id: "m",
        label: "M",
        caption: CAPTION,
        nodes: [{ id: "a", label: "A" }, { id: "b", label: "B", size: "lg" }, { id: "c", label: "C", size: "sm" }],
        edges: [{ from: "a", to: "b" }, { from: "a", to: "c" }],
      })
    );
    const [, b2, c2] = mixed.nodes;
    expect(b2.layer).toBe(c2.layer);
    expect(b2.x + b2.w / 2).toBeCloseTo(c2.x + c2.w / 2, 0);
  });

  test("a small node still holds its text", () => {
    const small = parseDiagram(base([{ id: "a", label: "A fairly long label", size: "sm" }, { id: "b", label: "B" }]));
    const built = layoutDiagram(small);
    expect(built.nodes[0].h).toBeGreaterThanOrEqual(nodeHeight(small) * 0.8 - 1);
  });
});

describe("arrows", () => {
  const heads = (arrow?: string) => {
    const spec = { ...base([{ id: "a", label: "A" }, { id: "b", label: "B" }]), edges: [{ from: "a", to: "b", ...(arrow ? { arrow } : {}) }] } as DiagramSpecInput;
    return (diagramToSvg(spec).match(/<polygon class="head"/g) ?? []).length;
  };
  test("end by default, and start, both or none on request", () => {
    expect(heads()).toBe(1);
    expect(heads("start")).toBe(1);
    expect(heads("both")).toBe(2);
    expect(heads("none")).toBe(0);
  });

  test("a start arrowhead points back at the source", () => {
    const spec = { ...base([{ id: "a", label: "A" }, { id: "b", label: "B" }]), edges: [{ from: "a", to: "b", arrow: "start" }] } as DiagramSpecInput;
    const l = layoutDiagram(parseDiagram(spec));
    const tip = /<polygon class="head" points="([\d.]+),([\d.]+)/.exec(diagramToSvg(spec))!;
    expect(Number(tip[2])).toBeCloseTo(l.nodes[0].y + l.nodes[0].h, 0);
  });
});

describe("loop-back edges", () => {
  test("several loops each get their own lane, so they do not lie on one another", () => {
    const spec = parseDiagram({
      id: "loops",
      label: "L",
      caption: CAPTION,
      nodes: ["a", "b", "c"].map((id) => ({ id, label: id })),
      edges: [
        { from: "a", to: "b" }, { from: "b", to: "c" },
        { from: "b", to: "a" }, { from: "c", to: "a" }, { from: "c", to: "b" },
      ],
    });
    const back = layoutDiagram(spec).edges.filter((e) => e.back);
    expect(back).toHaveLength(3);
    const lows = back.map((e) => /C[\d.]+,([\d.]+) /.exec(e.path)![1]);
    expect(new Set(lows).size).toBe(3);
  });
});

describe("legend", () => {
  const spec = base([{ id: "a", label: "A", shape: "cylinder" }, { id: "b", label: "B" }], {
    legend: [{ swatch: "cylinder", label: "Data store" }, { swatch: "dashed", label: "Asynchronous" }],
  });

  test("sits under the drawing and adds the room it needs", () => {
    const withLegend = layoutDiagram(parseDiagram(spec));
    const without = layoutDiagram(parseDiagram({ ...spec, legend: [] }));
    expect(withLegend.height).toBeGreaterThan(without.height);
    expect(withLegend.legend.every((e) => e.y > without.height - 1)).toBe(true);
  });

  test("wraps to a second row when it does not fit", () => {
    const many = parseDiagram({ ...spec, legend: Array.from({ length: 8 }, (_, i) => ({ swatch: "dashed" as const, label: `Entry number ${i}` })) });
    const rows = new Set(layoutDiagram(many).legend.map((e) => e.y));
    expect(rows.size).toBeGreaterThan(1);
  });

  test("is drawn, never animated, and has at most eight entries", () => {
    const scene = sceneFromDiagram({ ...spec, motion: ["reveal"] });
    const svg = diagramToSvg({ ...spec, motion: ["reveal"] });
    expect(scene.items.filter((i) => i.kind === "legend")).toHaveLength(2);
    expect(svg).toMatch(/<g class="legend"/);
    expect(() => parseDiagram({ ...spec, legend: Array.from({ length: 9 }, () => ({ swatch: "dashed", label: "x" })) })).toThrow(/at most 8/);
  });
});
