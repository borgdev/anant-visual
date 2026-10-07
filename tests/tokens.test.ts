import { describe, expect, test } from "vitest";
import { ALLOWED_SIGNATURE_STROKES, SERIES, STROKE, SURFACE } from "../src/core/tokens";
import { SIGNATURE_SURFACES } from "../src/react/styles";

describe("tokens", () => {
  test("surface tints step up and stop at 18%", () => {
    const steps = Object.values(SURFACE);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(Math.max(...steps)).toBeLessThanOrEqual(0.18);
  });

  test("the HTML surface classes agree with the SVG surface tokens", () => {
    for (const step of Object.keys(SURFACE) as (keyof typeof SURFACE)[]) {
      expect(SIGNATURE_SURFACES[step]).toContain(`[${SURFACE[step]}]`);
    }
  });

  test("a stroke renders at 0.75px or more at 320px on a 1200-unit artboard", () => {
    // The rule behind the scale (docs/visual-language.md §6.2).
    expect(STROKE.primary * (320 / 1200)).toBeGreaterThanOrEqual(0.75);
    expect(ALLOWED_SIGNATURE_STROKES).toContain(STROKE.primary);
    expect(ALLOWED_SIGNATURE_STROKES).toContain(STROKE.emphasis);
  });

  test("series differ by more than colour: fill weight or dash", () => {
    const keys = SERIES.map((s) => `${s.fillOpacity}|${s.dash ?? ""}`);
    expect(new Set(keys).size).toBe(SERIES.length);
  });
});
