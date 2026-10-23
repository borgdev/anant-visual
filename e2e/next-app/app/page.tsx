import { Figure } from "@anant/visual/react";
import { samples } from "./samples";

// A server component: every figure is laid out at build time, and only MotionHost and PanZoom reach the browser.
export default function Page() {
  return (
    <main className="mx-auto max-w-5xl space-y-16 p-6">
      <div style={{ height: "60vh" }}>Scroll: the figures play their motion once, when they come into view.</div>
      {samples.map((s) => (
        <section key={s.id} data-sample={s.id}>
          <Figure spec={s.spec} />
        </section>
      ))}
    </main>
  );
}
