# Developer guide: using `@anant/visual` in a site

For an engineer adding the library to an Anant website, or writing the figures on one. It is the "how", with the numbers and the traps. The rules about what a figure is for and how it must look are in [`visual-language.md`](visual-language.md); the step-by-step for writing one spec is in [`figure-authoring.md`](figure-authoring.md); the worked example of a site adopting and upgrading it (AnantVerify) is in [`adopting-anant-visual.md`](adopting-anant-visual.md).

**In ten lines.** You write a plain-data *spec* (JSON-shaped, validated by zod). The library lays it out into a *scene* (positioned shapes and text), and one renderer draws that scene as an inline SVG on the page, as a standalone SVG file, or as a PNG. Eight kinds of figure share this: `diagram`, `tree`, `mindmap`, `timeline`, `matrix`, `sequence`, `network`, `chart`. A bad spec fails the build. Motion and hover are opt-in and always an enhancement of a figure that is already complete.

```
spec  →  validate  →  layout  →  scene  →  SVG on the page   (server component, no layout code in the browser)
                                        →  SVG file         (figureToSvg, the CLI)
                                        →  PNG              (figureToPng, Node only)
```

---

## 1. Requirements

| Needs | Version | Notes |
|---|---|---|
| React | 19 | Peer dependency |
| A bundler that handles ESM and `"use client"` | Next 16 is what is tested | Any React 19 setup that does should work, but only Next 16 + Tailwind 4 is in the library's test harness |
| Tailwind | 4 | Only so its classes in `dist` are generated (see §2). The drawing itself is SVG with inline styles |
| The shadcn-style colour tokens | `--background`, `--foreground`, `--card`, `--border`, `--muted-foreground`, `--primary` | Every Anant site already defines them. Dark mode is a `.dark` class on an ancestor |
| The status tone tokens | `--tone-good/watch/warn/bad` | From `theme.css`, or bridged from your own names (§2) |
| zod | 4 | A direct dependency of the library, nothing to install |
| `@resvg/resvg-js` | `^2.6` | **Optional**, only to write PNGs from Node. Not needed to draw figures on a page or to write SVG |
| Chrome, Firefox, Safari | Current | The motion uses CSS `offset-path`, `:has()` and `@media (prefers-reduced-motion)`. Checked in Chrome, Firefox and WebKit on desktop; not in iOS Safari or Android browsers |

The library is currently a private git dependency, not published to npm. See §12.

## 2. Setting a site up

**1. Install**, pinned to a tag:

```bash
npm install "github:borgdev/anant-visual#v0.2.0"
```

**`v0.2.0` is not tagged yet** (GitHub has only `v0.1.0`), so this command fails until the `avant-grade` branch is merged and tagged. Until then install a commit of that branch, `#<sha>` in place of `#v0.2.0`, or a packed tarball (§11). The repository does not commit `dist/`: npm builds it on install through `prepare`, so the machine needs `git` and network access to fetch the dev dependencies for that build.

**2. Tell Tailwind about the package.** In your global CSS, after `@import "tailwindcss"`:

```css
@source "../../node_modules/@anant/visual/dist";   /* the library's class names; adjust the relative path */
@import "@anant/visual/theme.css";                 /* skip if your site already defines --tone-* and --motion-* */
```

Without the `@source` line the figure frame, list and viewer render unstyled. The drawing itself still appears, because it is inline SVG, which is why a missing line is easy to miss. Check the figure's card and the viewer's buttons.

**3. Check your colour tokens.** The drawing reads these CSS variables, which must hold a full colour (an `oklch(...)`, a hex, anything CSS accepts):

| Ink | Variable | Used for |
|---|---|---|
| `primary` | `--primary` | Edges, the emphasised node, lines and bars |
| `foreground` | `--foreground` | Node labels, values |
| `muted` | `--muted-foreground` | Sublabels, lane headers, axis labels |
| `background` | `--background` | Node fill |
| `card` | `--card` | Behind edge labels, the figure frame |
| `border` | `--border` | Node outlines, lane borders |
| `good` `watch` `warn` `bad` | `--tone-good` … `--tone-bad` | Status tones |

If your site names the status colours differently (AnantVerify calls them `--verdict-*`), bridge them in `@theme inline` rather than renaming; see the AnantVerify guide, step 2.

**4. Draw something.**

```tsx
// app/page.tsx: a server component
import { Figure } from "@anant/visual/react";

export default function Page() {
  return (
    <Figure
      spec={{
        id: "review-path",
        label: "How a change is reviewed",
        caption: "A change reaches production only after an independent review, and a rejected change returns to its author.",
        nodes: [
          { id: "author", label: "Author" },
          { id: "review", label: "Independent review", role: "emphasis" },
          { id: "ship", label: "Production", role: "terminal", tone: "good" },
        ],
        edges: [
          { from: "author", to: "review" },
          { from: "review", to: "ship", label: "approved", style: "emphasis" },
          { from: "review", to: "author", label: "rejected", style: "dashed" },
        ],
      }}
    />
  );
}
```

`Figure` draws any kind. `FlowDiagram` and `Chart` are the same thing for one kind each.

## 3. Rendering: server or client?

**Render figures in server components.** Validation and layout then run at build time and none of that code, nor zod, reaches the browser. Measured in the library's test app (Next 16.4, production build), the library code sent to the browser for sixteen figures including a zoomable one was about 3 KB (1.4 KB gzipped): `MotionHost` and `PanZoom`, the only two client components. The whole library's compiled JS is 133 KB raw (38 KB gzipped) for `core`, 23 KB (7 KB gzipped) for `react`, and none of it ships when figures are rendered on the server.

If you render a `Figure` inside a client component, it still works, but then layout and validation run in the browser and `core` ships with the page. Prefer passing the spec from a server component.

A figure that sets `motion` or `profile: "technical"` hydrates a small client wrapper. A figure with neither is plain HTML and SVG.

## 4. The eight kinds, at a glance

| Kind | Answers | Minimal spec (besides `id`, `label`, `caption`) |
|---|---|---|
| diagram (no `kind`) | What is the flow, process or architecture? | `nodes`, `edges`; optionally `groups`, `lanes`, `shape`, `icon`, `legend`, `routing` |
| `tree` | How is it organised? | `root: { id, label, children: [...] }` |
| `mindmap` | What is it made of? | `center`, `branches: [{ id, label, children }]` |
| `timeline` | When? | `events: [{ id, when, label, detail? }]`, optional `phases` |
| `matrix` | Which first, where does each sit? | `x`, `y` axes, `items: [{ id, label, x: 0..1, y: 0..1 }]` |
| `sequence` | Who talks to whom, in what order? | `participants`, `messages: [{ from, to, label }]` |
| `network` | What is connected to what? | `nodes`, `links` |
| `chart` | How much, how has it changed? | `type: "bar" \| "column" \| "line"`, `basis`, `categories`, `series` |

Every kind also takes `motion` and `interactive`. Examples of each, and the limits, are in [`figure-authoring.md`](figure-authoring.md); `npm run gallery` draws one of every kind.

## 5. Motion and hover

```ts
{ ...spec, motion: ["reveal", "trace", "flow"], interactive: true }
```

- `reveal` brings the parts in, in reading order. `trace` draws the solid edges (and a chart's line) on. `flow` sends a pulse along each edge, twice. `interactive` makes hovering a node quiet everything not connected to it.
- It plays **once, when 40% of the figure is in view**, and **only** for readers who have not asked for reduced motion. With scripts off, or reduced motion on, the figure is simply the finished drawing.
- The server HTML is always the complete figure. After hydration `MotionHost` dims the animated parts (`data-armed`) and releases them (`data-play`). A figure already in view when the page hydrates can blink once as it goes from drawn to armed; this has not been measured on a slow device, so put motion on figures below the fold, or check it on yours.
- It animates only opacity, transform, `stroke-dashoffset` and `offset-distance`. Do not add other animation to a figure; the library's contract (§10, §21) forbids anything that shifts layout.
- On a marketing page, at most three animated figures. This is a design limit, not enforced in code.

## 6. Exporting: SVG, PNG, the command line

```ts
import { figureToSvg } from "@anant/visual/core";
import { figureToPng } from "@anant/visual/node";    // Node only; npm i @resvg/resvg-js

const svg = figureToSvg(spec, { theme: "dark" });                      // a file: literal colours, title, description
const png = await figureToPng(spec, { scale: 2, fontFiles: ["./Inter.ttf"], fontFamily: "Inter" });
```

```bash
npx anant-visual check  spec.json
npx anant-visual export spec.json --svg out.svg --png out.png --theme dark --scale 2 --font ./Inter.ttf --font-family Inter
npx anant-visual schema diagram > diagram.schema.json
```

- **Colours.** An export has no host theme, so inks become literal colours. The status tones are exactly the ones in `theme.css` (a test holds them equal). `primary`, `foreground` and the rest default to a neutral palette: pass `palette: { primary: "#0a5cff", … }` to match your brand.
- **Fonts.** A PNG is drawn by resvg, not a browser, so it uses system fonts unless you give it `fontFiles`. An SVG file names a font family and the viewer supplies it: when it will leave your machine, export a PNG, or convert text to outlines in your design tool. Pass `fontFamily` to name the one you want.
- **Motion in a file.** An exported SVG plays its motion on load in a browser (a deck has no page to scroll). `loop: true` lets the flow pulse repeat forever, which suits a presentation and is never used on a page. A PNG is a still.
- **Where to put it.** Generate exports in a build step or a script, not at request time; commit the output if a doc or a deck needs a stable file. Specs are deterministic, so the same spec gives the same bytes and a diff means something changed.
- **Slides.** SVG imports into PowerPoint, Keynote and Google Slides. Arrowheads are drawn as shapes, not SVG markers, so they survive. Animation does not carry into a slide tool; use the PNG.

## 7. Writing specs: the workflow

- **Keep specs in one module per site** (`figure-specs.ts`), keyed by id, and place them by key (`figure: "diagram:review-path"`). It keeps content out of components and makes every figure reviewable in one place. AnantState does this.
- **Write the caption first.** It must state the concept ("a change must be reviewed"), not describe the picture ("boxes joined by arrows"), and be at least 60 characters. The build refuses a short one. It is also read by assistive technology and is the SVG's `<desc>`.
- **Let the editor help.** `npx anant-visual schema <kind>` prints a JSON Schema generated from the validators. Point a JSON file's `"$schema"` at it for autocomplete and inline errors, or hand it to a tool or a language model that drafts specs: it describes exactly what the build accepts.
- **Claims.** A chart says `illustrative` or `measured`, and a measured one names its `source`. The library enforces that it is said, not that it is true; your site's claims register decides what may be measured.
- **Do not hand-position.** Use `position` only as a last resort. If the layout does something you think is wrong, say so against the library: the fix belongs in the engine.

## 8. Testing the figures on your site

Three layers, from cheap to expensive:

1. **A unit test that parses every spec.** It fails the moment a spec is invalid, before a build:
   ```ts
   import { sceneFromFigure } from "@anant/visual/core";
   test.each(Object.entries(FIGURES))("%s is valid and lays out", (_, spec) => {
     expect(() => sceneFromFigure(spec)).not.toThrow();
   });
   ```
2. **Golden SVGs**, as the library does: `expect(figureToSvg(spec)).toMatchFileSnapshot("./golden/review-path.svg")`. A visual change appears as a diff of a picture you can open.
3. **A browser test** against your built site: that each figure hydrates without errors, that its words fit, that axe finds nothing in light and dark, and that nothing overflows at 375px. The library's own version of this, for a Next app, is `e2e/browser.test.ts`; copy its checks and point them at your routes. It uses `playwright-core` with `axe-core`, and runs in Chrome, Firefox and WebKit.

Look at every figure at 375px and at desktop width, in light and dark, with reduced motion on and off.

## 9. Accessibility, what you get and what you owe

You get, with no work: the drawing hidden from assistive technology and replaced by one ordered list built from the same layout (steps in reading order, lane and group path, where each leads, the key); a chart's data table; the caption; controls that are real, named buttons; keyboard scrolling and zoom in the viewer; nothing hidden for a reader who declines motion; status never carried by colour alone; and, checked by axe in light and dark on every sample figure, no WCAG 2 A/AA or best-practice violations.

You owe: a caption that states the concept; labels that are words, not codes; a legend whenever a shape, dash or tone carries a meaning a reader would have to guess; a contrast check of **your** `--primary`, `--muted-foreground` and tone colours on your backgrounds (the library's colours are tuned for its own tokens); and a real screen-reader pass on a page that matters, which has not been done for the library.

## 10. Troubleshooting

| You see | Cause | Fix |
|---|---|---|
| `Invalid diagram "x": caption: a caption must state the concept (60+ characters)` | Caption too short | Say what the figure means |
| `a diagram has at most 25 nodes; split it (or set profile "technical" …)` | Marketing limit | Split it, or `profile: "technical"` for documentation |
| `it is N units wide, and its text would render too small to read` | Too many steps in a row | `direction: "ttb"`, fewer steps, or `profile: "technical"` |
| `group "g" would cover node "x", which is not a member` | A group's members are not adjacent | Keep its members together, or add `x` to the group |
| `group "g" spans lanes …` | A group crosses a lane border | Put the group in one lane |
| `node "x" is in no lane, and every node must be in one …` | Lanes were declared | Give every node a `lane` |
| `node "x" has no links` (network) | An unconnected node | Link it or drop it |
| `a measured chart must name its source` | `basis: "measured"` without `source` | Add `source` |
| Figures render with no card, a stacked list, or unstyled buttons | Tailwind has not seen the package | The `@source` line in §2 |
| Colours are wrong or black | A required CSS variable is missing | The table in §2 |
| A figure blinks once as the page loads | Motion arms after hydration | Put animated figures below the fold |
| `PNG export needs the optional dependency @resvg/resvg-js` | Not installed | `npm i @resvg/resvg-js` |
| A PNG has the wrong typeface | System fonts used | `fontFiles` and `fontFamily` |
| Turbopack cannot resolve the package after `file:../anant-visual` | A symlink outside the project root | Install a packed tarball (§11) |

## 11. Working on the library

```bash
npm run check            # typecheck, unit and golden tests, build
npm run gallery          # gallery/index.html: every sample, with replay and a theme toggle
npm run test:browser     # real-browser tests in Chrome (BROWSER=firefox|webkit, or test:browser:all)
```

- **Unit and golden tests** run in about two seconds. A deliberate change to a drawing shows up as a changed SVG in `tests/__golden__/`; open it, and if it is right, `npx vitest run -u`.
- **Browser tests** build a Next 16 + Tailwind 4 app in `e2e/next-app`, install the library into it as a packed tarball (the way a site gets it), and drive it. They take about a minute. They need Chrome installed and, for the others, `npx playwright-core install firefox webkit`.
- **To try a local change in a real site**, pack and install, do not symlink: `npm pack` here, then `npm install --no-save ../anant-visual/anant-visual-0.2.0.tgz` in the site. Turbopack will not follow a symlink outside the project root.
- **Adding a figure kind:** a spec schema and a layout that ends in a scene (`src/core/figures/`), added to `sceneFromFigure`, `FIGURE_KINDS` and the schema list; a sample in `scripts/samples.mjs` (which feeds the gallery, the golden files and the browser test app); unit tests; a section in `figure-authoring.md` and `visual-language.md` §18.1. The renderer and the exports need no change, which is the point of the scene.
- **Changing a token, a limit or a spec field** is a change for every site. Add a line to `CHANGELOG.md`, bump the version, tag it.

## 12. Versions and access

- Pin to a tag and upgrade on purpose. A change to a limit, a token value or a spec field can change how a figure looks or whether it builds. Never track `main`.
- The repository is private. `npm install` fetches it with git, so every machine that builds your site (laptops, CI, the host) needs read access, for example a deploy key. If a build fails with a git or permission error, this is why.
- Read `CHANGELOG.md` before upgrading, then run your three test layers (§8).
- Nothing about the library is yet deployed to a production site. Treat 0.2.0 as proven in its own test app, not on yours.

## 13. Questions that come up

**Why SVG text, not HTML over SVG?** Export. HTML laid over an SVG cannot be turned into a standalone file, a PNG or a slide. The words are still real text: selectable, searchable and read once through the list. The cost is that text does not reflow with the page; a diagram is a fixed drawing that scales, and below its readable width the list replaces it.

**Why not Mermaid, D2 or a charting library?** They draw their own look, so a figure on one site would not match another, they do not enforce the captions, bases and limits the contract needs, and a library for one figure is a precedent. If the engine cannot draw something, raise it; the engine learns it.

**Can I draw outside a spec?** Not through this library. A signature figure is hand-drawn art and has its own shell (`SignatureFigure`); a functional figure is a spec.

**Can a chart be a pie?** No, by design: pie and donut, gauges, 3D, dual axes, truncated bar axes and coverage as a share of a whole are refused. See `visual-language.md` §19.

**How do I make the same figure appear on a page and in a deck?** Place the spec on the page with `Figure`; export the same spec with `figureToPng` for the deck. They are the same drawing.
