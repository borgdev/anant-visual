import { describe, expect, test } from "vitest";
import { diagramToPng } from "../src/node";

const spec = {
  id: "png",
  label: "A figure",
  caption: "A caption long enough to state the concept the figure makes, as the contract requires of every figure.",
  nodes: [
    { id: "a", label: "First" },
    { id: "b", label: "Second" },
  ],
  edges: [{ from: "a", to: "b" }],
  motion: ["reveal" as const, "flow" as const],
};

describe("PNG export", () => {
  test("renders a PNG, larger at a higher scale", async () => {
    const one = await diagramToPng(spec, { scale: 1 });
    const two = await diagramToPng(spec, { scale: 2 });
    expect([...one.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    const width = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset).getUint32(16);
    expect(width(two)).toBe(width(one) * 2);
  });
});
