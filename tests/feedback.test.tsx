import { describe, expect, test } from "vitest";
import { chartToScene, figureToSvg, formatNumber, formatValue, parseChart, sceneFromFigure, wrap, type ChartSpecInput, type FigureInput } from "../src";

const C = "A caption long enough to state the concept the figure makes, as the contract requires of every figure.";

describe("numbers are not misstated", () => {
  test("0.99 stays 0.99, not 1.0", () => {
    expect(formatNumber(0.99)).toBe("0.99");
    expect(formatValue(0.99, undefined, "n/a")).toBe("0.99");
  });
  test("trailing zeros go, large numbers keep one decimal, and decimals can be fixed", () => {
    expect(formatNumber(48)).toBe("48");
    expect(formatNumber(2.5)).toBe("2.5");
    expect(formatNumber(2.504)).toBe("2.5");
    expect(formatNumber(1234.56)).toBe("1234.6");
    expect(formatNumber(0.5, 2)).toBe("0.50");
    expect(formatNumber(12.3456, 0)).toBe("12");
  });
  const chart = (patch: Record<string, unknown> = {}): ChartSpecInput =>
    ({ kind: "chart", id: "c", label: "Skill", caption: C, type: "column", basis: "illustrative", categories: [{ label: "a" }, { label: "b" }], series: [{ id: "s", label: "S", values: [0.99, 0.5] }], ...patch }) as ChartSpecInput;
  test("a chart shows 0.99 on its bar, in its table and in its equivalent, and quarter ticks on a 0 to 1 axis", () => {
    const svg = figureToSvg(chart() as never);
    expect(svg).toContain(">0.99</text>");
    expect(svg).toContain(">0.25</text>");
    expect(svg).not.toContain(">1.0</text>");
    expect(chartToScene(chart()).equivalent![0].detail).toBe("S: 0.99");
  });
  test("a chart can fix its decimals", () => {
    expect(figureToSvg(chart({ decimals: 1 }) as never)).toContain(">1.0</text>");
    expect(() => parseChart(chart({ decimals: 9 }))).toThrow();
  });
});

describe("text wraps and is guarded", () => {
  test("a hyphenated name breaks after its hyphen", () => {
    expect(wrap("state-of-the-art", 9)).toEqual(["state-of-", "the-art"]);
    expect(wrap("A long cross-functional review", 14)).toEqual(["A long cross-", "functional", "review"]);
  });
  test("a word with no break is cut at the budget rather than left to overflow", () => {
    expect(wrap("Supercalifragilistic", 8)).toEqual(["Supercal", "ifragili", "stic"]);
  });
  test("ordinary text wraps as before", () => {
    expect(wrap("Independent review of the change", 20)).toEqual(["Independent review", "of the change"]);
    expect(wrap("", 10)).toEqual([""]);
  });
  test("a hyphenated category name on a bar chart is on lines inside its column", () => {
    const s = chartToScene({ ...chart2(), categories: [{ label: "Cross-functional-review-board" }, { label: "Two" }] } as never);
    const text = s.items.find((i) => i.ref === "c0")!.prims.find((p) => p.t === "text") as { lines: string[] };
    expect(text.lines.length).toBeGreaterThan(1);
    expect(Math.max(...text.lines.map((l) => l.length))).toBeLessThanOrEqual(20);
  });
});

function chart2() {
  return { kind: "chart", id: "b", label: "B", caption: C, type: "bar", basis: "illustrative", categories: [{ label: "a" }, { label: "b" }], series: [{ id: "s", label: "S", values: [1, 2] }] };
}

describe("a long source and note are never clipped", () => {
  const long = { ...chart2(), basis: "measured", source: "the platform benchmark suite run nightly against the reference corpus on the Ryzen 9 3900X reference machine, twelve cores, 64 GB", note: "The review stage is the slowest of the four and is where the work should begin, because it holds most of the cost and most of the waiting." };
  const scene = chartToScene(long as never);
  const rect = (ref: string) => scene.items.find((i) => i.ref === ref)!.prims[0] as { x: number; w: number; h: number };

  test("the chip wraps inside its outline and stays within the canvas", () => {
    const chip = rect("legend:basis");
    expect(chip.x).toBeGreaterThanOrEqual(0);
    expect(chip.x + chip.w).toBeLessThanOrEqual(scene.width);
    const text = scene.items.find((i) => i.ref === "legend:basis")!.prims[1] as { lines: string[] };
    expect(text.lines.length).toBeGreaterThan(1);
    expect(chip.h).toBeGreaterThan(22);
  });

  test("the note wraps, and the figure grows to hold it", () => {
    const note = scene.items.find((i) => i.ref === "legend:note")!.prims[0] as { lines: string[]; y: number };
    expect(note.lines.length).toBeGreaterThan(1);
    expect(scene.height).toBeGreaterThan(note.y + note.lines.length * 20 - 10);
  });

  test("a short one is unchanged: one line, beside the series names", () => {
    const s = chartToScene({ ...chart2(), basis: "illustrative" } as never);
    const text = s.items.find((i) => i.ref === "legend:basis")!.prims[1] as { lines: string[] };
    expect(text.lines).toEqual(["ILLUSTRATIVE"]);
  });

  test("a series label too long for the legend is refused", () => {
    expect(() => parseChart({ ...chart2(), series: [{ id: "s", label: "x".repeat(41), values: [1, 2] }] } as never)).toThrow(/at most 40/);
  });
});

describe("a box that cannot hold its words is sized to, or refused", () => {
  const long = "Cross-functional review of the whole change".slice(0, 40);
  const detail = "A detail that runs on across several lines of the card to the very limit of what the field allows".slice(0, 80);
  test("timeline cards grow to hold their words", () => {
    const spec = { kind: "timeline", id: "t", label: "T", caption: C, events: [{ id: "a", when: "Q1", label: long, detail }, { id: "b", when: "Q2", label: "Short" }] };
    const scene = sceneFromFigure(spec as FigureInput);
    const card = scene.items.find((i) => i.ref === "a")!.prims[0] as { h: number };
    const plain = sceneFromFigure({ ...spec, events: [{ id: "a", when: "Q1", label: "Short" }, { id: "b", when: "Q2", label: "Short" }] } as FigureInput);
    expect((plain.items.find((i) => i.ref === "a")!.prims[0] as { h: number }).h).toBe(92);
    expect(card.h).toBeGreaterThan(92);
  });
  test("tree, mind map and sequence boxes grow too", () => {
    const tree = sceneFromFigure({ kind: "tree", id: "tr", label: "T", caption: C, root: { id: "r", label: long, sublabel: detail.slice(0, 60), children: [{ id: "k", label: "Kid" }] } } as FigureInput);
    expect((tree.items.find((i) => i.ref === "r")!.prims[0] as { h: number }).h).toBeGreaterThan(64);
    const mind = sceneFromFigure({ kind: "mindmap", id: "mm", label: "M", caption: C, center: { id: "c", label: long }, branches: [{ id: "a", label: long }, { id: "b", label: "B" }] } as FigureInput);
    expect((mind.items.find((i) => i.ref === "a")!.prims[0] as { h: number }).h).toBeGreaterThan(56);
    const seq = sceneFromFigure({ kind: "sequence", id: "sq", label: "S", caption: C, participants: [{ id: "u", label: long.slice(0, 28) }, { id: "v", label: "V" }], messages: [{ from: "u", to: "v", label: "hi" }] } as FigureInput);
    expect((seq.items.find((i) => i.ref === "u")!.prims.find((p) => p.t === "rect") as { h: number }).h).toBeGreaterThan(64);
  });
  test("every word in every box fits its outline, whatever it says", () => {
    // The rule the guard enforces: the box is at least as tall as the lines the words wrap to.
    const spec = { kind: "timeline", id: "t", label: "T", caption: C, direction: "ttb", events: [{ id: "a", when: "Q1", label: long, detail }, { id: "b", when: "Q2", label: "x".repeat(40), detail: "y".repeat(80) }] };
    expect(() => sceneFromFigure(spec as FigureInput)).not.toThrow();
  });
});
