import type { ReactNode } from "react";
import { cx as cn } from "./cx";

/**
 * The signature figure shell.
 *
 * One implementation of the parts of `docs/visual-language.md` that every
 * signature asset shares, so the rules cannot drift asset by asset:
 *
 * - **Labels are HTML, never text inside the artwork** (§7). The artwork reserves
 *   a zone for each one, and the label sits in that zone rather than being baked
 *   into the file, so it translates, reflows, is searchable and reads aloud.
 * - **Responsive labels** (§6.1). Below `sm` the artboard stacks and the labels
 *   become a short list underneath it, priority-1 only.
 * - **One accessible equivalent, exactly once** (§4.3). The composition is marked
 *   `aria-hidden` because the caption carries the concept in full; repeating the
 *   caption through an accessible name would make a screen reader say it twice.
 *   The SVG is therefore decorative by construction, not by omission.
 * - **No motion unless a named primitive is asked for** (§10). The shell adds
 *   none; a figure that animates passes its own.
 */
export type SignatureLabelZone = {
  /** Stable name for the zone, e.g. `boundary`. */
  id: string;
  /** The words. Kept short: the artwork reserved roughly this much room. */
  label: string;
  /** Left edge as a share of the artboard, 0-100. */
  left: number;
  /** Top edge as a share of the artboard, 0-100. */
  top: number;
  /** A CSS length, never a character count (§7). */
  maxWidth: string;
  /** 1 = always shown, 2 = drops below 768px, 3 = drops below 1024px. */
  priority: 1 | 2 | 3;
  /**
   * The point in the artwork the label refers to, as artboard percentages. Today it
   * documents intent and lets a test confirm the label sits near what it names; a
   * leader line can be drawn from it later without changing any asset.
   */
  anchor?: { x: number; y: number };
  /**
   * Below `sm`: `list` (default) puts the label in the short list under the art,
   * `hide` drops it. Priority still decides which labels reach the list.
   */
  mobile?: "list" | "hide";
};

const ABSOLUTE_VISIBILITY: Record<1 | 2 | 3, string> = {
  1: "hidden sm:block",
  2: "hidden md:block",
  3: "hidden lg:block",
};

export function SignatureFigure({
  asset,
  art,
  labelZones,
  caption,
  compactArt,
  className,
}: {
  /** The registry id, e.g. `C-04`. Rendered as a hook so a page test can assert
   *  which asset is on which page, and that there is only one. */
  asset: string;
  art: ReactNode;
  labelZones: readonly SignatureLabelZone[];
  caption: string;
  /**
   * A different composition for the narrow case (`docs/visual-language.md` §6.1):
   * fewer nodes, the same claim, drawn on a 900 x 900 artboard. When supplied it
   * replaces `art` below `sm`; it is the same asset, not a new one.
   */
  compactArt?: ReactNode;
  className?: string;
}) {
  return (
    <figure data-signature={asset} className={cn("w-full", className)}>
      {compactArt ? (
        <div className="relative mx-auto aspect-square w-full max-w-sm sm:hidden">{compactArt}</div>
      ) : null}
      <div
        className={cn(
          "relative mx-auto aspect-[3/2] w-full max-w-5xl",
          compactArt ? "hidden sm:block" : undefined
        )}
      >
        {art}
        <div aria-hidden="true">
          {labelZones.map((zone) => (
            <span
              key={zone.id}
              style={{
                left: `${zone.left}%`,
                top: `${zone.top}%`,
                maxWidth: zone.maxWidth,
              }}
              className={cn(
                "absolute rounded border bg-background/85 px-1.5 py-1 text-xs font-medium leading-tight text-muted-foreground",
                ABSOLUTE_VISIBILITY[zone.priority]
              )}
            >
              {zone.label}
            </span>
          ))}
        </div>
      </div>

      {/* Below `sm` the artboard is too small to carry labels, so they become a
          short list and the lower priorities are dropped (§6.1). */}
      <ul
        aria-hidden="true"
        className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:hidden"
      >
        {labelZones
          .filter((zone) => zone.priority === 1 && zone.mobile !== "hide")
          .map((zone) => (
            <li key={zone.id}>{zone.label}</li>
          ))}
      </ul>

      <figcaption className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}
