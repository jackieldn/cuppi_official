import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveHeroSettings, defaultHeroSettings, validateHeroSettings, buildHero, HERO_TEMPLATES, LIMITS } from '../../src/lib/home-hero-settings.ts';
import { homeHero } from '../../src/lib/home-hero.ts';

describe('resolveHeroSettings', () => {
  test('nothing stored gives the original hero', () => {
    for (const bad of [undefined, null, 'rubbish', 5, []]) assert.deepEqual(resolveHeroSettings(bad), defaultHeroSettings());
  });

  test('the defaults build exactly the hero that shipped before it was editable', () => {
    const h = buildHero(defaultHeroSettings());
    assert.equal(h.template, 'split');
    assert.equal(h.introSeconds, 4.4, 'the original length');
    assert.deepEqual({ ...h, template: undefined, introSeconds: undefined }, { ...homeHero, template: undefined, introSeconds: undefined });
  });

  test('keeps valid stored values', () => {
    const s = resolveHeroSettings({
      template: 'centred', headline: 'Hello *there*', body: '', tint: 'lake', pattern: 'summerTea',
      patternSize: 300, patternCentre: 0.2, patternEdge: 0.1, cursorGlow: false, phone: 'front', facing: 'right',
      button: { label: 'Go', href: '/pricing', visible: false },
    });
    assert.equal(s.template, 'centred');
    assert.equal(s.headline, 'Hello *there*');
    assert.equal(s.body, '', 'an empty body is allowed');
    assert.equal(s.tint, 'lake');
    assert.equal(s.pattern, 'summerTea');
    assert.equal(s.cursorGlow, false);
    assert.deepEqual(s.button, { label: 'Go', href: '/pricing', visible: false });
  });

  test('every field falls back on its own', () => {
    const d = defaultHeroSettings();
    const s = resolveHeroSettings({ template: 'wide', headline: '   ', tint: 'purple', pattern: 'evil', phone: 'side', facing: 'up', cursorGlow: 'yes', button: { href: 'javascript:alert(1)', visible: 'no' } });
    assert.deepEqual(s, d);
  });

  test('numbers are clamped and rounded, and junk becomes the default', () => {
    const s = resolveHeroSettings({ patternSize: 99999, patternCentre: -3, patternEdge: 'lots' });
    assert.equal(s.patternSize, LIMITS.size.max);
    assert.equal(s.patternCentre, 0);
    assert.equal(s.patternEdge, defaultHeroSettings().patternEdge);
    assert.equal(resolveHeroSettings({ patternSize: 333.7 }).patternSize, 334);
    assert.equal(resolveHeroSettings({ patternEdge: NaN }).patternEdge, defaultHeroSettings().patternEdge);
  });

  test('the animation length is kept to 1 to 10 seconds, in tenths', () => {
    assert.equal(resolveHeroSettings({ introSeconds: 0 }).introSeconds, LIMITS.intro.min);
    assert.equal(resolveHeroSettings({ introSeconds: 99 }).introSeconds, LIMITS.intro.max);
    assert.equal(resolveHeroSettings({ introSeconds: 6.26 }).introSeconds, 6.3);
    assert.equal(resolveHeroSettings({ introSeconds: 'slow' }).introSeconds, 4.4);
    assert.equal(buildHero({ ...defaultHeroSettings(), introSeconds: 7 }).introSeconds, 7);
  });

  test('text is trimmed and capped', () => {
    const s = resolveHeroSettings({ headline: `  ${'x'.repeat(500)}  `, body: 'y'.repeat(500) });
    assert.equal(s.headline.length, LIMITS.headline);
    assert.equal(s.body.length, LIMITS.body);
  });

  test('the button only accepts a page on this site or an https address', () => {
    for (const bad of ['http://x.com', '//evil.com', 'data:text/html,x', 'features']) {
      assert.equal(resolveHeroSettings({ button: { href: bad } }).button.href, defaultHeroSettings().button.href, bad);
    }
    assert.equal(resolveHeroSettings({ button: { href: 'https://apps.apple.com/x' } }).button.href, 'https://apps.apple.com/x');
  });
});

describe('validateHeroSettings', () => {
  test('the defaults are fine', () => assert.deepEqual(validateHeroSettings(defaultHeroSettings()), []));
  test('asks for a headline', () => assert.equal(validateHeroSettings({ ...defaultHeroSettings(), headline: ' ' }).length, 1));
  test('checks the button only while it is shown', () => {
    const base = defaultHeroSettings();
    const bad = { ...base.button, label: '', href: 'nope' };
    assert.equal(validateHeroSettings({ ...base, button: { ...bad, visible: true } }).length, 2);
    assert.deepEqual(validateHeroSettings({ ...base, button: { ...bad, visible: false } }), []);
  });
});

describe('buildHero', () => {
  const base = defaultHeroSettings();
  test('a hidden button is no link, and no pattern is no pattern', () => {
    const h = buildHero({ ...base, button: { ...base.button, visible: false }, pattern: 'none' });
    assert.equal(h.link, undefined);
    assert.equal(h.pattern, undefined);
  });
  test('the pattern stays quiet around wherever the template puts the phone', () => {
    for (const t of HERO_TEMPLATES) assert.equal(buildHero({ ...base, template: t.key }).pattern.focus, t.focus);
  });
  test('the cursor light switches off with spot 0', () => {
    assert.equal(buildHero({ ...base, cursorGlow: false }).pattern.spot, 0);
    assert.ok(buildHero({ ...base, cursorGlow: true }).pattern.spot > 0);
  });
  test('only a 45 degree phone is mirrored, and only when it faces left', () => {
    assert.equal(buildHero({ ...base, phone: 'tilt', facing: 'left' }).flip, true);
    assert.equal(buildHero({ ...base, phone: 'tilt', facing: 'right' }).flip, false);
    assert.equal(buildHero({ ...base, phone: 'front', facing: 'left' }).flip, false);
  });
  test('each template that has words to one side turns the phone towards them', () => {
    assert.equal(HERO_TEMPLATES.find((t) => t.key === 'split').facing, 'left');
    assert.equal(HERO_TEMPLATES.find((t) => t.key === 'split-reverse').facing, 'right');
  });
});
