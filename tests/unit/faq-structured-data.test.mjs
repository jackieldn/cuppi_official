import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildSectionJsonLd, buildHubJsonLd, serializeJsonLd } from '../../src/lib/faq-jsonld.ts';

const entry = (over = {}) => ({
  id: 'e1', slug: 'how-do-i-approve-a-budget', question: 'How do I approve a Budget?', answer: [], plain: 'Open Budgets.\nTap Approve.',
  preview: 'Open Budgets.', videoUrls: [], sectionId: 'budget', topic: null, updatedAt: '2026-05-01T00:00:00Z', ...over,
});
const section = (entries = [entry()]) => ({ id: 'budget', label: 'Budget', blurb: 'b', group: 'Features', entries, topics: [], updatedAt: '2026-05-01T00:00:00Z' });
const ORIGIN = 'https://cuppi.co.uk';

describe('section structured data', () => {
  const ld = buildSectionJsonLd(section(), ORIGIN);
  const [crumbs, page] = ld['@graph'];

  test('has a breadcrumb trail ending on the current page, with no link on the last item', () => {
    assert.equal(crumbs['@type'], 'BreadcrumbList');
    assert.deepEqual(crumbs.itemListElement.map((i) => i.name), ['Cuppi', 'FAQ', 'Budget']);
    assert.equal(crumbs.itemListElement[1].item, 'https://cuppi.co.uk/faq');
    assert.equal(crumbs.itemListElement[2].item, undefined);
  });

  test('lists every question with its answer text and a per-question id', () => {
    assert.equal(page['@type'], 'FAQPage');
    assert.equal(page.url, 'https://cuppi.co.uk/faq/budget');
    assert.equal(page.mainEntity.length, 1);
    const q = page.mainEntity[0];
    assert.equal(q['@type'], 'Question');
    assert.equal(q.name, 'How do I approve a Budget?');
    assert.equal(q.acceptedAnswer.text, 'Open Budgets.\nTap Approve.');
    assert.equal(q['@id'], 'https://cuppi.co.uk/faq/budget#how-do-i-approve-a-budget');
  });

  test('a video-only answer still has non-empty answer text', () => {
    const v = entry({ plain: '', videoUrls: ['https://www.youtube.com/watch?v=20x-6ifhllQ'] });
    const text = buildSectionJsonLd(section([v]), ORIGIN)['@graph'][1].mainEntity[0].acceptedAnswer.text;
    assert.equal(text, 'Video walkthrough: https://www.youtube.com/watch?v=20x-6ifhllQ');
  });

  test('a text answer with a video keeps both', () => {
    const v = entry({ plain: 'Watch this.', videoUrls: ['https://youtu.be/20x-6ifhllQ'] });
    const text = buildSectionJsonLd(section([v]), ORIGIN)['@graph'][1].mainEntity[0].acceptedAnswer.text;
    assert.equal(text, 'Watch this.\nVideo walkthrough: https://youtu.be/20x-6ifhllQ');
  });
});

describe('hub structured data', () => {
  test('lists the topic pages in order', () => {
    const model = { sections: [section(), { ...section(), id: 'pets', label: 'Pets' }], groups: [], entries: [], popular: [], updatedAt: '2026-06-01T00:00:00Z' };
    const [crumbs, page] = buildHubJsonLd(model, ORIGIN)['@graph'];
    assert.deepEqual(crumbs.itemListElement.map((i) => i.name), ['Cuppi', 'FAQ']);
    assert.deepEqual(page.mainEntity.itemListElement.map((i) => i.url), ['https://cuppi.co.uk/faq/budget', 'https://cuppi.co.uk/faq/pets']);
    assert.equal(page.dateModified, '2026-06-01T00:00:00Z');
  });
});

describe('serializeJsonLd', () => {
  test('can never close the script tag it is placed in', () => {
    const out = serializeJsonLd({ text: '</script><script>alert(1)</script>' });
    assert.ok(!out.includes('<'));
    assert.deepEqual(JSON.parse(out), { text: '</script><script>alert(1)</script>' });
  });
});
