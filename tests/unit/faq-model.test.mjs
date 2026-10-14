import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildFaqModel, slugify, portableTextToPlain, isPlaceholderAnswer } from '../../src/lib/faq-model.ts';

const text = (t, extra = {}) => ({ _type: 'block', style: 'normal', children: [{ _type: 'span', text: t, marks: [] }], ...extra });
const faq = (id, question, category, answerText = `Answer to ${question}`, extra = {}) => ({
  _id: id,
  _createdAt: `2026-01-${String(id.length).padStart(2, '0')}T00:00:00Z`,
  _updatedAt: '2026-05-01T00:00:00Z',
  question,
  category,
  answer: [text(answerText)],
  order: 1,
  ...extra,
});

const config = {
  sections: [
    { id: 'bins', label: 'Bin Day', blurb: 'Bins.', group: 'Features', categories: ['bin-day'] },
    { id: 'dates', label: 'Dates', blurb: 'Dates.', group: 'Features', categories: ['birthday', 'anniversaries'] },
    { id: 'basics', label: 'Basics', blurb: 'Basics.', group: 'Start', categories: ['general'] },
  ],
  groupOrder: ['Start', 'Features'],
  layout: {
    bins: [
      { topic: 'Setting up', ids: ['b2', 'b1'] },
      { topic: 'Notifications', ids: ['b3'] },
    ],
  },
  popularIds: ['b1', 'g1'],
  reservedSectionIds: ['search'],
};

describe('buildFaqModel: sections', () => {
  test('groups answers into configured sections, merging categories, in config order', () => {
    const m = buildFaqModel(
      [faq('d1', 'Add a birthday', 'birthday'), faq('d22', 'Add an anniversary', 'anniversaries'), faq('b1', 'Set up bins', 'bin-day'), faq('g1', 'Home feed', 'general')],
      config,
    );
    assert.deepEqual(m.sections.map((s) => s.id), ['bins', 'dates', 'basics']);
    assert.equal(m.sections[1].entries.length, 2);
  });

  test('groups sections under their group heading, in the configured group order', () => {
    const m = buildFaqModel([faq('b1', 'Set up bins', 'bin-day'), faq('g1', 'Home feed', 'general')], config);
    assert.deepEqual(m.groups.map((g) => g.label), ['Start', 'Features']);
  });

  test('a category nobody mapped still gets its own page, in a catch-all group', () => {
    const m = buildFaqModel([faq('x1', 'What is a thing?', 'new-feature')], config);
    assert.equal(m.sections[0].id, 'new-feature');
    assert.equal(m.sections[0].label, 'New Feature');
    assert.equal(m.sections[0].group, 'More topics');
  });

  test('an unmapped category can never take a reserved URL segment', () => {
    const m = buildFaqModel([faq('x1', 'Find stuff', 'search')], config);
    assert.equal(m.sections[0].id, 'search-faq');
  });

  test('a section with no answers is not listed', () => {
    const m = buildFaqModel([faq('b1', 'Set up bins', 'bin-day')], config);
    assert.deepEqual(m.sections.map((s) => s.id), ['bins']);
  });

  test('missing category falls back to general', () => {
    const m = buildFaqModel([faq('g1', 'Home feed', null)], config);
    assert.equal(m.sections[0].id, 'basics');
  });

  test('records the latest edit per section and overall', () => {
    const m = buildFaqModel(
      [faq('b1', 'One', 'bin-day', 'a', { _updatedAt: '2026-02-01T00:00:00Z' }), faq('b2', 'Two', 'bin-day', 'a', { _updatedAt: '2026-09-09T00:00:00Z' }), faq('g1', 'Three', 'general', 'a', { _updatedAt: '2026-03-01T00:00:00Z' })],
      config,
    );
    assert.equal(m.sections[0].updatedAt, '2026-09-09T00:00:00Z');
    assert.equal(m.updatedAt, '2026-09-09T00:00:00Z');
  });
});

describe('buildFaqModel: ordering and sub-topics', () => {
  const raw = [
    faq('b1', 'Set up bins', 'bin-day'),
    faq('b2', 'Find my council', 'bin-day'),
    faq('b3', 'No notifications', 'bin-day'),
  ];

  test('follows the layout order, and builds sub-topics from it', () => {
    const s = buildFaqModel(raw, config).sections[0];
    assert.deepEqual(s.entries.map((e) => e.id), ['b2', 'b1', 'b3']);
    assert.deepEqual(s.topics.map((t) => t.label), ['Setting up', 'Notifications']);
    assert.deepEqual(s.topics[0].entries.map((e) => e.id), ['b2', 'b1']);
    assert.equal(s.topics[0].id, 'topic-setting-up');
  });

  test('a section whose layout has no sub-topics is a flat list', () => {
    const flat = { ...config, layout: { bins: [{ topic: null, ids: ['b1', 'b2'] }] } };
    const s = buildFaqModel(raw.slice(0, 2), flat).sections[0];
    assert.deepEqual(s.topics, []);
    assert.deepEqual(s.entries.map((e) => e.id), ['b1', 'b2']);
  });

  test('an answer added later goes after the listed ones, under "More questions"', () => {
    const s = buildFaqModel([...raw, faq('b9', 'Brand new question', 'bin-day')], config).sections[0];
    assert.equal(s.entries.at(-1).id, 'b9');
    assert.equal(s.topics.at(-1).label, 'More questions');
  });

  test('an answer added later that has an editor topic joins that sub-topic', () => {
    const s = buildFaqModel([...raw, faq('b9', 'Brand new question', 'bin-day', 'a', { topic: 'Notifications' })], config).sections[0];
    const notifications = s.topics.find((t) => t.label === 'Notifications');
    assert.deepEqual(notifications.entries.map((e) => e.id), ['b3', 'b9']);
    assert.ok(!s.topics.some((t) => t.label === 'More questions'));
  });

  test('an editor topic overrides the layout', () => {
    const s = buildFaqModel([faq('b1', 'Set up bins', 'bin-day', 'a', { topic: 'Sharing' }), faq('b2', 'Find my council', 'bin-day')], config).sections[0];
    assert.equal(s.entries.find((e) => e.id === 'b1').topic, 'Sharing');
  });

  test('unlisted answers are ordered by the Studio order field, then creation date', () => {
    const noLayout = { ...config, layout: {} };
    const s = buildFaqModel(
      [faq('b1', 'Third', 'bin-day', 'a', { order: 5 }), faq('b2', 'First', 'bin-day', 'a', { order: 1 }), faq('b3', 'Second', 'bin-day', 'a', { order: 2 })],
      noLayout,
    ).sections[0];
    assert.deepEqual(s.entries.map((e) => e.question), ['First', 'Second', 'Third']);
  });
});

describe('buildFaqModel: which answers are shown', () => {
  test('drops entries with no question or an empty answer', () => {
    const m = buildFaqModel(
      [faq('b1', '', 'bin-day'), faq('b2', 'Empty', 'bin-day', ''), faq('b3', 'Blank', 'bin-day', '   '), faq('b4', 'Fine', 'bin-day')],
      config,
    );
    assert.deepEqual(m.entries.map((e) => e.question), ['Fine']);
  });

  test('drops "coming soon" placeholders', () => {
    for (const stub of ['Tutorial coming soon', 'Coming soon.', 'TBC']) assert.ok(isPlaceholderAnswer(stub), stub);
    assert.ok(!isPlaceholderAnswer('Coming soon to your area: check the app for dates.'));
    const m = buildFaqModel([faq('b1', 'Receipts', 'bin-day', 'Tutorial coming soon'), faq('b2', 'Real', 'bin-day', 'A real answer.')], config);
    assert.deepEqual(m.entries.map((e) => e.question), ['Real']);
  });

  test('keeps an answer that is only a video, with a preview and its video url', () => {
    const video = { _type: 'youtube', url: 'https://www.youtube.com/watch?v=20x-6ifhllQ' };
    const m = buildFaqModel([{ ...faq('g1', 'How to set up 2-step verification?', 'general'), answer: [video] }], config);
    assert.equal(m.entries.length, 1);
    assert.deepEqual(m.entries[0].videoUrls, ['https://www.youtube.com/watch?v=20x-6ifhllQ']);
    assert.equal(m.entries[0].plain, '');
    assert.equal(m.entries[0].preview, 'Video walkthrough');
  });

  test('previews are one line, cut on a word boundary', () => {
    const long = 'word '.repeat(80);
    const e = buildFaqModel([faq('b1', 'Q', 'bin-day', long)], config).entries[0];
    assert.ok(e.preview.length <= 140);
    assert.ok(e.preview.endsWith('…'));
    assert.ok(!e.preview.includes('\n'));
  });

  test('popular questions come from `featured` answers when any exist, else from the defaults', () => {
    const base = [faq('b1', 'One', 'bin-day'), faq('g1', 'Two', 'general'), faq('b2', 'Three', 'bin-day')];
    assert.deepEqual(buildFaqModel(base, config).popular.map((e) => e.id), ['b1', 'g1']);
    const featured = base.map((f) => (f._id === 'b2' ? { ...f, featured: true } : f));
    assert.deepEqual(buildFaqModel(featured, config).popular.map((e) => e.id), ['b2']);
  });

  test('popular defaults that no longer exist are skipped', () => {
    const m = buildFaqModel([faq('b1', 'One', 'bin-day')], config);
    assert.deepEqual(m.popular.map((e) => e.id), ['b1']);
  });
});

describe('buildFaqModel: anchors', () => {
  test('derives a slug from the question', () => {
    const e = buildFaqModel([faq('b1', 'My budget doesn’t reset on the 1st. Can I change it?', 'bin-day')], config).entries[0];
    assert.equal(e.slug, 'my-budget-doesnt-reset-on-the-1st-can-i-change-it');
  });

  test('an editor slug locks the anchor', () => {
    const e = buildFaqModel([faq('b1', 'Reworded question', 'bin-day', 'a', { slug: 'original-question' })], config).entries[0];
    assert.equal(e.slug, 'original-question');
  });

  test('duplicate questions get distinct anchors, and the older one keeps the plain slug', () => {
    const older = faq('b1', 'Same?', 'bin-day', 'a', { _createdAt: '2026-01-01T00:00:00Z' });
    const newer = faq('b2', 'Same?', 'bin-day', 'a', { _createdAt: '2026-02-01T00:00:00Z' });
    for (const input of [[older, newer], [newer, older]]) {
      const bySlug = Object.fromEntries(buildFaqModel(input, config).entries.map((e) => [e.id, e.slug]));
      assert.equal(bySlug.b1, 'same');
      assert.equal(bySlug.b2, 'same-2');
    }
  });

  test('adding a question never changes an existing anchor', () => {
    const before = buildFaqModel([faq('b1', 'Same?', 'bin-day', 'a', { _createdAt: '2026-01-01T00:00:00Z' })], config).entries[0].slug;
    const after = buildFaqModel(
      [faq('b0', 'Same?', 'bin-day', 'a', { _createdAt: '2026-06-01T00:00:00Z' }), faq('b1', 'Same?', 'bin-day', 'a', { _createdAt: '2026-01-01T00:00:00Z' })],
      config,
    ).entries.find((e) => e.id === 'b1').slug;
    assert.equal(after, before);
  });

  test('a question with no usable characters falls back to an id-based anchor', () => {
    const e = buildFaqModel([faq('abc-123456', '???', 'bin-day')], config).entries[0];
    assert.equal(e.slug, 'q-123456');
  });
});

describe('slugify', () => {
  test('lowercases, drops apostrophes and quotes, collapses punctuation', () => {
    assert.equal(slugify('What’s the "barcode" for?'), 'whats-the-barcode-for');
    assert.equal(slugify('Splitting Items (The "Divide & Conquer" Pro Feature)'), 'splitting-items-the-divide-and-conquer-pro-feature');
  });
  test('removes accents', () => assert.equal(slugify('Café receipts'), 'cafe-receipts'));
  test('is capped at 80 characters without a trailing dash', () => {
    const s = slugify('word '.repeat(40));
    assert.ok(s.length <= 80);
    assert.ok(!s.endsWith('-'));
  });
  test('returns an empty string when nothing usable is left', () => assert.equal(slugify('?!'), ''));
});

describe('portableTextToPlain', () => {
  test('puts paragraphs and list items on separate lines, and ignores media', () => {
    const blocks = [
      text('First paragraph.'),
      text('Item one', { listItem: 'bullet', level: 1 }),
      text('Item two', { listItem: 'bullet', level: 1 }),
      { _type: 'youtube', url: 'https://youtu.be/20x-6ifhllQ' },
    ];
    assert.equal(portableTextToPlain(blocks), 'First paragraph.\nItem one\nItem two');
  });
  test('flattens tables into rows', () => {
    const table = { _type: 'simpleTable', rows: [{ cells: ['', 'Free', 'Pro'] }, { cells: ['Receipts per month', '10', 'Unlimited'] }] };
    assert.equal(portableTextToPlain([table]), 'Free: Pro\nReceipts per month: 10: Unlimited');
  });
  test('tolerates junk', () => {
    assert.equal(portableTextToPlain(null), '');
    assert.equal(portableTextToPlain([null, { _type: 'block' }, { _type: 'block', children: [{ text: 5 }] }]), '');
  });
});
