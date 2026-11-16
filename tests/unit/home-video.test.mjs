import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { HOME_VIDEO_LIMITS, buttonText, emptyHomeVideo, isShown, resolveHomeVideo, validateHomeVideo } from '../../src/lib/home-video.ts';

const STORAGE = 'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/cuppi_features%2Fhome-ad.mp4?alt=media';
const good = (over = {}) => ({ enabled: true, url: STORAGE, aspect: '16:9', title: 'Meet Bin Day', description: 'A short look.', featureSlug: 'bin-day', buttonLabel: 'See Bin Day', ...over });

describe('resolveHomeVideo', () => {
  test('nothing stored, or rubbish, gives the empty default, which shows nothing', () => {
    for (const stored of [undefined, null, 'x', 5, [], {}]) {
      assert.deepEqual(resolveHomeVideo(stored), emptyHomeVideo());
      assert.equal(isShown(resolveHomeVideo(stored)), false);
    }
  });

  test('a good document comes back as it was written', () => {
    assert.deepEqual(resolveHomeVideo(good()), good());
  });

  test('the section defaults to on, and only a real boolean switches it off', () => {
    assert.equal(resolveHomeVideo({ url: STORAGE }).enabled, true);
    assert.equal(resolveHomeVideo({ url: STORAGE, enabled: false }).enabled, false);
    assert.equal(resolveHomeVideo({ url: STORAGE, enabled: 'no' }).enabled, true);
  });

  test('an unsafe or non-video address is dropped, so nothing is shown', () => {
    for (const url of ['javascript:alert(1)', 'http://example.com/a.mp4', '//evil.example/a.mp4', 'a video', 5, null]) assert.equal(resolveHomeVideo({ url }).url, '');
    assert.equal(isShown(resolveHomeVideo({ url: 'javascript:alert(1)' })), false);
  });

  test('a YouTube link and a path on this site are fine', () => {
    assert.ok(resolveHomeVideo({ url: 'https://youtu.be/dQw4w9WgXcQ' }).url);
    assert.equal(resolveHomeVideo({ url: '/videos/ad.mp4' }).url, '/videos/ad.mp4');
  });

  test('aspect is widescreen unless it is exactly 9:16', () => {
    assert.equal(resolveHomeVideo({ aspect: '9:16' }).aspect, '9:16');
    for (const aspect of ['4:3', '', null, 1]) assert.equal(resolveHomeVideo({ aspect }).aspect, '16:9');
  });

  test('the feature must be a plain slug, so the button can only ever lead to a feature page', () => {
    assert.equal(resolveHomeVideo({ featureSlug: 'bin-day' }).featureSlug, 'bin-day');
    for (const featureSlug of ['/evil', 'https://evil.example', '../x', 'Bin Day', 'a//b', '-x', 5]) assert.equal(resolveHomeVideo({ featureSlug }).featureSlug, '');
  });

  test('words are trimmed and capped', () => {
    const r = resolveHomeVideo({ title: `  ${'t'.repeat(500)}  `, description: 'd'.repeat(5000), buttonLabel: 'b'.repeat(100) });
    assert.equal(r.title.length, HOME_VIDEO_LIMITS.title);
    assert.equal(r.description.length, HOME_VIDEO_LIMITS.description);
    assert.equal(r.buttonLabel.length, HOME_VIDEO_LIMITS.buttonLabel);
    assert.equal(resolveHomeVideo({ title: '  hi  ' }).title, 'hi');
  });
});

describe('isShown', () => {
  test('needs the switch on and a video', () => {
    assert.equal(isShown(good()), true);
    assert.equal(isShown(good({ enabled: false })), false);
    assert.equal(isShown(good({ url: '' })), false);
  });
});

describe('buttonText', () => {
  test("uses the admin's words, or Explore and the feature name", () => {
    assert.equal(buttonText({ buttonLabel: 'See Bin Day' }, 'Bin Day'), 'See Bin Day');
    assert.equal(buttonText({ buttonLabel: '' }, 'Bin Day'), 'Explore Bin Day');
    assert.equal(buttonText({ buttonLabel: '   ' }, 'Bin Day'), 'Explore Bin Day');
  });
});

describe('validateHomeVideo', () => {
  test('a good setup, or one that is switched off with no video, has no problems', () => {
    assert.deepEqual(validateHomeVideo(good(), true), []);
    assert.deepEqual(validateHomeVideo(good({ enabled: false, url: '' }), false), []);
  });

  test('switched on with no video says so in plain English', () => {
    const p = validateHomeVideo(good({ url: '' }), false);
    assert.equal(p.length, 1);
    assert.match(p[0], /Add a video/);
  });

  test('a video chosen but not uploaded yet counts as a video', () => {
    assert.deepEqual(validateHomeVideo(good({ url: '' }), true), []);
  });

  test('button words with no feature to open are a problem', () => {
    const p = validateHomeVideo(good({ featureSlug: '', buttonLabel: 'Click' }), true);
    assert.equal(p.length, 1);
    assert.match(p[0], /needs a feature/);
    assert.deepEqual(validateHomeVideo(good({ featureSlug: '', buttonLabel: '' }), true), []);
  });
});
