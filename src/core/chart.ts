import { z } from "zod";
import { TONES } from "./diagram.js";
import { MOTIONS } from "./scene.js";

/**
 * Chart class: a spec in, scales and a text equivalent out.
 *
 * `docs/visual-language.md` §4.2. Like diagrams, charts are validated when the page
 * is built. Two rules are enforced here rather than left to review: a chart must
 * say whether its numbers are illustrative or measured (a figure that looked like
 * measured output would be a claim the claims register does not allow), and a
 * measured chart must name its source.
 *
 * Only linear scales are needed by the charts this site draws, so there is no
 * charting dependency. Forbidden by design: pie and donut, gauges, 3D, dual axes,
 * and any rendering of coverage as a share of a whole.
 */

export const MAX_SERIES = 4;

export const chartSpecSchema = z
  .object({
    id: z.string().min(1).regex(/^[a-z0-9][a-z0-9-]*$/),
    label: z.string().min(1),
    caption: z.string().min(60, "a caption must state the concept (60+ characters)"),
    /** Present when the spec travels with other figures; ignored otherwise. */
    kind: z.literal("chart").optional(),
    /** `bar` is horizontal rows, `column` is vertical bars, `line` is a line over the categories. */
    type: z.enum(["bar", "column", "line"]),
    /** Motion that plays once in view: `reveal` brings the marks in, `trace` draws a line on. */
    motion: z.array(z.enum(MOTIONS)).default([]),
    /** Hovering a category keeps it in focus and quiets the rest. */
    interactive: z.boolean().default(false),
    /** Required: a chart is either a worked example or a measurement, never ambiguous. */
    basis: z.enum(["illustrative", "measured"]),
    /** Where a measured number came from. Required when `basis` is "measured". */
    source: z.string().optional(),
    /** Unit of the values, e.g. "ms" or "% of bar". Part of the text equivalent. */
    unit: z.string().optional(),
    /**
     * Decimal places shown on values and the axis. Omit it to show what the number needs: up to two
     * decimals, trailing zeros dropped (0.99 stays 0.99, 48 stays 48), one above a thousand.
     */
    decimals: z.number().int().min(0).max(4).optional(),
    /** Fixed axis maximum. Omit to use a rounded maximum of the data. */
    max: z.number().positive().optional(),
    categories: z
      .array(
        z.object({
          label: z.string().min(1),
          /** A verdict or status shown beside the row (bar charts). */
          badge: z.object({ label: z.string().min(1), tone: z.enum(TONES) }).optional(),
        })
      )
      .min(2),
    series: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1).max(40, "a series label is at most 40 characters; it must fit the legend"),
          /** `null` means not measured. It is drawn as absence, never as zero. */
          values: z.array(z.number().nullable()),
        })
      )
      .min(1)
      .max(MAX_SERIES),
    notMeasuredText: z.string().default("Not measured"),
    /** One line under the chart, e.g. the headline reading. */
    note: z.string().optional(),
  })
  .superRefine((spec, ctx) => {
    if (spec.basis === "measured" && !spec.source) {
      ctx.addIssue({ code: "custom", message: "a measured chart must name its source" });
    }
    for (const s of spec.series) {
      if (s.values.length !== spec.categories.length) {
        ctx.addIssue({ code: "custom", message: `series "${s.id}" has ${s.values.length} values for ${spec.categories.length} categories` });
      }
      if (spec.max !== undefined && s.values.some((v) => v !== null && v > spec.max!)) {
        ctx.addIssue({
          code: "custom",
          message: `series "${s.id}" has a value above the axis maximum (${spec.max}); the bar would be clipped and the chart would misstate it`,
        });
      }
      if ((spec.type === "bar" || spec.type === "column") && s.values.some((v) => v !== null && v < 0)) {
        ctx.addIssue({ code: "custom", message: `${spec.type} series "${s.id}" has a negative value` });
      }
    }
  });

export type ChartSpecInput = z.input<typeof chartSpecSchema>;
export type ChartSpec = z.output<typeof chartSpecSchema>;

export function parseChart(input: ChartSpecInput): ChartSpec {
  const result = chartSpecSchema.safeParse(input);
  if (!result.success) {
    const detail = result.error.issues.map((i) => `${i.path.join(".") || "spec"}: ${i.message}`).join("; ");
    throw new Error(`Invalid chart "${(input as { id?: string }).id ?? "?"}": ${detail}`);
  }
  return result.data;
}

/** Rounds up to 1, 2, 2.5, 5 or 10 times a power of ten. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return step * exp;
}

export function axisMax(spec: ChartSpec): number {
  if (spec.max) return spec.max;
  const all = spec.series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  return niceMax(Math.max(0, ...all));
}

/** Evenly spaced ticks from 0 to `max`, inclusive. */
export function ticks(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, i) => (max / count) * i);
}

/**
 * A number as text, without misstating it. With `decimals` it is that many places; without,
 * it is rounded to two (one from a thousand up) and trailing zeros are dropped, so 0.99 stays
 * 0.99 and 48 stays 48. Rounding to one place would show 0.99 as "1.0".
 */
export function formatNumber(value: number, decimals?: number): string {
  if (decimals !== undefined) return value.toFixed(decimals);
  const places = Math.abs(value) >= 1000 ? 1 : 2;
  return String(Number(value.toFixed(places)));
}

export function formatValue(value: number | null, unit: string | undefined, none: string, decimals?: number): string {
  if (value === null) return none;
  const text = formatNumber(value, decimals);
  return unit ? `${text} ${unit}` : text;
}
