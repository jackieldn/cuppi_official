import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMenu, defaultMenu, safeHref, validateMenu, newCustomKey, BUILT_IN_LINKS } from '../../src/lib/menu-settings.ts';

const STORE = 'https://apps.apple.com/gb/app/cuppi/id1';

describe('safeHref', () => {
  test('accepts site paths and https addresses', () => {
    assert.equal(safeHref('/pricing'), '/pricing');
    assert.equal(safeHref(' https://example.com/a?b=1 '), 'https://example.com/a?b=1');
  });
  test('rejects anything that could run code or leave the protocol', () => {
    for (const bad of ['javascript:alert(1)', 'http://example.com', '//evil.com', 'data:text/html,x', 'pricing', '', '/a b', null, 5]) {
      assert.equal(safeHref(bad), null, String(bad));
    }
  });
});

describe('resolveMenu', () => {
  test('nothing stored gives the default menu', () => {
    assert.deepEqual(resolveMenu(undefined, STORE), defaultMenu(STORE));
    assert.deepEqual(resolveMenu(null, STORE), defaultMenu(STORE));
    assert.deepEqual(resolveMenu('rubbish', STORE), defaultMenu(STORE));
  });

  test('keeps the stored order, labels and switches', () => {
    const m = resolveMenu({ links: [{ key: 'support', label: 'Help', visible: false }, { key: 'features', label: 'What it does', visible: true }] }, STORE);
    assert.deepEqual(m.links.map((l) => l.key).slice(0, 2), ['support', 'features']);
    assert.equal(m.links[0].label, 'Help');
    assert.equal(m.links[0].visible, false);
    assert.equal(m.links[1].label, 'What it does');
  });

  test('built-ins missing from the document are added at the end', () => {
    const m = resolveMenu({ links: [{ key: 'faq', label: 'FAQ', visible: true }] }, STORE);
    assert.equal(m.links.length, BUILT_IN_LINKS.length);
    assert.equal(m.links[0].key, 'faq');
  });

  test('panel links keep their fixed address, plain ones can change theirs', () => {
    const m = resolveMenu({ links: [{ key: 'features', label: 'F', href: 'https://x.com', visible: true }, { key: 'faq', label: 'FAQ', href: '/help', visible: true }] }, STORE);
    assert.equal(m.links.find((l) => l.key === 'features').href, '/features');
    assert.equal(m.links.find((l) => l.key === 'faq').href, '/help');
  });

  test('an unsafe address falls back to the default', () => {
    const m = resolveMenu({ links: [{ key: 'faq', label: 'FAQ', href: 'javascript:alert(1)', visible: true }] }, STORE);
    assert.equal(m.links.find((l) => l.key === 'faq').href, '/faq');
  });

  test('custom links are kept when safe and dropped when not; unknown keys are ignored', () => {
    const m = resolveMenu(
      {
        links: [
          { key: 'custom-1', label: 'Pricing', href: '/pricing', visible: true },
          { key: 'custom-2', label: 'Bad', href: 'javascript:x', visible: true },
          { key: 'evil', label: 'Evil', href: '/x', visible: true },
        ],
      },
      STORE,
    );
    const custom = m.links.filter((l) => l.custom);
    assert.deepEqual(custom.map((l) => l.key), ['custom-1']);
    assert.ok(!m.links.some((l) => l.key === 'evil'));
  });

  test('no more than four custom links', () => {
    const links = [1, 2, 3, 4, 5, 6].map((n) => ({ key: `custom-${n}`, label: `L${n}`, href: `/p${n}`, visible: true }));
    assert.equal(resolveMenu({ links }, STORE).links.filter((l) => l.custom).length, 4);
  });

  test('labels are trimmed, limited and never empty', () => {
    const m = resolveMenu({ links: [{ key: 'faq', label: '   ', visible: true }, { key: 'blog', label: 'x'.repeat(100), visible: true }] }, STORE);
    assert.equal(m.links.find((l) => l.key === 'faq').label, 'FAQ');
    assert.equal(m.links.find((l) => l.key === 'blog').label.length, 30);
  });

  test('the download button: label, address and switch, with safe fallbacks', () => {
    const ok = resolveMenu({ download: { label: 'Get Cuppi', href: 'https://example.com/get', visible: false } }, STORE);
    assert.deepEqual(ok.download, { label: 'Get Cuppi', href: 'https://example.com/get', visible: false });
    const bad = resolveMenu({ download: { label: '', href: 'javascript:alert(1)' } }, STORE);
    assert.deepEqual(bad.download, { label: 'Download', href: STORE, visible: true });
  });

  test('a duplicated key is only used once', () => {
    const m = resolveMenu({ links: [{ key: 'faq', label: 'One', visible: true }, { key: 'faq', label: 'Two', visible: true }] }, STORE);
    assert.equal(m.links.filter((l) => l.key === 'faq').length, 1);
    assert.equal(m.links.find((l) => l.key === 'faq').label, 'One');
  });
});

describe('validateMenu and newCustomKey', () => {
  test('a good menu has no problems; bad addresses and empty names are explained', () => {
    assert.deepEqual(validateMenu(defaultMenu(STORE)), []);
    const m = defaultMenu(STORE);
    m.links[2].href = 'nope';
    m.download.href = 'http://insecure.example';
    m.download.label = ' ';
    assert.equal(validateMenu(m).length, 3);
  });
  test('newCustomKey skips keys in use', () => {
    assert.equal(newCustomKey([]), 'custom-1');
    assert.equal(newCustomKey([{ key: 'custom-1' }, { key: 'custom-2' }]), 'custom-3');
  });
});
