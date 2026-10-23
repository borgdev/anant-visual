#!/usr/bin/env node
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { figureJsonSchema, SCHEMA_KINDS, type SchemaKind } from "../core/schema.js";
import { figureToSvg, sceneFromFigure, type FigureInput } from "../core/figures/index.js";
import { figureToPng } from "./png.js";

const USAGE = `anant-visual: draw, check and export figures from a JSON spec

  anant-visual check  <spec.json>
  anant-visual export <spec.json> [--svg out.svg] [--png out.png]
                      [--theme light|dark] [--scale 2] [--font file.ttf]... [--font-family Name]
                      [--background card|background|none] [--loop]
  anant-visual schema [kind]        JSON Schema for one kind, or a list of the kinds

Kinds: ${SCHEMA_KINDS.join(", ")}
A spec names its kind with "kind"; a diagram has none.`;

export type Io = { read(path: string): string; write(path: string, data: string | Uint8Array): void; out(line: string): void };
const realIo: Io = { read: (p) => readFileSync(p, "utf8"), write: (p, d) => writeFileSync(p, d), out: (l) => console.log(l) };

/** The command line as a function, so it can be tested without a process. Returns the exit code. */
export async function main(argv: string[], io: Io = realIo): Promise<number> {
  const [command, ...rest] = argv;
  try {
    const { values, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: {
        svg: { type: "string" },
        png: { type: "string" },
        theme: { type: "string" },
        scale: { type: "string" },
        font: { type: "string", multiple: true },
        "font-family": { type: "string" },
        background: { type: "string" },
        loop: { type: "boolean" },
      },
    });
    if (command === "schema") {
      if (!positionals[0]) {
        io.out(SCHEMA_KINDS.join("\n"));
        return 0;
      }
      io.out(JSON.stringify(figureJsonSchema(positionals[0] as SchemaKind), null, 2));
      return 0;
    }
    if (command !== "check" && command !== "export") {
      io.out(USAGE);
      return command ? 2 : 0;
    }
    if (!positionals[0]) throw new Error(`${command} needs a spec file`);
    const raw = JSON.parse(io.read(positionals[0])) as { kind?: string };
    const spec = raw as FigureInput;
    const scene = sceneFromFigure(spec);
    if (command === "check") {
      io.out(`ok: ${raw.kind ?? "diagram"} "${scene.id}" (${Math.round(scene.width)} x ${Math.round(scene.height)})`);
      return 0;
    }
    if (!values.svg && !values.png) throw new Error("export needs --svg and/or --png");
    const render = {
      theme: (values.theme as "light" | "dark" | undefined) ?? "light",
      background: values.background as "card" | "background" | "none" | undefined,
      fontFamily: values["font-family"],
      loop: values.loop,
    };
    if (values.svg) {
      io.write(values.svg, figureToSvg(spec, render));
      io.out(`wrote ${values.svg}`);
    }
    if (values.png) {
      io.write(values.png, await figureToPng(spec, { ...render, scale: values.scale ? Number(values.scale) : undefined, fontFiles: values.font }));
      io.out(`wrote ${values.png}`);
    }
    return 0;
  } catch (error) {
    io.out(`error: ${(error as Error).message}`);
    return 1;
  }
}

// Run when invoked as a program, not when imported by a test.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code));
}
