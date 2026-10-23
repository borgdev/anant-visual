/**
 * Wrapping, shared by layout (to size a box) and drawing (to break the words), so the two
 * can never disagree about how many lines a label takes.
 *
 * Greedy on a character budget. A word that does not fit a line is broken after a hyphen
 * where it has one ("well-known" becomes "well-" and "known"), and cut at the budget where
 * it has none, so a long unbroken token never runs out of its box.
 */
export function wrap(text: string, perLine: number): string[] {
  type Piece = { text: string; glue: boolean };
  const pieces: Piece[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (word.length <= perLine) {
      pieces.push({ text: word, glue: false });
      continue;
    }
    // Too long for a line by itself: break after hyphens, then cut what is still too long.
    let first = true;
    const push = (t: string) => {
      pieces.push({ text: t, glue: !first });
      first = false;
    };
    for (const part of word.split(/(?<=-)/)) {
      let rest = part;
      while (rest.length > perLine) {
        push(rest.slice(0, perLine));
        rest = rest.slice(perLine);
      }
      if (rest) push(rest);
    }
  }
  const lines: string[] = [];
  let line = "";
  for (const p of pieces) {
    const sep = line && !p.glue ? " " : "";
    if (line && line.length + sep.length + p.text.length > perLine) {
      lines.push(line);
      line = p.text;
    } else {
      line += sep + p.text;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
