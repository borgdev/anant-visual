import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Chart, chartToScene, figureToSvg, type ChartSpecInput } from "../src";

const C = "A caption long enough to state the concept the figure makes, as the contract requires of every figure.";
const spec = (patch: Record<string, unknown> = {}): ChartSpecInput =>
  ({
    id: "c",
    label: "Cost by stage",
    caption: C,
    type: "bar",
    basis: "illustrative",
    unit: "ms",
    categories: [{ label: "One", badge: { label: "Pass", tone: "good" } }, { label: "Two" }, { label: "Three" }],
    series: [{ id: "a", label: "Now", values: [12, 48, null] }, { id: "b", label: "Before", values: [14, 40, null] }],
    ...patch,
  }) as ChartSpecInput;

describe.each(["bar", "column", "line"] as const)("%s chart as a scene", (type) => {
  const s = chartToScene(spec({ type }));

  test("states its basis in the drawing and every value in the equivalent", () => {
    expect(figureToSvg({ ...spec({ type }), kind: "chart" } as never)).toMatch(/ILLUSTRATIVE<\/text>/);
    expect(s.equivalent!.map((e) => e.text)).toEqual(["One", "Two", "Three"]);
    expect(s.equivalent![1].detail).toBe("Now: 48 ms; Before: 40 ms");
  });

  test("not measured is absence, never zero", () => {
    expect(s.equivalent![2].detail).toBe("Now: Not measured; Before: Not measured");
    const svg = figureToSvg({ ...spec({ type }), kind: "chart" } as never);
    expect(svg).not.toMatch(/>0 ms</);
  });

  test("exports standalone, with a legend entry per series and no CSS variables", () => {
    const svg = figureToSvg({ ...spec({ type }), kind: "chart" } as never);
    expect(svg).toContain(">Now</text>");
    expect(svg).toContain(">Before</text>");
    expect(svg).not.toMatch(/var\(--(primary|foreground|muted-foreground|background|card|border|tone-[a-z]+)\)/);
  });

  test("series differ by weight or dash as well as colour", () => {
    const svg = figureToSvg({ ...spec({ type }), kind: "chart" } as never);
    if (type === "line") expect(svg).toContain("stroke-dasharray");
    else expect(svg).toMatch(/fill-opacity="0\.4"/);
  });
});

describe("chart details", () => {
  test("a measured chart names its source in the drawing", () => {
    const svg = figureToSvg({ ...spec({ basis: "measured", source: "the platform benchmark" }), kind: "chart" } as never);
    expect(svg).toContain("MEASURED · THE PLATFORM BENCHMARK");
  });

  test("a bar with a badge draws it in its tone, with its words", () => {
    const svg = figureToSvg({ ...spec(), kind: "chart" } as never);
    expect(svg).toContain(">Pass</text>");
  });

  test("a line breaks at a missing value instead of dropping to zero", () => {
    const s = chartToScene(spec({ type: "line", categories: [{ label: "a" }, { label: "b" }, { label: "c" }, { label: "d" }, { label: "e" }], series: [{ id: "a", label: "A", values: [1, 2, null, 4, 5] }] }));
    expect(s.items.filter((i) => i.kind === "edge")).toHaveLength(2);
  });

  test("a column cannot be negative", () => {
    expect(() => chartToScene(spec({ type: "column", series: [{ id: "a", label: "A", values: [-1, 2, 3] }] }))).toThrow(/negative/);
  });

  test("motion reveals each category in order, and the line traces", () => {
    const svg = figureToSvg({ ...spec({ type: "line", motion: ["reveal", "trace"], series: [{ id: "a", label: "A", values: [1, 2, 3] }] }), kind: "chart" } as never);
    expect(svg).toContain("@keyframes av-trace");
    expect(svg).toMatch(/class="edge trace m"/);
  });

  test("hovering a category keeps the lines lit", () => {
    const svg = figureToSvg({ ...spec({ type: "line", interactive: true, series: [{ id: "a", label: "A", values: [1, 2, 3] }] }), kind: "chart" } as never);
    const line = /<g class="edge[^"]*" data-t="([^"]+)"/.exec(svg)![1];
    expect(line.split(" ")).toEqual(["c0", "c1", "c2"]);
  });

  test("on a page: the drawing is hidden, and the data table is the one equivalent", () => {
    const html = renderToStaticMarkup(<Chart spec={spec()} />);
    expect(html).toMatch(/<div aria-hidden="true"><div[^>]*><svg/);
    expect((html.match(/<table/g) ?? []).length).toBe(1);
    expect(html).toContain("Not measured");
  });
});
