import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHomePage } from '../../src/lib/home-page-normalize.ts';
import { homePageFallback } from '../../src/lib/home-page-fallback.ts';

const SANITY = 'https://cdn.sanity.io/images/0uvqbyjc/production/';

// What the GROQ query in home-page.ts returns for a page, built from a HomePage.
function toRaw(page) {
  return {
    hero: { line1: page.hero.line1, line2: page.hero.line2, imageUrl: page.hero.image.url, imageAlt: page.hero.image.alt },
    sections: page.sections.map((s) =>
      s.kind === 'carousel'
        ? {
            kind: 'carousel', id: s.id, eyebrow: s.eyebrow, heading: s.heading, intro: s.intro,
            footnotes: s.footnotes,
            cards: s.cards.map((c) => ({ title: c.title, description: c.description, imageUrl: c.image.url, imageAlt: c.image.alt })),
          }
        : { kind: 'image', id: s.id, eyebrow: s.eyebrow, heading: s.heading, intro: s.intro, imageUrl: s.image.url, imageAlt: s.image.alt },
    ),
  };
}

const goodCard = (n = 1) => ({ title: `Card ${n}`, description: `About card ${n}`, imageUrl: `${SANITY}card${n}-400x820.webp`, imageAlt: null });
const goodCarousel = (id = 'pets') => ({ kind: 'carousel', id, eyebrow: 'Pets', heading: 'Heading', intro: 'Intro', footnotes: null, cards: [goodCard()] });
const goodImage = (id = 'security') => ({ kind: 'image', id, eyebrow: 'Security', heading: 'Heading', intro: 'Intro', imageUrl: `${SANITY}sec-800x600.webp`, imageAlt: 'A lock' });
const goodRaw = (sections = [goodCarousel(), goodImage()]) => ({
  hero: { line1: 'Line one', line2: 'line two', imageUrl: `${SANITY}hero-2000x1000.webp`, imageAlt: null },
  sections,
});

describe('the built-in copy', () => {
  test('is a valid page that survives normalisation unchanged', () => {
    assert.deepEqual(normalizeHomePage(toRaw(homePageFallback)), homePageFallback);
  });

  test('has the nine sections the site always had, in order', () => {
    assert.deepEqual(
      homePageFallback.sections.map((s) => s.id),
      ['welcome-home', 'birthdays', 'bin-day', 'personalisation', 'pets', 'receipts', 'budget', 'security', 'values'],
    );
  });
});

describe('a page published in Sanity', () => {
  test('is accepted, with image alt text defaulting to the card title / heading', () => {
    const page = normalizeHomePage(goodRaw());
    assert.ok(page);
    assert.equal(page.sections.length, 2);
    assert.equal(page.sections[0].cards[0].image.alt, 'Card 1');
    assert.equal(page.sections[1].image.alt, 'A lock');
    assert.deepEqual(page.sections[0].footnotes, []);
    assert.equal(page.hero.image.alt, 'Cuppi');
  });

  test('keeps footnotes and trims whitespace', () => {
    const raw = goodRaw([{ ...goodCarousel(), heading: '  Spaced  ', footnotes: ['*One', '  ', '**Two '] }]);
    const [section] = normalizeHomePage(raw).sections;
    assert.equal(section.heading, 'Spaced');
    assert.deepEqual(section.footnotes, ['*One', '**Two']);
  });
});

describe('a half-finished or hostile page', () => {
  const sectionsOf = (raw) => normalizeHomePage(raw)?.sections.map((s) => s.id);

  test('images from other hosts are dropped, not rendered', () => {
    const evil = { ...goodCard(2), imageUrl: 'https://evil.example/x.png' };
    const raw = goodRaw([{ ...goodCarousel(), cards: [goodCard(1), evil] }, { ...goodImage(), imageUrl: 'https://evil.example/y.png' }]);
    const page = normalizeHomePage(raw);
    assert.equal(page.sections.length, 1);
    assert.equal(page.sections[0].cards.length, 1);
  });

  test('another Sanity project\'s images are rejected', () => {
    const raw = goodRaw([{ ...goodImage(), imageUrl: 'https://cdn.sanity.io/images/someoneelse/production/x.webp' }, goodCarousel()]);
    assert.deepEqual(sectionsOf(raw), ['pets']);
  });

  test('cards missing a title, text or image are dropped; a carousel with none left is dropped', () => {
    const half = [{ ...goodCard(1), title: '' }, { ...goodCard(2), description: null }, { ...goodCard(3), imageUrl: null }];
    assert.deepEqual(sectionsOf(goodRaw([{ ...goodCarousel('a'), cards: half }, goodImage('b')])), ['b']);
  });

  test('anchors must be plain lowercase words, and duplicates are dropped', () => {
    const raw = goodRaw([
      goodImage('Bad Anchor'),
      goodImage('x" onmouseover="alert(1)'),
      goodImage('ok-one'),
      goodImage('ok-one'),
      goodImage(null),
    ]);
    assert.deepEqual(sectionsOf(raw), ['ok-one']);
  });

  test('unknown section types and sections missing text are dropped', () => {
    const raw = goodRaw([{ ...goodImage('a'), kind: 'banner' }, { ...goodImage('b'), heading: '' }, { ...goodImage('c'), intro: null }, goodImage('d')]);
    assert.deepEqual(sectionsOf(raw), ['d']);
  });

  test('no usable hero, or no usable sections, means "use the built-in copy"', () => {
    assert.equal(normalizeHomePage(null), null);
    assert.equal(normalizeHomePage({}), null);
    assert.equal(normalizeHomePage({ ...goodRaw(), hero: { ...goodRaw().hero, line1: '' } }), null);
    assert.equal(normalizeHomePage({ ...goodRaw(), hero: { ...goodRaw().hero, imageUrl: null } }), null);
    assert.equal(normalizeHomePage(goodRaw([])), null);
    assert.equal(normalizeHomePage(goodRaw([{ ...goodImage(), imageUrl: 'https://evil.example/x.png' }])), null);
    assert.equal(normalizeHomePage({ hero: goodRaw().hero, sections: 'nope' }), null);
  });
});
