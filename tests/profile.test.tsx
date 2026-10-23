import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FlowDiagram, MAX_NODES, MAX_NODES_TECHNICAL, MAX_WIDTH_TECHNICAL, layoutDiagram, parseDiagram, showDrawingFrom, type DiagramSpecInput } from "../src";

const CAPTION = "A caption long enough to state the concept the figure makes, as the contract requires of every figure.";
const wide = (count: number, profile?: string, direction?: string): DiagramSpecInput => {
  const ids = Array.from({ length: count }, (_, i) => `n${i}`);
  return {
    id: "big",
    label: "Big",
    caption: CAPTION,
    ...(profile ? { profile } : {}),
    ...(direction ? { direction } : {}),
    nodes: ids.map((id) => ({ id, label: id.toUpperCase() })),
    edges: ids.slice(1).map((id, i) => ({ from: ids[i], to: id })),
  } as DiagramSpecInput;
};

describe("the technical profile", () => {
  test("marketing keeps its limits, and the message points to the profile", () => {
    expect(() => parseDiagram(wide(MAX_NODES + 1))).toThrow(/at most 25 nodes[\s\S]*technical/);
    expect(() => parseDiagram(wide(6))).not.toThrow();
    expect(() => layoutDiagram(parseDiagram(wide(7)))).toThrow(/too small to read[\s\S]*technical/);
  });

  test("technical allows more nodes and a much wider drawing", () => {
    expect(() => parseDiagram(wide(MAX_NODES + 5, "technical", "ttb"))).not.toThrow();
    const l = layoutDiagram(parseDiagram(wide(10, "technical")));
    expect(l.width).toBeGreaterThan(1400);
    expect(l.width).toBeLessThanOrEqual(MAX_WIDTH_TECHNICAL);
  });

  test("technical has its own ceiling", () => {
    expect(() => parseDiagram(wide(MAX_NODES_TECHNICAL + 1, "technical"))).toThrow(/at most 80/);
    expect(() => layoutDiagram(parseDiagram(wide(16, "technical")))).toThrow(/too small to read/);
  });

  test("the drawing is always shown, never swapped for the list", () => {
    expect(showDrawingFrom(2600, "ltr", "technical")).toBe("sm");
    expect(showDrawingFrom(2600, "ltr")).toBe("lg");
  });
});

describe("technical diagram on a page", () => {
  const html = renderToStaticMarkup(<FlowDiagram spec={wide(10, "technical")} />);

  test("is a viewer with named controls, outside the hidden drawing", () => {
    expect(html).toContain('aria-label="Zoom in"');
    expect(html).toContain('aria-label="Zoom out"');
    expect(html).toContain(">Fit<");
    expect(html).toMatch(/role="region" aria-label="Big: scroll to pan/);
    expect(html).toMatch(/tabindex="0"/);
    expect(/<svg[^>]*aria-hidden="true"/.test(html)).toBe(true);
  });

  test("keeps the list for screen readers, always", () => {
    expect(html).toMatch(/<ol[^>]*class="[^"]*\bsr-only\b/);
    expect(html).not.toContain("md:sr-only");
  });

  test("a marketing diagram is not wrapped in a viewer", () => {
    expect(renderToStaticMarkup(<FlowDiagram spec={wide(3)} />)).not.toContain("Zoom in");
  });
});
