import { describe, expect, test } from "vitest";
import { figureToSvg, type FigureInput } from "../src";
// @ts-expect-error a plain data module shared with the gallery script
import { samples } from "../scripts/samples.mjs";

/**
 * Golden files: every sample figure, exported as SVG, is pinned in `tests/__golden__/`.
 * A change to layout, shape, colour or motion shows up as a diff of a picture you can open,
 * so it is reviewed as one. Update with `npx vitest run -u` once the new drawing is right.
 */
describe("golden figures", () => {
  for (const sample of samples as { title: string; spec: FigureInput }[]) {
    const name = sample.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    test(`${sample.title} (static)`, async () => {
      await expect(figureToSvg({ ...sample.spec, motion: [], interactive: false } as FigureInput)).toMatchFileSnapshot(`./__golden__/${name}.svg`);
    });
  }
});
