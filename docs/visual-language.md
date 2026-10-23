# The Anant visual language (shared contract)

> **Status.** This is the one contract for every Anant website. It lives in the `@anant/visual` package, next to the code that implements it, so the two change together.
>
> **Provenance.** Sections 1–15 were written for `anantverify-web`. Its registry (C-01…C-12), the §4.2 pairs and the §4.4 worked example are **AnantVerify's**, and are kept here as the worked example of how a site registers its assets. **Each site keeps its own registry and its own adjacent-pair table in its own repository**, and decides which grammars apply to it: convergence and boundary are AnantDecision's and AnantVerify's product motifs, and a site for another product does not use them. Sections **§16–§20** at the end are the rules for the library's own code: tokens, the signature shell, the diagram and chart classes, and interactive figures.
>
> **Changing it.** A change to this document, the tokens or an engine is a change for every site. Add a note to `CHANGELOG.md`, and bump the version.

---

## 1. Visual philosophy

Three commitments, in order. They resolve most disagreements before they start.

1. **Explanation beats decoration.** An asset earns its place by making an idea restatable. If a reader
   cannot say what it meant, it is wallpaper — regardless of how good it looks.
2. **Restraint is a system, not a scarcity.** Twelve canonical assets reused widely are more disciplined
   than four bespoke ones, because reuse is what produces consistency. The cap that matters is on
   *placement* (§8), not on the size of the vocabulary (§6).
3. **Abstraction must survive contact with a stranger.** Enterprise buyers do not learn a visual grammar.
   They learn an argument. The artwork supports the sentence next to it; it never carries the idea alone.

### The Concept Restatement Test (acceptance criterion)

> After viewing the illustration and its caption, a buyer who did not design it should be able to explain
> the intended concept in one sentence.

Sub-tests:

- **Product Distinction Test** — remove every label and logo. C-03 (convergence) and C-04 (boundary) must
  still look like they are about different things.
- **Anti-decoration Test** — if the caption has to explain the picture rather than the concept, the picture
  is wrong, not the caption.
- **Semantic Reduction Test** — moving from full to `compact` to mobile, an asset may lose **detail** but
  never **meaning**. C-03 at full size may show seven trajectories narrowing to one; at `compact`, three
  narrowing to one is the same claim. Three trajectories becoming `AI → decision` is not — that has
  simplified the concept rather than the geometry.
- **Applied at the asset's primary size.** The Product Distinction Test runs at the size the asset is
  designed for, not at its smallest form. A `compact` variant placed beside prose is allowed to be less
  **distinctive**, because the prose carries the argument there. It is never allowed to be less
  **meaningful**. Distinctiveness and meaning are separate properties, and only the first may fall.

## 2. The primitives

Drawn from copy the site already publishes, not invented for the artwork. It is **two layers, not one
sequence** — a substrate, and a lifecycle that runs over it. Reading it as a single pipeline would say that
relationships and history happen *after* state, and the published copy says the opposite: it asks about a
state's history, connections and constraints, as properties of that state.

**The state substrate.** `STATE` is the field that everything else is a property of, not a stage in a
process:

```
STATE ── Entity · Relationship · Event · History · Constraints · Trajectory
```

The published copy asks four questions about a state — what is it, what led to it, what else does it touch,
and what is the enterprise not permitted to do — which is why relationships, history and constraints sit
here rather than downstream of it.

**The lifecycle.** The six objects the registry addresses, each with the primitives that enrich it:

```
STATE → INTELLIGENCE → DECISION → ASSURANCE → ACTION → OUTCOME → (back to STATE)

INTELLIGENCE   Observer · Decision Opportunity · Prediction · Reasoning · Alternatives
DECISION       Proposed Decision
ASSURANCE      Evidence · Authority · Decision Behaviour · Coverage · Boundary
OUTCOME        Learning
```

Everything in the registry is a view of some segment of that lifecycle. If a proposed illustration is not,
it does not need a C-number.

`AnantDecision` publishes a shorter chain on `/anantdecision` — `EVENT → STATE CHANGE → DECISION
OPPORTUNITY → ANANTDECISION → NEXT BEST ACTION → HUMAN / AGENT / APPLICATION`. That is a page-level reading
of the same lifecycle, not a competing one.

Two product-specific grammars are carved out of it:

| Product | Grammar | Reads as |
|---|---|---|
| AnantDecision | **Convergence** | Many possible futures narrow to one structured Next Best Action |
| AnantVerify | **Boundary** | A proposed decision must cross an independent boundary before it becomes real |

Together: **convergence → decision → boundary → action.**

## 3. The five visual classes

| Class | Purpose | Implementation | Themeable | Owner | Count |
|---|---|---|---|---|---|
| **Functional** | Explain exact architecture and process | React + SVG in code | Yes, by construction | Engineering | 22 page modules + shared figures |
| **Editorial** | Teach a single relationship inside an article | SVG line art, `currentColor` | Yes | Commissioned, spec §12 of the asset brief | 4 (E-01…E-04) |
| **Signature** | Make a distinctive Anant concept memorable | SVG, transparent, registered | Yes, token-driven | Commissioned against this document | 12 (C-01…C-12) |
| **Product** | Prove the software exists | Real screenshots | No — real UI | Product | 6 (P-01…P-06) |
| **Documentary** | Show where decisions happen, and who builds this | Photography | No | Commissioned | 8 (T-, I-) |

The boundaries are real: a signature asset is never used to explain a specific architecture, and a
functional figure is never redrawn as a signature asset.

**Shape carries the product distinction; colour is secondary.** AnantDecision and AnantVerify may each keep a
consistent hue, but the distinction between them must survive greyscale, because it is carried by geometry —
convergence narrowing, a boundary being crossed. Colour reinforces recognition; it is never the thing being
recognised. This is the Product Distinction Test (§1) stated as a production rule.

## 4. The registry

Defined by **idea**, not by page. Pages reference ideas.

| ID | Idea | Communicates | Primary home | Reuse |
|---|---|---|---|---|
| C-01 | **Living Enterprise State** | Entities, relationships, events, history and change as one connected field | `/resources/architecture` | `/platform/overview`, `/anantdecision` |
| C-02 | **State to Trusted Action** | The canonical lifecycle: state → intelligence → decision → assurance → action → outcome | `/` | `/platform/how-it-works`, `/resources/decision-assurance` |
| C-03 | **Decision Convergence** | AnantDecision: possible futures converge to one structured action | `/anantdecision` | `/solutions/ai-agents`, `/platform/overview` |
| C-04 | **Assurance Boundary** | AnantVerify: a proposal crosses an independent boundary before becoming real | `/resources/decision-assurance` | `/platform/runtime-control`, `/platform/overview`, all seven industry pages (small form) |
| C-05 | **Same State, Different Trajectory** | Identical endpoints can carry different decision meaning | `/resources/decision-assurance` | `/resources/dtt-methodology` |
| C-06 | **Transform the World Around the Decision** | DTT: invariant, material, temporal, boundary and interaction change | `/platform/dtt` | `/resources/dtt-methodology` |
| C-07 | **Assurance Coverage Landscape** | Tested regions beside explicitly untested ones | `/platform/coverage-robustness` | `/solutions/model-risk`, `/solutions/ai-governance` |
| C-08 | **Graduated Autonomy** | The permitted level of automation changes with consequence, uncertainty, authority and assurance | `/solutions/ai-governance` | `/solutions/ai-agents`, `/industries/healthcare` |
| C-09 | **Agent Intelligence vs Enterprise Authority** | An agent proposes; the enterprise holds authority over consequential action | `/solutions/ai-agents` | `/resources/architecture` |
| C-10 | **Decision Lineage & Replay** | State → decision → evidence → authority → assurance → execution → outcome, reconstructable | `/platform/replay-audit` | `/solutions/audit-compliance` |
| C-11 | **Distributed Decision Fabric** | Cloud, enterprise, edge and restricted environments in one decision architecture | `/resources/architecture` | `/platform/how-it-works` |
| C-12 | **Decision-Driven Enterprise** | Changes in enterprise state continuously open decision opportunities that can be evaluated, assured and acted upon | `/platform/overview` | `/`, `/partners` |

**Reuse is the point.** Four assets (C-04, C-07, C-08, C-09) carry the argument across fifteen pages. An
asset used once is a candidate for deletion, not a candidate for promotion.

### 4.1 The drawing grammars

The registry says *what* each asset communicates. These say *how* it may be drawn, so that two illustrators
working a year apart produce the same language.

**Every signature asset has exactly one primary grammar.** Secondary primitives may appear when they are
needed to establish context. Product motifs may not be reassigned — convergence stays AnantDecision's,
boundary stays AnantVerify's — but an asset whose subject *is* the lifecycle may show both, because both are
part of what it depicts.

| Grammar | Built from | Permitted | Forbidden |
|---|---|---|---|
| **State** (C-01) | A spatial field: nodes joined by relationships, one region distinguishable as *changed* | Nested planes for history; a distinct stroke weight for a relationship that crosses domains | Any literal database, cylinder or cloud icon; a list; a table |
| **Convergence** (C-03) | Several paths entering one, narrowing | Paths of equal weight that visibly reduce in number; one output of greater weight | A funnel, a fan, or a decision tree with labelled branches |
| **Boundary** (C-04) | One continuous line that a thing crosses | A single unbroken stroke; the crossing shown as position, not as an arrowhead through a wall | A shield, a padlock, a gate, or a dashed rectangle around a group of boxes |
| **Trajectory** (C-05) | Two paths, one endpoint | Paths distinct in *shape* that end at the same point; the difference in meaning carried by which side of the boundary each passes | A split-then-merge flowchart; a timeline |
| **Transformation** (C-06) | A centre with several surrounding variants of the same world | Repeated geometry with one variable changed per neighbour; the expectation shown as the centre's decision changing | Before/after pairs with labels; a grid of mini-screenshots |
| **Coverage** (C-07) | A field whose regions differ by density and line style: **tested**, **known but not tested**, and **unknown** | Density rather than hue to show how much has been examined; dashed for the genuinely unknown — the one legitimate use of dashes, because it means something | A progress bar, a percentage gauge, a heat map with a legend, or **any rendering of coverage as a proportion of a whole** — the site's own position is that incomplete knowledge cannot be converted into a safety percentage |
| **Lineage** (C-10) | A chain terminating in a reconstructable record | Left-to-right reading; the record drawn as one object | A stack of paper, a clipboard, or a magnifying glass |
| **Lifecycle** (C-02) | The lifecycle objects of §2, in one reading, in order | Convergence as a secondary primitive at the intelligence step, boundary as a secondary primitive at the assurance step; one object per stage and no more than six | A circular "continuous improvement" arrow loop; a numbered list; a swimlane |
| **Autonomy** (C-08) | Decision classes positioned inside an envelope defined by consequence, uncertainty, authority and assurance | One envelope with classes moving inside it; the same class shown twice under different assurance conditions | A maturity staircase — `manual → assisted → automated → autonomous`; a traffic-light triangle; a slider control |
| **Authority** (C-09) | Two actors, one of them holding a limit the other cannot cross | The agent's reach drawn as bounded; the enterprise drawn as the holder of the limit, with the boundary only as the edge of its side | Robot versus human; a handshake; a shield; a padlock; a "human in the loop" badge |
| **Distribution** (C-11) | One decision fabric shown across several operating environments | Environments as *locations of the same architecture*, drawn with identical geometry, with differences carried by how they connect | A cloud icon leading to a building icon leading to a factory icon; three separate product boxes joined by arrows; a map with pins |
| **Observation** (C-12) | A quiet region of state becoming significant, and a decision opportunity opening from it | A condition crossing a threshold, or a change in topology, drawn as the reason the opportunity exists; the opportunity drawn as an opening rather than as an alert | An eye, a radar sweep, a bell, a notification badge or a bell curve; a generic closed-loop AI diagram |

The two product motifs may not be mixed *as primary grammars*: **convergence belongs to AnantDecision**,
**boundary belongs to AnantVerify**. C-02's primary grammar is **Lifecycle**, and it is the one asset entitled
to carry both motifs as secondary primitives, because its subject is the crossing itself. Any other asset
that appears to need both has the wrong primary grammar.

### 4.2 Adjacent-pair distinction

The registry's real risk is two assets drifting into the same picture. Every pair that could collide has a
stated difference, and the Product Distinction Test is run against it:

| Pair | The difference that must be visible without a label |
|---|---|
| C-04 vs C-09 | C-04 shows *a thing crossing* a boundary. C-09 shows *two roles* — an agent supplying intelligence and proposing, an enterprise holding the limit — with the boundary only as the edge of the enterprise's side |
| C-01 vs C-07 | C-01 is about connection and change. C-07 is about *how much of it has been examined* |
| C-03 vs C-06 | C-03 narrows options for one decision. C-06 varies the world around a fixed decision |
| C-05 vs C-06 | C-05 is two paths to the same place. C-06 is one place seen from several worlds |
| C-02 vs C-10 | C-02 is forward-looking: what happens next. C-10 is retrospective: what can be reconstructed |
| C-12 vs C-01 | C-01 shows a state and how it is connected and changing. C-12 shows a state *becoming significant* — the moment an opportunity opens from it |
| C-08 vs C-04 | C-04 is one proposal crossing one boundary. C-08 is a whole class of decisions positioned inside an envelope, with no crossing shown |
| C-11 vs C-09 | C-09 is two actors with an authority limit between them. C-11 is one architecture appearing in several places, with no authority relationship depicted |

### 4.3 Captions and alt text

A caption is not optional and it is not decoration: it is the Concept Restatement Test in written form, and
it is written **before** the artwork, not after.

- **Caption:** one sentence, in the site's voice, naming the concept and the relationship — "Two decisions,
the same state, different paths to it, and therefore different meaning." A caption that describes the picture
("two curved lines meeting at a circle") fails.
- **Alt text:** describes the concept, not the shapes. `alt="Two trajectories reaching the same state by
different paths, each crossing the assurance boundary differently"` — not `alt="Curved lines and a circle"`.
- **The rule is one accessible equivalent, not one alt attribute.** Every signature concept must reach a
  screen reader **exactly once**. Two modes satisfy that:
  - *The illustration carries something the surrounding text does not* → give it a descriptive accessible
    name: `alt` for an `<img>`, `role="img"` plus `aria-label` for inline SVG.
  - *The adjacent caption already states the concept in full* → the artwork is supplemental, and repeating the
    caption through the accessible name makes a screen reader say it twice. Hide the artwork instead:
    `aria-hidden="true" focusable="false"` on the SVG, with the caption still accessible.
- **Decorative is not available to signature assets** in the sense that a bare `alt=""` with no adjacent
  caption is never acceptable for signature work. It is legitimate only for `atmosphere/` textures, which
  are not signature work.

### 4.4 Worked example — C-04 Assurance Boundary

This is the template every asset brief follows, filled in for the asset with the widest reuse (it carries
`/platform/runtime-control`, `/platform/overview`, `/resources/decision-assurance` and a small form on all
seven industry pages). An illustrator should be able to draw from this without asking a question.

| Field | Value |
|---|---|
| **Idea** | AnantVerify: a proposed decision crosses an independent boundary before it becomes real |
| **Grammar** | Boundary (§4.1) — one continuous line, crossed by position |
| **Artboard** | 1200 × 800, primary stroke 3 units, emphasis 4.5 units, 60-unit safe margin |
| **Composition** | Left: the proposal, drawn as one object emitted from a state field. Centre: a single unbroken vertical line, the tallest element on the artboard. Right: the same object continuing, thinner, into the enterprise side. The focal point is the crossing — the only emphasis-stroke element |
| **Surfaces** | `faint` for the state field, `light` for the proposal, `medium` for the enterprise side. Nothing else is tinted |
| **Variants** | `primary` (3:2) · `compact` (900 × 900, one relationship, three nodes) · `dark` only if the two-background proof fails |
| **Motion** | `cross` — the proposal's position along a fixed path, once, on first in-view. Static state complete: the crossing is visible without motion |

**Label zones** (HTML, never in the file):

| `id` | `desktop` | `mobile` | `maxWidth` | `priority` | `anchor` |
|---|---|---|---|---|---|
| `proposal` | 18 %, top 30 % | stacked above | 14ch | 1 | tail of the proposal object |
| `boundary` | 50 %, top 8 % | stacked | 12ch | 1 | top of the boundary line |
| `verdict` | 62 %, top 46 % | stacked | 18ch | 2 | the crossing point |
| `enterprise` | 86 %, top 30 % | stacked | 16ch | 3 | the continued object |

`maxWidth` is a CSS length, not a character count, and it carries translation headroom (§7).

**Caption:** "A proposed decision does not earn the right to act by being confident. It must cross an
independent assurance boundary with authority to refuse it."

**Alt:** `alt="A proposed decision crossing a single continuous assurance boundary, continuing as a governed
action on the enterprise side"`

**Proof:** composited on `#ffffff` and `#0b0f18` at 1200 px wide. Fails if the boundary line loses contrast
on either background — the boundary is the one element that may never recede.

**Checklist:** passes §12.1 steps 1–8 by construction; steps 9–10 are checked at placement.

## 5. Variants are not new assets

C-03 may ship as `horizontal`, `compact` and `dark` presentations. All three are **C-03**, because they
communicate the same idea. A variant is a change of aspect, density or theme — never of concept.

A new C-number requires: a concept the registry does not already express, a page that genuinely needs it,
and a review against §1. Without all three, the answer is a variant.

## 6. Composition

- **Transparent background.** No card, no frame, no drop shadow. The page supplies the surface.
- **Reading direction is left → right, top → bottom**, matching the lifecycle order in §2. A vertical form is
  a variant, not a different asset.
- **One focal point.** One element carries the meaning; everything else recedes by tint, stroke weight or
  both.
- **The boundary motif is a real boundary** — a continuous line the reader can trace, not a dashed rectangle
  drawn around a group of boxes.
- **Depth is drawn, not simulated.** No perspective grids, no isometric cubes, no 3D renders. "Depth" means
  a layered plane, a tint step and a stroke weight — not lighting.
- **Density ceiling:** a signature asset reads at 640 px wide on a laptop and 320 px on a phone. If it needs
  more than roughly two nesting levels, it is a functional diagram wearing an illustration's clothes.

### 6.1 Responsive behaviour

An asset is drawn once, at one artboard, and has to work at three widths. The rules are the asset's, not the
page's:

| Width | Behaviour |
|---|---|
| ≥ 1024 px | Full artboard. Every label zone visible; the asset may sit beside prose |
| 640–1023 px | Same artboard, scaled. Priority-3 labels hidden; priority-2 labels may wrap to two lines, which is why `maxWidth` is a bounded CSS length |
| < 640 px | **No horizontal scrolling, ever** — the asset stacks above the prose and its labels become a short list under it. Priority-2 and -3 labels hidden. The artwork must still read at 320 px wide |

Two consequences worth stating, because they are the usual mistakes:

- **A `compact` variant is not a scaled-down asset.** It is a different composition for the narrow case —
fewer nodes, one relationship instead of three — and it is still the same C-number. What it may shed is
**detail**; what it may not shed is the **claim**. This is the Semantic Reduction Test (§1), and it is where
`compact` variants usually go wrong.
- **The asset never sets its own width in the SVG.** No `width`/`height` attributes, only `viewBox`, so the
layout decides and the mobile-overflow guard can do its job.

### 6.2 Artboard and stroke scale

Artwork is drawn in **artboard units**, not pixels, and the stroke weight has to survive the smallest display
width, not the largest. This table is the reason there is a number rather than an opinion:

| Class | Artboard | Displayed at | Primary stroke | Hairline (fills only, never alone) | Emphasis |
|---|---|---|---|---|---|
| Signature | 1200 × 800 (3:2) | 320–1200 px | **3 units** | 1.5 units | 4.5 units |
| Signature `compact` | 900 × 900 (1:1) | 320–640 px | **3.5 units** | 1.5 units | 5 units |
| Editorial | 960 × 600 (8:5) | 640–960 px | **1.5 units** | 1 unit | 2.25 units |

The rule behind the numbers: **a stroke must render at ≥ 0.75 CSS px at the smallest width the asset is
displayed at.** A 1200-unit artboard shown at 320 px scales by 0.267, so a 3-unit stroke renders at 0.8 px —
which is the thinnest a line can be and still read as a line. The 4.5-unit emphasis stroke is the focal
point, at 1.2 px.

That is also a correction to earlier guidance in `docs/visual-asset-brief.md`, which said "1.5px strokes"
without naming an artboard. 1.5 units on a 1200-wide artboard is 0.4 px on a phone: a line that disappears.
Editorial art escapes this because it is placed in article columns at 640 px and above; if it ever has to
render below that, its strokes go to 2.25 units.

**Safe margin: 60 units on all sides.** No element and no label zone crosses it.

## 7. Label zones

Labels are **HTML in the page**, never text inside the SVG, so they translate, reflow, search and read aloud.
That means the artwork must reserve space for them. Every signature asset ships a `LabelZoneSpec`:

| Field | Meaning |
|---|---|
| `id` | Stable name for the zone, e.g. `state`, `boundary`, `action` |
| `desktop` | Position as a percentage of the artboard, plus alignment |
| `mobile` | Position, or `hide` |
| `maxWidth` | A CSS length — `ch`, `rem` or `clamp()`. Never a character count: ten English characters, ten German characters and ten Japanese glyphs occupy very different widths, and `ch` is itself a Latin metric |
| `priority` | 1 = always shown, 2 = drops below 768 px, 3 = drops below 1024 px |
| `anchor` | The point in the artwork the label refers to, for the leader line if one is used |

An asset without a `LabelZoneSpec` cannot be placed: the artwork and its labels would be composed twice, by
two people, and drift.

**Label zones must tolerate expansion.** A translation may be meaningfully longer than the English — allow
roughly 35 % and test at that width, because the failure mode is overflow rather than untidy wrapping. This
is also why `priority` belongs to the spec rather than to the page: when a zone runs out of room, the
lowest-priority label is the one that goes.

## 8. Placement

- **Maximum one signature illustration per page.**
- **Never in the same band as a functional diagram.** The conceptual piece says *why*; the diagram says *how*.
  Side by side they compete, and the reader loses both. **"Adjacent" means the same band** — the same section
  element — because that is what puts the two in one field of view. Two figures in consecutive bands, each with
  its own heading and prose around it, do not compete and are allowed. That distinction is load-bearing: it was
  a real violation when the `/anantdecision` hero carried a signature asset and the path figure in one section,
  and it is not a violation for C-02 to sit in its own band ahead of the home page's functional sections.
- **Product screenshots do not count against the cap** — proof is not decoration.
- **Know which pages already carry functional figures.** `/` carries four (`HowItWorks`, `DttSection`,
  `CoverageSection`, `RuntimeSection`); `/anantdecision` carries `living-state`, `relationship-map`,
  `option-compare` and `decision-boundary`; `/platform/how-it-works` carries `state-ownership` and
  `state-quality`; `/platform/coverage-robustness` carries `DecisionSurface`. On those pages the signature asset
  goes into the argument, ahead of the figure that explains the mechanics. §3's rule applies here too: a
  functional figure is never redrawn as a signature asset — so if an asset cannot be placed without duplicating
  one, that is a finding about the asset, not a commissioning problem.
- **The `/resources/` articles are the only figure-free pages.** The platform, solution and industry pages
  carry a code-drawn figure in nearly every section, so the adjacency rule leaves no room on them; the articles
  have no figures at all, which is why the signature class starts there. C-04 sits in the article that
  introduces the missing layer, and C-03 leads `/anantdecision` with the path figure moved below the argument.
- **No two signature assets in one column** at any breakpoint.

## 9. Light and dark

The default is **one asset that works in both themes**. A `-dark` variant is justified only when the depth
treatment genuinely cannot survive both, and it doubles that asset's cost.

- Every surface tint steps through named tokens, not ad-hoc alpha.
- Strokes are `currentColor`; tints are `currentColor` at the token step.
- **Translucency applies to surfaces, never to text or to anything carrying meaning.** The codebase already
  carries this lesson from the status chips, where compositing text toward its own tint dropped it under the
  contrast threshold. A translucent surface behind a label makes that label's contrast a property of the
  artwork, which is not a place to move an accessibility decision.
- Contrast is verified in both themes before an asset is accepted. There is no "it looks fine on white".

**The four surface steps, as values a vector tool can use.** Every tint is a step of the *theme's* accent,
which is why one asset can work in both themes:

| Step | Light (accent `#1d61f1`) | Dark (accent `#4c88ff`) | Used for |
|---|---|---|---|
| `faint` | 4 % | 4 % | The broadest plane, the field |
| `light` | 8 % | 8 % | A region inside the field |
| `medium` | 12 % | 12 % | The emerging decision |
| `strong` | 18 % | 18 % | The focal element |

Nothing goes above 18 %: past that the accent stops reading as a surface and starts competing with the four
verdict colours, which are semantic and must not be diluted.

### 9.1 The two-background proof

Because the default is one asset for both themes, "it was drawn for light and looks wrong on dark" is a
rework risk that costs nothing to remove. Every signature asset is delivered with a **proof**: the same file
composited on `#ffffff` and on `#0b0f18`, at the asset's primary size, in one image or two. It is a check,
not a deliverable for the site.

The proof is what makes the dark-mode decision (§13, item 1) concrete: if the proof shows the depth
treatment collapsing on `#0b0f18`, the asset gets a `-dark` variant, and that decision is made before the
commission closes rather than after.

## 10. Motion and dynamics

**The short answer: yes, motion is part of this language — but as a five-term vocabulary, not as an effect
layer, and never as the only carrier of meaning.**

### 10.1 Why it belongs here at all

The subject of the product is change over time. A static figure can *depict* expectation against outcome; a
trajectory that draws itself when a transformation is applied *demonstrates* the distinction between an
invariant and a material change. That is a real explanatory gain, and it is the only justification strong
enough to accept the costs of motion. Motion that exists to make a page feel alive is out of scope.

### 10.2 The permitted vocabulary

Five primitives, each meaning one thing, reused everywhere. No asset invents its own animation.

| Name | Meaning | Technique |
|---|---|---|
| `state-trace` | A trajectory is traversed over time | `stroke-dashoffset` draw-on |
| `converge` | Possible futures narrow to one decision | Opacity and scale on the same geometry |
| `cross` | A proposal crosses the assurance boundary | Position along a fixed path, then a boundary pulse |
| `flip` | A verdict changes as a transformation is applied | Cross-fade between two static states |
| `resolve` | Conflicting sources settle to one | Opacity step-down on the losing sources |

### 10.3 Hard constraints

- **CSS and SVG only.** No animation library. None is installed, and this does not change that.
- **Animate `opacity`, `transform` and `stroke-dashoffset` — and nothing else.** `stroke-dashoffset` is
  permitted **only** for the registered `state-trace` primitive, which cannot be expressed with opacity or
  transform; `stroke-dasharray` is static configuration and is never animated. Never width, height, top,
  left, margin or padding — those shift layout, and the mobile-overflow and duplication guards exist
  precisely because layout drift is the expensive kind of defect.
- **`prefers-reduced-motion` is a first-class branch, not a footnote.** The static state must carry the whole
  meaning; the animation is enhancement. A reader with reduced motion enabled sees the complete illustration
  and the complete explanation, minus the movement.
- **No infinite loops.** The only permitted repeating animation on a marketing surface is a UI primitive's
  own loading state (`skeleton.tsx`). An illustration that pulses forever is decoration.
- **One motion per asset.** A signature asset may animate one primitive, once, on entry.
- **Triggered, not autoplaying:** on first in-view (once), or on hover/focus for interactive figures. Never
  on scroll position, never in a loop, never on load.
- **The LCP element never animates.** The hero's largest paint must not wait on motion.
- **Budget: at most three animated figures per page, of which at most one is a signature asset.** §8 caps
  signature placement at one per page, so in practice this budget is for editorial figures. The added
  JavaScript is zero.
- **Animated assets must be inlined SVG**, not `<img src="…svg">`. CSS cannot reach inside an `<img>`, so an
  external SVG cannot be themed or animated. The delivered file must therefore be inline-safe: no `<style>`
  block with hard-coded colours, no SMIL `<animate>`, no duplicate `id`s, `currentColor` for every stroke.

### 10.4 What motion is not allowed to do

- Carry information that the static state does not also carry.
- Delay access to content (no entrance sequence the reader must wait through).
- Draw attention to itself rather than to the concept.
- Appear in a figure that sits beside a functional diagram, where it becomes noise.

## 11. What is enforced in code

`src/components/marketing/visual-styles.ts` holds only what can be enforced: surface tint steps, the status
tone pairs, motion durations and the reduced-motion-safe utility strings. Geometry, composition and label
zones live in this document because they are design decisions, not compiled ones.

`e2e/visual-assets.spec.ts` and `e2e/motion.spec.ts` enforce the mechanically checkable parts:

| Rule | Enforced by |
|---|---|
| No `<text>` inside editorial or signature SVG | `visual-assets.spec.ts` |
| Signature SVG is inline-safe (no `<style>`, no SMIL, no duplicate ids) | `visual-assets.spec.ts` |
| A `-dark` variant has a light counterpart (variants pair) | `visual-assets.spec.ts` |
| Naming, format and weight ceilings | `visual-assets.spec.ts` |
| No infinite animation; no layout-shifting transition | `motion.spec.ts`, run under `reducedMotion: reduce`. The check is a deny-list of layout properties, so the sanctioned `stroke-dashoffset` passes |
| Content is complete with motion disabled | `motion.spec.ts` |

**The first two assets are delivered as components, not as files, and that moves the enforcement.** §15 says
what comes back per asset is an SVG; C-03 and C-04 instead live in `src/components/diagrams/`. That satisfies
§10.3's intent more directly — a component is inline by construction, so it is themeable and safe to render
twice without duplicate ids — but it means the file-level rules in `visual-assets.spec.ts` (naming, the 24 KB
ceiling, no `<text>`, `currentColor`) cannot reach them. The mechanically checkable parts are asserted at the
DOM level by `e2e/signature-assets.spec.ts` instead:

| Rule | Enforced by |
|---|---|
| One signature asset per page (§8) | `signature-assets.spec.ts` |
| Inlined, not referenced through an `<img>` (§10.3) | `signature-assets.spec.ts` |
| `aria-hidden` with the caption as the single accessible equivalent (§4.3) | `signature-assets.spec.ts` |
| No `<text>`, no `<style>`, no SMIL, no baked colour (§7, §9, §10.3) | `signature-assets.spec.ts` |
| Labels present as HTML; priority-1 list on a phone (§6.1, §7) | `signature-assets.spec.ts` |
| The path figure is not beside the signature asset (§8) | `signature-assets.spec.ts` |

If an illustrator later supplies a file for either asset it lands in `public/images/signature/`, and both sets
of rules apply to it.

## 12. Governance

- **Reviewer:** the person who owns this document decides whether a proposed piece is a new C-number, a
  variant, an editorial figure, or not needed.
- **A new C-number requires:** a concept the registry does not express, a page that needs it, and a pass on
  §1.
- **Before commissioning:** the registry entry, the `LabelZoneSpec` and the caption are written first. The
  caption is part of the asset, not an afterthought — it is the Concept Restatement Test in written form.
- **Before publication:** contrast verified in both themes, reduced-motion state verified, caption and alt
  text approved, and the asset passes on a 320 px viewport.

### 12.1 The asset review checklist

Run in order. The first three can be done before anything is drawn, and that is the point.

| # | Check | Fails when |
|---|---|---|
| 1 | Registry entry written: C-number, one-sentence idea, and which pages draw on it | It needs a new C-number but the idea is a variant, or the reverse |
| 2 | Caption written and restated by someone who did not write it | The caption describes the picture |
| 3 | `LabelZoneSpec` written: zones, mobile behaviour, `maxWidth` as a CSS length, priority, anchor (§7) | Labels and artwork will be composed twice, by two people; or a label has no room to translate |
| 4 | Drawn from exactly one **primary** grammar in §4.1 | It has no grammar in §4.1 at all, it uses two as primaries, or it reaches for a shield |
| 5 | Adjacent-pair distinction holds (§4.2) | It cannot be told apart from its nearest neighbour without text |
| 6 | Two-background proof passes (§9.1) | It only works on white, and no `-dark` decision was made |
| 7 | Renders at 320 px without horizontal scroll (§6.1, §8) | It needs more than roughly two nesting levels |
| 8 | Motion, if any, is one named primitive with a complete static state (§10) | The static state loses the meaning, or it loops |
| 9 | The concept reaches a screen reader exactly once — accessible name or adjacent caption, never both (§4.3) — and contrast is verified in both themes | The caption and the alt text say the same thing, or a label sits on a tint whose contrast nobody checked |
| 10 | Placement confirmed: one per page, not adjacent to a functional diagram | It competes with the code-drawn figure it was supposed to complement |

## 13. Decisions required from the brand owner

Defaults are marked; each can be overruled in a line.

| # | Decision | Default |
|---|---|---|
| 1 | Dark mode per signature asset | One semantic SVG where possible; `-dark` variant only where depth cannot survive both |
| 2 | Label zones | Every asset ships a `LabelZoneSpec`; zero text inside SVG |
| 3 | Placement cap | One signature asset per page; never adjacent to a functional diagram; screenshots exempt |
| 4 | Registry ownership | This document's owner decides; a new C-number needs a new concept |
| 5 | Variants | A variant is never a new asset |
| 6 | Motion | Five named primitives, CSS/SVG only, reduced-motion branch mandatory, ≤ 3 animated figures per page of which ≤ 1 signature |
| 7 | Commissioning order | Screenshots and portraits first — proof and trust — then the grammar-validation set: **C-04 → C-03 → C-02 → C-01 → C-07**, before the remaining seven |

## 14. Why this ordering, stated plainly

A buyer evaluating a new vendor for assurance over consequential actions asks two questions before any
metaphor lands: *who built this*, and *does it exist*. Those are answered by P-02, T-01…T-06 and I-01…I-07 —
not by a beautiful illustration of a boundary.

The registry exists so that when the signature work happens, it happens once, coherently, and becomes
recognisable. It is not a reason to postpone the two assets that answer what the buyer is actually asking.

**The signature order is a validation sequence, not a reuse ranking.** C-04 and C-03 are the two visual
atoms — boundary and convergence — so they are drawn first, whatever their page counts happen to be. C-02
follows because it is the only asset that composes both motifs, which makes it the proof that the two
grammars coexist. C-01 then establishes the state vocabulary everything else is drawn against, and C-07 is
the first asset that needs a finer assurance vocabulary than tested-and-untested. If C-04 or C-03 fails,
nothing downstream should be commissioned, which is why this order is by risk rather than by reach.

---

## 15. The commissioning package

What an illustrator receives, and what governs what:

| Document | Governs | Read it for |
|---|---|---|
| **This document** | Conceptual and signature artwork | The registry, the grammars, composition, label zones, placement, motion, acceptance |
| `docs/visual-asset-brief.md` | Photography, product screenshots, editorial line art | Subjects, ratios, master sizes, formats, alt-text house style, the handoff checklist |
| `docs/reference/svg-line-art-style.svg` | The austere editorial language | Geometry to copy for E-tier figures |
| `docs/reference/svg-signature-style.svg` | The signature class | Artboard, stroke scale in artboard units, the four surface steps on both themes, the two motifs shown side by side, and the forbidden treatments |
| `docs/reference/svg-signature-atoms.svg` | Nothing — it is a proof, not a brief | C-04 and C-03 drawn at artboard geometry on both themes, before either is commissioned |
| A per-asset brief in `docs/asset-briefs/` | One asset | What to draw for that specific C-number, and the published copy it rests on. §4.4 is C-04's brief, and the template |

**What comes back per asset:** one SVG (viewBox only, currentColor strokes, inline-safe, ≤ 24 KB), the
variant files if any, the two-background proof, and a suggested caption if the writer has not already
supplied one. Labels are not part of the delivery — they are HTML on the page.

**What is not commissioned from an illustrator:** the functional figures (code-drawn), the OG cards and app
icons (generated in code), and anything in the §3 "not for commission" table of the asset brief.

**Refining a code proof.** Four assets — C-01 to C-04 — are drawn in code and placed. They are working assets,
not placeholder sketches: they hold the grammar, they pass the guards, and they ship. A commissioned version is
therefore a **replacement, not a parallel file**. A designer may change geometry, density, composition and
surface assignments. They may not change the primary grammar, which motif belongs to which product, the claim
the asset makes, or its caption — the caption is part of the asset (§4.3). A replacement lands in
`public/images/signature/` and is swapped into the one component that renders it; both guard sets then apply,
the file rules of `visual-assets.spec.ts` and the DOM rules of `signature-assets.spec.ts`. No page changes,
because each page refers to its asset by C-number rather than by file path.

**Before anything is drawn:** registry entry, caption and `LabelZoneSpec` — in that order (§12.1). The first
three checklist steps exist precisely so that an asset cannot be commissioned before its concept is settled,
which is the rework this whole document is designed to prevent.

The briefs in `docs/asset-briefs/` are that artefact. Four exist — C-03, C-02, C-01 and C-07, written in the
commissioning sequence of §13 item 7 — and each states its `LabelZoneSpec`, its caption, and which published
copy it rests on. **The remaining seven are deliberately unwritten:** they would encode a grammar that has not
been drawn once, and §14's sequence exists so that they never have to be written against a motif that fails.

**The two atoms have been drawn once, in code,** as `docs/reference/svg-signature-atoms.svg`. That is not the
commission — it is the grammar proof the validation sequence exists to produce, and it is deliberately cheap
to run. It confirms three things and found one. Confirmed: both motifs are drawable from their briefs without
a further question; both work in one file across both themes without a `-dark` variant, because the tint steps
are `fill-opacity` of the accent; and both pass the Product Distinction Test — remove every label and they
still read differently, one object crossing a line against many paths becoming one. Found: C-04's composition
was wrong in a way the brief could not have caught. Two planes of equal size flanking a boundary read as a
comparison of two peers, not a proposal crossing into an authority that governs it, so the enterprise side is
now the larger territory and the state field the smaller one. That correction was visible in a browser; it
would otherwise have been discovered in a commissioned draft.

**What the drawing did not resolve is placement,** and it is the next decision rather than a detail. Both
registry homes are already occupied by code-drawn hero figures — `RuntimeFlow` on `/platform/runtime-control`
and `EnterpriseDecisionFlow` on `/anantdecision` — and §8 forbids a signature asset sitting adjacent to a
functional diagram. So the question is whether the signature atoms replace those bands or live elsewhere. That
is now a decision with evidence behind it rather than a guess.


---


---

# Library rules

## 16. Tokens (`@anant/visual/core`, `tokens`)

Stroke weights, surface tints and series styling are numbers defined once, in the library's `tokens`. Figures read `STROKE.*` and `SURFACE.*`; they never carry a literal. `SIGNATURE_SURFACES` (in `styles`) holds the matching Tailwind class strings for HTML surfaces, and the library's tests assert the two agree.

## 17. Signature shell additions

`SignatureLabelZone` gains optional `anchor` (the point in the artwork the label names) and `mobile` (`list` or `hide`). `SignatureFigure` accepts a `compactArt` slot: a different composition on a 900 × 900 artboard shown below `sm` in place of the main art. It is the same asset, and must pass the Semantic Reduction Test (§1).

## 18. Functional diagrams (the diagram class)

A functional diagram explains an exact architecture or process. §3 says it is never redrawn as signature art, and that rule stands. This section is the grammar that was missing for it.

**Authoring.** A `DiagramSpec` (`@anant/visual`, `core/diagram`), validated when the page is built. A malformed spec fails the build.

**Layout.** Computed at build time (the site is a static export), so no layout code reaches the browser. It is a small layered pass for up to 25 nodes. An edge that spans several layers and would cross an intermediate node is routed around it, above or below, whichever is shorter. A group is the bounding box of its members; if that box would cover a node that is not a member, the build fails and names the node. Text is bounded (label 48 characters, sublabel 60, edge label 24), and every node in a diagram is as tall as the node with the most text, so it fits its box. A labelled edge gets a gap its label fits in, and a group label that would wrap gets room for two lines. A diagram wider than 1400 artboard units fails the build, because its type would render below about 10px: use `direction: "ttb"` or fewer steps in a row. A node with no edges is allowed if it is in a group (a containment diagram), and the text equivalent then says which group. A node's `position` overrides auto-layout when needed. Authoring steps are in `figure-authoring.md`.

**Swimlanes.** `lanes` splits the figure into bands that run with the reading direction (rows when left to right, columns when top to bottom), each with a header strip carrying its label, which is uppercase and reads upward on a row. A lane is for who or what does a step, never for decoration; it holds nested groups but a group cannot cross a lane border. The accessible list says `Lane: …` for each step.

**Permitted.** Boxes (HTML), group regions (a faint plane with a label), solid, dashed and emphasis edges with an arrowhead, an optional edge label, a tone on a node.

**Node roles carry meaning by shape, so they survive greyscale:**

| Role | Reads as | Shape |
|---|---|---|
| `step` | An ordinary stage | Rounded box |
| `emphasis` | The one node the figure is about | Heavier border, medium tint |
| `external` | Outside our control | Dashed border |
| `terminal` | Where the flow ends | Pill |

**Edge semantics:** solid is flow, dashed is optional or asynchronous, emphasis is the one path the figure is about. At most one emphasis path per diagram.

**Forbidden.** Shadows, gradients, 3D, icon-only nodes (an icon may accompany a label, never replace it), text baked into an image (a diagram's words are live SVG `<text>` from the spec, §21), more than 25 nodes (split the diagram), a legend that needs more than the four roles above, and a signature asset in the same band (§8).

**Accessibility.** The drawing is `aria-hidden`. The ordered list generated from the same layout is the one accessible equivalent: each node, then what it leads to. It is visible until the drawing can render its type at 10px or more: below `md` for a diagram up to 1130 units wide, below `lg` for a wider one, and below `sm` for top-to-bottom diagrams. It is screen-reader-only above that. The concept still reaches a screen reader exactly once (§4.3).

**Responsive.** Below the breakpoint the list replaces the drawing. A diagram is not scaled down until its text is unreadable; type is 18 artboard units and scales with the diagram.

## 19. Charts (the chart class)

**Authoring.** A `ChartSpec` (`@anant/visual`, `core/chart`), validated at build.

**Rules enforced by the spec:**
- `basis` is required: `illustrative` (a worked example) or `measured`. A measured chart must name its `source`. A figure that looked like measured output would be a claim the claims register does not allow.
- A `null` value means not measured. It is drawn as absence, with the `notMeasuredText`, never as zero and never as a short bar.
- A caption of at least 60 characters.

**Permitted.** Horizontal bars (grouped, up to four series) and lines. Axis labels, values and badges are HTML; marks are SVG.

**Forbidden.** Pie and donut, gauges, 3D, dual axes, truncated axes on bars, and **any rendering of coverage as a proportion of a whole** (the Coverage grammar already forbids it).

**Series are not told apart by colour alone:** each series has a fill weight (bars) or dash pattern (lines), and every value is in the data table.

**Accessibility.** Marks are `aria-hidden`. A screen-reader-only data table with a caption stating unit and basis is the one accessible equivalent. The table sits in a clipping wrapper: `sr-only` on a `<table>` itself does not clip, and its intrinsic width scrolls the page sideways.

## 20. Interactive figures (proposed, not yet in force)

**Status: needs a decision.** Nothing here is implemented, and the interactive what-if is blocked on the product team's browser build (the product team's what-if brief).

Proposal for the contract when it is unblocked:
- An interactive figure is a client island, lazy-loaded, never the LCP element, and inert until in view.
- **Relaxed from §10.3:** user-driven motion (hover, focus, drag, step) is allowed, because it is the reader's action and not the page's.
- **Unchanged from §10.3:** no autoplay loop, no scroll-position-driven animation, one named primitive per asset, and a complete static state under `prefers-reduced-motion`.
- The static diagram or chart is always rendered first and enhanced, so the page is complete without JavaScript.
- Keyboard-operable, labelled controls, and results announced politely.

## 21. The scene, export and diagram motion

**One drawing, many outputs.** A diagram is laid out into a *scene*: positioned primitives (rect, path, polygon, text, pulse) whose colours are inks (`primary`, `muted`, `good`…), not values. One renderer turns a scene into SVG, so the figure on a page, an exported file, a PNG and a slide are the same drawing. Nothing is drawn by hand-written HTML any more.

- **On a page** (`mode: "inline"`): colours are `var(--token)`, so light, dark and brand follow the host. The drawing is `aria-hidden` and the generated list is the accessible equivalent (§4.3), unchanged.
- **As a file** (`diagramToSvg`): literal colours (the tone values are the ones in `theme.css`, and a test holds them equal), a `<title>` and `<desc>`, no external dependency. Pass `theme: "dark"`, a `palette` for a brand, `background: "none"` for transparency.
- **As a PNG** (`@anant/visual/node`, `diagramToPng`): Node only, via the optional `@resvg/resvg-js` peer. A PNG is a still, so motion is dropped. Give it the brand `fontFiles`, or it uses system fonts.
- **Arrowheads are polygons, not SVG markers**, because markers are the first thing a slide tool or Figma loses.

**Text** is SVG `<text>` generated from the spec. It is selectable and searchable, and it is not an image. The earlier rule against text in the SVG existed to stop baked-in, untranslatable labels, which this is not. Wrapping is decided at layout time from the same character budget the box was sized with.

### Diagram motion

A spec may set `motion` and `interactive`. Both are off by default, so no existing figure changes.

| Name | Meaning | Technique |
|---|---|---|
| `reveal` | The parts exist in this order | Opacity and a small rise, nodes in reading order |
| `trace` | The flow passes along this path | Solid edges draw on (`stroke-dashoffset`); dashed edges fade in |
| `flow` | Something travels along the edge | A pulse on `offset-path`; two passes on a page, endless only in an exported file (`loop`) |
| focus (`interactive`) | These are connected | Hovering a node quiets everything that is not it, its neighbours or their edges |

Rules, which extend §10 and do not relax it:

- **The static drawing is complete without any of it.** The server markup shows everything. Only after hydration, and only for a reader who has not asked for reduced motion, does `MotionHost` dim the animated parts and release them once, when 40% of the figure is in view. No script, or `prefers-reduced-motion: reduce`, means nothing is ever hidden.
- **Triggered, once.** No scroll-linked motion and no autoplay on load on a page. A file export plays on load because it has no page to scroll.
- **Order is meaning.** Items animate in the reading order the text equivalent uses, never for effect.
- `stroke-dashoffset` is now permitted for `trace` on a diagram edge, as it is for `state-trace`. `stroke-dasharray` on a dashed edge is never animated or rescaled.
- Focus quiets by opacity only, for fine pointers that can hover; it is a reading aid and carries nothing the list does not.
- The one-motion-per-asset and three-animated-figures-per-page limits (§10.3) still hold on marketing pages. A `technical` profile that relaxes them is planned, not yet in force.
