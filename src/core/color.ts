/**
 * Colour for the places a CSS variable cannot reach: a standalone SVG, a PNG, a deck.
 *
 * Inline, the scene renderer writes `var(--primary)` and the host's theme decides.
 * Exported, there is no host, so every ink is resolved here to a literal. The tone
 * values are the ones in `theme.css`, and a test asserts the two agree.
 */

export type Theme = "light" | "dark";

/** Every colour a scene may ask for. Tones are the status colours, the rest are the shadcn-style tokens. */
export const INKS = [
  "primary",
  "foreground",
  "muted",
  "background",
  "card",
  "border",
  "good",
  "watch",
  "warn",
  "bad",
] as const;
export type Ink = (typeof INKS)[number];

/** The CSS variable each ink reads from when the host provides the theme. */
export const INK_VAR: Record<Ink, string> = {
  primary: "--primary",
  foreground: "--foreground",
  muted: "--muted-foreground",
  background: "--background",
  card: "--card",
  border: "--border",
  good: "--tone-good",
  watch: "--tone-watch",
  warn: "--tone-warn",
  bad: "--tone-bad",
};

/** The same values as `theme.css`, as oklch strings, so a test can compare them verbatim. */
export const TONE_OKLCH: Record<Theme, Record<"good" | "watch" | "warn" | "bad", string>> = {
  light: {
    good: "oklch(0.46 0.13 149)",
    watch: "oklch(0.45 0.13 75)",
    warn: "oklch(0.48 0.165 41)",
    bad: "oklch(0.48 0.19 27)",
  },
  dark: {
    good: "oklch(0.7 0.16 149)",
    watch: "oklch(0.8 0.15 75)",
    warn: "oklch(0.7 0.18 41)",
    bad: "oklch(0.704 0.191 22.216)",
  },
};

/** Neutral defaults for a standalone export; pass `palette` to match a brand. */
export const DEFAULT_PALETTE: Record<Theme, Record<Ink, string>> = {
  light: {
    primary: "oklch(0.5 0.17 262)",
    foreground: "oklch(0.145 0 0)",
    muted: "oklch(0.45 0 0)",
    background: "oklch(1 0 0)",
    card: "oklch(1 0 0)",
    border: "oklch(0.87 0 0)",
    ...TONE_OKLCH.light,
  },
  dark: {
    primary: "oklch(0.72 0.14 262)",
    foreground: "oklch(0.985 0 0)",
    muted: "oklch(0.72 0 0)",
    background: "oklch(0.145 0 0)",
    card: "oklch(0.205 0 0)",
    border: "oklch(0.35 0 0)",
    ...TONE_OKLCH.dark,
  },
};

const OKLCH = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/;

/** Converts `oklch(L C h)` to `#rrggbb`. Anything else (a hex, a name) passes through unchanged. */
export function toHex(color: string): string {
  const m = OKLCH.exec(color.trim());
  if (!m) return color;
  const L = Number(m[1]);
  const C = Number(m[2]);
  const h = (Number(m[3]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  const byte = (v: number) => {
    const c = Math.min(1, Math.max(0, v));
    const g = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(g * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${lin.map(byte).join("")}`;
}

/** Resolves an ink to a literal colour for a theme, with optional overrides. */
export function resolveInk(ink: Ink, theme: Theme, palette?: Partial<Record<Ink, string>>): string {
  return toHex(palette?.[ink] ?? DEFAULT_PALETTE[theme][ink]);
}
