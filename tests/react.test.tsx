import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Chart, FlowDiagram, SignatureFigure, type DiagramSpecInput, type ChartSpecInput } from "../src";

const CAPTION = "A caption long enough to state the concept the figure makes, as the contract requires of every figure.";

const diagram: DiagramSpecInput = {
  id: "demo",
  label: "A demo",
  caption: CAPTION,
  nodes: [
    { id: "a", label: "First" },
    { id: "b", label: "Second", sublabel: "With a sublabel", role: "emphasis" },
    { id: "c", label: "Third", role: "terminal" },
  ],
  edges: [
    { from: "a", to: "b" },
    { from: "b", to: "c", label: "then", style: "dashed" },
  ],
};

const chart: ChartSpecInput = {
  id: "demo-chart",
  label: "A demo chart",
  caption: CAPTION,
  type: "bar",
  basis: "illustrative",
  categories: [{ label: "one" }, { label: "two" }],
  series: [{ id: "s", label: "Series", values: [3, null] }],
};

describe("FlowDiagram", () => {
  const html = renderToStaticMarkup(<FlowDiagram spec={diagram} />);

  test("hides the drawing from assistive technology and provides one list", () => {
    expect(html).toContain('data-diagram="demo"');
    expect(html).toContain('aria-hidden="true"');
    expect((html.match(/<ol/g) ?? []).length).toBe(1);
    expect(html).toContain("Leads to: Second");
  });

  test("keeps the artwork inline-safe: no SMIL, hex colour, fixed size, script or foreignObject", () => {
    const svg = /<svg[\s\S]*?<\/svg>/.exec(html)![0];
    expect(svg).not.toMatch(/<animate/);
    expect(svg).not.toMatch(/<script|<foreignObject/);
    expect(svg).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(svg).not.toMatch(/<svg[^>]*\s(width|height)=/);
    expect(svg).toContain("var(--primary)");
  });

  test("draws its words as SVG text, so they can be selected and searched", () => {
    const svg = /<svg[\s\S]*?<\/svg>/.exec(html)![0];
    expect(svg).toMatch(/<text[^>]*>First<\/text>/);
    expect(svg).toMatch(/<text[^>]*>With a sublabel<\/text>/);
  });

  test("gives each diagram on a page its own scope, so CSS and motion never cross", () => {
    const two = renderToStaticMarkup(
      <>
        <FlowDiagram spec={diagram} />
        <FlowDiagram spec={{ ...diagram, id: "demo-2" }} />
      </>
    );
    const scopes = [...two.matchAll(/<svg[^>]* class="(av-[^"]+)"/g)].map((m) => m[1]);
    expect(scopes).toHaveLength(2);
    expect(new Set(scopes).size).toBe(2);
  });

  test("a figure with no motion is not wrapped in the client host", () => {
    expect(html).not.toMatch(/<svg[^>]*data-(armed|motion)/);
    expect(html).not.toContain("@keyframes");
  });

  test("a figure that asks for motion ships the complete static drawing, unarmed", () => {
    const moving = renderToStaticMarkup(<FlowDiagram spec={{ ...diagram, motion: ["reveal", "trace", "flow"] }} />);
    expect(moving).toContain('data-motion="reveal trace flow"');
    expect(moving).not.toMatch(/<svg[^>]*data-armed/);
    expect(moving).not.toMatch(/<svg[^>]*data-play/);
    expect(moving).toContain("prefers-reduced-motion:no-preference");
  });

  test("refuses an invalid spec rather than rendering it", () => {
    expect(() => renderToStaticMarkup(<FlowDiagram spec={{ ...diagram, caption: "short" }} />)).toThrow(/caption/);
  });
});

describe("Chart", () => {
  const html = renderToStaticMarkup(<Chart spec={chart} />);

  test("states its basis and provides a data table as the one equivalent", () => {
    expect(html).toMatch(/ILLUSTRATIVE<\/text>/);
    expect(html).toContain("<table");
    expect(html).toContain("Not measured");
  });

  test("clips the table in a wrapper, because sr-only on a table does not clip", () => {
    expect(html).toMatch(/<div class="sr-only"><table/);
  });

  test("refuses a chart that does not say what it is", () => {
    const { basis: _basis, ...rest } = chart as Record<string, unknown>;
    void _basis;
    expect(() => renderToStaticMarkup(<Chart spec={rest as ChartSpecInput} />)).toThrow();
  });
});

describe("SignatureFigure", () => {
  const zones = [
    { id: "a", label: "Always", left: 10, top: 10, maxWidth: "10ch", priority: 1 as const },
    { id: "b", label: "Hidden on phone", left: 50, top: 50, maxWidth: "10ch", priority: 1 as const, mobile: "hide" as const },
    { id: "c", label: "Wide only", left: 70, top: 70, maxWidth: "10ch", priority: 3 as const },
  ];
  const html = renderToStaticMarkup(
    <SignatureFigure asset="X-01" art={<svg viewBox="0 0 10 10" />} labelZones={zones} caption={CAPTION} />
  );

  test("labels are HTML and the asset carries its id", () => {
    expect(html).toContain('data-signature="X-01"');
    expect(html).toContain("Always");
  });

  test("the phone list holds only priority-1 labels not marked hide", () => {
    const list = /<ul[^>]*sm:hidden[^>]*>([\s\S]*?)<\/ul>/.exec(html)![1];
    expect(list).toContain("Always");
    expect(list).not.toContain("Hidden on phone");
    expect(list).not.toContain("Wide only");
  });

  test("a compact variant replaces the main art below sm", () => {
    const withCompact = renderToStaticMarkup(
      <SignatureFigure asset="X-02" art={<svg viewBox="0 0 10 10" />} compactArt={<svg viewBox="0 0 9 9" />} labelZones={zones} caption={CAPTION} />
    );
    expect(withCompact).toContain("aspect-square");
    expect(withCompact).toContain("hidden sm:block");
  });
});
