import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  DEFAULT_PALETTE,
  INK_VAR,
  TONE_OKLCH,
  diagramToSvg,
  renderSvg,
  sceneFromDiagram,
  toHex,
  type DiagramSpecInput,
} from "../src/core";

const CAPTION = "A caption long enough to state the concept the figure makes, as the contract requires of every figure.";

const spec: DiagramSpecInput = {
  id: "review-path",
  label: "How a change is reviewed",
  caption: CAPTION,
  nodes: [
    { id: "author", label: "Author" },
    { id: "review", label: "Independent <review> & sign-off", sublabel: "Two people", role: "emphasis" },
    { id: "ship", label: "Production", role: "terminal", tone: "good" },
    { id: "audit", label: "Auditor", role: "external" },
  ],
  edges: [
    { from: "author", to: "review" },
    { from: "review", to: "ship", label: "approved", style: "emphasis" },
    { from: "review", to: "author", label: "rejected", style: "dashed" },
    { from: "review", to: "audit", style: "dashed" },
  ],
};

describe("colour", () => {
  test("converts oklch to hex", () => {
    expect(toHex("oklch(1 0 0)")).toBe("#ffffff");
    expect(toHex("oklch(0 0 0)")).toBe("#000000");
    expect(toHex("#123456")).toBe("#123456");
    expect(toHex(TONE_OKLCH.light.good)).toMatch(/^#[0-9a-f]{6}$/);
  });

  test("the tone values used for export are the ones theme.css defines", () => {
    const css = readFileSync(new URL("../theme.css", import.meta.url), "utf8");
    const dark = css.slice(css.indexOf(".dark"));
    const light = css.slice(0, css.indexOf(".dark"));
    for (const tone of ["good", "watch", "warn", "bad"] as const) {
      expect(light).toContain(`--tone-${tone}: ${TONE_OKLCH.light[tone]};`);
      expect(dark).toContain(`--tone-${tone}: ${TONE_OKLCH.dark[tone]};`);
    }
    expect(DEFAULT_PALETTE.light.good).toBe(TONE_OKLCH.light.good);
  });
});

describe("scene", () => {
  const scene = sceneFromDiagram(spec);

  test("has one item per node, per edge and per edge label", () => {
    const count = (kind: string) => scene.items.filter((i) => i.kind === kind).length;
    expect(count("node")).toBe(4);
    expect(count("edge")).toBe(4);
    expect(count("edge-label")).toBe(2);
  });

  test("a solid edge can be traced; a dashed one cannot", () => {
    const edges = scene.items.filter((i) => i.kind === "edge");
    expect(edges.map((e) => e.traceable)).toEqual([true, true, false, false]);
  });

  test("the description carries the caption and the reading order", () => {
    expect(scene.description).toContain(CAPTION);
    expect(scene.description).toContain("Author leads to");
  });
});

describe("standalone SVG", () => {
  const svg = diagramToSvg(spec);

  test("is a self-contained file: literal colours, no CSS variables, a title and a description", () => {
    expect(svg.startsWith("<?xml")).toBe(true);
    for (const name of Object.values(INK_VAR)) expect(svg).not.toContain(`var(${name})`);
    expect(svg).toContain("<title>How a change is reviewed</title>");
    expect(svg).toContain("<desc>");
    expect(svg).toContain('role="img"');
    expect(svg).toMatch(/fill="#[0-9a-f]{6}"/);
  });

  test("is deterministic", () => {
    expect(diagramToSvg(spec)).toBe(svg);
  });

  test("escapes spec text", () => {
    expect(svg).toContain("Independent &lt;review&gt; &amp;");
    expect(svg).not.toContain("<review>");
  });

  test("draws arrowheads as shapes, not markers, so decks and Figma keep them", () => {
    expect(svg).not.toContain("<marker");
    expect((svg.match(/<polygon class="head"/g) ?? []).length).toBe(4);
  });

  test("a dark export resolves to dark inks and a palette overrides the brand", () => {
    const dark = diagramToSvg(spec, { theme: "dark" });
    expect(dark).not.toBe(svg);
    const branded = diagramToSvg(spec, { palette: { primary: "#ff0066" } });
    expect(branded).toContain("#ff0066");
  });

  test("a transparent background leaves out the ground rect", () => {
    const clear = diagramToSvg(spec, { background: "none" });
    expect(clear.length).toBeLessThan(svg.length);
  });

  test("a static figure carries no motion or hover rules", () => {
    expect(svg).not.toContain("@keyframes");
    expect(svg).not.toContain(":hover");
    expect(svg).not.toContain("data-motion");
  });
});

describe("motion", () => {
  const moving = diagramToSvg({ ...spec, motion: ["reveal", "trace", "flow"] });

  test("plays on load in a file, and only for readers who accept motion", () => {
    expect(moving).toContain("data-play");
    expect(moving).toMatch(/@media \(prefers-reduced-motion:no-preference\)\{[\s\S]*@keyframes av-reveal/);
    expect(moving).toContain("@keyframes av-trace");
    expect(moving).toContain("@keyframes av-pulse");
  });

  test("nothing is hidden or animated outside the motion media query", () => {
    const [outside] = moving.split("@media (prefers-reduced-motion:no-preference){");
    expect(outside).not.toContain("opacity:0}.");
    expect(outside).not.toContain("@keyframes");
    expect(outside).not.toContain("animation:");
  });

  test("a dashed edge keeps its dash pattern: only solid lines are length-normalised", () => {
    const paths = [...moving.matchAll(/<path class="line"[^>]*>/g)].map((m) => m[0]);
    const dashed = paths.filter((p) => p.includes("stroke-dasharray"));
    expect(dashed).toHaveLength(2);
    for (const p of dashed) expect(p).not.toContain("pathLength");
    for (const p of paths.filter((p) => !p.includes("stroke-dasharray"))) expect(p).toContain('pathLength="1"');
  });

  test("flow pulses repeat twice on a page and forever only when asked", () => {
    expect(moving).toMatch(/av-pulse 1400ms linear var\(--fd\) 2 backwards/);
    expect(diagramToSvg({ ...spec, motion: ["flow"] }, { loop: true })).toMatch(/var\(--fd\) infinite backwards/);
  });

  test("nodes appear in reading order", () => {
    const delays = [...moving.matchAll(/class="node m" data-id="([a-z]+)"[^>]*style="--d:(\d+)ms/g)].map((m) => [m[1], Number(m[2])] as const);
    const d = Object.fromEntries(delays);
    expect(d.author).toBeLessThan(d.review);
    expect(d.review).toBeLessThan(d.ship);
  });

  test("a flow-only figure marks nothing to be dimmed", () => {
    const flow = diagramToSvg({ ...spec, motion: ["flow"] });
    expect(flow).not.toMatch(/class="[^"]*\bm\b/);
  });

  test("on a page, the dimmed start exists only once the host arms the figure", () => {
    const inline = renderSvg(sceneFromDiagram({ ...spec, motion: ["reveal"] }), { mode: "inline", scope: "av-x" });
    expect(inline).toContain(".av-x[data-armed]:not([data-play]) .m{opacity:0}");
    expect(inline).toContain(".av-x[data-play] .node.m");
    expect(inline).not.toContain("data-play=");
  });
});

describe("interactive focus", () => {
  test("hovering a node keeps its neighbours and edges, and quiets the rest", () => {
    const svg = renderSvg(sceneFromDiagram({ ...spec, interactive: true }), { scope: "av-x" });
    expect(svg).toContain('.av-x:has(.node[data-id="review"]:hover)');
    expect(svg).toMatch(/\(hover:hover\) and \(prefers-reduced-motion:no-preference\)/);
    const audit = /<g class="node" data-id="audit" data-t="([^"]+)"/.exec(svg)![1];
    expect(audit.split(" ").sort()).toEqual(["audit", "review"]);
  });

  test("is off unless asked for", () => {
    expect(renderSvg(sceneFromDiagram(spec))).not.toContain(":hover");
  });
});
