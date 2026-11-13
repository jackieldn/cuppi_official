import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DISCLAIMER_LIMITS,
  disclaimerIds,
  disclaimerTag,
  hasDisclaimer,
  isDisclaimerId,
  resolveDisclaimers,
  splitDisclaimers,
  stripDisclaimers,
  validateDisclaimers,
} from '../../src/lib/disclaimers.ts';
import { newSection, validateSections } from '../../src/lib/feature-sections.ts';

describe('tags in text', () => {
  test('splitDisclaimers finds the tag after a word and keeps the rest', () => {
    assert.deepEqual(splitDisclaimers('Medication{i:health} reminders'), ['Medication', { disclaimer: 'health' }, ' reminders']);
    assert.deepEqual(splitDisclaimers('{i:a}{i:b}'), [{ disclaimer: 'a' }, { disclaimer: 'b' }]);
    assert.deepEqual(splitDisclaimers('Two{i:a} and three{i:b-c}.'), ['Two', { disclaimer: 'a' }, ' and three', { disclaimer: 'b-c' }, '.']);
  });

  test('text without a tag comes back as it went in', () => {
    assert.deepEqual(splitDisclaimers('Plain words'), ['Plain words']);
    assert.deepEqual(splitDisclaimers(''), ['']);
    // things that look a little like tags are left alone
    for (const t of ['{i:Health}', '{i:}', '{i: health}', '{i:health', '{x:health}', '{{i:health}']) {
      assert.ok(!splitDisclaimers(t).some((p) => typeof p !== 'string' && p.disclaimer === 'Health'), t);
    }
    assert.deepEqual(splitDisclaimers('{i:Health}'), ['{i:Health}']);
  });

  test('stripDisclaimers removes the tags and the space before them', () => {
    assert.equal(stripDisclaimers('Medication{i:health} reminders'), 'Medication reminders');
    assert.equal(stripDisclaimers('Medication {i:health}, on time'), 'Medication, on time');
    assert.equal(stripDisclaimers('No tags here'), 'No tags here');
  });

  test('disclaimerIds and hasDisclaimer', () => {
    assert.deepEqual(disclaimerIds('a{i:one} b{i:two} c{i:one}'), ['one', 'two', 'one']);
    assert.deepEqual(disclaimerIds('nothing'), []);
    assert.equal(hasDisclaimer('x{i:one}'), true);
    // twice in a row: the pattern keeps no state between calls
    assert.equal(hasDisclaimer('x{i:one}'), true);
    assert.equal(hasDisclaimer('x'), false);
  });

  test('disclaimerTag is what the text reads', () => {
    assert.equal(disclaimerTag('health'), '{i:health}');
    assert.deepEqual(disclaimerIds(disclaimerTag('vet-advice')), ['vet-advice']);
  });
});

describe('ids', () => {
  test('lowercase words joined by hyphens, within the limit', () => {
    for (const ok of ['health', 'vet-advice', 'a1', 'x']) assert.ok(isDisclaimerId(ok), ok);
    for (const bad of ['', 'Health', 'vet advice', 'vet_advice', '-a', 'a-', 'a--b', 'x'.repeat(33)]) assert.ok(!isDisclaimerId(bad), bad);
  });
});

describe('resolveDisclaimers', () => {
  test('anything that is not { items: [...] } gives none', () => {
    for (const bad of [undefined, null, 'x', 5, [], {}, { items: 'x' }]) assert.deepEqual(resolveDisclaimers(bad), []);
  });

  test('keeps good ones, trims, and names an unnamed one after its tag', () => {
    const out = resolveDisclaimers({ items: [{ id: 'health', label: ' Health ', text: ' Not medical advice. ' }, { id: 'vet', text: 'See a vet.' }] });
    assert.deepEqual(out, [
      { id: 'health', label: 'Health', text: 'Not medical advice.' },
      { id: 'vet', label: 'vet', text: 'See a vet.' },
    ]);
  });

  test('drops what cannot be used, one entry at a time', () => {
    const out = resolveDisclaimers({
      items: ['junk', null, { id: 'Bad Id', text: 'x' }, { id: 'empty', text: '   ' }, { id: 'ok', text: 'Fine' }, { id: 'ok', text: 'A repeat keeps the first' }, { id: 5, text: 'x' }],
    });
    assert.deepEqual(out, [{ id: 'ok', label: 'ok', text: 'Fine' }]);
  });

  test('long words and long lists are cut to the limits', () => {
    const [d] = resolveDisclaimers({ items: [{ id: 'a', label: 'L'.repeat(200), text: 'T'.repeat(5000) }] });
    assert.equal(d.label.length, DISCLAIMER_LIMITS.label);
    assert.equal(d.text.length, DISCLAIMER_LIMITS.text);
    const many = Array.from({ length: 60 }, (_, i) => ({ id: `d${i}`, text: 'x' }));
    assert.equal(resolveDisclaimers({ items: many }).length, DISCLAIMER_LIMITS.items);
  });
});

describe('validateDisclaimers', () => {
  const d = (id, text = 'Words', label = '') => ({ id, label, text });
  test('a good list has no problems', () => assert.deepEqual(validateDisclaimers([d('health'), d('vet-advice')]), []));
  test('says what is wrong, by number', () => {
    const p = validateDisclaimers([d(''), d('Bad Id'), d('ok'), d('ok'), d('fine', '  ')]);
    assert.equal(p.length, 4);
    assert.match(p[0], /Disclaimer 1.*needs a tag name/);
    assert.match(p[1], /Disclaimer 2.*lowercase letters/);
    assert.match(p[2], /Disclaimer 4.*used twice/);
    assert.match(p[3], /Disclaimer 5.*needs the words/);
  });
});

describe('tags in page sections', () => {
  const callout = (title) => ({ ...newSection('callout', 'a'), title });

  test('a tag for a disclaimer that exists is fine, one that does not is reported', () => {
    assert.deepEqual(validateSections([callout('Meds{i:health} on time')], ['health']), []);
    const p = validateSections([callout('Meds{i:health} and vets{i:vet}')], ['health']);
    assert.equal(p.length, 1);
    assert.match(p[0], /Section 1 \(Big sentence\): there is no disclaimer called "vet"/);
  });

  test('without a list of disclaimers, only the placement is checked', () => {
    assert.deepEqual(validateSections([callout('Meds{i:anything}')]), []);
  });

  test('a tag cannot go in a label chip or a tab title', () => {
    const showcase = { ...newSection('showcase', 'a'), title: 'T', image: { url: 'blob:1', alt: '' }, eyebrow: 'New{i:health}' };
    assert.match(validateSections([showcase])[0], /cannot go in a label or a topic title/);
    const tabs = { ...newSection('tabs', 'b'), items: [{ title: 'Meds{i:health}', body: '', image: { url: 'blob:1', alt: '' } }] };
    assert.match(validateSections([tabs])[0], /cannot go in a label or a topic title/);
    const fine = { ...tabs, items: [{ title: 'Meds', body: 'Doses{i:health}', image: { url: 'blob:1', alt: '' } }] };
    assert.deepEqual(validateSections([fine], ['health']), []);
  });

  test('every text a section carries is checked', () => {
    const cards = { ...newSection('cards', 'c'), title: 'T', cards: [{ title: 'C', body: 'x{i:nope}', image: { url: 'blob:1', alt: '' } }], footnotes: ['y{i:nope2}'] };
    const [problem] = validateSections([cards], []);
    assert.match(problem, /"nope"/);
    assert.match(problem, /"nope2"/);
  });
});
