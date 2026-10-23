// Builds gallery/index.html: every sample figure, drawn by the real renderer, with a theme
// toggle and a replay button, so motion can be judged in a browser. Run `npm run gallery`.
import { mkdirSync, writeFileSync } from "node:fs";
import { DEFAULT_PALETTE, INK_VAR, renderSvg, resolveInk, sceneFromDiagram } from "../dist/core/index.js";

const CAPTION = "A caption long enough to state the concept the figure makes, as the contract requires of every figure.";
const samples = [
  {
    title: "Review path",
    note: "reveal + trace + flow, with hover focus",
    spec: {
      id: "review-path", label: "How a change is reviewed", caption: CAPTION,
      motion: ["reveal", "trace", "flow"], interactive: true,
      nodes: [
        { id: "author", label: "Author" },
        { id: "review", label: "Independent review", sublabel: "Two people, not the author", role: "emphasis" },
        { id: "ship", label: "Production", role: "terminal", tone: "good" },
        { id: "audit", label: "Auditor", role: "external", group: "outside" },
        { id: "log", label: "Audit log", group: "outside", tone: "watch" },
      ],
      edges: [
        { from: "author", to: "review" },
        { from: "review", to: "ship", label: "approved", style: "emphasis" },
        { from: "review", to: "author", label: "rejected", style: "dashed" },
        { from: "ship", to: "log", style: "dashed" },
        { from: "log", to: "audit" },
      ],
      groups: [{ id: "outside", label: "Outside our control" }],
    },
  },
  {
    title: "Nested groups",
    note: "Cloud › VPC › Private subnet, with an outsider; reveal + flow",
    spec: {
      id: "cloud", label: "Where the service runs", caption: CAPTION, motion: ["reveal", "flow"],
      nodes: [
        { id: "user", label: "User", role: "external" },
        { id: "audit", label: "Auditor", role: "external" },
        { id: "lb", label: "Load balancer", group: "vpc" },
        { id: "api", label: "API", group: "private", role: "emphasis" },
        { id: "db", label: "Database", group: "private" },
      ],
      edges: [
        { from: "user", to: "lb" }, { from: "audit", to: "lb", style: "dashed" },
        { from: "lb", to: "api" }, { from: "api", to: "db" },
      ],
      groups: [
        { id: "cloud", label: "Cloud" },
        { id: "vpc", label: "VPC", parent: "cloud" },
        { id: "private", label: "Private subnet", parent: "vpc" },
      ],
    },
  },
  {
    title: "Top to bottom",
    note: "reveal only",
    spec: {
      id: "pipeline", label: "A pipeline", caption: CAPTION, direction: "ttb", motion: ["reveal"],
      nodes: ["Ingest", "Validate", "Transform", "Publish"].map((l) => ({ id: l.toLowerCase(), label: l })),
      edges: [["ingest", "validate"], ["validate", "transform"], ["transform", "publish"]].map(([from, to]) => ({ from, to })),
    },
  },
  {
    title: "Static",
    note: "no motion: what every existing figure still looks like",
    spec: {
      id: "static", label: "A static figure", caption: CAPTION,
      nodes: [{ id: "a", label: "Input" }, { id: "b", label: "Decision", role: "emphasis" }, { id: "c", label: "Result", role: "terminal", tone: "bad" }],
      edges: [{ from: "a", to: "b" }, { from: "b", to: "c", label: "blocked", style: "emphasis" }],
    },
  },
];

const vars = (theme) => Object.entries(INK_VAR).map(([ink, v]) => `${v}:${resolveInk(ink, theme)}`).join(";");
const figures = samples
  .map((s, i) => {
    const svg = renderSvg(sceneFromDiagram(s.spec), { mode: "inline", scope: `av-g${i}` });
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
