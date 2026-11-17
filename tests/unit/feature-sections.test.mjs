import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  SECTION_TEMPLATES,
  SECTION_LIMITS,
  blockUrls,
  copySection,
  mapBlockUrls,
  newSection,
  planCell,
  readContentIds,
  resolveBlocks,
  sectionSummary,
  validateSections,
} from '../../src/lib/feature-sections.ts';
import { readOverride, validateFeatures } from '../../src/lib/features-types.ts';
import { contentIds, NO_CONTENT, pick } from '../../src/lib/feature-content-types.ts';
import { safeVideoUrl, videoKind } from '../../src/lib/safe-urls.ts';

const STORAGE = 'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/';
const img = (extra = {}) => ({ url: `${STORAGE}o/a.png?alt=media`, alt: 'A phone', ...extra });

describe('safeVideoUrl', () => {
  test('tidies every YouTube shape to the watch address', () => {
    for (const link of ['https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://youtube.com/embed/dQw4w9WgXcQ?x=1']) {
      assert.equal(safeVideoUrl(link), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      assert.equal(videoKind(link), 'youtube');
    }
  });
  test('allows https files and this site, nothing else', () => {
    assert.equal(videoKind(`${STORAGE}o/v.mp4?alt=media`), 'file');
    assert.equal(videoKind('https://example.com/v.mp4'), 'file');
    assert.equal(safeVideoUrl('/videos/a.mp4'), '/videos/a.mp4');
    for (const bad of ['http://example.com/v.mp4', 'javascript:alert(1)', '//evil.com/v.mp4', 'data:video/mp4;base64,AAA', 'not a url', '', 5, null, 'https://x.com/a b.mp4']) {
      assert.equal(safeVideoUrl(bad), undefined, String(bad));
    }
  });
});

describe('newSection', () => {
  test('every template has a blank section of its own type, with a unique id', () => {
    const ids = new Set();
    for (const t of SECTION_TEMPLATES) {
      const b = newSection(t.type);
      assert.equal(b.type, t.type);
      ids.add(b.id);
    }
    assert.equal(ids.size, SECTION_TEMPLATES.length);
  });
  test('a blank section is not ready to save, and says what is missing', () => {
    for (const t of SECTION_TEMPLATES) {
      const problems = validateSections([newSection(t.type)]);
      if (t.type === 'banner' || t.type === 'video') assert.ok(problems.length > 0, t.type);
    }
    assert.match(validateSections([newSection('video')])[0], /^Section 1 \(Video\): add a video link/);
    assert.match(validateSections([newSection('showcase')]).join(' '), /heading/);
  });
  test('copySection gives a fresh id and does not share its insides', () => {
    const a = newSection('tabs', 'a');
    const b = copySection(a);
    assert.notEqual(b.id, 'a');
    b.items[0].title = 'changed';
    assert.equal(a.items[0].title, '');
  });
});

describe('resolveBlocks', () => {
  test('anything that is not a list gives no sections', () => {
    for (const bad of [undefined, null, 'x', 5, {}]) assert.deepEqual(resolveBlocks(bad), []);
  });

  test('keeps good sections of every template, in order', () => {
    const stored = [
      { id: 'a', type: 'showcase', title: 'T', body: 'B', image: img(), side: 'right', tint: 'sky', eyebrow: 'Chip' },
      { id: 'b', type: 'tabs', title: 'Tabs', items: [{ title: 'One', body: 'x', image: img({ fit: 'contain' }) }], side: 'right', tint: 'lake' },
      { id: 'c', type: 'banner', title: 'Big', image: img({ fit: 'photo' }), tint: 'moss' },
      { id: 'd', type: 'video', title: 'Watch', layout: 'split', side: 'right', tint: 'clay', video: { url: 'https://youtu.be/dQw4w9WgXcQ', aspect: '9:16', label: 'Setup' } },
      { id: 'e', type: 'cards', title: 'Cards', cards: [{ title: 'c', body: 'b', image: img() }], footnotes: ['* note'] },
      { id: 'f', type: 'callout', title: 'Hello', tint: 'honey' },
      { id: 'g', type: 'points', items: [{ title: 'p', body: 'q' }] },
      { id: 'h', type: 'plans', title: 'Free or Pro', intro: 'Pick what fits', rows: [{ label: 'Receipts', free: '10 a month', pro: 'Unlimited' }], tint: 'sky' },
    ];
    const out = resolveBlocks(stored);
    assert.deepEqual(out.map((b) => b.type), ['showcase', 'tabs', 'banner', 'video', 'cards', 'callout', 'points', 'plans']);
    assert.equal(out[1].items[0].image.fit, 'contain');
    assert.equal(out[3].video.aspect, '9:16');
    assert.equal(out[3].video.url, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(out[3].side, 'right');
    assert.deepEqual(out[4].footnotes, ['* note']);
  });

  test('drops what cannot be drawn, and only that', () => {
    const out = resolveBlocks([
      { id: 'a', type: 'unknown', title: 'x' },
      'rubbish',
      { id: 'b', type: 'showcase', title: 'No picture', body: '', image: { url: 'https://evil.example/a.png' }, side: 'left', tint: 'honey' },
      { id: 'c', type: 'video', video: { url: 'http://insecure/v.mp4' } },
      { id: 'd', type: 'tabs', items: [] },
      { id: 'e', type: 'callout', title: 'Kept', tint: 'honey' },
    ]);
    assert.deepEqual(out.map((b) => b.id), ['e']);
  });

  test('a bad item costs only itself', () => {
    const [cards] = resolveBlocks([{ id: 'a', type: 'cards', title: 'T', cards: [{ title: 'ok', body: '', image: img() }, { title: 'no image', image: { url: 'x' } }, { title: '', image: img() }] }]);
    assert.equal(cards.cards.length, 1);
  });

  test('bad fields fall back to the defaults', () => {
    const [v] = resolveBlocks([{ id: 'a', type: 'video', layout: 'sideways', side: 'up', tint: 'neon', video: { url: 'https://example.com/v.mp4', aspect: '4:3', poster: 'https://evil.example/p.png' } }]);
    assert.equal(v.layout, 'full');
    assert.equal(v.side, 'left');
    assert.equal(v.tint, 'honey');
    assert.equal(v.video.aspect, '16:9');
    assert.equal(v.video.poster, undefined);
  });

  test('ids are made unique and limits are enforced', () => {
    const out = resolveBlocks([{ id: 'same', type: 'callout', title: 'a', tint: 'honey' }, { id: 'same', type: 'callout', title: 'b', tint: 'honey' }, { type: 'callout', title: 'c', tint: 'honey' }]);
    assert.equal(new Set(out.map((b) => b.id)).size, 3);
    const many = Array.from({ length: 50 }, (_, i) => ({ id: `s${i}`, type: 'callout', title: 'x', tint: 'honey' }));
    assert.equal(resolveBlocks(many).length, SECTION_LIMITS.sections);
    const items = Array.from({ length: 20 }, (_, i) => ({ title: `p${i}`, body: '' }));
    assert.equal(resolveBlocks([{ id: 'p', type: 'points', items }])[0].items.length, SECTION_LIMITS.items);
  });

  test('readOverride reads blocks through it', () => {
    const o = readOverride('x', { blocks: [{ id: 'a', type: 'callout', title: 'Hi', tint: 'moss' }, { type: 'nope' }] });
    assert.equal(o.blocks.length, 1);
    assert.equal(readOverride('x', { name: 'N' }).blocks, undefined);
  });
});

describe('screenshots in phone frames', () => {
  const shot = (n) => ({ url: `${STORAGE}o/${n}.png?alt=media`, alt: n, width: 1170, height: 2532 });
  const read = (image) => resolveBlocks([{ id: 'a', type: 'showcase', title: 'T', body: '', side: 'left', tint: 'honey', image }])[0]?.image;

  test('a framed screenshot keeps its size, angle, mirror and background', () => {
    const i = read({ ...shot('a'), fit: 'frame', frame: 'tilt', flip: true, bg: '#D8EAF9' });
    assert.deepEqual([i.fit, i.frame, i.flip, i.bg, i.width, i.height], ['frame', 'tilt', true, '#D8EAF9', 1170, 2532]);
  });
  test('two phones keep both screenshots', () => {
    const i = read({ ...shot('a'), fit: 'frame', second: shot('b') });
    assert.equal(i.second.alt, 'b');
    assert.equal(i.frame, 'front', 'face forward unless told otherwise');
  });
  test('the two-phone arrangement is kept, and ignored without a second phone', () => {
    assert.equal(read({ ...shot('a'), fit: 'frame', second: shot('b'), arrange: 'level' }).arrange, 'level');
    assert.equal(read({ ...shot('a'), fit: 'frame', second: shot('b'), arrange: 'higher' }).arrange, 'higher');
    assert.equal(read({ ...shot('a'), fit: 'frame', second: shot('b'), arrange: 'lower' }).arrange, undefined, 'lower is the default');
    assert.equal(read({ ...shot('a'), fit: 'frame', second: shot('b'), arrange: 'sideways' }).arrange, undefined);
    assert.equal(read({ ...shot('a'), fit: 'frame', arrange: 'level' }).arrange, undefined);
  });
  test('each phone keeps its own view: top is the default, bottom is kept', () => {
    const i = read({ ...shot('a'), fit: 'frame', view: 'bottom', second: { ...shot('b'), view: 'top' } });
    assert.equal(i.view, 'bottom');
    assert.equal(i.second.view, undefined, 'top is the default');
    const j = read({ ...shot('a'), fit: 'frame', second: { ...shot('b'), view: 'bottom' } });
    assert.deepEqual([j.view, j.second.view], [undefined, 'bottom']);
    assert.equal(read({ ...shot('a'), fit: 'frame', view: 'middle' }).view, undefined);
    assert.equal(read({ ...shot('a'), fit: 'photo', view: 'bottom' }).view, undefined, 'phone frames only');
  });
  test('slide is kept for one framed phone only', () => {
    assert.equal(read({ ...shot('a'), fit: 'frame', slide: true }).slide, true);
    assert.equal(read({ ...shot('a'), fit: 'frame', slide: false }).slide, undefined);
    assert.equal(read({ ...shot('a'), fit: 'frame', slide: 'yes' }).slide, undefined);
    assert.equal(read({ ...shot('a'), fit: 'frame', slide: true, second: shot('b') }).slide, undefined, 'not with two phones');
    assert.equal(read({ ...shot('a'), fit: 'phone', slide: true }).slide, undefined, 'not on a ready-made phone');
  });
  test('bad values fall back: unsafe colour, odd sizes, a second shot that cannot be shown', () => {
    const i = read({ ...shot('a'), width: -5, height: 'tall', fit: 'frame', frame: 'sideways', bg: 'red; background:url(x)', second: { url: 'https://evil.example/x.png' } });
    assert.equal(i.bg, undefined);
    assert.equal(i.width, undefined);
    assert.equal(i.height, undefined);
    assert.equal(i.frame, 'front');
    assert.equal(i.second, undefined);
  });
  test('frame settings are ignored on other fits', () => {
    const i = read({ ...shot('a'), fit: 'photo', frame: 'tilt', second: shot('b'), bg: '#fff' });
    assert.deepEqual([i.fit, i.frame, i.second, i.bg], ['photo', undefined, undefined, undefined]);
  });
  test('new phone sections start as framed screenshots', () => {
    assert.equal(newSection('showcase').image.fit, 'frame');
    assert.equal(newSection('cards').cards[0].image.fit, 'frame');
    assert.equal(newSection('tabs').items[0].image.fit, 'frame');
  });
  test('the second screenshot is uploaded and validated like the first', () => {
    const b = { ...newSection('showcase', 'a'), title: 'T', image: { ...shot('a'), url: 'blob:1', fit: 'frame', second: { url: '', alt: '' } } };
    assert.match(validateSections([b])[0], /second phone/);
    const ready = { ...b, image: { ...b.image, second: { url: 'blob:2', alt: '' } } };
    assert.deepEqual(validateSections([ready]), []);
    assert.deepEqual(blockUrls([ready]), ['blob:1', 'blob:2']);
    assert.equal(mapBlockUrls([ready], (u) => `https://x/${u}`)[0].image.second.url, 'https://x/blob:2');
    // switching away from frames makes the leftover empty second phone irrelevant
    assert.deepEqual(validateSections([{ ...b, image: { ...b.image, fit: 'photo' } }]), []);
  });
});

describe('plans (Free and Pro table)', () => {
  const row = (label, free, pro) => ({ label, free, pro });

  test('keeps its title, description, lines and colour', () => {
    const [b] = resolveBlocks([{ id: 'a', type: 'plans', title: ' Free or Pro ', intro: 'Words', rows: [row('Bins', '1', '5'), row('Reminders', 'Yes', 'Yes')], tint: 'moss' }]);
    assert.equal(b.title, 'Free or Pro');
    assert.equal(b.intro, 'Words');
    assert.equal(b.tint, 'moss');
    assert.deepEqual(b.rows, [row('Bins', '1', '5'), row('Reminders', 'Yes', 'Yes')]);
  });

  test('needs a title and at least one named line; a nameless line costs only itself', () => {
    assert.deepEqual(resolveBlocks([{ id: 'a', type: 'plans', title: '', rows: [row('x', 'a', 'b')] }]), []);
    assert.deepEqual(resolveBlocks([{ id: 'a', type: 'plans', title: 'T', rows: [] }]), []);
    assert.deepEqual(resolveBlocks([{ id: 'a', type: 'plans', title: 'T', rows: 'nope' }]), []);
    const [b] = resolveBlocks([{ id: 'a', type: 'plans', title: 'T', rows: [row('', 'a', 'b'), 'junk', row('Kept', '', 'Yes')] }]);
    assert.deepEqual(b.rows, [row('Kept', '', 'Yes')]);
  });

  test('limits lines and cell length, and falls back to the default colour', () => {
    const rows = Array.from({ length: 40 }, (_, i) => row(`r${i}`, 'x'.repeat(500), 'y'));
    const [b] = resolveBlocks([{ id: 'a', type: 'plans', title: 'T', rows, tint: 'neon' }]);
    assert.equal(b.rows.length, SECTION_LIMITS.rows);
    assert.equal(b.rows[0].free.length, SECTION_LIMITS.cell);
    assert.equal(b.tint, 'honey');
  });

  test('planCell turns Yes and No words into a tick or a dash, and leaves other words alone', () => {
    for (const yes of ['Yes', ' yes ', 'YES', '✅', '✓']) assert.equal(planCell(yes).kind, 'yes', yes);
    for (const no of ['No', 'no', '-', '—', '❌', '', '   ']) assert.equal(planCell(no).kind, 'no', JSON.stringify(no));
    for (const words of ['No limit', 'Yes, with a family plan', '10 a month', 'Unlimited', 'Not now']) assert.equal(planCell(words).kind, 'text', words);
    assert.equal(planCell(' 10 a month ').text, '10 a month');
  });

  test('a blank one is not ready to save, and every empty cell is named', () => {
    const problems = validateSections([newSection('plans')]);
    assert.ok(problems.every((p) => p.startsWith('Section 1 (Free and Pro)')));
    assert.match(problems.join(' '), /add a title/);
    assert.match(problems.join(' '), /line 1 needs a name/);
    assert.match(problems.join(' '), /line 1 needs something under Free/);
    assert.match(problems.join(' '), /line 1 needs something under Pro/);
    assert.deepEqual(validateSections([{ ...newSection('plans'), title: 'T', rows: [row('Bins', 'No', 'Yes')] }]), []);
  });

  test('disclaimer tags are checked in the title, description and every cell', () => {
    const b = { ...newSection('plans'), title: 'T{i:nope}', rows: [row('A', 'Yes', 'Yes')] };
    assert.match(validateSections([b], ['health']).join(' '), /no disclaimer called "nope"/);
    assert.deepEqual(validateSections([{ ...b, title: 'T{i:health}' }], ['health']), []);
    const inCell = { ...b, title: 'T', rows: [row('A', 'Yes', 'Fast{i:gone}')] };
    assert.match(validateSections([inCell], ['health']).join(' '), /no disclaimer called "gone"/);
  });

  test('has a summary and a copy of its own', () => {
    const b = { ...newSection('plans', 'a'), title: 'Free or Pro', rows: [row('A', 'Yes', 'Yes')] };
    assert.equal(sectionSummary(b), 'Free or Pro');
    assert.equal(sectionSummary(newSection('plans')), '1 line');
    const c = copySection(b);
    c.rows[0].label = 'changed';
    assert.equal(b.rows[0].label, 'A');
  });
});

describe('articles and FAQs (picked from Sanity)', () => {
  const A = '077a60cd-d933-4051-a55e-c7c55e7a1a36';
  const B = '086bf167-824b-4db9-8cc1-b07ba864134e';
  const F = '006ac3ad-56dc-4328-94dd-cbf3e52f17ff';

  test('both are templates, and a new one has a heading but no picks yet', () => {
    for (const type of ['articles', 'faqs']) {
      assert.ok(SECTION_TEMPLATES.some((t) => t.type === type), type);
      const b = newSection(type);
      assert.equal(b.type, type);
      assert.ok(b.title.trim(), `${type} starts with a heading`);
      assert.deepEqual(b.ids, []);
    }
    assert.match(validateSections([newSection('articles')]).join(' '), /Section 1 \(Articles\): choose at least one article/);
    assert.match(validateSections([newSection('faqs')]).join(' '), /Section 1 \(FAQs\): choose at least one question/);
  });

  test('keeps the heading, words, colour and picks in order', () => {
    const out = resolveBlocks([
      { id: 'a', type: 'articles', title: ' Read more ', intro: 'Words', ids: [B, A], tint: 'sky' },
      { id: 'f', type: 'faqs', title: 'Good to know', ids: [F], tint: 'lake' },
    ]);
    assert.deepEqual(out.map((b) => b.type), ['articles', 'faqs']);
    assert.equal(out[0].title, 'Read more');
    assert.equal(out[0].intro, 'Words');
    assert.deepEqual(out[0].ids, [B, A]);
    assert.equal(out[0].tint, 'sky');
    assert.equal(out[1].intro, undefined);
    assert.equal(out[1].tint, 'lake');
  });

  test('needs a heading and at least one usable pick, else the section is dropped', () => {
    for (const type of ['articles', 'faqs']) {
      assert.deepEqual(resolveBlocks([{ id: 'a', type, title: '', ids: [A], tint: 'honey' }]), [], 'no heading');
      assert.deepEqual(resolveBlocks([{ id: 'a', type, title: 'T', ids: [], tint: 'honey' }]), [], 'no picks');
      assert.deepEqual(resolveBlocks([{ id: 'a', type, title: 'T', ids: 'nope', tint: 'honey' }]), [], 'picks not a list');
      assert.deepEqual(resolveBlocks([{ id: 'a', type, title: 'T', ids: [5, null, '', 'has space', '<script>'], tint: 'honey' }]), [], 'nothing usable');
    }
  });

  test('readContentIds keeps usable ids once each, in order, up to the limit', () => {
    assert.deepEqual(readContentIds([A, ' ' + B + ' ', A, 7, 'bad id', '', 'x'.repeat(101)], 10), [A, B]);
    assert.deepEqual(readContentIds([A, B, F], 2), [A, B]);
    for (const bad of [undefined, null, 'x', 5, {}]) assert.deepEqual(readContentIds(bad, 5), []);
  });

  test('limits the picks per section, and falls back to the default colour', () => {
    const many = Array.from({ length: 30 }, (_, i) => `id-${i}`);
    const [a, f] = resolveBlocks([
      { id: 'a', type: 'articles', title: 'T', ids: many, tint: 'neon' },
      { id: 'f', type: 'faqs', title: 'T', ids: many, tint: 'neon' },
    ]);
    assert.equal(a.ids.length, SECTION_LIMITS.articles);
    assert.equal(f.ids.length, SECTION_LIMITS.faqs);
    assert.equal(a.tint, 'honey');
  });

  test('is read back through readOverride, so it survives the database', () => {
    const o = readOverride('x', { blocks: [{ id: 'a', type: 'faqs', title: 'Hi', ids: [F], tint: 'moss' }, { type: 'faqs', title: 'No picks', ids: [] }] });
    assert.equal(o.blocks.length, 1);
    assert.deepEqual(o.blocks[0].ids, [F]);
  });

  test('disclaimer tags are checked in the heading and the words under it', () => {
    const b = { ...newSection('faqs'), ids: [F], title: 'Pets{i:nope}' };
    assert.match(validateSections([b], ['health']).join(' '), /no disclaimer called "nope"/);
    assert.deepEqual(validateSections([{ ...b, title: 'Pets{i:health}' }], ['health']), []);
    assert.deepEqual(validateSections([{ ...newSection('articles'), ids: [A] }], []), []);
  });

  test('has a summary, a copy of its own, and no pictures to upload', () => {
    const b = { ...newSection('articles', 'a'), ids: [A, B] };
    assert.equal(sectionSummary(b), 'From The Cosy Corner');
    assert.equal(sectionSummary({ ...b, title: '' }), '2 articles');
    assert.equal(sectionSummary({ ...newSection('faqs'), title: '', ids: [F] }), '1 question');
    const c = copySection(b);
    c.ids.push('more');
    assert.deepEqual(b.ids, [A, B]);
    assert.deepEqual(blockUrls([b, newSection('faqs')]), []);
  });

  test('validateFeatures flags a section with nothing picked', () => {
    const feature = { slug: 'x', name: 'X', tagline: '', icon: 'star', tint: 'honey', group: 'home', status: 'live', order: 1, tile: 'amber', hero: { headline: 'H', intro: '', image: { url: 'https://a/b.png', alt: '' } }, blocks: [newSection('articles', 'a'), newSection('faqs', 'f')] };
    const problems = validateFeatures([feature]);
    assert.ok(problems.some((p) => /articles block "a" has no articles/.test(p)));
    assert.ok(problems.some((p) => /faqs block "f" has no questions/.test(p)));
  });

  test('contentIds gathers every id a page points at, once, for a single lookup', () => {
    const blocks = [
      { ...newSection('articles', 'a1'), ids: [A, B] },
      { ...newSection('callout', 'c'), title: 'x' },
      { ...newSection('articles', 'a2'), ids: [B] },
      { ...newSection('faqs', 'f'), ids: [F] },
    ];
    assert.deepEqual(contentIds(blocks), { articles: [A, B], faqs: [F] });
    assert.deepEqual(contentIds([]), { articles: [], faqs: [] });
    assert.deepEqual(contentIds(undefined), { articles: [], faqs: [] });
  });

  test('pick returns what exists in the section order, and skips what was deleted', () => {
    const byId = { a: { n: 1 }, b: { n: 2 }, c: { n: 3 } };
    assert.deepEqual(pick(['c', 'gone', 'a'], byId), [{ n: 3 }, { n: 1 }]);
    assert.deepEqual(pick(['x'], byId), []);
    assert.deepEqual(pick(['a'], undefined), []);
    assert.deepEqual(pick(['toString', '__proto__'], byId), [], 'inherited names are not content');
    assert.deepEqual(pick(['a'], NO_CONTENT.articles), []);
  });
});

describe('validateSections', () => {
  test('a finished page has no problems', () => {
    const blocks = [
      { ...newSection('banner', 'a'), image: img({ fit: 'photo' }) },
      { ...newSection('video', 'b'), video: { url: 'https://youtu.be/dQw4w9WgXcQ', aspect: '9:16' } },
      { ...newSection('video', 'c'), video: { url: 'blob:http://localhost/123', aspect: '16:9' } },
    ];
    assert.deepEqual(validateSections(blocks), []);
  });
  test('rejects a video link that would not play, and numbers the sections', () => {
    const blocks = [newSection('callout'), { ...newSection('video'), video: { url: 'http://nope', aspect: '16:9' } }];
    const problems = validateSections(blocks);
    assert.ok(problems.some((p) => p.startsWith('Section 1 (Big sentence)')));
    assert.ok(problems.some((p) => p.startsWith('Section 2 (Video)') && /YouTube link/.test(p)));
  });
});

describe('uploads', () => {
  const blocks = [
    { ...newSection('showcase', 'a'), image: img() },
    { ...newSection('tabs', 'b'), items: [{ title: 'x', body: '', image: { url: 'blob:1', alt: '' } }, { title: 'y', body: '', image: { url: 'blob:2', alt: '' } }] },
    { ...newSection('video', 'c'), video: { url: 'blob:3', aspect: '9:16', poster: 'blob:4' } },
    { ...newSection('callout', 'd'), title: 'Hi' },
  ];
  test('blockUrls lists every picture, poster and video', () => {
    assert.deepEqual(blockUrls(blocks).filter((u) => u.startsWith('blob:')), ['blob:1', 'blob:2', 'blob:3', 'blob:4']);
  });
  test('mapBlockUrls swaps them without touching the original', () => {
    const out = mapBlockUrls(blocks, (u) => (u.startsWith('blob:') ? `https://x/${u.slice(5)}` : u));
    assert.deepEqual(blockUrls(out).filter((u) => u.includes('x/')), ['https://x/1', 'https://x/2', 'https://x/3', 'https://x/4']);
    assert.equal(blocks[2].video.url, 'blob:3');
    assert.equal(out[3].title, 'Hi');
  });
  test('an empty address stays empty', () => {
    const out = mapBlockUrls([newSection('banner', 'a')], () => 'SHOULD NOT BE CALLED');
    assert.equal(out[0].image.url, '');
  });
});

test('sectionSummary says something for every template', () => {
  for (const t of SECTION_TEMPLATES) assert.equal(typeof sectionSummary(newSection(t.type)), 'string');
  assert.equal(sectionSummary({ ...newSection('video'), video: { url: 'x', aspect: '9:16' } }), 'Phone-shaped video');
});
