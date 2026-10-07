import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHomePageDocument } from '../../scripts/home-page-seed.mjs';
import { homePageFallback } from '../../src/lib/home-page-fallback.ts';
import { normalizeHomePage } from '../../src/lib/home-page-normalize.ts';

const doc = buildHomePageDocument(homePageFallback);
const assetUrl = (img) => img._sanityAsset.replace(/^image@/, '');

// What the GROQ query in src/lib/home-page.ts would return for this document.
function groq(d) {
  return {
    hero: { line1: d.hero.line1, line2: d.hero.line2, imageUrl: assetUrl(d.hero.image), imageAlt: d.hero.image.alt ?? null },
    sections: d.sections.map((s) => ({
      kind: s._type === 'carouselSection' ? 'carousel' : s._type === 'imageSection' ? 'image' : null,
      id: s.anchor.current,
      eyebrow: s.eyebrow,
      heading: s.heading,
      intro: s.intro,
      footnotes: s.footnotes ?? null,
      cards: s.cards?.map((c) => ({ title: c.title, description: c.description, imageUrl: assetUrl(c.image), imageAlt: c.image.alt ?? null })) ?? null,
      imageUrl: s.image ? assetUrl(s.image) : null,
      imageAlt: s.image?.alt ?? null,
    })),
  };
}

test('the seed document, read back through the site\'s query shape, is exactly today\'s page', () => {
  assert.deepEqual(normalizeHomePage(groq(doc)), homePageFallback);
});

test('uses the type and field names the Studio schema defines', () => {
  assert.equal(doc._type, 'homePage');
  assert.equal(doc._id, 'homePage');
  for (const s of doc.sections) {
    assert.ok(['carouselSection', 'imageSection'].includes(s._type), s._type);
    assert.equal(s.anchor._type, 'slug');
    for (const c of s.cards ?? []) assert.equal(c._type, 'featureCard');
  }
});

test('every array item has a unique _key', () => {
  const keys = [];
  for (const s of doc.sections) {
    keys.push(s._key);
    for (const c of s.cards ?? []) keys.push(c._key);
  }
  assert.ok(keys.every(Boolean));
  assert.equal(new Set(keys).size, keys.length);
});

test('every image is imported from an https URL', () => {
  const images = [doc.hero.image, ...doc.sections.flatMap((s) => (s.cards ? s.cards.map((c) => c.image) : [s.image]))];
  assert.equal(images.length, 23);
  for (const img of images) {
    assert.equal(img._type, 'image');
    assert.match(img._sanityAsset, /^image@https:\/\//);
  }
});
