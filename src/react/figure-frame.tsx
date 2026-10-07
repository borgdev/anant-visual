import { cx as cn } from "./cx";
import { VISUAL_LABEL } from "./styles";

/**
 * The shared frame for functional figures, diagrams and charts: a card with an
 * uppercase label, the figure, and a caption underneath. One implementation so the
 * three classes cannot drift apart in spacing or type.
 */
export function FigureFrame({
  label,
  caption,
  children,
  className,
  figureProps,
}: {
  label: string;
  caption: string;
  children: React.ReactNode;
  className?: string;
  figureProps?: Record<`data-${string}`, string>;
}) {
  return (
    <figure className={cn("mx-auto w-full max-w-4xl", className)} {...figureProps}>
      <div className="rounded-2xl border bg-card p-5 sm:p-7">
        <p className={VISUAL_LABEL}>{label}</p>
        <div className="mt-4">{children}</div>
      </div>
      <figcaption className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}
