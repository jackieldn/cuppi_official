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

describe('the hero screenshot', () => {
  const STORAGE = 'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/';
  const shot = { url: `${STORAGE}o/cuppi_home%2Fshot.png?alt=media`, alt: 'The Pets screen', width: 1170, height: 2532, bg: '#D8EAF9' };

  test('none saved is the original, and the default hero still uses the built-in screenshot', () => {
    assert.equal(defaultHeroSettings().screenshot, null);
    assert.deepEqual(buildHero(defaultHeroSettings()).screenshot, homeHero.screenshot);
    for (const bad of [undefined, null, 'x', 5, [], {}, { url: 5 }]) assert.equal(resolveHeroSettings({ screenshot: bad }).screenshot, null);
  });

  test('a saved screenshot is kept and is what the hero draws', () => {
    const s = resolveHeroSettings({ screenshot: shot });
    assert.deepEqual(s.screenshot, shot);
    assert.deepEqual(buildHero(s).screenshot, shot);
    // everything else about the hero is unaffected
    assert.equal(buildHero(s).headline, homeHero.headline);
  });

  test('an address the site cannot show falls back to the original rather than breaking the hero', () => {
    for (const url of ['https://evil.example/a.png', 'http://insecure/a.png', 'javascript:alert(1)', '//evil.com/a.png', 'blob:http://localhost/123']) {
      assert.equal(resolveHeroSettings({ screenshot: { ...shot, url } }).screenshot, null, url);
    }
    // a file on this site is fine
    assert.equal(resolveHeroSettings({ screenshot: { ...shot, url: '/images/hero/x.jpg' } }).screenshot.url, '/images/hero/x.jpg');
  });

  test('bad fields fall back on their own', () => {
    const s = resolveHeroSettings({ screenshot: { url: shot.url, width: -5, height: 'tall', bg: 'red; background:url(x)', alt: '   ' } }).screenshot;
    assert.deepEqual([s.width, s.height], [1170, 2532]);
    assert.equal(s.bg, '#FFFFFF');
    assert.equal(s.alt, 'The Cuppi app');
    assert.equal(resolveHeroSettings({ screenshot: { ...shot, alt: 'x'.repeat(500) } }).screenshot.alt.length, 200);
  });

  test('saving needs a picture if a screenshot is set', () => {
    assert.deepEqual(validateHeroSettings({ ...defaultHeroSettings(), screenshot: shot }), []);
    assert.equal(validateHeroSettings({ ...defaultHeroSettings(), screenshot: { ...shot, url: '' } }).length, 1);
  });

  test('the view, a second phone, its arrangement and the slide are kept and read like a feature page\'s', () => {
    const second = { url: `${STORAGE}o/cuppi_home%2Fsecond.png?alt=media`, alt: 'Second', width: 1170, height: 2532, view: 'bottom' };
    const s = resolveHeroSettings({ screenshot: { ...shot, view: 'bottom', second, arrange: 'level' } }).screenshot;
    assert.equal(s.view, 'bottom');
    assert.deepEqual(s.second, second);
    assert.equal(s.arrange, 'level');
    assert.deepEqual(buildHero(resolveHeroSettings({ screenshot: { ...shot, view: 'bottom', second } })).screenshot.second, second);
    // top and a lower arrangement are the defaults, so nothing is stored for them
    const plain = resolveHeroSettings({ screenshot: { ...shot, view: 'top', second, arrange: 'lower' } }).screenshot;
    assert.equal(plain.view, undefined);
    assert.equal(plain.arrange, undefined);
  });

  test('the slide is for one phone only, and a second screenshot that cannot be shown is dropped', () => {
    assert.equal(resolveHeroSettings({ screenshot: { ...shot, slide: true } }).screenshot.slide, true);
    assert.equal(resolveHeroSettings({ screenshot: { ...shot, slide: 'yes' } }).screenshot.slide, undefined);
    const second = { url: `${STORAGE}o/x.png?alt=media`, alt: 'b' };
    assert.equal(resolveHeroSettings({ screenshot: { ...shot, slide: true, second } }).screenshot.slide, undefined, 'not with two phones');
    assert.equal(resolveHeroSettings({ screenshot: { ...shot, second: { url: 'https://evil.example/x.png' } } }).screenshot.second, undefined);
  });

  test('saving needs the second phone\'s picture if there is a second phone', () => {
    const withSecond = (url) => ({ ...defaultHeroSettings(), screenshot: { ...shot, second: { url, alt: '' } } });
    assert.deepEqual(validateHeroSettings(withSecond(shot.url)), []);
    assert.equal(validateHeroSettings(withSecond('')).length, 1);
  });
});

