# Adopting `@anant/visual` in anantverify-web

A guide for the AnantVerify engineering team.

**In short.** `@anant/visual` is the shared visual library for every Anant site. It grew out of the signature-figure shell and the visual-language contract that started in this repository, and it adds a diagram engine, a chart engine and tokens. AnantVerify can adopt it in small, reversible steps. We rehearsed the first steps on a clone of `anantverify-web` (commit `0538e70`), and your whole test suite passed.

Read this first, then follow [the steps](#the-steps). Nothing here changes what visitors see until you choose to use the new parts.

---

## 1. What you get, and what stays yours

| | Library | Your repository |
|---|---|---|
| Signature-figure shell (labels as HTML, phone list, one accessible equivalent) | Yes | Your 12 artworks (C-01…C-12) stay here |
| Tokens: stroke weights, tint steps, series styles | Yes | |
| **Diagram engine**: a spec in, a laid-out diagram out, with a generated text equivalent | Yes | Your diagram specs |
| **Chart engine**: bar and line charts that must say illustrative or measured, with a data table | Yes | Your chart data and its claims |
| The shared contract: classes, grammars, accessibility, motion, governance | Yes (`docs/visual-language.md`) | Your registry (C-xx), your §4.2 pairs, your asset briefs |
| Status colours | `tone-good/watch/warn/bad` | Your `verdict-*` tokens (see the bridge below) |
| `VerdictBadge`, `flow-diagram.tsx`, the page visuals in `components/marketing/` | | **Yours, unchanged** |

The library does not decide what you claim. It draws figures; your content and claims register decide what goes in them.

## 2. What we found in your code

Facts from reading `anantverify-web` and from the rehearsal, so you can check the plan against what you know.

- **Same stack.** Next 16.3.6, React 19.2.8, Tailwind 4 and zod 4 match the library, so there is nothing to align.
- **Your signature shell is the ancestor of the library's.** It is the same component with three additions: an optional label `anchor`, an optional `mobile: "list" | "hide"`, and a `compactArt` slot for a narrow-screen composition. A figure that does not use them behaves as before. One visible difference: label text is 12px in the library (`text-xs`) and 11px in yours (`text-[11px]`). Your tests did not catch it, but look at your densest label zones.
- **Your status colours have different names but the same values.** You name them `--verdict-allow/hold/escalate/block`; the library uses `--tone-good/watch/warn/bad`. The oklch values are identical (`allow` = `good`, `hold` = `watch`, `escalate` = `warn`, `block` = `bad`), in light and dark. A four-line bridge in your CSS is enough, with no renaming (step 2).
- **Your `flow-diagram.tsx` is a different component.** It lays out cards with icons and verdict chips from `FlowNodeSpec`. The library's `FlowDiagram` is spec-driven with build-time layout. They do not replace each other and they can coexist. Import the library one under another name if both appear in one file: `import { FlowDiagram as SpecDiagram } from "@anant/visual/react"`.
- **Your `visual-styles.ts` is keyed by verdict** (`allow`, `hold`…); the library's `styles` is keyed by tone. Leave yours alone. Nothing in the library needs it.
- **There is no CI workflow in the repository**, so we could not tell how you build and deploy. The library repo is private, so whatever builds the site needs read access to it. See "Private repository access" below.

## 3. The rehearsal

Done on a throwaway clone, with the library installed from the pushed git tag exactly as below. Your repository was not touched.

| Check | Result |
|---|---|
| Install from `github:borgdev/anant-visual#v0.1.0` (the build runs on install) | Works |
| `next build` with the library's signature shell replacing yours (12 figures, one import line each) | Compiled |
| Your signature, motion, mobile-overflow, accessibility, visual-asset and page-consistency tests | 232 passed |
| Your entire Playwright suite, chromium and mobile-safari | 1171 passed, 5 skipped (the skips are already in your suite) |
| A library diagram and chart using status tones, through the bridge, in light and dark | Looks right, verdict colours in both themes |

**Not done:** no page content was migrated, no real page was given a diagram, and nothing was deployed. Treat the steps as rehearsed, not production-proven.

## The steps

### 1. Install, pinned to a tag

```bash
npm install "github:borgdev/anant-visual#v0.1.0"
```

npm records it in `package.json` as `"@anant/visual": "github:borgdev/anant-visual#v0.1.0"`. Pin to a tag and upgrade deliberately; never track `main`.

### 2. Let Tailwind see it, and bridge the colours

In `src/app/globals.css`, after `@import "shadcn/tailwind.css";`:

```css
/* The shared visual library ships compiled JS carrying Tailwind class names. */
@source "../../node_modules/@anant/visual/dist";
```

And in the existing `@theme inline { … }` block, after the verdict lines:

```css
  /* Bridge: the library names status tones good/watch/warn/bad; this site names the same colours as verdicts. */
  --color-tone-good: var(--verdict-allow);
  --color-tone-good-foreground: var(--verdict-allow-foreground);
  --color-tone-watch: var(--verdict-hold);
  --color-tone-watch-foreground: var(--verdict-hold-foreground);
  --color-tone-warn: var(--verdict-escalate);
  --color-tone-warn-foreground: var(--verdict-escalate-foreground);
  --color-tone-bad: var(--verdict-block);
  --color-tone-bad-foreground: var(--verdict-block-foreground);
```

You do **not** import the library's `theme.css`: it defines the same values you already have. Your motion tokens (`--motion-*`, `--ease-standard`) already match.

### 3. Swap the signature shell

```bash
grep -rl '@/components/diagrams/signature-figure' src \
  | xargs sed -i 's#@/components/diagrams/signature-figure#@anant/visual/react#'
git rm src/components/diagrams/signature-figure.tsx
```

`SignatureFigure` and `SignatureLabelZone` have the same names and the same props, so the 12 figure files change by one line each. Then run the checks in step 7.

### 4. Optional: read the tokens instead of literals

Your figures use literal stroke widths and tint opacities, which is the same thing the contract fixes at 3 / 4.5 and 0.04 / 0.08 / 0.12 / 0.18. You can leave them. If you want the guard that stops them drifting, import `STROKE` and `SURFACE` from `@anant/visual/core` and copy `e2e/visual-lint.spec.ts` from `anant-state-website`.

### 5. Optional: use the diagram and chart engines

For a **new** diagram or chart, add a spec and render it:

```tsx
import { FlowDiagram, Chart } from "@anant/visual/react";

<FlowDiagram spec={{
  id: "review", label: "How a change is reviewed",
  caption: "A change reaches production only after an independent review, and a rejected change returns to its author.",
  nodes: [{ id: "a", label: "Author" }, { id: "b", label: "Review", role: "emphasis" }],
  edges: [{ from: "a", to: "b" }],
}} />
```

Specs are validated at build time: a missing caption, an edge to nowhere, a diagram too wide to read, or a chart that does not say whether its numbers are illustrative or measured all fail the build, with a message that says what to do. The how-to is [`figure-authoring.md`](figure-authoring.md). The rules are in [`visual-language.md`](visual-language.md) §18 and §19.

You do not have to convert existing diagrams. Convert one when you next change it, if the engine does it better.

### 6. Documentation

Your `docs/visual-language.md` sections 1–15 are what the library's contract was built from, so nothing is lost by moving them. Suggested shape: keep your registry (§4), the §4.2 pairs, the §4.4 worked example and your asset briefs in your repository as a short overlay (this is what `anant-state-website` did), and point to `node_modules/@anant/visual/docs/visual-language.md` for the shared rules. Do this once step 3 has shipped, not before.

### 7. Verify

```bash
npm run build
npx playwright test e2e/signature-assets.spec.ts e2e/motion.spec.ts \
  e2e/mobile-overflow.spec.ts e2e/accessibility.spec.ts e2e/visual-assets.spec.ts
npx playwright test          # the whole suite, before merging
```

Look at your densest signature figure at phone width. The labels grew from 11px to 12px.

## Tests worth adopting from `anant-state-website`

They are not in the library, because they need a built page and your route list. Copy and adapt:

| File | Checks | Adapt |
|---|---|---|
| `e2e/functional-figures.spec.ts` | Diagrams and charts: drawing hidden, one text equivalent, caption, basis stated; every diagram's text fits its boxes | Your route list; copy the helper that imports `CONTENT_ROUTES` |
| `e2e/figure-dark-mode.spec.ts` | Contrast inside every figure, light and dark | Your route list. Your site already has working dark mode |
| `e2e/label-fit.spec.ts` | Signature labels fit with 35% longer text | Your route list |
| `e2e/visual-lint.spec.ts` | Strokes on the scale, tints from tokens | The folder it scans and the file names it excludes |

## Gotchas

- **Private repository access.** `npm install` fetches the library with git, so the machine that builds your site (laptops, CI, the host's build) needs read access, for example a deploy key. If a build fails with a git or permission error, this is why.
- **Use a real install, not a symlink, for local work with Next.** `file:../anant-visual` creates a symlink, and Turbopack will not resolve a package outside the project root. To test a local change, run `npm pack` in the library and `npm install --no-save ../anant-visual/anant-visual-0.1.0.tgz`.
- **Stale cache after switching install methods.** If Turbopack complains about a path you no longer use, delete `.next` (and your `NEXT_DIST_DIR` folder) and rebuild.
- **Tailwind must be told about the package.** Without the `@source` line, the library's classes are missing from your CSS and figures render unstyled.
- **Do not track `main`.** A change to a token value, a limit (node count, label length, readability width) or a spec field can change how a figure looks or whether it builds. Upgrades are a deliberate, tested step.

## Working with the library

- **Changing it** is a change for every Anant site. Make it in `anant-visual`, run `npm run check` (typecheck, tests, build), add a line to `CHANGELOG.md`, bump the version, tag, and let each site upgrade on its own schedule.
- **Reporting what does not fit.** If a diagram you need cannot be drawn, or a rule gets in your way, raise it against the library. The aim is for the engine to learn the case, not for a site to work around it.
- **Owner.** No one is named yet; see the decisions below.

## Decisions for the AnantVerify team

1. **Bridge or rename?** The bridge (step 2) leaves your `verdict-*` names alone and costs eight lines. Renaming would touch every use of `VerdictBadge` and `STATUS_*`. We recommend the bridge.
2. **Which tests to adopt**, and when. At least `functional-figures` once you place your first library diagram.
3. **When to replace your parallel diagram components.** There is no urgency. Suggested trigger: when you next edit one.
4. **Who owns the library.** Someone has to review changes and cut versions. It should not be left to whichever site changed it last.
5. **Where the build gets access** to the private repository.
