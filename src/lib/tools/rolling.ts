// The logic behind the rolling numbers (the digits that roll up or down when a figure changes), apart from
// the drawing: how a piece of text splits into digits and the words around them, and which way the digits roll.
//
// Pure functions with no imports, so the unit tests can load them from Node.

export type Token =
  /** One digit. `ordinal` counts digits from the right (0 is the last digit), so a digit keeps its place as the number grows or shrinks. */
  | { kind: 'digit'; ch: string; ordinal: number }
  /** A run of anything else (the £, commas, a decimal point, words). `ordinal` counts runs from the right. */
  | { kind: 'text'; text: string; ordinal: number };

/** "£1,389.58" -> "£" "1" "," "3" "8" "9" "." "5" "8", each digit on its own. Digits and runs are numbered from the right. */
export function tokenise(text: string): Token[] {
  const raw: ({ kind: 'digit'; ch: string } | { kind: 'text'; text: string })[] = [];
  for (const ch of text) {
    if (ch >= '0' && ch <= '9') raw.push({ kind: 'digit', ch });
    else {
      const last = raw[raw.length - 1];
      if (last?.kind === 'text') last.text += ch;
      else raw.push({ kind: 'text', text: ch });
    }
  }
  let digits = 0;
  let runs = 0;
  const out: Token[] = [];
  for (let i = raw.length - 1; i >= 0; i--) {
    const t = raw[i];
    out.unshift(t.kind === 'digit' ? { ...t, ordinal: digits++ } : { ...t, ordinal: runs++ });
  }
  return out;
}

/** The numbers in a piece of text, in order: "25 years 3 months" -> [25, 3]; "£1,389.58" -> [1389.58]. */
export function numbersIn(text: string): number[] {
  return (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, '')));
}

/**
 * Which way the digits roll when `prev` becomes `next`: up if the figure went up, down if it went down. With
 * several numbers in the text (years and months) it is the first one that differs. Anything else rolls up.
 */
export function rollDirection(prev: string, next: string): 'up' | 'down' {
  const a = numbersIn(prev);
  const b = numbersIn(next);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return b[i] > a[i] ? 'up' : 'down';
  }
  return 'up';
}
