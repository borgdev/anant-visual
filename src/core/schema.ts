import { z } from "zod";
import { diagramSpecSchema } from "./diagram.js";
import { chartSpecSchema } from "./chart.js";
import { matrixSpecSchema } from "./figures/matrix.js";
import { networkSpecSchema } from "./figures/network.js";
import { sequenceSpecSchema } from "./figures/sequence.js";
import { timelineSpecSchema } from "./figures/timeline.js";
import { mindmapSpecSchema, treeSpecSchema } from "./figures/tree.js";

/**
 * JSON Schema for every spec, generated from the same definitions that validate them, so an
 * editor's autocomplete, a no-code tool and an LLM author all see exactly what the build
 * will accept. It describes the *input*: defaults are optional, as they are when writing.
 */
const SCHEMAS = {
  diagram: diagramSpecSchema,
  tree: treeSpecSchema,
  mindmap: mindmapSpecSchema,
  timeline: timelineSpecSchema,
  matrix: matrixSpecSchema,
  sequence: sequenceSpecSchema,
  network: networkSpecSchema,
  chart: chartSpecSchema,
} as const;

export type SchemaKind = keyof typeof SCHEMAS;
export const SCHEMA_KINDS = Object.keys(SCHEMAS) as SchemaKind[];

export function figureJsonSchema(kind: SchemaKind): Record<string, unknown> {
  const schema = SCHEMAS[kind];
  if (!schema) throw new Error(`Unknown kind "${kind}"; expected one of ${SCHEMA_KINDS.join(", ")}`);
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  return { ...json, title: `Anant ${kind} spec`, $id: `https://anant.dev/visual/${kind}.schema.json` };
}
