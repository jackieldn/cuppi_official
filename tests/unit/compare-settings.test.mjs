import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { COMPARE_LIMITS, allRows, defaultCompare, emptySnapshot } from '../../src/lib/compare-data.ts';
import { UNKNOWN_SHOT_SIZE, readShots, resolveCompare, storedCompare, validateCompare, withoutSource } from '../../src/lib/compare-settings.ts';

const shot = (n = 1) => ({ src: `/images/compare/s${n}.webp`, width: 600, height: 1300, alt: `Screen ${n}` });

describe('resolveCompare', () => {
  test('nothing stored, or junk, gives the default', () => {
    for (const bad of [null, undefined, 'x', 5, [], {}]) assert.deepEqual(resolveCompare(bad), defaultCompare());
  });

  test('what is saved round-trips unchanged', () => {
    const d = defaultCompare();
    d.checkedOn = '2026-12-01';
    d.groups[0].rows[0].label = 'Chores and jobs';
    d.snapshots = [emptySnapshot('chores')];
    d.snapshots[0].apps.hartley = { shots: [shot()], version: '1.9.2', device: 'iPhone 16', testedOn: '2026-12-01', what: 'Opened Activity' };
    assert.deepEqual(resolveCompare(storedCompare(d)), d);
  });

  test('a field that is unusable falls back to its own default, not the whole page', () => {
    const r = resolveCompare({ checkedOn: 'yesterday', whyIntro: 'Our words.', groups: 'nope', prices: { familywall: { monthly: 'lots' } } });
    assert.equal(r.checkedOn, defaultCompare().checkedOn);
    assert.equal(r.whyIntro, 'Our words.');
    assert.deepEqual(r.groups, defaultCompare().groups);
    assert.equal(r.prices.familywall.monthly, 5.99);
  });

  test('a price of 0 is kept (Hartley is free)', () => {
    assert.equal(resolveCompare({ prices: { familywall: { monthly: 0 } } }).prices.familywall.monthly, 0);
  });

  test('the note under the matrix may be cleared on purpose', () => {
    assert.equal(resolveCompare({ notYet: '' }).notYet, '');
  });

  test('why tiles keep their card colour, and take words, tile colour, icon and picture when they are usable', () => {
    const r = resolveCompare({
      reasons: [
        { id: 'no-tracking', title: 'No ads', text: 'Ever.', tint: 'clay', tile: 'blue', icon: 'star', iconUrl: 'https://firebasestorage.googleapis.com/x.webp' },
        { id: 'made-for-uk', tile: 'purple', icon: 'banana', iconUrl: 'javascript:alert(1)' },
      ],
    });
    const tile = r.reasons.find((x) => x.id === 'no-tracking');
    assert.equal(tile.title, 'No ads');
    assert.equal(tile.tint, 'moss'); // the card colour is not editable
    assert.equal(tile.tile, 'blue');
    assert.equal(tile.icon, 'star');
    assert.equal(tile.iconUrl, 'https://firebasestorage.googleapis.com/x.webp');
    const uk = r.reasons.find((x) => x.id === 'made-for-uk');
    assert.equal(uk.tile, 'amber'); // an unknown colour falls back to the default
    assert.equal(uk.icon, 'map');
    assert.equal(uk.iconUrl, undefined);
    assert.equal(r.reasons.length, 4);
  });

  test('the look-inside section: text, captions and the switch, each with its own default', () => {
    const d = defaultCompare();
    assert.equal(resolveCompare({}).showLook, true);
    assert.equal(resolveCompare({ showLook: false }).showLook, false);
    assert.equal(resolveCompare({ showLook: 'no' }).showLook, true);
    const r = resolveCompare({ whyTitle: 'Why us', lookTitle: 'Inside', lookIntro: '', lookCaptions: { hartley: 'Hartley on {date}', familywall: '   ' } });
    assert.equal(r.whyTitle, 'Why us');
    assert.equal(r.lookTitle, 'Inside');
    assert.equal(r.lookIntro, ''); // the line may be cleared on purpose
    assert.equal(r.lookCaptions.hartley, 'Hartley on {date}');
    assert.equal(r.lookCaptions.familywall, d.lookCaptions.familywall);
    assert.equal(r.lookCaptions.cuppi, d.lookCaptions.cuppi);
  });

  test('the matrix, price and sources headings and lines each have a default and take what is saved', () => {
    const d = defaultCompare();
    assert.equal(d.featuresTitle, 'Feature by feature');
    const r = resolveCompare({ featuresTitle: 'Side by side', featuresIntro: '', priceTitle: '  ', priceIntro: 'Monthly.', sourcesTitle: 'Our sources' });
    assert.equal(r.featuresTitle, 'Side by side');
    assert.equal(r.featuresIntro, ''); // a line may be cleared on purpose
    assert.equal(r.priceTitle, d.priceTitle); // a heading may not
    assert.equal(r.priceIntro, 'Monthly.');
    assert.equal(r.sourcesTitle, 'Our sources');
  });

  test('the privacy section: heading, line and card labels each have a default and take what is saved', () => {
    const d = defaultCompare();
    assert.equal(d.privacyTitle, 'Privacy hygiene');
    assert.equal(d.privacyLabels.tracking, 'Used to track you');
    const r = resolveCompare({ privacyTitle: 'Data, plainly', privacyIntro: '', privacyLabels: { tracking: 'Tracks you', linked: '  ', nothing: 'No data' } });
    assert.equal(r.privacyTitle, 'Data, plainly');
    assert.equal(r.privacyIntro, ''); // a line may be cleared on purpose
    assert.equal(r.privacyLabels.tracking, 'Tracks you');
    assert.equal(r.privacyLabels.nothing, 'No data');
    assert.equal(r.privacyLabels.linked, d.privacyLabels.linked); // a blank label falls back
    assert.equal(r.privacyLabels.notLinked, d.privacyLabels.notLinked);
  });

  test('rows are cleaned: no name drops the row, duplicate keys are made unique, odd cells become "to confirm"', () => {
    const r = resolveCompare({
      groups: [{ id: 'g', title: 'G', rows: [{ id: 'a', label: 'A' }, { id: 'a', label: 'B', cells: { cuppi: { kind: 'yes' }, hartley: { kind: 'text' } } }, { id: 'c' }] }],
    });
    const rows = allRows(r);
    assert.deepEqual(rows.map((x) => x.label), ['A', 'B']);
    assert.notEqual(rows[0].id, rows[1].id);
    assert.equal(rows[0].cells.cuppi.kind, 'tbc');
    assert.equal(rows[1].cells.hartley.kind, 'no');
  });

  test('sources need a key, a name and a real date, and a bad address is dropped from the source', () => {
    const r = resolveCompare({
      sources: [
        { id: 'ok', label: 'Fine', url: 'https://example.com/x', checkedOn: '2026-01-02' },
        { id: 'bad date', label: 'Nope', checkedOn: '2026-01-02' },
        { id: 'js', label: 'Script', url: 'javascript:alert(1)', checkedOn: '2026-01-02' },
        { id: 'page', label: 'On site', url: '/compare/snapshots', checkedOn: '2026-01-02' },
      ],
    });
    assert.deepEqual(r.sources.map((s) => s.id), ['ok', 'js', 'page']);
    assert.equal(r.sources.find((s) => s.id === 'js').url, undefined);
    assert.equal(r.sources.find((s) => s.id === 'page').url, '/compare/snapshots');
  });

  test('screenshots keep at most three, and only real ones', () => {
    const many = [shot(1), shot(2), shot(3), shot(4)];
    assert.equal(readShots(many).length, COMPARE_LIMITS.shots);
    assert.deepEqual(readShots([{ src: 'javascript:x', width: 1, height: 1, alt: 'x' }, null, 5, { width: 3, height: 3 }]), []);
    assert.equal(readShots('no').length, 0);
  });

  test('a screenshot saved with no usable size is kept at the usual shape, not dropped', () => {
    // This is how screenshots vanished after a refresh: they were saved with a size of 0 by 0 and then thrown away on reading.
    const kept = readShots([{ src: 'https://firebasestorage.googleapis.com/a.webp', width: 0, height: 0, alt: 'Cuppi Home on iPhone' }, { src: '/b.webp', alt: 'B' }, { src: '/c.webp', width: 'wide', height: -4, alt: 'C' }]);
    assert.equal(kept.length, 3);
    for (const s of kept) assert.deepEqual([s.width, s.height], [UNKNOWN_SHOT_SIZE.width, UNKNOWN_SHOT_SIZE.height]);
    assert.equal(kept[0].alt, 'Cuppi Home on iPhone');
    // A real size is kept as it is.
    assert.deepEqual(readShots([{ src: '/d.webp', width: 1206.4, height: 2622, alt: 'D' }]).map((s) => [s.width, s.height]), [[1206, 2622]]);
    // And it comes through resolveCompare, so the page and the admin both show it.
    assert.equal(resolveCompare({ shots: { cuppi: [{ src: '/a.webp', width: 0, height: 0, alt: 'A' }] } }).shots.cuppi.length, 1);
  });

  test('a snapshot needs a row key, appears once, and carries its details', () => {
    const r = resolveCompare({
      snapshots: [
        { rowId: 'pets', apps: { hartley: { shots: [shot()], version: '1.9.1', testedOn: '2026-11-19' } } },
        { rowId: 'pets', apps: {} },
        { apps: {} },
      ],
    });
    assert.equal(r.snapshots.length, 1);
    assert.equal(r.snapshots[0].apps.hartley.version, '1.9.1');
    assert.equal(r.snapshots[0].apps.cuppi.shots.length, 0);
  });
});

describe('storedCompare', () => {
  test('has no undefined anywhere and trims text', () => {
    const d = defaultCompare();
    d.whyIntro = '  padded  ';
    d.panels.cuppi.note = undefined;
    const s = storedCompare(d);
    assert.equal(s.whyIntro, 'padded');
    assert.ok(!JSON.stringify(s).includes('undefined'));
  });
});

describe('validateCompare', () => {
  const problems = (change) => {
    const d = defaultCompare();
    change(d);
    return validateCompare(d);
  };

  test('the default is fine', () => assert.deepEqual(validateCompare(defaultCompare()), []));

  test('a rival cell that says something must cite a source that exists', () => {
    assert.ok(problems((d) => (d.groups[0].rows[0].sources.hartley = [])).some((p) => /names no source/.test(p)));
    assert.ok(problems((d) => (d.groups[0].rows[0].sources.hartley = ['nope'])).some((p) => /not in the list/.test(p)));
    // "to confirm" needs none.
    assert.deepEqual(problems((d) => { d.groups[0].rows[0].cells.hartley = { kind: 'tbc' }; d.groups[0].rows[0].sources.hartley = []; }), []);
  });

  test('catches duplicate keys, empty groups, blank names and bad dates', () => {
    assert.ok(problems((d) => (d.groups[0].rows[1].id = d.groups[0].rows[0].id)).some((p) => /share the key/.test(p)));
    assert.ok(problems((d) => d.groups.push({ id: 'empty', title: 'Empty', rows: [] })).some((p) => /no rows/.test(p)));
    assert.ok(problems((d) => (d.groups[0].rows[0].label = ' ')).some((p) => /needs a name/.test(p)));
    assert.ok(problems((d) => (d.checkedOn = '2026-13-45')).some((p) => /real date/.test(p)));
    assert.ok(problems((d) => (d.sources[0].checkedOn = 'soon')).some((p) => /checked on/.test(p)));
  });

  test('a screenshot needs a description, and a snapshot needs a row that exists', () => {
    assert.ok(problems((d) => (d.shots.cuppi = [{ ...shot(), alt: '' }])).some((p) => /description/.test(p)));
    assert.ok(problems((d) => d.snapshots.push(emptySnapshot('ghost'))).some((p) => /no longer in the matrix/.test(p)));
    assert.deepEqual(problems((d) => d.snapshots.push(emptySnapshot('pets'))), []);
  });

  test('the headings and captions must not be empty', () => {
    assert.ok(problems((d) => (d.whyTitle = ' ')).some((p) => /needs a heading/.test(p)));
    assert.ok(problems((d) => (d.lookTitle = '')).some((p) => /needs a heading/.test(p)));
    assert.ok(problems((d) => (d.featuresTitle = ' ')).some((p) => /matrix needs a heading/.test(p)));
    assert.ok(problems((d) => (d.priceTitle = '')).some((p) => /price section needs a heading/.test(p)));
    assert.ok(problems((d) => (d.sourcesTitle = '')).some((p) => /sources section needs a heading/.test(p)));
    assert.ok(problems((d) => (d.privacyTitle = '')).some((p) => /privacy section needs a heading/.test(p)));
    assert.ok(problems((d) => (d.privacyLabels.linked = ' ')).some((p) => /label on the privacy cards/.test(p)));
    assert.ok(problems((d) => (d.lookCaptions.hartley = '')).some((p) => /caption/.test(p)));
    assert.deepEqual(problems((d) => (d.lookIntro = '')), []);
  });

  test('a price must be a number from 0', () => {
    assert.ok(problems((d) => (d.prices.familywall.monthly = -1)).some((p) => /price needs a number/.test(p)));
    assert.ok(problems((d) => (d.prices.hartley.monthly = Number.NaN)).some((p) => /price needs a number/.test(p)));
  });
});

describe('withoutSource', () => {
  test('takes a source out of the list and off every claim that cited it, and leaves the rest valid', () => {
    const d = defaultCompare();
    const out = withoutSource(d, 'fw-store');
    assert.ok(!out.sources.some((s) => s.id === 'fw-store'));
    assert.ok(!JSON.stringify([out.groups, out.panels, out.prices]).includes('fw-store'));
    // Other sources stay, and the original is untouched.
    assert.ok(out.sources.some((s) => s.id === 'fw-privacy'));
    assert.ok(d.sources.some((s) => s.id === 'fw-store'));
    // A claim left with no source is reported, not hidden.
    assert.ok(validateCompare(out).some((p) => /names no source/.test(p)));
  });
});
