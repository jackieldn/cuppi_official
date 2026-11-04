import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// The sanitiser only runs in a browser, so give it a DOM before importing it.
globalThis.window = new JSDOM('').window;
const { sanitizeHtml, sanitizeJournalHtml } = await import('../../src/lib/sanitize-html.ts');

test('real content with <b> is unchanged', () => {
  const real = 'Built in <b>After Effects</b> for a client.';
  assert.equal(sanitizeHtml(real), real);
});

test('scripts, event handlers, iframes, images and styles are removed', () => {
  assert.doesNotMatch(sanitizeHtml('hi<script>alert(1)</script>'), /<script/i);
  assert.doesNotMatch(sanitizeHtml('<img src=x onerror=alert(1)>'), /onerror|<img/i);
  assert.doesNotMatch(sanitizeHtml('<iframe src="https://evil"></iframe>ok'), /<iframe/i);
  assert.doesNotMatch(sanitizeHtml('<p style="background:url(x)">t</p>'), /style=/i);
  assert.doesNotMatch(sanitizeHtml('<p onclick="x()">t</p>'), /onclick/i);
});

test('javascript: and data: links are neutralised', () => {
  assert.doesNotMatch(sanitizeHtml('<a href="javascript:alert(1)">x</a>'), /javascript:/i);
  assert.doesNotMatch(sanitizeHtml('<a href="data:text/html;base64,AAAA">x</a>'), /data:/i);
});

test('https links are kept and hardened', () => {
  const out = sanitizeHtml('<a href="https://example.com">site</a>');
  assert.match(out, /href="https:\/\/example\.com"/);
  assert.match(out, /rel="noopener noreferrer"/);
  assert.match(out, /target="_blank"/);
});

test('empty input gives an empty string', () => {
  assert.equal(sanitizeHtml(undefined), '');
  assert.equal(sanitizeHtml(null), '');
  assert.equal(sanitizeHtml(''), '');
});

test('journal posts keep https pictures and formatting, but nothing risky', () => {
  const ok = sanitizeJournalHtml('<h2>Hi</h2><p><u>under</u> <img src="https://example.com/a.png" alt="a"></p>');
  assert.match(ok, /<h2>Hi<\/h2>/);
  assert.match(ok, /<u>under<\/u>/);
  assert.match(ok, /<img src="https:\/\/example\.com\/a\.png" alt="a">/);
  assert.doesNotMatch(sanitizeJournalHtml('<img src="javascript:alert(1)">'), /javascript:/i);
  assert.doesNotMatch(sanitizeJournalHtml('<img src="data:image/png;base64,AAAA">'), /data:/i);
  assert.doesNotMatch(sanitizeJournalHtml('<img src="https://x/a.png" onerror="x()">'), /onerror/i);
  assert.doesNotMatch(sanitizeJournalHtml('<p style="color:red">t</p><script>x()</script>'), /style=|<script/i);
});

test('regular sanitiser still strips pictures', () => {
  assert.doesNotMatch(sanitizeHtml('<img src="https://example.com/a.png">'), /<img/i);
});
