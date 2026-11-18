import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePlans, defaultSections, featurePlanRows, defaultPrices, storedPlans, validatePlans, newCustomId, PLANS_LIMITS } from '../../src/lib/plans-settings.ts';

const rows = (...labels) => labels.map((label) => ({ label, free: '1', pro: '5' }));
const plansBlock = (r) => ({ id: 'p', type: 'plans', title: 'Plans', rows: r, tint: 'honey' });
const feat = (slug, r) => ({ slug, ...(r ? { blocks: [{ id: 'x', type: 'callout', title: 'hi', tint: 'honey' }, plansBlock(r)] } : { blocks: [] }) });
const FEATURES = [feat('pets', rows('Pet profiles', 'Weight tracker')), feat('home-feed'), feat('bin-day', rows('Bin profiles'))];
const ids = (p) => p.sections.map((s) => s.id);

describe('featurePlanRows / defaultSections', () => {
  test('copies the rows of the first plans block, and nothing for a feature without one', () => {
    assert.deepEqual(featurePlanRows(FEATURES[0]), rows('Pet profiles', 'Weight tracker'));
    assert.deepEqual(featurePlanRows(FEATURES[1]), []);
    assert.deepEqual(featurePlanRows({ slug: 'x' }), []);
  });

  test('the copy is independent of the feature', () => {
    const copy = featurePlanRows(FEATURES[0]);
    copy[0].label = 'changed';
    assert.equal(FEATURES[0].blocks[1].rows[0].label, 'Pet profiles');
  });

  test('one section per feature that has a table, in feature order', () => {
    const s = defaultSections(FEATURES);
    assert.deepEqual(s.map((x) => x.feature), ['pets', 'bin-day']);
    assert.deepEqual(s.map((x) => x.id), ['pets', 'bin-day']);
  });
});

describe('resolvePlans', () => {
  test('nothing stored (or rubbish) gives the default prices and a section per feature with a table', () => {
    for (const bad of [undefined, null, 'x', 5, {}, { sections: 'no' }]) {
      const p = resolvePlans(bad, FEATURES);
      assert.deepEqual(p.prices, defaultPrices(), String(bad));
      assert.deepEqual(ids(p), ['pets', 'bin-day'], String(bad));
    }
  });

  test('an empty saved list stays empty: clearing the page is a choice', () => {
    assert.deepEqual(resolvePlans({ sections: [] }, FEATURES).sections, []);
  });

  test('keeps the stored order, intro and rows', () => {
    const p = resolvePlans({ sections: [{ feature: 'bin-day', intro: ' Hello ', rows: rows('A') }, { feature: 'pets', rows: rows('B', 'C') }] }, FEATURES);
    assert.deepEqual(ids(p), ['bin-day', 'pets']);
    assert.equal(p.sections[0].intro, 'Hello');
    assert.deepEqual(p.sections[1].rows.map((r) => r.label), ['B', 'C']);
  });

  test('drops a feature that is gone, a repeat, and junk', () => {
    const p = resolvePlans({ sections: [{ feature: 'gone', rows: rows('A') }, { feature: 'pets', rows: rows('A') }, { feature: 'pets', rows: rows('B') }, null, 7, { rows: rows('A') }] }, FEATURES);
    assert.deepEqual(ids(p), ['pets']);
    assert.equal(p.sections[0].rows[0].label, 'A');
  });

  test('a table of your own needs a title; a stored id is kept when it is a safe one', () => {
    const p = resolvePlans({ sections: [{ id: 'custom-7', title: 'Your Home', rows: rows('Adults') }, { id: 'custom-8', title: '  ', rows: rows('x') }, { id: '../x', title: 'Other', rows: rows('y') }] }, FEATURES);
    assert.deepEqual(p.sections.map((s) => s.title), ['Your Home', 'Other']);
    assert.equal(p.sections[0].id, 'custom-7');
    assert.match(p.sections[1].id, /^custom-\d+$/);
    assert.notEqual(p.sections[1].id, 'custom-7');
  });

  test('lines without a name are dropped, empty cells are kept as empty', () => {
    const p = resolvePlans({ sections: [{ feature: 'pets', rows: [{ label: '', free: '1', pro: '2' }, { label: 'Ok', free: 5, pro: ' Yes ' }] }] }, FEATURES);
    assert.deepEqual(p.sections[0].rows, [{ label: 'Ok', free: '', pro: 'Yes' }]);
  });

  test('prices: trimmed, limited, gaps filled; the annual note can be cleared', () => {
    const p = resolvePlans({ prices: { monthly: ' £7.99 ', annual: '', annualNote: '' }, sections: [] }, FEATURES);
    assert.equal(p.prices.monthly, '£7.99');
    assert.equal(p.prices.annual, defaultPrices().annual);
    assert.equal(p.prices.annualNote, '');
    assert.equal(resolvePlans({ prices: { monthly: 'x'.repeat(100) } }, FEATURES).prices.monthly.length, PLANS_LIMITS.price);
  });

  test('never holds more tables than the page allows', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ title: `T${i}`, rows: rows('a') }));
    assert.equal(resolvePlans({ sections: many }, FEATURES).sections.length, PLANS_LIMITS.sections);
  });
});

describe('storedPlans / validatePlans', () => {
  const name = (s) => s.title ?? s.feature ?? '';

  test('stored settings read back the same, and carry no undefined fields', () => {
    const p = resolvePlans({ sections: [{ feature: 'pets', rows: rows('A') }, { id: 'custom-1', title: 'Home', intro: 'x', rows: rows('B') }] }, FEATURES);
    const out = storedPlans(p);
    assert.ok(!JSON.stringify(out, (_, v) => (v === undefined ? '__undef__' : v)).includes('__undef__'));
    assert.deepEqual(resolvePlans(out, FEATURES), p);
  });

  test('empty optional fields are left out', () => {
    const out = storedPlans({ prices: defaultPrices(), sections: [{ id: 'pets', feature: 'pets', title: 'ignored', intro: '  ', rows: rows('A') }] });
    assert.deepEqual(Object.keys(out.sections[0]).sort(), ['feature', 'id', 'rows']);
  });

  test('a good draft has no problems', () => {
    assert.deepEqual(validatePlans(resolvePlans(null, FEATURES), name), []);
  });

  test('says what is wrong in plain words', () => {
    const draft = {
      prices: { monthly: '', annual: '£1', annualNote: '' },
      sections: [
        { id: 'pets', feature: 'pets', rows: [] },
        { id: 'bin-day', feature: 'bin-day', rows: [{ label: ' ', free: '', pro: '' }] },
        { id: 'custom-1', title: ' ', rows: rows('A') },
      ],
    };
    const problems = validatePlans(draft, name);
    assert.ok(problems.some((p) => /monthly/i.test(p)));
    assert.ok(problems.some((p) => /pets has no lines/i.test(p)));
    assert.ok(problems.some((p) => /bin-day has a line with no name/i.test(p)));
    assert.ok(problems.some((p) => /needs a title/i.test(p)));
  });

  test('newCustomId never repeats one in use', () => {
    assert.equal(newCustomId([]), 'custom-1');
    assert.equal(newCustomId([{ id: 'custom-1' }, { id: 'custom-2' }]), 'custom-3');
  });
});
