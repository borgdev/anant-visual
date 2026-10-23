import { axisMax, formatValue, parseChart, ticks, type ChartSpec, type ChartSpecInput } from "./chart.js";
import { TONE_INK, wrap } from "./diagram-scene.js";
import type { Ink } from "./color.js";
import type { Primitive, Scene, SceneItem } from "./scene.js";
import { SERIES, STROKE } from "./tokens.js";

/**
 * A chart as a scene: the same marks, labels and legend a page shows, as one drawing, so it
 * exports to SVG and PNG and animates like any other figure. Every value is also in the
 * accessible equivalent (a table on the page), and a chart says whether its numbers are
 * illustrative or measured in the drawing itself.
 */

const W = 960;
const fmt = (t: number) => (Number.isInteger(t) ? String(t) : t.toFixed(1));
const grid = (d: string): Primitive => ({ t: "path", d, stroke: { ink: "foreground", opacity: 0.12 }, strokeWidth: STROKE.hairline });
const label = (x: number, y: number, line: string, o: { size?: number; anchor?: "start" | "middle" | "end"; weight?: 400 | 500 | 600 | 700; ink?: Ink } = {}): Primitive => ({
  t: "text",
  x,
  y,
  lines: [line],
  size: o.size ?? 13,
  lineHeight: (o.size ?? 13) * 1.25,
  weight: o.weight ?? 400,
  anchor: o.anchor ?? "start",
  fill: { ink: o.ink ?? "muted" },
});

function legend(spec: ChartSpec, y: number): { items: SceneItem[]; height: number } {
  const items: SceneItem[] = [];
  const entries: { text: string; swatch: Primitive[]; width: number }[] = spec.series.map((s, i) => {
    const w = s.label.length * 7.4 + 34 + 28;
    const ink = SERIES[i].ink;
    const swatch: Primitive[] =
      spec.type === "line"
        ? [{ t: "path", d: "M0,0 L24,0", stroke: { ink }, strokeWidth: STROKE.primary, dash: SERIES[i].dash }]
        : [{ t: "rect", x: 0, y: -6, w: 22, h: 12, rx: 3, fill: { ink, opacity: SERIES[i].fillOpacity } }];
    return { text: s.label, swatch, width: w };
  });
  const basis = spec.basis === "illustrative" ? "ILLUSTRATIVE" : `MEASURED · ${spec.source}`.toUpperCase();
  let x = 24;
  let row = 0;
  const place = (width: number) => {
    if (x > 24 && x + width > W - 24) {
      x = 24;
      row++;
    }
    const at = x;
    x += width;
    return { x: at, y: y + row * 28 };
  };
  entries.forEach((e) => {
    const p = place(e.width);
    const shift = (prim: Primitive): Primitive => (prim.t === "rect" ? { ...prim, x: prim.x + p.x, y: prim.y + p.y } : prim.t === "path" ? { ...prim, d: `M${p.x},${p.y} L${p.x + 24},${p.y}` } : prim);
    items.push({ kind: "legend", ref: `legend:${e.text}`, seq: 0, touches: [], prims: [...e.swatch.map(shift), label(p.x + 32, p.y + 4.5, e.text)] });
  });
  const chip = place(basis.length * 8 + 28);
  const chipW = basis.length * 8 + 16;
  items.push({
    kind: "legend",
    ref: "legend:basis",
    seq: 0,
    touches: [],
    prims: [
      { t: "rect", x: chip.x, y: chip.y - 11, w: chipW, h: 22, rx: 11, stroke: { ink: "border" }, strokeWidth: STROKE.hairline },
      label(chip.x + chipW / 2, chip.y + 4, basis, { size: 11.5, anchor: "middle", weight: 600 }),
    ],
  });
  let height = (row + 1) * 28;
  if (spec.note) {
    items.push({ kind: "legend", ref: "legend:note", seq: 0, touches: [], prims: [label(24, y + height + 8, spec.note, { size: 14, ink: "foreground", weight: 500 })] });
    height += 28;
  }
  return { items, height };
}

function barChart(spec: ChartSpec) {
  const max = axisMax(spec);
  const barH = 20;
  const gap = 6;
  const rowH = spec.series.length * barH + (spec.series.length - 1) * gap;
  const badges = spec.categories.some((c) => c.badge);
  const labelW = 150;
  const plotX = 24 + labelW + 12;
  const badgeW = badges ? 150 : 0;
  const valueRoom = 78;
  const plotW = W - plotX - 24 - badgeW - valueRoom;
  const top = 18;
  const rowGap = 24;
  const bottom = top + spec.categories.length * rowH + (spec.categories.length - 1) * rowGap;
  const items: SceneItem[] = [
    {
      kind: "region",
      ref: "axis",
      seq: -1,
      touches: [],
      prims: [
        ...ticks(max).map((t) => grid(`M${plotX + (t / max) * plotW},${top - 8} L${plotX + (t / max) * plotW},${bottom + 8}`)),
        ...ticks(max).map((t) => label(plotX + (t / max) * plotW, bottom + 28, fmt(t), { anchor: "middle" })),
      ],
    },
  ];
  spec.categories.forEach((c, ci) => {
    const y = top + ci * (rowH + rowGap);
    const prims: Primitive[] = [];
    const lines = wrap(c.label, 20);
    prims.push({ t: "text", x: 24, y: y + rowH / 2 - ((lines.length - 1) * 18) / 2, lines, size: 15, lineHeight: 18, weight: 500, anchor: "start", fill: { ink: "foreground" } });
    if (spec.series.every((s) => s.values[ci] === null)) {
      prims.push(
        { t: "rect", x: plotX, y: y + rowH / 2 - 18, w: plotW, h: 36, rx: 8, stroke: { ink: "border" }, strokeWidth: STROKE.hairline, dash: "6 5" },
        label(plotX + 14, y + rowH / 2 + 4.5, spec.notMeasuredText)
      );
    } else {
      spec.series.forEach((s, si) => {
        const v = s.values[ci];
        if (v === null) return;
        const by = y + si * (barH + gap);
        const w = Math.max((v / max) * plotW, 2);
        prims.push(
          { t: "rect", x: plotX, y: by, w, h: barH, rx: 3, fill: { ink: SERIES[si].ink, opacity: SERIES[si].fillOpacity } },
          label(plotX + w + 8, by + barH / 2 + 4.5, formatValue(v, spec.unit, spec.notMeasuredText), { size: 13, ink: "foreground", weight: 500 })
        );
      });
    }
    if (c.badge) {
      const ink = TONE_INK[c.badge.tone]!;
      const bw = c.badge.label.length * 8 + 28;
      const bx = W - 24 - badgeW + 8;
      prims.push(
        { t: "rect", x: bx, y: y + rowH / 2 - 14, w: bw, h: 28, rx: 14, fill: { ink, opacity: 0.1 }, stroke: { ink, opacity: 0.3 }, strokeWidth: STROKE.hairline },
        { t: "text", x: bx + bw / 2, y: y + rowH / 2, lines: [c.badge.label], size: 13, lineHeight: 16, weight: 600, anchor: "middle", fill: { ink } }
      );
    }
    items.push({ kind: "node", ref: `c${ci}`, seq: ci, touches: [`c${ci}`], prims });
  });
  return { items, bottom: bottom + 66 };
}

/** Plot geometry shared by the column and line charts. */
function plotGeometry(spec: ChartSpec) {
  const max = axisMax(spec);
  const x0 = 64;
  const plotW = W - x0 - 28;
  const top = 18;
  const plotH = 300;
  const n = spec.categories.length;
  return { max, x0, plotW, top, plotH, n, bottom: top + plotH, cx: (i: number) => x0 + ((i + 0.5) / n) * plotW, y: (v: number) => top + plotH - (v / max) * plotH };
}

function axes(spec: ChartSpec, g: ReturnType<typeof plotGeometry>): SceneItem {
  return {
    kind: "region",
    ref: "axis",
    seq: -1,
    touches: [],
    prims: [
      ...ticks(g.max).map((t) => grid(`M${g.x0},${g.y(t)} L${g.x0 + g.plotW},${g.y(t)}`)),
      ...ticks(g.max).map((t) => label(g.x0 - 10, g.y(t) + 4.5, fmt(t), { anchor: "end" })),
      ...spec.categories.map((c, i) => ({ t: "text" as const, x: g.cx(i), y: g.bottom + 26, lines: wrap(c.label, Math.max(8, Math.floor(g.plotW / g.n / 8.5))), size: 14, lineHeight: 17, weight: 500 as const, anchor: "middle" as const, fill: { ink: "muted" as const } })),
    ],
  };
}

function columnChart(spec: ChartSpec) {
  const g = plotGeometry(spec);
  const items: SceneItem[] = [axes(spec, g)];
  const slot = (g.plotW / g.n) * 0.68;
  const bw = Math.min(46, slot / spec.series.length);
  spec.categories.forEach((_, ci) => {
    const prims: Primitive[] = [];
    const start = g.cx(ci) - (bw * spec.series.length) / 2;
    spec.series.forEach((s, si) => {
      const v = s.values[ci];
      if (v === null) {
        prims.push({ t: "rect", x: start + si * bw + 2, y: g.bottom - 30, w: bw - 4, h: 30, rx: 4, stroke: { ink: "border" }, strokeWidth: STROKE.hairline, dash: "4 4" });
        return;
      }
      const h = Math.max((v / g.max) * g.plotH, 2);
      prims.push(
        { t: "rect", x: start + si * bw, y: g.bottom - h, w: bw - 3, h, rx: 3, fill: { ink: SERIES[si].ink, opacity: SERIES[si].fillOpacity } },
        { t: "text", x: start + si * bw + (bw - 3) / 2, y: g.bottom - h - 10, lines: [fmt(v)], size: 13, lineHeight: 16, weight: 500, anchor: "middle", fill: { ink: "foreground" } }
      );
    });
    items.push({ kind: "node", ref: `c${ci}`, seq: ci, touches: [`c${ci}`], prims });
  });
  return { items, bottom: g.bottom + 70 };
}

function lineChart(spec: ChartSpec) {
  const g = plotGeometry(spec);
  const items: SceneItem[] = [axes(spec, g)];
  spec.series.forEach((s, si) => {
    // A `null` breaks the line: not measured is absence, never zero.
    const runs: { i: number; v: number }[][] = [[]];
    s.values.forEach((v, i) => (v === null ? runs.push([]) : runs[runs.length - 1].push({ i, v })));
    runs
      .filter((r) => r.length > 1)
      .forEach((run, ri) =>
        items.push({
          kind: "edge",
          ref: `${s.id}:${ri}`,
          seq: 0,
          touches: spec.categories.map((_, i) => `c${i}`),
          traceable: !SERIES[si].dash,
          prims: [{ t: "path", d: run.map((p, k) => `${k ? "L" : "M"}${g.cx(p.i)},${g.y(p.v)}`).join(" "), stroke: { ink: SERIES[si].ink }, strokeWidth: STROKE.emphasis, dash: SERIES[si].dash }],
        })
      );
  });
  spec.categories.forEach((_, ci) => {
    const prims: Primitive[] = [];
    spec.series.forEach((s, si) => {
      const v = s.values[ci];
      if (v === null) return;
      const cx = g.cx(ci);
      const cy = g.y(v);
      prims.push({ t: "shape", d: `M${cx - 7},${cy} a7,7 0 1 0 14,0 a7,7 0 1 0 -14,0 Z`, fill: { ink: SERIES[si].ink } });
    });
    items.push({ kind: "node", ref: `c${ci}`, seq: ci, touches: [`c${ci}`], prims });
  });
  return { items, bottom: g.bottom + 70 };
}

export function chartToScene(input: ChartSpecInput): Scene {
  const spec = parseChart(input);
  const body = spec.type === "bar" ? barChart(spec) : spec.type === "column" ? columnChart(spec) : lineChart(spec);
  const key = legend(spec, body.bottom);
  const unit = spec.unit ? ` (${spec.unit})` : "";
  const basis = spec.basis === "illustrative" ? "illustrative values" : `measured, ${spec.source}`;
  const equivalent = spec.categories.map((c, ci) => ({
    text: c.label,
    detail: spec.series.map((s) => `${s.label}: ${formatValue(s.values[ci], spec.unit, spec.notMeasuredText)}`).join("; ") + (c.badge ? `; ${c.badge.label}` : ""),
  }));
  return {
    id: spec.id,
    width: W,
    height: body.bottom + key.height + 20,
    title: spec.label,
    description: `${spec.caption} ${spec.label}${unit}, ${basis}. ${equivalent.map((e) => `${e.text}: ${e.detail}`).join(". ")}`,
    items: [...body.items, ...key.items],
    motion: spec.motion,
    interactive: spec.interactive,
    equivalent,
  };
}
