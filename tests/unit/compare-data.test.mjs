import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_IDS,
  RIVALS,
  TEAM_TEST,
  allRows,
  captionFor,
  dateLabel,
  defaultCompare,
  emptySnapshot,
  formatPounds,
  isHighlighted,
  numberSources,
  parsePounds,
  proofGaps,
  sourceById,
} from '../../src/lib/compare-data.ts';
import { validateCompare } from '../../src/lib/compare-settings.ts';

const c = defaultCompare();
const rows = allRows(c);
const used = new Set([
  ...rows.flatMap((r) => Object.values(r.sources).flat()),
  ...Object.values(c.panels).flatMap((p) => p.sources),
  ...Object.values(c.prices).flatMap((p) => p.sources),
]);

describe('the default content', () => {
  test('is valid by the same rules the admin saves by', () => {
    assert.deepEqual(validateCompare(c), []);
  });

  test('is a fresh copy each time', () => {
    const a = defaultCompare();
    a.groups[0].rows[0].label = 'changed';
    assert.notEqual(defaultCompare().groups[0].rows[0].label, 'changed');
  });
});

describe('sources', () => {
  test('each has a unique id, a label, a real date, and a https address or a page on this site when it has one', () => {
    assert.equal(new Set(c.sources.map((s) => s.id)).size, c.sources.length);
    for (const s of c.sources) {
      assert.ok(s.label.trim(), s.id);
      assert.match(s.checkedOn, /^\d{4}-\d{2}-\d{2}$/, s.id);
      assert.ok(!Number.isNaN(Date.parse(s.checkedOn)), s.id);
      if (s.url) assert.match(s.url, /^(https:\/\/|\/)/, s.id);
    }
  });

  test('every source a claim names exists', () => {
    for (const id of used) assert.ok(sourceById(c, id), `unknown source "${id}"`);
  });

  test('the team test points at the snapshots page', () => {
    assert.equal(sourceById(c, TEAM_TEST).url, '/compare/snapshots');
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
});

describe('your data', () => {
  test('every app has a panel, with sources, and Cuppi lists nothing used to track', () => {
    for (const app of APP_IDS) assert.ok(c.panels[app].sources.length > 0, app);
    assert.deepEqual(c.panels.cuppi.tracking, []);
    assert.deepEqual(c.panels.cuppi.identifiers, []);
  });

  test('the rivals list what the App Store labels list', () => {
    assert.deepEqual(c.panels.hartley.tracking, ['Contact info', 'User content', 'Identifiers', 'Usage data']);
    assert.deepEqual(c.panels.familywall.tracking, ['Identifiers']);
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

  test('formatPounds writes whole pounds plainly and the rest to the penny', () => {
    assert.equal(formatPounds(0), '£0');
    assert.equal(formatPounds(5.99), '£5.99');
    assert.equal(formatPounds(6), '£6');
    assert.equal(formatPounds(4.5), '£4.50');
  });
});

describe('numbering', () => {
  test('numbers run 1, 2, 3 in order of first citation and cover every cited source', () => {
    const n = numberSources(c);
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

describe('proof gaps', () => {
  test('every claim resting on the team test is a gap until it has a screenshot', () => {
    const gaps = proofGaps(c);
    assert.ok(gaps.length > 0);
    assert.ok(gaps.every((g) => RIVALS.includes(g.app)));
    // Chores cites the team test for Hartley and FamilyWall.
    assert.ok(gaps.some((g) => g.rowId === 'chores' && g.app === 'hartley'));
    assert.ok(gaps.some((g) => g.rowId === 'chores' && g.app === 'familywall'));
    // Shopping for Hartley cites a listing only, so it is not a gap.
    assert.ok(!gaps.some((g) => g.rowId === 'shopping' && g.app === 'hartley'));
  });

  test('a screenshot closes that app’s gap and no other', () => {
    const d = defaultCompare();
    const snap = emptySnapshot('chores');
    snap.apps.hartley.shots = [{ src: '/images/compare/x.webp', width: 10, height: 20, alt: 'Hartley Activity' }];
    d.snapshots = [snap];
    const gaps = proofGaps(d);
    assert.ok(!gaps.some((g) => g.rowId === 'chores' && g.app === 'hartley'));
    assert.ok(gaps.some((g) => g.rowId === 'chores' && g.app === 'familywall'));
  });
});

describe('captions', () => {
  test('{date} becomes the day the facts were checked, in every caption', () => {
    assert.equal(captionFor(c, 'hartley'), 'Hartley, captured 19 Nov 2026');
    assert.equal(captionFor(c, 'cuppi'), 'Cuppi Home on iPhone');
    const d = defaultCompare();
    d.checkedOn = '2027-02-03';
    d.lookCaptions.familywall = 'Seen {date}, again {date}';
    assert.equal(captionFor(d, 'familywall'), 'Seen 3 Feb 2027, again 3 Feb 2027');
  });
});

describe('dates', () => {
  test('dateLabel writes a calendar day the British way and leaves anything else alone', () => {
    assert.equal(dateLabel('2026-11-19'), '19 Nov 2026');
    assert.equal(dateLabel('2026-01-01'), '1 Jan 2026');
    assert.equal(dateLabel('soon'), 'soon');
    assert.equal(dateLabel(undefined), '');
  });
});
