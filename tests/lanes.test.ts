import { describe, expect, test } from "vitest";
import { describeDiagram, diagramToSvg, layoutDiagram, parseDiagram, sceneFromDiagram, type DiagramSpecInput } from "../src/core";

const CAPTION = "A caption long enough to state the concept the figure makes, as the contract requires of every figure.";
const n = (id: string, lane?: string, extra: Record<string, unknown> = {}) => ({ id, label: id.toUpperCase(), ...(lane ? { lane } : {}), ...extra });

const order: DiagramSpecInput = {
  id: "order",
  label: "Order to cash",
  caption: CAPTION,
  nodes: [n("place", "customer"), n("check", "sales"), n("pack", "warehouse"), n("pay", "customer"), n("ship", "warehouse")],
  edges: [
    { from: "place", to: "check" },
    { from: "check", to: "pack" },
    { from: "pack", to: "pay" },
    { from: "pay", to: "ship" },
  ],
  lanes: [
    { id: "customer", label: "Customer" },
    { id: "sales", label: "Sales" },
    { id: "warehouse", label: "Warehouse" },
  ],
};

describe("swimlanes, left to right", () => {
  const layout = layoutDiagram(parseDiagram(order));
  const node = (id: string) => layout.nodes.find((x) => x.id === id)!;
  const lane = (id: string) => layout.lanes.find((x) => x.id === id)!;

  test("lanes stack in the order listed and do not overlap", () => {
    const ys = layout.lanes.map((l) => l.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    for (let i = 1; i < layout.lanes.length; i++) {
      expect(layout.lanes[i].y).toBeGreaterThanOrEqual(layout.lanes[i - 1].y + layout.lanes[i - 1].h);
    }
  });

  test("every node sits wholly inside its own lane, clear of the header", () => {
    for (const spec of order.nodes) {
      const l = lane(spec.lane!);
      const p = node(spec.id);
      expect(p.y).toBeGreaterThanOrEqual(l.y);
      expect(p.y + p.h).toBeLessThanOrEqual(l.y + l.h);
      expect(p.x).toBeGreaterThanOrEqual(l.head.x + l.head.w);
    }
  });

  test("the flow still reads left to right across the lanes", () => {
    const xs = ["place", "check", "pack", "pay", "ship"].map((id) => node(id).x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  test("lanes span the whole drawing, which stays inside the canvas", () => {
    for (const l of layout.lanes) {
      expect(l.x).toBeGreaterThanOrEqual(0);
      expect(l.x + l.w).toBeLessThanOrEqual(layout.width);
      expect(l.y + l.h).toBeLessThanOrEqual(layout.height);
    }
    for (const p of layout.nodes) expect(p.x + p.w).toBeLessThanOrEqual(layout.width);
  });

  test("two nodes in the same lane and layer stack inside that lane, which grows to hold them", () => {
    const wide = layoutDiagram(
      parseDiagram({
        ...order,
        nodes: [...order.nodes, n("review", "sales")],
        edges: [...order.edges, { from: "place", to: "review" }],
      })
    );
    const sales = wide.lanes.find((l) => l.id === "sales")!;
    expect(sales.h).toBeGreaterThan(lane("sales").h);
    const [a, b] = ["check", "review"].map((id) => wide.nodes.find((x) => x.id === id)!);
    expect(a.layer).toBe(b.layer);
    expect(a.y + a.h).toBeLessThanOrEqual(b.y);
    for (const p of [a, b]) {
      expect(p.y).toBeGreaterThanOrEqual(sales.y);
      expect(p.y + p.h).toBeLessThanOrEqual(sales.y + sales.h);
    }
  });

  test("a long lane label makes its lane tall enough to hold the words", () => {
    const l = layoutDiagram(parseDiagram({ ...order, lanes: [{ id: "customer", label: "The customer who orders" }, ...order.lanes!.slice(1)] }));
    expect(l.lanes[0].h).toBeGreaterThanOrEqual("The customer who orders".length * 8);
  });

  test("a group stays inside its lane", () => {
    const g = layoutDiagram(
      parseDiagram({
        ...order,
        nodes: [n("place", "customer"), n("check", "sales", { group: "g" }), n("pack", "sales", { group: "g" }), n("pay", "customer"), n("ship", "warehouse")],
        groups: [{ id: "g", label: "Review" }],
      })
    );
    const box = g.groups[0];
    const sales = g.lanes.find((l) => l.id === "sales")!;
    expect(box.y).toBeGreaterThanOrEqual(sales.y);
    expect(box.y + box.h).toBeLessThanOrEqual(sales.y + sales.h);
  });
});

describe("swimlanes, top to bottom", () => {
  test("lanes become columns with a header across the top", () => {
    const l = layoutDiagram(parseDiagram({ ...order, direction: "ttb" }));
    expect(l.lanes.every((x) => x.vertical)).toBe(true);
    const xs = l.lanes.map((x) => x.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    for (const spec of order.nodes) {
      const lane = l.lanes.find((x) => x.id === spec.lane)!;
      const p = l.nodes.find((x) => x.id === spec.id)!;
      expect(p.x).toBeGreaterThanOrEqual(lane.x);
      expect(p.x + p.w).toBeLessThanOrEqual(lane.x + lane.w);
      expect(p.y).toBeGreaterThanOrEqual(lane.head.y + lane.head.h);
    }
  });
});

describe("lane validation", () => {
  test("once there are lanes, every node needs one", () => {
    expect(() => parseDiagram({ ...order, nodes: [n("place"), ...order.nodes.slice(1)] })).toThrow(/node "place" is in no lane/);
  });
  test("a node cannot name an unknown lane, or a lane in a diagram without any", () => {
    expect(() => parseDiagram({ ...order, nodes: [n("place", "nowhere"), ...order.nodes.slice(1)] })).toThrow(/unknown lane "nowhere"/);
    expect(() => parseDiagram({ ...order, lanes: [] })).toThrow(/has no lanes/);
  });
  test("a group may not cut across lanes", () => {
    expect(() =>
      parseDiagram({
        ...order,
        nodes: [n("place", "customer", { group: "g" }), n("check", "sales", { group: "g" }), ...order.nodes.slice(2)],
        groups: [{ id: "g", label: "G" }],
      })
    ).toThrow(/spans lanes/);
  });
  test("a lane label is bounded, because it must fit its header", () => {
    expect(() => parseDiagram({ ...order, lanes: [{ id: "customer", label: "x".repeat(40) }, ...order.lanes!.slice(1)] })).toThrow(/lane label/);
  });
});

describe("lanes in the scene and the file", () => {
  test("lanes are drawn first, and the header text of a row reads upward", () => {
    const scene = sceneFromDiagram(order);
    expect(scene.items.filter((i) => i.kind === "lane").map((i) => i.ref)).toEqual(["customer", "sales", "warehouse"]);
    const svg = diagramToSvg(order);
    expect(svg.indexOf('class="lane')).toBeLessThan(svg.indexOf('class="node'));
    expect(svg).toMatch(/<text[^>]*transform="rotate\(-90 [\d.]+ [\d.]+\)"[^>]*>CUSTOMER<\/text>/);
    const ttb = diagramToSvg({ ...order, direction: "ttb" });
    expect(ttb).not.toContain("rotate(-90");
  });

  test("the text equivalent says which lane each step is in", () => {
    const spec = parseDiagram(order);
    const eq = describeDiagram(spec, layoutDiagram(spec));
    expect(eq.find((i) => i.id === "check")!.lane).toBe("Sales");
  });

  test("a diagram without lanes is unchanged by all this", () => {
    const l = layoutDiagram(parseDiagram({ ...order, lanes: [], nodes: order.nodes.map(({ lane: _l, ...rest }) => rest) }));
    expect(l.lanes).toEqual([]);
  });
});
