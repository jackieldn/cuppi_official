// Text-mode helpers for the desktop easter egg's 1997 DOS skin (JackDOS).
// Everything is laid out for an 80-column screen, using characters from the
// old IBM PC character set (code page 437) so it looks right in a DOS font.

export const COLS = 80;
/** Usable width: two columns are kept free on the right, as DOS output tended to. */
export const TEXT_WIDTH = COLS - 2;

/** Cuts text to `width` columns, marking the cut with "~" like an 8.3 filename. */
export function truncate(text: string, width: number): string {
  if (width <= 0) return '';
  return text.length > width ? `${text.slice(0, width - 1)}~` : text;
}

export function padRight(text: string, width: number): string {
  return truncate(text, width).padEnd(width);
}

export function padLeft(text: string, width: number): string {
  return truncate(text, width).padStart(width);
}

/**
 * Word-wraps text to `width` columns. Paragraph breaks (newlines) are kept;
 * words longer than a line are split. Every line gets `indent` in front.
 */
export function wrap(text: string, width = TEXT_WIDTH, indent = ''): string[] {
  const room = Math.max(1, width - indent.length);
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push('');
      continue;
    }
    let line = '';
    for (let word of words) {
      while (word.length > room) {
        if (line) {
          out.push(indent + line);
          line = '';
        }
        out.push(indent + word.slice(0, room));
        word = word.slice(room);
      }
      if (!word) continue;
      if (!line) line = word;
      else if (line.length + 1 + word.length <= room) line += ` ${word}`;
      else {
        out.push(indent + line);
        line = word;
      }
    }
    if (line) out.push(indent + line);
  }
  return out;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/**
 * Swaps characters a 1997 DOS font wouldn't have for ones it would: curly
 * quotes and dashes become plain ones, and emoji are dropped. The box-drawing
 * and block characters used for the text art are left alone.
 */
export function toDosText(text: string): string {
  const plain = text
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...');
  const noEmoji = plain.replace(/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}️‍]/gu, '');
  if (noEmoji === plain) return plain;
  // Only prose has emoji: tidy the gaps they leave (keeping any indent), but
  // never touch the spacing of tables and text art, which have none.
  const indent = /^ */.exec(noEmoji)?.[0] ?? '';
  return indent + noEmoji.slice(indent.length).replace(/ {2,}/g, ' ').replace(/ ([.,!?;:])/g, '$1');
}

/** Rich text from the CMS to plain text: block tags become line breaks, the rest is dropped. */
export function stripHtml(html: string): string {
  const text = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '- ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#\d+|[a-z]+);/gi, (m, code: string) =>
      code.startsWith('#') ? String.fromCharCode(Number(code.slice(1))) : (ENTITIES[code.toLowerCase()] ?? m),
    )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.split('\n').map(toDosText).join('\n');
}

export interface Column {
  header: string;
  width: number;
  align?: 'left' | 'right';
}

/** A fixed-width table with a header row and a dashed rule under it. */
export function table(columns: Column[], rows: string[][]): string[] {
  const cell = (text: string, c: Column) => (c.align === 'right' ? padLeft(text, c.width) : padRight(text, c.width));
  const line = (cells: string[]) =>
    columns
      .map((c, i) => cell(cells[i] ?? '', c))
      .join(' ')
      .trimEnd();
  return [line(columns.map((c) => c.header)), line(columns.map((c) => '-'.repeat(c.width))), ...rows.map(line)];
}

/** A text bar chart: filled blocks for `fraction` (0 to 1), shaded blocks for the rest. */
export function bar(fraction: number, width = 20): string {
  const filled = Math.round(Math.min(1, Math.max(0, fraction)) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

/** A double-line box around a title, `width` columns wide overall. */
export function box(title: string, width = 48): string[] {
  const inner = width - 2;
  return [`╔${'═'.repeat(inner)}╗`, `║ ${padRight(title, inner - 2)} ║`, `╚${'═'.repeat(inner)}╝`];
}

/** DOS's MM-DD-YY. */
export function dosDate(d: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getFullYear() % 100)}`;
}

/** DOS's 10:32a. */
export function dosTime(d: Date): string {
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`;
}

/** 1,234,567 */
export function bytes(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

// ---------------------------------------------------------------------------
// Block letters: a 3x5 pixel font drawn with half-block characters, two
// pixel rows to each text row, so every letter is 3 columns by 3 rows.

const PIXEL_FONT: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  E: ['###', '#..', '##.', '#..', '###'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  _: ['...', '...', '...', '...', '###'],
  ' ': ['...', '...', '...', '...', '...'],
};

const HALF_BLOCKS: Record<string, string> = { '##': '█', '#.': '▀', '.#': '▄', '..': ' ' };

/**
 * Draws `word` in block letters (3 rows tall, 4 columns a letter including
 * the gap). Letters the font doesn't have come out as blanks.
 */
export function blockLetters(word: string): string[] {
  const glyphs = [...word.toUpperCase()].map((ch) => PIXEL_FONT[ch] ?? PIXEL_FONT[' ']);
  const rows: string[] = [];
  for (let y = 0; y < 5; y += 2) {
    rows.push(
      glyphs
        .map((g) => [...g[y]].map((top, x) => HALF_BLOCKS[top + (g[y + 1]?.[x] ?? '.')]).join(''))
        .join(' ')
        .trimEnd(),
    );
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Text art. We can't show pictures in text mode, so these stand in for them.

export const BANNER = [
  '     ██╗ █████╗  ██████╗██╗  ██╗',
  '     ██║██╔══██╗██╔════╝██║ ██╔╝',
  '     ██║███████║██║     █████╔╝ ',
  '██   ██║██╔══██║██║     ██╔═██╗ ',
  '╚█████╔╝██║  ██║╚██████╗██║  ██╗',
  ' ╚════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝',
];

const PICTURE_ART = [
  ' .     *      .   ',
  '     /\\    .   /\\ ',
  ' /\\ /  \\  /\\ /  \\',
  '/  \\    \\/  \\    \\',
];

/** Centres text in `width` columns, trimming both sides if it's too wide. */
function centre(text: string, width: number): string {
  if (text.length >= width) {
    const cut = Math.floor((text.length - width) / 2);
    return text.slice(cut, cut + width);
  }
  const left = Math.floor((width - text.length) / 2);
  return ' '.repeat(left) + text + ' '.repeat(width - text.length - left);
}

/** A framed "photo": mountains under a starry sky. */
export function picture(caption: string, width = 30): string[] {
  const inner = width - 2;
  return [
    `┌${'─'.repeat(inner)}┐`,
    `│${' '.repeat(inner)}│`,
    ...PICTURE_ART.map((row) => `│${centre(row, inner)}│`),
    `├${'─'.repeat(inner)}┤`,
    `│${padRight(` ${caption}`, inner)}│`,
    `└${'─'.repeat(inner)}┘`,
  ];
}

/** Places blocks of lines side by side, with `gap` spaces between them. */
export function sideBySide(blocks: string[][], gap = 2): string[] {
  const height = Math.max(...blocks.map((b) => b.length));
  const widths = blocks.map((b) => Math.max(...b.map((l) => l.length)));
  return Array.from({ length: height }, (_, row) =>
    blocks
      .map((b, i) => (b[row] ?? '').padEnd(widths[i]))
      .join(' '.repeat(gap))
      .trimEnd(),
  );
}

export const PORTRAIT = [
  '   .-"""""-.   ',
  '  /  _   _  \\  ',
  ' |  (o) (o)  | ',
  ' |     ^     | ',
  ' |   \\___/   | ',
  '  \\_________/  ',
];

export const CASSETTE = [
  ' ________________________ ',
  '|  ____________________  |',
  '| |   JACK  MIX  TAPE  | |',
  '| |   ( O )    ( O )   | |',
  '| |____________________| |',
  '|    __/__________\\__    |',
  '|___/________________\\___|',
];

export const FLOPPY = [
  ' ______________ ',
  '|[]  ______  []|',
  '|   |      |   |',
  '|   |______|   |',
  '|   ________   |',
  '|  |  ____  |  |',
  '|__|_|____|_|__|',
];
