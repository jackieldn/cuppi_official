// Builds a Sanity import file containing the "Home page" document, from the
// content the site shows today (src/lib/home-page-fallback.ts).
//
//   node --experimental-transform-types --no-warnings scripts/home-page-seed.mjs home-page.ndjson
//
// Then, from the Studio folder (needs `sanity login`):
//
//   npx sanity dataset import path/to/home-page.ndjson production --missing
//
// --missing means an existing "homePage" document is left alone, so running
// the import again can never overwrite edits made in the Studio. Sanity
// downloads each image from the URL and stores it in the dataset.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { homePageFallback } from '../src/lib/home-page-fallback.ts';

/** The "homePage" document as Sanity should store it, for a given HomePage. */
export function buildHomePageDocument(page) {
  // Sanity needs a unique _key on every array item.
  let counter = 0;
  const key = (prefix) => `${prefix}${String(++counter).padStart(3, '0')}`;

  const image = (img, withAlt = true) => ({
    _type: 'image',
    _sanityAsset: `image@${img.url}`,
    ...(withAlt ? { alt: img.alt } : {}),
  });

  return {
    _id: 'homePage',
    _type: 'homePage',
    hero: {
      line1: page.hero.line1,
      line2: page.hero.line2,
      image: image(page.hero.image),
    },
    sections: page.sections.map((s) => {
      const common = {
        _key: key('sec'),
        anchor: { _type: 'slug', current: s.id },
        eyebrow: s.eyebrow,
        heading: s.heading,
        intro: s.intro,
      };
      if (s.kind === 'carousel') {
        return {
          ...common,
          _type: 'carouselSection',
          cards: s.cards.map((c) => ({
            _key: key('card'),
            _type: 'featureCard',
            title: c.title,
            description: c.description,
            // Card alt text defaults to the title on the site, so leave it unset.
            image: image(c.image, false),
          })),
          footnotes: s.footnotes,
        };
      }
      return { ...common, _type: 'imageSection', image: image(s.image) };
    }),
  };
}

// Run directly (not imported by a test): write the import file.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = process.argv[2];
  if (!out) {
    console.error('Usage: node scripts/home-page-seed.mjs <output.ndjson>');
    process.exit(1);
  }
  const doc = buildHomePageDocument(homePageFallback);
  writeFileSync(out, `${JSON.stringify(doc)}\n`);
  const images = 1 + doc.sections.reduce((n, s) => n + (s._type === 'carouselSection' ? s.cards.length : 1), 0);
  console.log(`Wrote ${out}: 1 document, ${doc.sections.length} sections, ${images} images to import.`);
}
