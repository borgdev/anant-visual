import { useId } from "react";
import { cx as cn } from "./cx.js";
import { FigureFrame } from "./figure-frame.js";
import { FlowDiagram } from "./flow-diagram.js";
import { MotionHost } from "./motion-host.js";
import { showDrawingFrom, type DiagramSpecInput } from "../core/diagram.js";
import { sceneFromFigure, type FigureInput } from "../core/figures/index.js";
import { renderSvg } from "../core/render-svg.js";

const SHOW = { sm: "sm:block", md: "md:block", lg: "lg:block" } as const;
const HIDE_LIST = { sm: "sm:sr-only", md: "md:sr-only", lg: "lg:sr-only" } as const;

/**
 * Any communication figure: a diagram, tree, mind map, timeline, matrix, sequence or
 * network. A diagram has no `kind` and is drawn by `FlowDiagram`; the others share this
 * shell, which draws the scene and offers the same list as its accessible equivalent
 * (`docs/visual-language.md` §4.3, §21).
 */
export function Figure({ spec }: { spec: FigureInput }) {
  const kind = (spec as { kind?: string }).kind ?? "diagram";
  if (kind === "diagram") return <FlowDiagram spec={spec as DiagramSpecInput} />;
  return <SceneFigure spec={spec} />;
}

function SceneFigure({ spec }: { spec: FigureInput }) {
  const scene = sceneFromFigure(spec);
  const scope = `av-${useId().replace(/:/g, "")}`;
  const svg = renderSvg(scene, { mode: "inline", scope });
  const showAt = showDrawingFrom(scene.width, "ltr");
  const drawing = (
    <div className="mx-auto w-full" style={{ maxWidth: `${Math.max(scene.width, 640)}px` }} dangerouslySetInnerHTML={{ __html: svg }} />
  );
  const { label, caption } = spec as { label: string; caption: string };
  return (
    <FigureFrame label={label} caption={caption} figureProps={{ "data-figure": scene.id }}>
      <div aria-hidden="true" className={cn("hidden", SHOW[showAt])}>
        {scene.motion.length ? <MotionHost>{drawing}</MotionHost> : drawing}
      </div>
      <ol aria-label={`${label}, as a list`} className={cn("flex flex-col gap-2", HIDE_LIST[showAt])}>
        {(scene.equivalent ?? []).map((item, i) => (
          <li key={i} className="rounded-xl border bg-background px-4 py-3 text-sm">
            <span className="font-semibold">{item.text}</span>
            {item.detail ? <span className="block text-muted-foreground">{item.detail}</span> : null}
          </li>
        ))}
      </ol>
    </FigureFrame>
  );
}
