/**
 * Joins class names, skipping anything falsy. The renderers only ever combine
 * strings and `cond && "class"`, so this is all they need, and it keeps the library
 * free of a class-merging dependency the host may already have a different one of.
 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
