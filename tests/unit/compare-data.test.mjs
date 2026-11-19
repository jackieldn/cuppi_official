import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { APP_IDS, RIVALS, SOURCES, FACT_GROUPS, DATA_PANELS, RIVAL_PRICES, REASONS, SHOTS, sourceById, parsePounds, numberSources, isHighlighted, CHECKED_ON } from '../../src/lib/compare-data.ts';

const rows = FACT_GROUPS.flatMap((g) => g.rows);
const used = new Set([
  ...rows.flatMap((r) => Object.values(r.sources).flat()),
  ...Object.values(DATA_PANELS).flatMap((p) => p.sources),
  ...Object.values(RIVAL_PRICES).flatMap((p) => p.sources),
]);

describe('sources', () => {
  test('each has a unique id, a label, a real date, and a https address when it has one', () => {
    assert.equal(new Set(SOURCES.map((s) => s.id)).size, SOURCES.length);
    for (const s of SOURCES) {
      assert.ok(s.label.trim(), s.id);
      assert.match(s.checkedOn, /^\d{4}-\d{2}-\d{2}$/, s.id);
      assert.ok(!Number.isNaN(Date.parse(s.checkedOn)), s.id);
      if (s.url) assert.match(s.url, /^https:\/\//, s.id);
    }
  });

  test('every source a claim names exists', () => {
    for (const id of used) assert.ok(sourceById(id), `unknown source "${id}"`);
  });

  test('no source is left unused', () => {
    for (const s of SOURCES) assert.ok(used.has(s.id) || s.id === 'cuppi-store', `"${s.id}" is never cited`);
  });
});

describe('the matrix', () => {
  test('row ids are unique and every row has a cell for every app', () => {
    assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
    for (const r of rows) {
      for (const app of APP_IDS) {
        assert.ok(['yes', 'no', 'text', 'tbc'].includes(r.cells[app]?.kind), `${r.id}/${app}`);
        if (r.cells[app].kind === 'text') assert.ok(r.cells[app].text?.trim(), `${r.id}/${app} has no words`);
      }
    }
  });

  test('every rival cell that says something names at least one source', () => {
    for (const r of rows) {
      for (const app of RIVALS) {
        if (r.cells[app].kind === 'tbc') continue;
        assert.ok((r.sources[app] ?? []).length > 0, `${r.id}/${app} says something with no source`);
      }
    }
  });

  test('a cell still to confirm names no source (there is nothing to cite yet)', () => {
    for (const r of rows) for (const app of RIVALS) if (r.cells[app].kind === 'tbc') assert.equal((r.sources[app] ?? []).length, 0, `${r.id}/${app}`);
  });
});

describe('your data', () => {
  test('every app has a panel, with sources, and Cuppi lists nothing used to track', () => {
    for (const app of APP_IDS) assert.ok(DATA_PANELS[app].sources.length > 0, app);
    assert.deepEqual(DATA_PANELS.cuppi.tracking, []);
    assert.deepEqual(DATA_PANELS.cuppi.identifiers, []);
  });

  test('the rivals list what the App Store labels list', () => {
    assert.deepEqual(DATA_PANELS.hartley.tracking, ['Contact info', 'User content', 'Identifiers', 'Usage data']);
    assert.deepEqual(DATA_PANELS.familywall.tracking, ['Identifiers']);
  });
});

describe('price', () => {
  test('parsePounds reads the ways a price is written', () => {
    assert.equal(parsePounds('£59.90'), 59.9);
    assert.equal(parsePounds('£5.99'), 5.99);
    assert.equal(parsePounds('£1,200'), 1200);
    assert.equal(parsePounds('£0'), 0);
    assert.equal(parsePounds('free'), undefined);
    assert.equal(parsePounds(''), undefined);
  });

  test('the rivals’ monthly figures match their labels', () => {
    for (const p of Object.values(RIVAL_PRICES)) assert.equal(parsePounds(p.label), p.monthly);
  });
});

describe('numbering', () => {
  test('numbers run 1, 2, 3 in order of first citation and cover every cited source', () => {
    const n = numberSources();
    assert.deepEqual([...n.values()], [...n.values()].map((_, i) => i + 1));
    for (const id of used) assert.ok(n.has(id), id);
    // The first source of the first rival cell in the matrix is cited first.
    assert.equal(n.get(rows[0].sources.hartley[0]), 1);
  });
});

describe('highlighting', () => {
  test('a tick and good news in words are highlighted; a dash, plain words and "to confirm" are not', () => {
    assert.equal(isHighlighted({ kind: 'yes' }), true);
    assert.equal(isHighlighted({ kind: 'yes', text: 'Premium only' }), true);
    assert.equal(isHighlighted({ kind: 'text', text: 'None', good: true }), true);
    assert.equal(isHighlighted({ kind: 'text', text: 'iOS 17' }), false);
    assert.equal(isHighlighted({ kind: 'no' }), false);
    assert.equal(isHighlighted({ kind: 'tbc' }), false);
  });

  test('Cuppi has a tick or good news in every row but Android and the iPhone version', () => {
    const plain = rows.filter((r) => !isHighlighted(r.cells.cuppi)).map((r) => r.id);
    assert.deepEqual(plain, ['ios', 'android']);
  });
});

describe('the rest', () => {
  test('reasons have a title and text, and shots start empty or have a size and a description', () => {
    for (const r of REASONS) assert.ok(r.title && r.text);
    for (const app of APP_IDS) for (const s of SHOTS[app]) assert.ok(s.src.startsWith('/') && s.width > 0 && s.height > 0 && s.alt.trim(), app);
  });

  test('the check date is a date', () => {
    assert.ok(!Number.isNaN(Date.parse(CHECKED_ON)));
  });
});
