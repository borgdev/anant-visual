# Adding a diagram or a chart

For anyone writing site content. You do not need to touch any component. You add a spec to your site's figure specs, place it by key, and the build tells you if it breaks a rule.

The rules behind this are in [`visual-language.md`](visual-language.md) §18 (diagrams) and §19 (charts). The reasons are in the strategy in the AnantState repository (`docs/visual-system-strategy.md`).

## Which kind of figure do I need?

| You want to show | Use |
|---|---|
| One idea, memorably, once on a page | A **signature** figure (`S-xx`). Hand-drawn; ask for a new one only if no registry entry fits (see `visual-language.md` §5) |
| How parts connect or in what order things happen | A **diagram** |
| Numbers compared, or a trend | A **chart** |
| That the product exists | A product screenshot |

A signature figure and a diagram must not sit in the same band of a page.

## A diagram, in three steps

**1. Add a spec** to `DIAGRAMS` in your site's figure specs module (AnantState: `src/lib/content/figure-specs.ts`):

```ts
"review-path": {
  id: "review-path",                       // must equal the key
  label: "How a change is reviewed",       // small uppercase heading
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
},
```

**2. Place it** by key. In a page's content, `figure: "diagram:review-path"`; in a blog post, `<Figure name="diagram:review-path" />`.

**3. Build.** `npm run build` validates the spec. `npm run test:visual` checks the rendered result.

### What each part means

| Field | Notes |
|---|---|
| `caption` | Required, 60+ characters. State the **concept**, not the picture ("a change must be reviewed", not "boxes joined by arrows"). It is written before the drawing |
| `nodes[].role` | `step` (default), `emphasis` (the one thing the figure is about), `external` (outside our control, dashed), `terminal` (where it ends, pill). Shape carries the meaning, so it survives greyscale |
| `nodes[].shape` | `box` (default), `pill`, `cylinder` (data store), `diamond` (decision), `hexagon` (service), `queue`, `document`, `cloud` (outside or elastic), `stack` (many of the same). One meaning each; do not pick by taste |
| `nodes[].icon` | `user`, `users`, `database`, `server`, `cloud`, `lock`, `key`, `globe`, `gear`, `document`, `check`, `alert`, `bolt`, `mail`, `clock`, `code`. Goes above the label; never instead of it |
| `nodes[].size` | `sm`, `md` (default), `lg`. Use `lg` for the thing the figure is about, `sm` for supporting parts |
| `edges[].arrow` | `end` (default), `start`, `both`, `none` |
| `legend` | Up to 8 entries, each a `swatch` (a role, shape, `dashed`, `emphasis-edge` or tone) and a `label`. Add one whenever a shape, dash or tone carries meaning a reader would have to guess |
| `nodes[].tone` | `good`, `watch`, `warn`, `bad`, `primary`, `muted`. A status, never decoration |
| `nodes[].group` | Draws a labelled region round the members. Members must sit next to each other, or the build fails and names the node in the way |
| `edges[].style` | `solid` flow, `dashed` optional or asynchronous, `emphasis` the one path the figure is about |
| `lanes`, `nodes[].lane` | Swimlanes: one band per actor, system or tier, drawn in the order listed. Once any lane exists every node needs one. Flow still reads along the layers; the lane says who does the step. A group sits inside a single lane |
| `routing` | `curved` (default) or `orthogonal`: straight runs with rounded right-angle bends, for architecture and circuit-style figures |
| `direction` | `ltr` (default) or `ttb`. Use `ttb` for more than about five steps, or for a loop you want to read down the page |
| A node with no edges | Allowed inside a group, for "what sits where" diagrams (see `topologies`). Place the nodes with `position`, and the text equivalent will say which group each is in |
| `position` | Escape hatch: pin a node to a layer and row when auto-layout gets it wrong |

### Motion, focus and export

| Field | Notes |
|---|---|
| `motion` | Any of `"reveal"`, `"trace"`, `"flow"`. Plays once, in view, for readers who accept motion. The static figure is complete without it. Off by default |
| `interactive` | `true` lets a reader hover a node to see what it connects to. Off by default |

To use a diagram outside the site:

```ts
import { diagramToSvg } from "@anant/visual/core";
import { diagramToPng } from "@anant/visual/node";   // Node only; npm i @resvg/resvg-js

const svg = diagramToSvg(spec, { theme: "light" });                 // a file, with motion if the spec has it
const png = await diagramToPng(spec, { scale: 2, fontFiles: [...] }); // a still
```

See `visual-language.md` §21 for the rules.

### From the command line, and in your editor

```bash
npx anant-visual check  spec.json                          # validate with the build's own messages
npx anant-visual export spec.json --svg out.svg --png out.png --theme dark --scale 2
npx anant-visual schema diagram > diagram.schema.json     # JSON Schema; try `schema` for the kinds
```

A spec names its `kind`; a diagram has none, and a chart is `"kind": "chart"` (checked, not yet exported). Point your editor at the generated schema (`"$schema"` in the JSON) for autocomplete and inline errors, and give the same file to a tool or a language model that writes specs: it describes exactly what the build accepts.

### Limits, and what the build says when you hit one

| Limit | Message you will see |
|---|---|
| 25 nodes | `a diagram has at most 25 nodes; split it` |
| Label 48 characters, sublabel 60, edge label 24 | `a node label is at most 48 characters; it must fit its box` |
| About five steps left to right (1400 units) | `it is N units wide, and its text would render too small to read. Use direction "ttb"…` |
| Every node needs an edge or a group | `node "x" has no edges and is in no group` |
| Edges and groups must point at real ids | `edge refers to unknown node "x"` |
| A group cannot cover a non-member | `group "g" would cover node "x", which is not a member` |

If a diagram needs more than 25 nodes, it is two diagrams. Groups nest: give an inner group `parent: "outer"` and put a node in its innermost group only.

## Other kinds of figure

A diagram has no `kind`. The rest name theirs, and all are drawn, exported and animated the same way (`<Figure spec={...} />`, `figureToSvg`, `figureToPng`). Each has the same caption rule and the same `motion` and `interactive` fields.

| `kind` | Use it for | Shape of the spec | Limits |
|---|---|---|---|
| `tree` | A hierarchy: an org chart, a taxonomy | `root` with nested `children`; `direction` `ttb` (default) or `ltr` | 40 nodes, 5 levels, about 8 siblings across (use `ltr` for more) |
| `mindmap` | An idea and what hangs off it | `center` and `branches`, each with nested `children`; branches are shared between both sides | 40 nodes, about 3 levels |
| `timeline` | Events in order | `events` (`when`, `label`, `detail`), optional `phases` spanning events; `direction` | 8 events across, 14 down. Spacing is by order, **not to scale**, and says so |
| `matrix` | Where things sit on two judgements | `x`, `y` axes (`label`, `low`, `high`), optional `quadrants`, `items` at 0 to 1 | 16 items. Positions are relative, **not measured**, and it says so |
| `sequence` | Who talks to whom, in order | `participants` and `messages` (`solid` call, `dashed` reply, `emphasis`) | 6 participants, 24 messages |
| `network` | Things and their links, no order | `nodes` (`weight`, `cluster`) and `links` (`directed`) | 40 nodes; every node needs a link. The layout is seeded, so it never changes between builds |

Pick the kind by the question the reader is asking: *how is it organised* (tree), *what is it made of* (mind map), *when* (timeline), *which first* (matrix), *what happens, in what order, between whom* (sequence), *what is connected to what* (network), *what is the flow or the architecture* (diagram).

## A chart, in three steps

**1. Add a spec** to `CHARTS` in the same file:

```ts
"cost-by-stage": {
  id: "cost-by-stage",
  label: "Where the cost goes · worked example",
  caption: "Most of the cost sits in two stages, which is where a review should start.",
  type: "bar",                 // "bar" (horizontal) or "line"
  basis: "illustrative",       // REQUIRED: "illustrative" or "measured"
  unit: "units",
  categories: [{ label: "Intake" }, { label: "Review" }, { label: "Delivery" }],
  series: [{ id: "cost", label: "Cost", values: [12, 48, 30] }],
},
```

**2. Place it** as `chart:cost-by-stage`. **3. Build.**

### Rules a chart must meet

- **`basis` is required.** `illustrative` means a worked example; `measured` means a real measurement and then `source` is required (`source: "the platform benchmark, Ryzen 9 3900X"`). A chart that looked like a measurement but is not is a claim the claims register does not allow. Check your site's claims register before publishing any measured number.
- **Not measured is `null`, never `0`.** It draws as absence with your `notMeasuredText`.
- **No pie or donut, no gauge, no dual axes, no truncated bar axis, and no coverage shown as a share of a whole.**
- Up to four series, told apart by weight or dash as well as colour.
- Every number is also available to screen readers as a table; you do not write that.

## Checking your work

```bash
npm run typecheck        # types
npm run lint
npm run blog:check       # if the figure is in a blog post
npm run test:visual      # figures, tokens, contrast, motion, label fit
```

Look at it at **375 px** and at desktop width. Below `md` a diagram becomes a list (that is the accessible version, not a fallback). If the list reads badly, the diagram is probably too complicated.

## When something looks wrong

| Symptom | Likely cause |
|---|---|
| An edge runs behind a box | Multi-layer edges are routed around nodes automatically. If it still looks wrong, pin a node with `position` |
| Boxes in the wrong order | Order follows the edges, then the order you declared. Declare them in reading order |
| Text wraps to four lines | Shorten the label. The limit exists for this |
| `test:visual` reports a contrast failure | A `tone` or a tint on a surface that fails in one theme. Use a different tone, not a custom colour |
| You want an animation, a hover, or a live control | Not yet. See `visual-language.md` §20 (interactive figures are a proposal) |

## Do not

- Put text inside an SVG, or use a hex colour, a shadow, a gradient or a 3D effect.
- Add a charting or diagram library for one figure. If the engines cannot draw it, raise it; the fix belongs in the engine.
- Edit a figure's stroke weights or tints by hand. They come from the library's tokens.
