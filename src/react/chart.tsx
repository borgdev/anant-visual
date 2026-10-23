import { useId } from "react";
import { FigureFrame } from "./figure-frame.js";
import { MotionHost } from "./motion-host.js";
import { formatValue, parseChart, type ChartSpec, type ChartSpecInput } from "../core/chart.js";
import { chartToScene } from "../core/chart-scene.js";
import { renderSvg } from "../core/render-svg.js";

/**
 * Chart class renderer (`docs/visual-language.md` §4.2).
 *
 * The whole drawing (marks, axis, values, badges and legend) is one inline SVG from the
 * scene renderer, the same markup an export is made from. The drawing is `aria-hidden`
 * and a data table, screen-reader-only, is the one accessible equivalent, so a reader
 * who cannot see the marks still gets every number. Every chart states, in the drawing,
 * whether it is illustrative or measured.
 */

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
              <td key={s.id}>{formatValue(s.values[ci], spec.unit, spec.notMeasuredText, spec.decimals)}</td>
            ))}
            {spec.categories.some((x) => x.badge) ? <td>{c.badge?.label ?? ""}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

export function Chart({ spec: input }: { spec: ChartSpecInput }) {
  // Validated here, at build time, so a malformed chart fails the build.
  const spec = parseChart(input);
  const scope = `av-${useId().replace(/:/g, "")}`;
  const svg = renderSvg(chartToScene(spec), { mode: "inline", scope });
  const drawing = <div className="mx-auto w-full" style={{ maxWidth: "960px" }} dangerouslySetInnerHTML={{ __html: svg }} />;
  return (
    <FigureFrame label={spec.label} caption={spec.caption} figureProps={{ "data-chart": spec.id }}>
      <div aria-hidden="true">{spec.motion.length ? <MotionHost>{drawing}</MotionHost> : drawing}</div>
      <DataTable spec={spec} />
    </FigureFrame>
  );
}
