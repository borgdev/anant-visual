import { figureToSvg, type FigureInput } from "../core/figures/index.js";
import type { DiagramSpecInput } from "../core/diagram.js";
import type { RenderOptions } from "../core/render-svg.js";

/**
 * Rasterising, for Node only (a build script, a CLI, a docs pipeline). It needs the
 * optional `@resvg/resvg-js` peer dependency, which is imported on first use so the
 * rest of the library never loads it.
 *
 * A PNG is a still: motion is left out. Text needs a font, so pass `fontFiles` for the
 * brand face, or the system fonts are used.
 */
export type PngOptions = Omit<RenderOptions, "mode" | "loop"> & {
  /** Output scale; 2 gives a crisp image for a deck or a retina page. */
  scale?: number;
  fontFiles?: string[];
  /** The family the font files provide, used for the text. */
  fontFamily?: string;
};

export async function svgToPng(svg: string, options: { scale?: number; fontFiles?: string[]; fontFamily?: string } = {}): Promise<Uint8Array> {
  let Resvg: typeof import("@resvg/resvg-js").Resvg;
  try {
    ({ Resvg } = await import("@resvg/resvg-js"));
  } catch {
    throw new Error("PNG export needs the optional dependency @resvg/resvg-js: npm install @resvg/resvg-js");
  }
  const resvg = new Resvg(svg, {
    fitTo: { mode: "zoom", value: options.scale ?? 2 },
    font: {
      loadSystemFonts: !options.fontFiles?.length,
      fontFiles: options.fontFiles,
      defaultFontFamily: options.fontFamily ?? "Inter",
    },
  });
  return resvg.render().asPng();
}

/** Any figure (a diagram, tree, mind map, timeline, matrix, sequence or network) as a PNG. */
export async function figureToPng(input: FigureInput, options: PngOptions = {}): Promise<Uint8Array> {
  const { scale, fontFiles, ...render } = options;
  // Motion is dropped for a still, so the first frame is the whole drawing.
  const svg = figureToSvg({ ...input, motion: [], interactive: false } as FigureInput, render);
  return svgToPng(svg, { scale, fontFiles, fontFamily: render.fontFamily });
}

export const diagramToPng = (input: DiagramSpecInput, options: PngOptions = {}) => figureToPng(input, options);
