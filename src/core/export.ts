import { describeDiagram, layoutDiagram, parseDiagram, type DiagramSpecInput } from "./diagram.js";
import { diagramToScene } from "./diagram-scene.js";
import { renderSvg, type RenderOptions } from "./render-svg.js";
import type { Scene } from "./scene.js";

/** A validated, laid-out diagram as a scene: the one thing every renderer and exporter starts from. */
export function sceneFromDiagram(input: DiagramSpecInput): Scene {
  const spec = parseDiagram(input);
  const layout = layoutDiagram(spec);
  const text = describeDiagram(spec, layout)
    .map((i) => `${i.text}${i.leadsTo.length ? ` leads to ${i.leadsTo.join("; ")}` : ""}`)
    .join(". ");
  return diagramToScene(spec, layout, `${spec.caption} ${text}`);
}

/**
 * A diagram as a standalone SVG file: literal colours, a title and description, fonts by
 * name, and any motion playing on load. Paste it into a doc or a deck, or rasterise it.
 */
export function diagramToSvg(input: DiagramSpecInput, options: Omit<RenderOptions, "mode"> = {}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${renderSvg(sceneFromDiagram(input), { ...options, mode: "standalone" })}`;
}
