// Builds gallery/index.html: every sample figure, drawn by the real renderer, with a theme
// toggle and a replay button, so motion can be judged in a browser. Run `npm run gallery`.
import { mkdirSync, writeFileSync } from "node:fs";
import { DEFAULT_PALETTE, INK_VAR, renderSvg, resolveInk, sceneFromFigure } from "../dist/core/index.js";

import { samples } from "./samples.mjs";

const vars = (theme) => Object.entries(INK_VAR).map(([ink, v]) => `${v}:${resolveInk(ink, theme)}`).join(";");
const figures = samples
  .map((s, i) => {
    const svg = renderSvg(sceneFromFigure(s.spec), { mode: "inline", scope: `av-g${i}` });
    return `<section><header><h2>${s.title}</h2><span>${s.note}</span><button data-replay>Replay</button></header><div class="fig">${svg}</div></section>`;
  })
  .join("\n");

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>@anant/visual gallery</title>
<style>
:root{${vars("light")};--ease-standard:cubic-bezier(.22,1,.36,1);--motion-flip:300ms;color-scheme:light}
:root[data-theme=dark]{${vars("dark")};color-scheme:dark}
body{margin:0;font:15px system-ui,sans-serif;background:var(--background);color:var(--foreground)}
main{max-width:960px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:20px} section{margin:28px 0}
header{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap} h2{font-size:16px;margin:0} header span{color:var(--muted-foreground);flex:1}
button{font:inherit;padding:4px 12px;border:1px solid var(--border);background:var(--card);color:inherit;border-radius:8px;cursor:pointer}
.fig{margin-top:12px;border:1px solid var(--border);background:var(--card);border-radius:16px;padding:24px}
.bar{display:flex;gap:12px;align-items:center}.bar p{flex:1;margin:0;color:var(--muted-foreground)}
</style>
<main><div class="bar"><h1>@anant/visual gallery</h1><p>Rendered by the library's own SVG renderer.</p><button id="theme">Dark</button></div>
${figures}
</main>
<script>
const root=document.documentElement;
document.getElementById("theme").onclick=function(){const d=root.dataset.theme==="dark";root.dataset.theme=d?"light":"dark";this.textContent=d?"Dark":"Light"};
function arm(svg){svg.setAttribute("data-armed","");svg.removeAttribute("data-play")}
function play(svg){svg.getBoundingClientRect();svg.setAttribute("data-play","")}
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){play(e.target);io.unobserve(e.target)}}),{threshold:.4});
document.querySelectorAll("svg[data-motion]").forEach(svg=>{arm(svg);io.observe(svg)});
document.querySelectorAll("[data-replay]").forEach(b=>b.onclick=()=>{const svg=b.closest("section").querySelector("svg");if(!svg.hasAttribute("data-motion"))return;arm(svg);requestAnimationFrame(()=>play(svg))});
</script></html>`;
mkdirSync(new URL("../gallery/", import.meta.url), { recursive: true });
writeFileSync(new URL("../gallery/index.html", import.meta.url), html);
console.log("gallery/index.html written");
