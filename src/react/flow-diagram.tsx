import { useId } from "react";
import { cx as cn } from "./cx.js";
import { FigureFrame } from "./figure-frame.js";
import { MotionHost } from "./motion-host.js";
import {
  describeDiagram,
  layoutDiagram,
  showDrawingFrom,
  parseDiagram,
  type DiagramSpecInput,
} from "../core/diagram.js";
import { diagramToScene } from "../core/diagram-scene.js";
import { renderSvg } from "../core/render-svg.js";

/**
 * Diagram class renderer (`docs/visual-language.md` §4.5).
 *
 * The whole drawing is one inline SVG produced by the scene renderer, the same
 * markup a file or PNG export is made from, so a figure on the page and the figure
 * in a deck cannot differ. Its words are SVG text: selectable and searchable.
 * The drawing is `aria-hidden`; the ordered list generated from the same layout is
 * the one accessible equivalent. It is visible on narrow screens, where the
 * diagram would be too small to read, and screen-reader-only from `md` up.
 *
 * Shape carries meaning so the distinctions survive greyscale: `emphasis` is the
 * one node the figure is about (heavier border), `external` is outside our control
 * (dashed), `terminal` is where the flow ends (pill).
 *
 * A spec may ask for `motion` (reveal, trace, flow) and `interactive` focus. Both are
 * enhancements: the markup is the complete static figure, and `MotionHost` plays the
 * motion once, in view, for readers who accept it.
 */
// Whole class names, so Tailwind can see them.
const SHOW = { sm: "sm:block", md: "md:block", lg: "lg:block" } as const;
const HIDE_LIST = { sm: "sm:sr-only", md: "md:sr-only", lg: "lg:sr-only" } as const;

export function FlowDiagram({ spec: input }: { spec: DiagramSpecInput }) {
  // Validated here, at build time, so a malformed diagram fails the build.
  const spec = parseDiagram(input);
  const layout = layoutDiagram(spec);
  const equivalent = describeDiagram(spec, layout);
  const scope = `av-${useId().replace(/:/g, "")}`;
  const svg = renderSvg(diagramToScene(spec, layout, spec.caption), { mode: "inline", scope });
  const { width } = layout;
  // A wide diagram needs more room to stay legible, so it switches to the list later.
  const showAt = showDrawingFrom(width, spec.direction);
  const drawing = (
    <div
      className="mx-auto w-full"
      style={{ maxWidth: `${spec.direction === "ttb" ? width : Math.max(width, 640)}px` }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );

  return (
    <FigureFrame label={spec.label} caption={spec.caption} figureProps={{ "data-diagram": spec.id }}>
      <div aria-hidden="true" className={cn("hidden", SHOW[showAt])}>
        {spec.motion.length ? <MotionHost>{drawing}</MotionHost> : drawing}
      </div>

      <ol
        aria-label={`${spec.label}, as a list`}
        className={cn(
          "flex flex-col gap-2",
          HIDE_LIST[showAt]
        )}
      >
        {equivalent.map((item) => (
          <li key={item.id} className="rounded-xl border bg-background px-4 py-3 text-sm">
            <span className="font-semibold">{item.text}</span>
            {item.lane ? <span className="block text-muted-foreground">Lane: {item.lane}</span> : null}
            {item.group ? <span className="block text-muted-foreground">In: {item.group}</span> : null}
            {item.leadsTo.length ? (
              <span className="block text-muted-foreground">Leads to: {item.leadsTo.join("; ")}</span>
            ) : null}
          </li>
        ))}
      </ol>
    </FigureFrame>
  );
}
