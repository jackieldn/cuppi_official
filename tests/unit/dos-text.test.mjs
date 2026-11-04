import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  truncate,
  wrap,
  stripHtml,
  table,
  bar,
  box,
  dosDate,
  dosTime,
  picture,
  sideBySide,
  toDosText,
  blockLetters,
  BANNER,
  COLS,
} from '../../src/lib/dos-text.ts';

describe('JackDOS text helpers', () => {
  test('truncate marks the cut with ~ and leaves short text alone', () => {
    assert.equal(truncate('After Effects', 20), 'After Effects');
    assert.equal(truncate('After Effects', 6), 'After~');
    assert.equal(truncate('x', 0), '');
  });

  test('wrap keeps every line within the width and keeps paragraphs', () => {
    const lines = wrap('the quick brown fox jumps over the lazy dog\n\nsecond paragraph', 12, '  ');
    assert.ok(lines.every((l) => l.length <= 12), lines.join('|'));
    assert.ok(lines.every((l) => l === '' || l.startsWith('  ')));
    assert.ok(lines.includes(''), 'blank line between paragraphs');
    assert.equal(lines.at(-1), '  paragraph');
  });

  test('wrap splits words longer than a line', () => {
    assert.deepEqual(wrap('abcdefghij', 4), ['abcd', 'efgh', 'ij']);
  });

  test('stripHtml turns rich text into plain text a DOS font can show', () => {
    assert.equal(
      stripHtml('<p>Hello &amp; welcome</p><p>It’s “great” — really…</p>'),
      'Hello & welcome\nIt\'s "great" - really...',
    );
    assert.equal(stripHtml('<ul><li>One</li><li>Two</li></ul>'), '- One\n- Two');
  });

  test('toDosText drops emoji from prose but leaves text art spacing alone', () => {
    assert.equal(toDosText('a senior 🌠 motion and 🎨 graphic designer 🤖.'), 'a senior motion and graphic designer.');
    assert.equal(toDosText('MotoGP Season ‘23'), "MotoGP Season '23");
    assert.equal(toDosText('  # TITLE      CLIENT'), '  # TITLE      CLIENT');
    assert.equal(toDosText('│   /\\  /  \\   │'), '│   /\\  /  \\   │');
  });

  test('table lines up columns under a dashed rule', () => {
    const out = table(
      [
        { header: '#', width: 2, align: 'right' },
        { header: 'TITLE', width: 8 },
      ],
      [['1', 'Very long title'], ['12', 'Short']],
    );
    assert.deepEqual(out, [' # TITLE', '-- --------', ' 1 Very lo~', '12 Short']);
  });

  test('bar fills in proportion and clamps', () => {
    assert.equal(bar(0.5, 4), '██░░');
    assert.equal(bar(2, 3), '███');
    assert.equal(bar(-1, 3), '░░░');
  });

  test('box is the width asked for', () => {
    const out = box('JACK', 20);
    assert.ok(out.every((l) => l.length === 20));
  });

  test('DOS-style date and time', () => {
    const d = new Date(1994, 5, 16, 14, 5);
    assert.equal(dosDate(d), '06-16-94');
    assert.equal(dosTime(d), '2:05p');
    assert.equal(dosTime(new Date(1994, 5, 16, 0, 7)), '12:07a');
  });

  test('blockLetters draws a 3-row word, 4 columns a letter', () => {
    const rows = blockLetters('jackie_');
    assert.equal(rows.length, 3);
    assert.ok(rows.every((r) => r.length <= 7 * 4 - 1));
    // J: a column down the right, hooking left at the bottom.
    assert.deepEqual(blockLetters('J'), ['  █', '▄ █', ' ▀']);
    assert.ok(rows.every((r) => /^[█▀▄ ]*$/.test(r)), 'only block characters');
  });

  test('text art fits on an 80-column screen, even side by side', () => {
    assert.ok(BANNER.every((l) => l.length <= COLS));
    const row = sideBySide([picture('one'), picture('two')]);
    assert.ok(row.every((l) => l.length <= COLS));
    assert.equal(new Set(picture('x').map((l) => l.length)).size, 1, 'picture frame is rectangular');
  });
});
