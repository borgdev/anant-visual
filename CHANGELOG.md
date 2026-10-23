# Changelog

## Unreleased (branch `avant-grade`)

- `core`: **scene model** (`scene`, `diagram-scene`): a laid-out diagram as positioned primitives with inks instead of colours. **SVG renderer** (`render-svg`): pure, deterministic, inline or standalone. **Export**: `sceneFromDiagram`, `diagramToSvg`. **Colour**: oklch to hex, a default palette, tone values held equal to `theme.css` by a test.
- `node`: new entry `@anant/visual/node` with `diagramToPng` and `svgToPng` (optional peer `@resvg/resvg-js`).
- `react`: `FlowDiagram` now draws through the scene renderer, so the page and an export are the same drawing. New `MotionHost` arms and plays motion once in view.
- Spec: `motion` (`reveal`, `trace`, `flow`) and `interactive` focus, both off by default.
- **Nested groups**: a group may set `parent`; a parent encloses its children, the text equivalent names the whole path (`Cloud › VPC › Subnet`), and two unrelated groups that overlap fail the build.
- **Group-aware layout**: crossing-reduction sweeps no longer split a group around an outsider, and room is made between a group's border and its neighbours.
- **Swimlanes**: `lanes` and `node.lane`. Rows left to right, columns top to bottom, each with a header strip; lanes grow to hold stacked nodes and their own label; a group must sit inside one lane; every node needs a lane once any exist. The text equivalent says which lane each step is in.
- **Shapes**: `shape` (`box`, `pill`, `cylinder`, `diamond`, `hexagon`, `queue`, `document`, `cloud`, `stack`), each a silhouette that means one thing; text wraps to the room the outline leaves. **Icons**: 15 built-in strokes via `icon`. **Size**: `size` `sm`/`md`/`lg`; a layer is centred on its widest node. **Arrows**: `arrow` `end`/`start`/`both`/`none`. **Legend**: `legend` entries drawn under the figure, wrapped to the width, and read out in the accessible list. Several loop-back edges now take their own lanes.
- **Six more figure kinds** (`kind`): `tree`, `mindmap`, `timeline`, `matrix`, `sequence`, `network`, each validated, laid out into the same scene and so exported, animated and made accessible the same way. `sceneFromFigure`, `figureToSvg`, `figureToPng`, and a React `Figure` that dispatches on `kind`.
- **`routing: "orthogonal"`** for diagrams: straight runs with rounded bends between neighbouring layers.
- **JSON Schema** (`figureJsonSchema`, `SCHEMA_KINDS`) generated from the validators for every kind, and a **CLI** (`anant-visual check | export | schema`).
- **`profile: "technical"`** for diagrams: 80 nodes and a 3200-unit drawing in a keyboard-operable zoom and pan viewer (`PanZoom`), list kept for screen readers.
- **Charts on the scene**: `chartToScene`. A chart's marks, axis, values, badges and legend are now one drawing from the scene renderer, so a chart exports to SVG and PNG and animates like a diagram (`kind: "chart"`, `motion`, `interactive`). New `column` type. The data table for screen readers is unchanged.
- `npm run gallery` builds `gallery/index.html`: every sample with a theme toggle and replay.
- Docs: visual-language §21, figure-authoring.
- Changed: a diagram's words are SVG text, not HTML overlays; arrowheads are polygons, not markers. Appearance is intended to be unchanged.

## 0.1.0

First extraction, from `anant-state-website`.

- `core`: `tokens`, `diagram` (spec, validation, layered build-time layout with long-edge routing, group and text-fit guards, a readability limit, generated text equivalent, containment diagrams), `chart` (spec, validation, scales, null as not measured).
- `react`: `FlowDiagram`, `Chart`, `FigureFrame`, `SignatureFigure` (label `anchor` and `mobile`, a `compactArt` slot), and the shared class strings.
- `theme.css`: tone and motion tokens.
- `docs`: the shared visual-language contract and the figure-authoring guide.
