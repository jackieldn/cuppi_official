import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TOOLS, GROUP_LABELS, toolBySlug } from '../../src/lib/tools/registry.ts';
import { TOOL_CONTENT } from '../../src/lib/tools/content.ts';
import { buildToolJsonLd } from '../../src/lib/tools/seo.ts';
import { defaultToolSettings, resolveToolSettings, resolveTools, menuTools, liveTools } from '../../src/lib/tools/settings.ts';

const STORAGE = 'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/cuppi_home%2Ftools%2Fa.png?alt=media';

describe('the tools list', () => {
  test('every tool has a unique web-safe slug, a group that exists, and words for its page', () => {
    assert.equal(new Set(TOOLS.map((t) => t.slug)).size, TOOLS.length);
    for (const t of TOOLS) {
      assert.match(t.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(GROUP_LABELS[t.group], t.slug);
      assert.ok(t.seoTitle.length <= 60, `${t.slug} title is ${t.seoTitle.length} characters`);
      assert.ok(t.seoDescription.length <= 200, `${t.slug} description is long`);
      assert.ok(toolBySlug(t.slug));
    }
  });
  test('every tool has page content with related tools that exist, and a worked example', () => {
    for (const t of TOOLS) {
      const c = TOOL_CONTENT[t.slug];
      assert.ok(c, `${t.slug} has content`);
      assert.ok(c.faqs.length >= 4, `${t.slug} has questions`);
      for (const slug of c.related) assert.ok(toolBySlug(slug) && slug !== t.slug, `${t.slug} relates to ${slug}`);
      const ex = c.example();
      assert.ok(ex.heading && ex.body.length > 0);
      for (const line of ex.body) assert.ok(!/NaN|undefined|–/.test(line), `${t.slug}: ${line}`);
    }
  });
});

describe('structured data', () => {
  test('a tool gets an app, a breadcrumb trail and its questions, as plain JSON', () => {
    const t = TOOLS[0];
    const ld = buildToolJsonLd(t, TOOL_CONTENT[t.slug], 'https://cuppi.co.uk');
    assert.deepEqual(ld['@graph'].map((n) => n['@type']), ['WebApplication', 'BreadcrumbList', 'FAQPage']);
    assert.equal(ld['@graph'][0].url, `https://cuppi.co.uk/tools/${t.slug}`);
    assert.equal(ld['@graph'][2].mainEntity.length, TOOL_CONTENT[t.slug].faqs.length);
    JSON.parse(JSON.stringify(ld));
  });
});

describe('tool settings', () => {
  test('nothing stored, or rubbish, gives every tool live and in the menu, in the default order', () => {
    for (const stored of [undefined, null, 'x', 5, [], {}, { tools: 'no' }]) {
      assert.deepEqual(resolveToolSettings(stored), defaultToolSettings());
    }
    assert.deepEqual(defaultToolSettings().map((s) => s.slug), TOOLS.map((t) => t.slug));
    assert.ok(defaultToolSettings().every((s) => s.live && s.inMenu));
  });

  test('the stored order, switches, tile colour and icon are used', () => {
    const [a, b] = TOOLS;
    const s = resolveToolSettings({ tools: [{ slug: b.slug, live: false, inMenu: true, tile: 'pink', iconUrl: STORAGE }, { slug: a.slug, live: true, inMenu: false, tile: 'green' }] });
    assert.deepEqual(s.slice(0, 2).map((x) => x.slug), [b.slug, a.slug]);
    assert.equal(s[0].live, false);
    assert.equal(s[0].tile, 'pink');
    assert.equal(s[0].iconUrl, STORAGE);
    assert.equal(s[1].inMenu, false);
  });

  test('tools missing from the document are added at the end, live; unknown and repeated ones are dropped', () => {
    const s = resolveToolSettings({ tools: [{ slug: 'nope', live: true }, { slug: TOOLS[2].slug, live: false }, { slug: TOOLS[2].slug, live: true }] });
    assert.equal(s.length, TOOLS.length);
    assert.equal(s[0].slug, TOOLS[2].slug);
    assert.equal(s[0].live, false); // the first of the repeats wins
    assert.ok(s.slice(1).every((x) => x.live));
  });

  test('a bad colour falls back to the tool’s own, and an icon address that is not ours is dropped', () => {
    const s = resolveToolSettings({ tools: [{ slug: TOOLS[0].slug, tile: 'purple', iconUrl: 'https://evil.example/x.png' }] });
    assert.equal(s[0].tile, TOOLS[0].tile);
    assert.ok(!('iconUrl' in s[0]));
  });

  test('the menu lists live tools switched on for it, in order; the hub lists every live tool', () => {
    const stored = { tools: TOOLS.map((t, i) => ({ slug: t.slug, live: i !== 1, inMenu: i !== 2, tile: t.tile })) };
    const tools = resolveTools(stored);
    assert.deepEqual(liveTools(tools).map((t) => t.slug), TOOLS.filter((_, i) => i !== 1).map((t) => t.slug));
    assert.deepEqual(menuTools(tools).map((t) => t.slug), TOOLS.filter((_, i) => i !== 1 && i !== 2).map((t) => t.slug));
    assert.equal(tools[0].name, TOOLS[0].name); // the tool's own details come with its settings
  });
});
