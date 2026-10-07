/**
 * Shared type and chip styling for the page-local visual components.
 *
 * Every long-form page has its own `*-visuals.tsx`, and without this each one
 * re-declares the same three strings. Keeping them here means a change to the
 * small-label or chip treatment lands on every page at once.
 */

/** Small uppercase heading above a group of items inside a visual. */
export const VISUAL_LABEL =
  "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

/** Neutral inline chip used for lists of inputs, dimensions or fields. */
export const VISUAL_CHIP =
  "rounded-md border bg-background/70 px-2 py-0.5 text-xs font-medium text-muted-foreground";

/** A full-width labeled band standing in for one stage of a short flow. */
export const VISUAL_ROW =
  "rounded-lg border bg-muted/30 px-3 py-2 text-center text-xs font-semibold tracking-wide";

/**
 * Tones are declared as a border/background pair and a text color separately,
 * because some figures need only one of the two — a panel that tints its
 * background still wants its label in the tone color, and vice versa.
 *
 * These are the `--tone-*` tokens on a 10% tint of themselves, which clears
 * AA at small sizes. Do not add `opacity` to text inside them: that composites
 * the text toward its own tint and drops it under the threshold.
 */
export const STATUS_SURFACES = {
  good: "border-tone-good/30 bg-tone-good/10",
  watch: "border-tone-watch/30 bg-tone-watch/10",
  warn: "border-tone-warn/30 bg-tone-warn/10",
  bad: "border-tone-bad/30 bg-tone-bad/10",
  primary: "border-primary/30 bg-primary/10",
  muted: "border-border bg-muted/40",
} as const;

export const STATUS_TEXT = {
  good: "text-tone-good",
  watch: "text-tone-watch",
  warn: "text-tone-warn",
  bad: "text-tone-bad",
  primary: "text-primary",
  muted: "text-muted-foreground",
} as const;

export type StatusTone = keyof typeof STATUS_SURFACES;

/** Border, background and text together — the common case. */
export const STATUS_TONES: Record<StatusTone, string> = {
  good: `${STATUS_SURFACES.good} ${STATUS_TEXT.good}`,
  watch: `${STATUS_SURFACES.watch} ${STATUS_TEXT.watch}`,
  warn: `${STATUS_SURFACES.warn} ${STATUS_TEXT.warn}`,
  bad: `${STATUS_SURFACES.bad} ${STATUS_TEXT.bad}`,
  primary: `${STATUS_SURFACES.primary} ${STATUS_TEXT.primary}`,
  muted: `${STATUS_SURFACES.muted} ${STATUS_TEXT.muted}`,
};

/**
 * Surface steps for signature illustrations, per `docs/visual-language.md`.
 *
 * The four steps exist so an illustrator or an engineer never picks an alpha
 * value by eye. Two rules travel with them:
 *
 *  - Surfaces only. Never place a label on one without verifying its contrast;
 *    a tinted surface makes the label's contrast a property of the artwork,
 *    which is not where an accessibility decision belongs.
 *  - Steps, not gradients. Depth here is a plane and a stroke weight, not
 *    lighting.
 *
 * Geometry, composition and label zones are design decisions and live in the
 * document rather than here.
 */
export const SIGNATURE_SURFACES = {
  faint: "bg-primary/[0.04]",
  light: "bg-primary/[0.08]",
  medium: "bg-primary/[0.12]",
  strong: "bg-primary/[0.18]",
} as const;

export type SignatureSurface = keyof typeof SIGNATURE_SURFACES;

/**
 * The permitted motion vocabulary. Five names, one meaning each; an asset uses
 * one of them and does not invent another (`docs/visual-language.md` §10).
 *
 * `MOTION_SAFE` is the required pairing: the transition is declared for
 * readers who accept motion and removed for those who do not. The global clamp
 * in `globals.css` is the backstop, not the plan — an asset still has to be
 * complete and legible in its static state.
 */
export const MOTION = {
  trace: "duration-[var(--motion-trace)] ease-[var(--ease-standard)]",
  converge: "duration-[var(--motion-converge)] ease-[var(--ease-standard)]",
  cross: "duration-[var(--motion-cross)] ease-[var(--ease-standard)]",
  flip: "duration-[var(--motion-flip)] ease-[var(--ease-standard)]",
  resolve: "duration-[var(--motion-resolve)] ease-[var(--ease-standard)]",
} as const;

export type MotionPrimitive = keyof typeof MOTION;

/** Opacity and transform only — never a property that shifts layout. */
export const MOTION_SAFE =
  "motion-safe:transition-[opacity,transform] motion-reduce:transition-none";

/**
 * The single sanctioned exception. `state-trace` draws a path on by animating
 * `stroke-dashoffset`, which is neither opacity nor transform and cannot be
 * expressed with either, so it gets its own pairing rather than widening the
 * default. Everything else uses `MOTION_SAFE`.
 *
 * `stroke-dasharray` is static configuration and is never animated.
 */
export const MOTION_TRACE_SAFE =
  "motion-safe:transition-[stroke-dashoffset] motion-reduce:transition-none";
