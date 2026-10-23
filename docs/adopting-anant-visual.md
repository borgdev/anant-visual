# Adopting `@anant/visual` in a site: the AnantVerify worked example

A guide for the AnantVerify engineering team.

**Where things stand.** AnantVerify has already adopted the library at `v0.1.0` (commit `7d3cf62`, "Adopt the shared @anant/visual library"): the package is installed and pinned, Tailwind scans it, the verdict colours are bridged to the library's tones, the private copy of the signature shell is deleted, and the twelve signature figures run on the shared shell. One figure, `decision-cycle` (commit `0da7227`), is already a library diagram, and `e2e/functional-figures.spec.ts` audits it. Nothing in this guide asks you to undo or redo that.

This guide now does three jobs:

1. **[Upgrade from 0.1.0 to 0.2.0](#1-upgrading-from-010-to-020)**, which is what is new, what it costs, and the rehearsal we ran.
2. **[Start using the new parts](#2-using-what-0020-adds)** where they help, without a big-bang change.
3. **[Keep what you have, and decide who owns it](#3-what-stays-yours)**, with the gotchas and open decisions.

For the how-to of writing and rendering figures on any site, read [`developer-guide.md`](developer-guide.md); for writing a spec, [`figure-authoring.md`](figure-authoring.md); for the rules, [`visual-language.md`](visual-language.md).

---

## 1. Upgrading from 0.1.0 to 0.2.0

### What changes for you

AnantVerify uses two things from the library today, imported from `@anant/visual/react`: `SignatureFigure` (the twelve signature figures) and one `FlowDiagram` (`decision-cycle`, placed in `anantdecision-visuals.tsx` by commit `0da7227`).

- **`SignatureFigure` is unchanged**: props, output and behaviour. The tokens, the status-tone class strings, the `theme.css` contract and your colour bridge are unchanged too.
- **`FlowDiagram` is drawn differently, and this is a breaking change for your tests, not for your page.** In 0.1.0 its boxes were HTML elements laid over an SVG. In 0.2.0 the whole figure is one SVG: the words are SVG `<text>`, and the drawing carries one scoped `<style>` for its motion and hover rules. It looks the same, but your `e2e/functional-figures.spec.ts` pins the old markup and fails on it, by design: it asserts "no `<text>` in the artwork", "no `<style>` in the artwork", and measures overflow on `div.absolute.flex`. The patch below updates those three assertions.

What 0.2.0 adds, none of which you have to use:

| Added | What it is |
|---|---|
| A new drawing engine | Every figure is laid out into a scene and drawn by one SVG renderer. The library's `FlowDiagram` and `Chart` now use it (your site does not import either) |
| Seven more figure kinds | Diagram upgrades (nested groups, swimlanes, nine shapes, icons, legend, orthogonal routing) and `tree`, `mindmap`, `timeline`, `matrix`, `sequence`, `network`, plus `chart` types `bar`, `column`, `line` |
| Motion and hover | `motion: ["reveal", "trace", "flow"]` and `interactive: true`, opt-in, played once in view, never for a reader who asks for reduced motion |
| Export | SVG and PNG from the same spec, a command line (`anant-visual`), and a JSON Schema for editors |
| A technical profile | 80 nodes and a zoom and pan viewer, for documentation |
| Real-browser tests | A harness that installs the packed library into a Next 16 + Tailwind 4 app and drives Chrome, Firefox and WebKit |

### The one new requirement

The drawing reads your site's colour variables directly (`var(--primary)`, `--foreground`, `--card`, `--border`, `--muted-foreground`, `--background`) and the tone variables. AnantVerify defines all of them already (shadcn tokens, plus your `--verdict-*` through the bridge). You do not need to change anything. Check once, in the browser, that a library diagram's edges are your primary colour and its status nodes are your verdict colours.

### How to upgrade

```bash
npm install "github:borgdev/anant-visual#v0.2.0"     # once the tag exists; see the note below
git apply node_modules/@anant/visual/docs/patches/functional-figures-0.2.0.patch
npm run build
npx playwright test          # the whole suite
```

The patch (`docs/patches/functional-figures-0.2.0.patch`, 67 lines, made against the `functional-figures.spec.ts` at your `HEAD`) changes three things in that one file:

| Old assertion | New assertion | Why |
|---|---|---|
| No `<text>` in the artwork | The artwork **has** SVG `<text>` | The words are live text from the spec, so they stay selectable, searchable and exportable; the old rule existed to stop baked-in, untranslatable labels, which this is not |
| No `<style>` in the artwork | No `<foreignObject>` and no `<script>` | The drawing has one scoped `<style>` of its own; what must stay out is anything that breaks on export or a theme |
| Overflow measured on `div.absolute.flex` | Overflow measured on each SVG node group: its words' bounding box against its outline's, and the rendered type size from the font size and the SVG's scale | The boxes are SVG shapes now |

The other assertions (drawing hidden from assistive technology, a generated list of at least two items, a caption over 60 characters, no SMIL, no baked colour, viewBox only, the phone and desktop behaviour, no chart placed) are unchanged and still pass.

Then look at your densest signature figure at phone width. Nothing is expected to change, because the signature shell is the same; the check is cheap.

**The `v0.2.0` tag does not exist yet.** GitHub has only `v0.1.0`; 0.2.0 is on the `avant-grade` branch, and `CHANGELOG.md` says "not yet tagged". Until the branch is merged and tagged, `#v0.2.0` fails. To try it now, install a commit of that branch instead, which is checked to work (the repository does not commit `dist/`, so npm runs the `prepare` build on install, and the build, the `anant-visual` command and the `core` and `node` entry points all resolve from a git install):

```bash
npm install "github:borgdev/anant-visual#<commit sha on avant-grade>"
```

A commit sha pins exactly; a branch name (`#avant-grade`) moves with every push, so use it only to look, never in a lockfile you ship. Or install a packed tarball: `npm pack` in the library, then `npm install --no-save <path to the .tgz>` here. Do not use `file:../anant-visual`: it is a symlink and Turbopack will not follow it.

### The rehearsal we ran

On a fresh clone of `anantverify-web` at `1a62462` (committed work only; your uncommitted changes were not in it, and your repository was not touched), with 0.2.0 installed from a packed tarball over the `v0.1.0` dependency, using your own `node_modules` and your own Playwright config:

| Check | Result |
|---|---|
| `next build` with 0.2.0 | Compiled; every route prerendered |
| Your whole Playwright suite (1,210 tests, Chromium and mobile-Safari), unpatched | **1,198 passed, 5 skipped, 7 failed.** Six are the `functional-figures` assertions above (3 tests × 2 browsers), failing because they pin the old markup. The seventh (`/platform/console carries 2 real console screenshots`) failed once under 12 parallel workers and passed alone, in both browsers; it is a timing flake, not this upgrade |
| `functional-figures.spec.ts` with the patch applied | 12 of 12 passed, both browsers |

(Your suite grew from 1,171 to 1,210 tests since the 0.1.0 rehearsal.) Nothing else in your suite, including `signature-assets`, `motion`, `mobile-overflow`, `accessibility`, `visual-assets` and `page-consistency`, was affected.

**Not done:** no new figure kind was placed on a page, nothing was migrated beyond the test patch, and nothing was deployed. I did not compare the `decision-cycle` figure before and after by eye on your page; the figure's behaviour is covered by the patched spec and by the library's own browser tests. Look at it once.

### If something fails

| Symptom | Cause | Fix |
|---|---|---|
| `npm install` fails with a git or permission error | The library is private; the machine has no read access | A deploy key or token for the machine that builds. See the open decisions |
| Six `functional-figures` tests fail: "no `<text>` in the artwork" and "text overflows its box" | The spec pins the 0.1.0 markup | Apply the patch above |
| Figures render unstyled | The `@source` line was lost in a merge | Restore it in `globals.css` (section 3) |
| A signature figure's labels moved | You changed a token or label size alongside the upgrade | Compare with `git stash`; the shell itself is unchanged in 0.2.0 |

---

## 2. Using what 0.2.0 adds

Do this at your own pace, one figure at a time. A figure the library draws is checked by the build, so a mistake cannot ship.

### Where it helps most

You have two families of functional diagrams today, both mostly written by hand as components: the cards-and-chips `flow-diagram.tsx` (used on the how-it-works, partners, evidence and decision pages) and a set of page-specific visuals in `components/marketing/*-visuals.tsx`. One figure, `decision-cycle`, is already a library spec. The library does not replace the first: yours lays out icon cards with verdict chips, the library's lays out labelled boxes. Where it earns its place:

| You have | The library gives you |
|---|---|
| A new diagram you would otherwise hand-build | `Figure` with a spec: laid out for you, validated, with the accessible list generated |
| A process with an actor per stage (who approves, who owns, who is notified) | `lanes` (swimlanes) |
| An architecture with stores, queues, decisions and services | `shape` and `icon`, with a `legend` |
| A "what happens, in order, between systems" explanation | A `sequence` figure |
| An org or ownership chart, a taxonomy | A `tree` |
| A timeline of a replay, an audit or a rollout | A `timeline` |
| A priority or coverage positioning | A `matrix` |
| A figure that has to go into a deck, a brief or a PDF | `figureToSvg` or `figureToPng`; the same spec as the page |
| A stats claim as a chart | `Chart`, which refuses to ship without `basis`, and `source` for a measurement |

### First use, in four steps

1. Add a spec to a specs module. Write the caption first: it states the concept and is at least 60 characters.
2. Render it in a server component: `import { Figure } from "@anant/visual/react"`.
3. Nothing to add for the test: `functional-figures.spec.ts` discovers every `data-diagram` figure from the sitemap, so a new one is audited automatically (and, with 0.2.0's other figure kinds, which render `data-figure`, extend its selector the same way).
4. Look at it at 375px and at desktop width, in light and dark.

If your own `FlowDiagram` is imported in the same file, rename one: `import { Figure as SpecFigure } from "@anant/visual/react"`.

### Motion

Add `motion: ["reveal", "trace"]` to a figure you want to animate. It plays once when 40% of it is in view, and only for a reader who has not asked for reduced motion; your `motion.spec.ts` already runs under `reducedMotion: reduce` and checks that content is complete, which still holds. Keep to your own limit of three animated figures a page, and keep animated figures below the fold, because a figure already in view when the page hydrates can blink once as it arms. Your contract (§10) and the library's (§21) say the same thing here; the library's adds `trace` on edges as permitted.

### Exporting for the team

```bash
npx anant-visual export spec.json --svg figure.svg --png figure.png --theme dark --scale 2 \
  --font ./fonts/YourBrand.ttf --font-family "Your Brand"
```

Your brand type must be given to a PNG as `--font`; without it a PNG uses system fonts. Pass a `palette` (in code) to match your primary colour in a file.

### Converting an existing figure

You do not have to. Convert one when you next edit it and the engine does it better, and only if you are happy to give up hand placement. A converted diagram changes look: boxes and arrows in the shared style, not your cards and chips.

---

## 3. What stays yours

| | Library | Your repository |
|---|---|---|
| Signature-figure shell | Yes | Your 12 artworks (C-01…C-12) |
| Tokens (strokes, tints, series) | Yes | |
| Figure engines (eight kinds, export, motion) | Yes | Your specs, captions and claims |
| The shared contract (`docs/visual-language.md`) | Yes | Your registry (C-xx), your §4.2 pairs, your asset briefs, as a short overlay |
| Status colours | `tone-good/watch/warn/bad` | Your `verdict-*`, bridged in `globals.css` |
| `VerdictBadge`, `flow-diagram.tsx`, the `components/marketing` visuals | | **Yours, unchanged** |

The library does not decide what you claim. It draws figures; your content and your claims register decide what goes in them.

### What is in your `globals.css`, so a merge does not lose it

```css
@source "../../node_modules/@anant/visual/dist";           /* after the shadcn import */
/* inside @theme inline: */
--color-tone-good: var(--verdict-allow);   --color-tone-good-foreground: var(--verdict-allow-foreground);
--color-tone-watch: var(--verdict-hold);   --color-tone-watch-foreground: var(--verdict-hold-foreground);
--color-tone-warn: var(--verdict-escalate); --color-tone-warn-foreground: var(--verdict-escalate-foreground);
--color-tone-bad: var(--verdict-block);    --color-tone-bad-foreground: var(--verdict-block-foreground);
```

You do not import the library's `theme.css`: it defines the same values you have.

### Tests

Your Playwright suite already covers the signature shell (`signature-assets`, `motion`, `mobile-overflow`, `accessibility`, `visual-assets`, `page-consistency`). Add, as you place library figures:

| | Checks | Notes |
|---|---|---|
| `e2e/functional-figures.spec.ts` (**you have it**, adapted from `anant-state-website`) | Drawing hidden, a generated list, caption, text fits its box, phone and desktop behaviour | Update with the 0.2.0 patch (section 1) |
| `e2e/figure-dark-mode.spec.ts` (from `anant-state-website`) | Contrast inside every figure, light and dark | Not adopted yet. Adapt its route list |
| `e2e/label-fit.spec.ts` | Signature labels fit with 35% longer text | Not adopted yet |
| `e2e/visual-lint.spec.ts` | Strokes on the scale, tints from tokens | Not adopted yet |
| The figure checks in the library's `e2e/browser.test.ts` | Hydration without errors; motion plays once and reduced motion shows the whole figure; hover focus; the viewer; 375px; axe in light and dark | Not adopted. They use `playwright-core`; port the assertions into your `@playwright/test` specs, aimed at your routes, once you place an animated or technical figure |

### Gotchas

- **Private repository access.** `npm install` fetches the library over git, so every machine that builds your site needs read access: laptops (your SSH key works today), CI, and the host's build. If a build fails with a git or permission error, this is why. It is still undecided.
- **Real install, not a symlink, for local work with Next.** `file:../anant-visual` is a symlink and Turbopack will not resolve a package outside the project root. Use `npm pack` and install the tarball.
- **Stale cache after switching install methods.** Delete `.next` (and your `NEXT_DIST_DIR` folder) and rebuild.
- **Tailwind must be told about the package.** Without the `@source` line the library's classes are missing and figures render unstyled.
- **Do not track `main`.** A change to a token value, a limit or a spec field can change how a figure looks or whether it builds. Upgrade to a tag, deliberately, and run the whole suite.
- **Your signature labels are 12px.** The library's shell uses `text-xs` where your old copy used 11px; check your densest label zones after any upgrade of the shell (already shipped with 0.1.0).

### Working with the library

- **Changing it** is a change for every Anant site. Make it in `anant-visual`, run `npm run check` (typecheck, unit and golden tests, build) and `npm run test:browser`, add a line to `CHANGELOG.md`, bump the version, tag, and let each site upgrade on its own schedule.
- **Reporting what does not fit.** If a figure you need cannot be drawn, or a rule gets in your way, raise it against the library. The aim is for the engine to learn the case, not for a site to work around it.

## Decisions for the AnantVerify team

1. **Upgrade to 0.2.0 now, or when you first need a new figure?** It is safe either way once the `functional-figures` patch is applied: the full suite passes with it. Upgrading early keeps you on the version everyone else will be on.
2. **Which further test to adopt.** Our suggestion: `figure-dark-mode`, because it is the check the library's own browser tests cover with axe and your suite does not yet.
3. **When to convert your parallel diagram components.** There is no urgency. Suggested trigger: when you next edit one.
4. **Who owns the library.** Someone has to review changes and cut versions. It should not be left to whichever site changed it last.
5. **Where the build gets access** to the private repository. Today it works because your machine has the SSH key; CI and the host do not.
6. **Whether the site should ship animated figures at all**, and on which pages. The capability is off by default; this is a content decision, not an engineering one.
