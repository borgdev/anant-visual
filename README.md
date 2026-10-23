# @anant/visual

The Anant visual system, shared by every Anant website: design tokens, a **diagram engine**, a **chart engine**, and the figure shell for signature illustrations. It is the code behind one visual language, so a diagram on one product's site looks and behaves like a diagram on another's.

- **Contract:** [`docs/visual-language.md`](docs/visual-language.md) is the rule book (what a figure is for, how it is drawn, labelled, made accessible and animated).
- **Authoring:** [`docs/figure-authoring.md`](docs/figure-authoring.md) is the how-to for adding a diagram or a chart.
- **Adopting it in AnantVerify:** [`docs/adopting-in-anantverify.md`](docs/adopting-in-anantverify.md), rehearsed on a clone of `anantverify-web`.
- **Changes:** [`CHANGELOG.md`](CHANGELOG.md).

## What is in it

| Entry point | Contents | Needs React |
|---|---|---|
| `@anant/visual/core` | `tokens`; the figure kinds (`diagram`, `tree`, `mindmap`, `timeline`, `matrix`, `sequence`, `network`, `chart`) with validation and build-time layout; the **scene** and its **SVG renderer**; `figureToSvg`; JSON Schema | No |
| `@anant/visual/react` | `Figure` (any kind), `FlowDiagram`, `Chart`, `PanZoom`, `MotionHost`, `FigureFrame`, `SignatureFigure`, and the shared class strings | Yes |
| `@anant/visual/node` | `figureToPng`, `svgToPng`, and the `anant-visual` command line (optional peer `@resvg/resvg-js`) | No |
| `@anant/visual` | `core` and `react` | Yes |
| `@anant/visual/theme.css` | The tone and motion CSS tokens the renderers need | n/a |

## One drawing, everywhere

Every figure is laid out into a **scene** and drawn by one renderer, so the figure on a page, an SVG file, a PNG and a slide are the same drawing. Figures animate (`motion`: `reveal`, `trace`, `flow`) and respond to hover (`interactive`), always as enhancements: the markup is the complete static figure, and a reader who asks for reduced motion sees it as is.

```bash
npx anant-visual export spec.json --svg out.svg --png out.png --theme dark
npx anant-visual schema diagram          # JSON Schema, for editors and tools that write specs
npm run gallery                          # gallery/index.html: every sample, with replay and a theme toggle
```

It ships compiled JavaScript (ESM) with type declarations in `dist/`, built by `npm run build` (which also runs on `npm install` from git, via `prepare`). No transpile step is needed in the host.

## Using it in a site (Next.js, Tailwind 4)

1. **Install** (see "How a site gets it" below).
2. **Let Tailwind see its classes.** In the global CSS, after `@import "tailwindcss"`:
   ```css
   @source "../../node_modules/@anant/visual/dist";
   @import "@anant/visual/theme.css";   /* skip if your site already defines the tone and motion tokens */
   ```
3. **Use it.**
   ```tsx
   import { FlowDiagram, Chart } from "@anant/visual/react";

   <FlowDiagram spec={{ id: "review", label: "How a change is reviewed", caption: "…at least 60 characters stating the concept…",
     nodes: [{ id: "a", label: "Author" }, { id: "b", label: "Review", role: "emphasis" }],
     edges: [{ from: "a", to: "b" }] }} />
   ```
   Specs are validated when the page is built, so a diagram that breaks a rule fails the build.

### What the host site must provide

The renderers use the standard shadcn-style colour tokens, which every Anant site defines: `background`, `foreground`, `card`, `border`, `muted`, `muted-foreground`, `primary`. The status tones (`tone-good`, `tone-watch`, `tone-warn`, `tone-bad`) and motion tokens come from `theme.css`. `react` and `react-dom` 19 are peer dependencies.

### What stays in the site

Its figure specs (the content), its registry of signature figures and their artwork, its page placements, and its own claims register. The library draws figures; it does not decide what a site claims.

## How a site gets it

While the repository is private and unpublished, depend on it by git reference, pinned to a tag so a site only changes when it chooses to:

```json
"@anant/visual": "git+ssh://git@github.com/borgdev/anant-visual.git#v0.1.0"
```

Locally, to work on the library and a site together, use `"@anant/visual": "file:../anant-visual"` (a symlink) and **do not commit that**.

## Developing

```bash
npm install
npm run check      # typecheck + tests
```

The tests cover the engines (layout invariants, every build-time refusal, scales), the tokens, and the renderers' accessibility contract (hidden drawing, one text equivalent, no `<text>`/`<style>`/SMIL/hex in the artwork). Browser-level checks (contrast in both themes, text fit at real widths, motion, overflow) need a built page, so each site runs them in its own end-to-end suite; the site's `e2e/` shows how.

## Versioning

Semver. A change to a token value, a limit (`MAX_NODES`, label lengths, the readability width) or a spec field is **breaking for the sites that use it**, and says so in `CHANGELOG.md`. Sites upgrade deliberately, one at a time, and re-run their visual checks.
