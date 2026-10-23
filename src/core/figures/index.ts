import { sceneFromDiagram } from "../export.js";
import type { DiagramSpecInput } from "../diagram.js";
import { renderSvg, type RenderOptions } from "../render-svg.js";
import type { Scene } from "../scene.js";
import { chartToScene } from "../chart-scene.js";
import type { ChartSpecInput } from "../chart.js";
import { matrixToScene, type MatrixSpecInput } from "./matrix.js";
import { networkToScene, type NetworkSpecInput } from "./network.js";
import { sequenceToScene, type SequenceSpecInput } from "./sequence.js";
import { timelineToScene, type TimelineSpecInput } from "./timeline.js";
import { mindmapToScene, treeToScene, type MindmapSpecInput, type TreeSpecInput } from "./tree.js";

export * from "./base.js";
export * from "./tree.js";
export * from "./timeline.js";
export * from "./matrix.js";
export * from "./sequence.js";
export * from "./network.js";

/** Every communication figure the library draws. A diagram has no `kind`; the rest name theirs. */
export type FigureInput =
  | (DiagramSpecInput & { kind?: "diagram" })
  | TreeSpecInput
  | MindmapSpecInput
  | TimelineSpecInput
  | MatrixSpecInput
  | SequenceSpecInput
  | NetworkSpecInput
  | (ChartSpecInput & { kind: "chart" });

export const FIGURE_KINDS = ["diagram", "tree", "mindmap", "timeline", "matrix", "sequence", "network", "chart"] as const;
export type FigureKind = (typeof FIGURE_KINDS)[number];

/** Validates a figure and lays it out into a scene, whatever its kind. */
export function sceneFromFigure(input: FigureInput): Scene {
  const kind = (input as { kind?: string }).kind ?? "diagram";
  switch (kind) {
    case "diagram": {
      const { kind: _k, ...rest } = input as DiagramSpecInput & { kind?: string };
      void _k;
      return sceneFromDiagram(rest);
    }
    case "tree": return treeToScene(input as TreeSpecInput);
    case "mindmap": return mindmapToScene(input as MindmapSpecInput);
    case "timeline": return timelineToScene(input as TimelineSpecInput);
    case "matrix": return matrixToScene(input as MatrixSpecInput);
    case "sequence": return sequenceToScene(input as SequenceSpecInput);
    case "network": return networkToScene(input as NetworkSpecInput);
    case "chart": return chartToScene(input as ChartSpecInput);
    default:
      throw new Error(`Unknown figure kind "${kind}"; expected one of ${FIGURE_KINDS.join(", ")}`);
  }
}

/** Any figure as a standalone SVG file. */
export function figureToSvg(input: FigureInput, options: Omit<RenderOptions, "mode"> = {}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${renderSvg(sceneFromFigure(input), { ...options, mode: "standalone" })}`;
}
