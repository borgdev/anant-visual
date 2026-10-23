import { describe, expect, test } from "vitest";
import { main, type Io } from "../src/node/cli";
import { SCHEMA_KINDS, figureJsonSchema } from "../src/core";

const C = "A caption long enough to state the concept the figure makes, as the contract requires of every figure.";
const files: Record<string, string> = {
  "d.json": JSON.stringify({ id: "d", label: "D", caption: C, nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }], edges: [{ from: "a", to: "b" }] }),
  "t.json": JSON.stringify({ kind: "tree", id: "t", label: "T", caption: C, root: { id: "r", label: "R", children: [{ id: "k", label: "K" }] } }),
  "bad.json": JSON.stringify({ id: "d", label: "D", caption: "short", nodes: [], edges: [] }),
  "c.json": JSON.stringify({ kind: "chart", id: "c", label: "C", caption: C, type: "bar", basis: "illustrative", categories: [{ label: "a" }, { label: "b" }], series: [{ id: "s", label: "S", values: [1, 2] }] }),
};
const run = async (...argv: string[]) => {
  const out: string[] = [];
  const written: Record<string, string | Uint8Array> = {};
  const io: Io = { read: (p) => files[p] ?? (() => { throw new Error(`no such file ${p}`); })(), write: (p, d) => void (written[p] = d), out: (l) => void out.push(l) };
  const code = await main(argv, io);
  return { code, out: out.join("\n"), written };
};

describe("cli", () => {
  test("checks a diagram, another kind and a chart", async () => {
    expect((await run("check", "d.json")).out).toMatch(/^ok: diagram "d"/);
    expect((await run("check", "t.json")).out).toMatch(/^ok: tree "t"/);
    expect((await run("check", "c.json")).out).toBe('ok: chart "c"');
  });

  test("a bad spec fails with the build's own message and a non-zero code", async () => {
    const r = await run("check", "bad.json");
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/caption/);
  });

  test("exports SVG and PNG", async () => {
    const r = await run("export", "d.json", "--svg", "o.svg", "--png", "o.png", "--theme", "dark", "--scale", "1");
    expect(r.code).toBe(0);
    expect(String(r.written["o.svg"])).toContain("<title>D</title>");
    expect([...(r.written["o.png"] as Uint8Array).slice(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
  });

  test("export without an output says what it needs", async () => {
    expect((await run("export", "d.json")).out).toMatch(/--svg and\/or --png/);
  });

  test("prints a schema, and lists the kinds", async () => {
    expect((await run("schema")).out.split("\n")).toEqual([...SCHEMA_KINDS]);
    const schema = JSON.parse((await run("schema", "tree")).out);
    expect(schema.properties.root).toBeDefined();
  });

  test("shows usage for an unknown command", async () => {
    const r = await run("frobnicate");
    expect(r.code).toBe(2);
    expect(r.out).toContain("anant-visual check");
  });
});

describe("json schema", () => {
  test.each(SCHEMA_KINDS)("%s has a usable schema", (kind) => {
    const s = figureJsonSchema(kind) as { type: string; properties: Record<string, unknown>; required?: string[] };
    expect(s.type).toBe("object");
    expect(Object.keys(s.properties)).toContain("caption");
  });

  test("defaults are optional when writing, and a caption is required", () => {
    const s = figureJsonSchema("diagram") as { required: string[] };
    expect(s.required).toContain("caption");
    expect(s.required).not.toContain("direction");
    expect(s.required).not.toContain("motion");
  });

  test("an unknown kind is refused", () => {
    expect(() => figureJsonSchema("spiral" as never)).toThrow(/expected one of/);
  });
});
