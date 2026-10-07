/**
 * Visual tokens: the one place a tint or a stroke weight is defined as a number.
 *
 * `docs/visual-language.md` §6.2 and §9 state these values; this file is what the
 * artwork reads, so a figure never carries a literal `0.12` or `4.5`. SVG attributes
 * need numbers, which Tailwind class strings cannot supply, which is why the
 * surfaces exist both here (for SVG) and in `visual-styles.ts` (for HTML). The
 * `visual-lint` e2e spec asserts that the two agree.
 */

/** Surface tint steps as `fill-opacity` of the accent. Nothing goes above `strong`. */
export const SURFACE = {
  faint: 0.04,
  light: 0.08,
  medium: 0.12,
  strong: 0.18,
} as const;

export type SurfaceStep = keyof typeof SURFACE;

/**
 * Stroke weights in artboard units. A stroke must render at 0.75 CSS px or more at
 * the smallest width the asset is shown at (§6.2), which is why these are numbers
 * rather than opinions.
 */
export const STROKE = {
  /** Signature, 1200 x 800. */
  primary: 3,
  emphasis: 4.5,
  hairline: 1.5,
  /** Signature `compact`, 900 x 900. */
  compactPrimary: 3.5,
  compactEmphasis: 5,
  /** Editorial, 960 x 600. */
  editorial: 1.5,
  editorialEmphasis: 2.25,
} as const;

/** Stroke weights a signature figure may use. Anything else fails `visual-lint`. */
export const ALLOWED_SIGNATURE_STROKES: readonly number[] = [
  STROKE.hairline,
  STROKE.primary,
  STROKE.compactPrimary,
  STROKE.emphasis,
  STROKE.compactEmphasis,
];

/** Opacity of a relationship drawn as context, not as the subject of the figure. */
export const LINE_OPACITY = {
  context: 0.45,
  quiet: 0.35,
  muted: 0.55,
} as const;

/**
 * How chart series are told apart. Colour is never the only carrier: each series
 * also differs in fill weight (bars) or dash pattern (lines), and every value is
 * available as text.
 */
export const SERIES = [
  { className: "text-primary", fillOpacity: 1, dash: undefined },
  { className: "text-muted-foreground", fillOpacity: 0.4, dash: "10 8" },
  { className: "text-tone-watch", fillOpacity: 0.7, dash: "3 7" },
  { className: "text-tone-good", fillOpacity: 0.55, dash: "16 6 3 6" },
] as const;
