import { cx as cn } from "./cx";
import { FigureFrame } from "./figure-frame";
import { STATUS_TONES } from "./styles";
import {
  axisMax,
  formatValue,
  parseChart,
  ticks,
  type ChartSpec,
  type ChartSpecInput,
} from "../core/chart";
import { SERIES, STROKE } from "../core/tokens";

/**
 * Chart class renderer (`docs/visual-language.md` §4.2).
 *
 * Marks are SVG; axis labels, values and badges are HTML. The drawing is
 * `aria-hidden` and a data table, screen-reader-only, is the one accessible
 * equivalent, so a reader who cannot see the marks still gets every number.
 * Every chart states whether it is illustrative or measured.
 */

function Legend({ spec }: { spec: ChartSpec }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
      {spec.series.map((s, i) => (
        <span key={s.id} className="inline-flex items-center gap-2">
          {spec.type === "bar" ? (
            <span
              className={cn("h-2.5 w-5 rounded-sm bg-current", SERIES[i].className)}
              style={{ opacity: SERIES[i].fillOpacity }}
              aria-hidden="true"
            />
          ) : (
            <svg viewBox="0 0 24 6" className={cn("h-1.5 w-6", SERIES[i].className)} aria-hidden="true" focusable="false">
              <line
                x1="0"
                y1="3"
                x2="24"
                y2="3"
                stroke="currentColor"
                strokeWidth={STROKE.primary}
                strokeDasharray={SERIES[i].dash}
              />
            </svg>
          )}
          {s.label}
        </span>
      ))}
      <span className="rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wider">
        {spec.basis === "illustrative" ? "Illustrative" : `Measured · ${spec.source}`}
      </span>
      {spec.note ? <span className="font-medium text-foreground">{spec.note}</span> : null}
    </div>
  );
}

function DataTable({ spec }: { spec: ChartSpec }) {
  // The wrapper clips; `sr-only` on a <table> itself does not, because tables
  // ignore `overflow`, and its intrinsic width would scroll the page sideways.
  return (
    <div className="sr-only">
    <table>
      <caption>
        {spec.label}
        {spec.unit ? ` (${spec.unit})` : ""}, {spec.basis === "illustrative" ? "illustrative values" : `measured, ${spec.source}`}
      </caption>
      <thead>
        <tr>
          <th scope="col">Category</th>
          {spec.series.map((s) => (
            <th key={s.id} scope="col">
              {s.label}
            </th>
          ))}
          {spec.categories.some((c) => c.badge) ? <th scope="col">Result</th> : null}
        </tr>
      </thead>
      <tbody>
        {spec.categories.map((c, ci) => (
          <tr key={c.label}>
            <th scope="row">{c.label}</th>
            {spec.series.map((s) => (
              <td key={s.id}>{formatValue(s.values[ci], spec.unit, spec.notMeasuredText)}</td>
            ))}
            {spec.categories.some((x) => x.badge) ? <td>{c.badge?.label ?? ""}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

function BarChart({ spec }: { spec: ChartSpec }) {
  const max = axisMax(spec);
  const barH = 22;
  const gap = 8;
  const rowH = spec.series.length * barH + (spec.series.length - 1) * gap;
  const hasBadges = spec.categories.some((c) => c.badge);
  const columns = hasBadges
    ? "grid-cols-[4.5rem_minmax(0,1fr)] sm:grid-cols-[5rem_minmax(0,1fr)_8rem]"
    : "grid-cols-[4.5rem_minmax(0,1fr)] sm:grid-cols-[5rem_minmax(0,1fr)]";

  return (
    <div aria-hidden="true">
      <ul className="flex flex-col gap-4">
        {spec.categories.map((category, ci) => {
          const unmeasured = spec.series.every((s) => s.values[ci] === null);
          return (
            <li key={category.label} className={cn("grid items-center gap-x-4 gap-y-2", columns)}>
              <span className="text-sm font-medium">{category.label}</span>
              {unmeasured ? (
                <div className="flex h-9 items-center rounded-md border border-dashed px-3 text-xs text-muted-foreground">
                  {spec.notMeasuredText}
                </div>
              ) : (
                <svg
                  viewBox={`0 0 1000 ${rowH}`}
                  preserveAspectRatio="none"
                  className="w-full"
                  style={{ height: `${rowH * 0.55}px` }}
                  focusable="false"
                >
                  {ticks(max).map((t) => (
                    <line
                      key={t}
                      x1={(t / max) * 1000}
                      x2={(t / max) * 1000}
                      y1="0"
                      y2={rowH}
                      stroke="currentColor"
                      strokeOpacity="0.12"
                      strokeWidth={STROKE.hairline}
                      vectorEffect="non-scaling-stroke"
                      className="text-foreground"
                    />
                  ))}
                  {spec.series.map((s, si) => {
                    const v = s.values[ci];
                    if (v === null) return null;
                    return (
                      <rect
                        key={s.id}
                        x="0"
                        y={si * (barH + gap)}
                        width={Math.max((v / max) * 1000, 2)}
                        height={barH}
                        rx="3"
                        fill="currentColor"
                        fillOpacity={SERIES[si].fillOpacity}
                        className={SERIES[si].className}
                      />
                    );
                  })}
                </svg>
              )}
              {category.badge ? (
                <span
                  className={cn(
                    "col-start-2 inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold sm:col-start-3",
                    STATUS_TONES[category.badge.tone]
                  )}
                >
                  {category.badge.label}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LineChart({ spec }: { spec: ChartSpec }) {
  const max = axisMax(spec);
  const W = 1000;
  const H = 360;
  const n = spec.categories.length;
  const x = (i: number) => ((i + 0.5) / n) * W;
  const y = (v: number) => H - (v / max) * H;

  // Two rows: the plot, then the category labels. The y labels sit in the plot's row so
  // their percentages are measured against the plot and nothing else, and the SVG keeps
  // its aspect ratio so a marker is a circle, not an ellipse.
  return (
    <div aria-hidden="true" className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-2">
      <div className="relative">
        {ticks(max).map((t) => (
          <span
            key={t}
            className="absolute right-0 -translate-y-1/2 text-xs tabular-nums text-muted-foreground"
            style={{ top: `${(1 - t / max) * 100}%` }}
          >
            {Number.isInteger(t) ? t : t.toFixed(1)}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" focusable="false">
        {ticks(max).map((t) => (
          <line
            key={t}
            x1="0"
            x2={W}
            y1={y(t)}
            y2={y(t)}
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeWidth={STROKE.hairline}
            className="text-foreground"
          />
        ))}
        {spec.series.map((s, si) => {
          // A `null` breaks the line: not measured is absence, never zero.
          const runs: { i: number; v: number }[][] = [[]];
          s.values.forEach((v, i) => {
            if (v === null) runs.push([]);
            else runs[runs.length - 1].push({ i, v });
          });
          return (
            <g key={s.id} className={SERIES[si].className}>
              {runs
                .filter((run) => run.length > 1)
                .map((run, ri) => (
                  <polyline
                    key={ri}
                    points={run.map((p) => `${x(p.i)},${y(p.v)}`).join(" ")}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={STROKE.emphasis}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={SERIES[si].dash}
                  />
                ))}
              {runs.flat().map((p) => (
                <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r="7" fill="currentColor" />
              ))}
            </g>
          );
        })}
      </svg>
      <div />
      <div
        className="mt-2 grid text-center text-xs text-muted-foreground"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {spec.categories.map((c) => (
          <span key={c.label}>{c.label}</span>
        ))}
      </div>
    </div>
  );
}

export function Chart({ spec: input }: { spec: ChartSpecInput }) {
  // Validated here, at build time, so a malformed chart fails the build.
  const spec = parseChart(input);
  return (
    <FigureFrame label={spec.label} caption={spec.caption} figureProps={{ "data-chart": spec.id }}>
      {spec.type === "bar" ? <BarChart spec={spec} /> : <LineChart spec={spec} />}
      <Legend spec={spec} />
      <DataTable spec={spec} />
    </FigureFrame>
  );
}
