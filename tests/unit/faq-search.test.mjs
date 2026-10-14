import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchIndex, searchFaq, highlight, snippet } from '../../src/lib/faq-search.ts';

const doc = (slug, sectionLabel, question, text, topic = null) => ({ slug, sectionId: sectionLabel.toLowerCase().replace(/\W+/g, '-'), sectionLabel, topic, question, text });

const docs = [
  doc('bin-setup', 'Bin Day', 'How do I set up a Bin Day notification?', 'Open Bin Day, choose your council and pick the day. Recycling and general waste alternate.', 'Setting up'),
  doc('bin-missing', 'Bin Day', 'I haven’t received any Bin Day notifications. What can I do?', 'Check that notifications are allowed for Cuppi in Settings.', 'Notifications'),
  doc('cancel-pro', 'Cuppi Pro & rewards', 'Cancelling Pro subscription', 'Open Settings, tap your name, then Subscriptions. Refunds go through Apple.', 'Plans & billing'),
  doc('child', 'Your account', 'Child accounts', 'Children get a limited account. Kids cannot delete the household.'),
  doc('profile', 'Your account', 'Updating profile', 'Change your name and photo from the profile screen.'),
  doc('pdf-attach', 'Receipts', 'Can I attach a PDF?', 'Yes. Pro lets you attach PDF invoices to a receipt.', 'PDFs'),
  doc('pin', 'The basics', 'I’ve forgotten my PIN', 'Use Forgot PIN on the lock screen to reset it.'),
  doc('approve-budget', 'Budget', 'How do I approve a Budget?', 'Open Budgets, tap the Upcoming card, review the changes and approve.', 'Approving a budget'),
];
const index = buildSearchIndex(docs);
const top = (q, n = 1) => searchFaq(index, q).results.slice(0, n).map((r) => r.doc.slug);

describe('searchFaq: finding answers', () => {
  test('finds an answer by a word in its question', () => assert.deepEqual(top('cancelling'), ['cancel-pro']));
  test('stems plurals and endings', () => {
    assert.equal(top('bins')[0], 'bin-setup');
    assert.deepEqual(top('approving'), ['approve-budget']);
  });
  test('ignores filler words', () => assert.deepEqual(top('how do i approve a budget'), ['approve-budget']));
  test('uses synonyms: what people type vs what the answer says', () => {
    assert.equal(top('rubbish')[0], 'bin-setup');
    assert.equal(top('kids')[0], 'child');
    assert.equal(top('passcode')[0], 'pin');
    assert.equal(top('cancel')[0], 'cancel-pro');
  });
  test('finds words that appear only in the answer', () => assert.deepEqual(top('invoices'), ['pdf-attach']));
  test('matches the topic and section name', () => assert.ok(top('subscription', 3).includes('cancel-pro')));
  test('ranks a question match above an answer-only match', () => {
    // "refunds" is only in the cancel answer; "notification" is in two questions.
    assert.equal(top('notifications')[0], 'bin-missing');
  });
  test('prefers an exact phrase in the question', () => assert.equal(top('bin day notification')[0], 'bin-setup'));
  test('is case and punctuation insensitive', () => assert.deepEqual(top('  PIN?! '), ['pin']));
  test('a short word never prefix-matches a longer one', () => {
    // "pro" must not match "profile".
    assert.ok(!top('pro', 8).includes('profile'));
  });
  test('a longer word matches by prefix', () => assert.deepEqual(top('subscript'), ['cancel-pro']));
  test('returns nothing for gibberish or an empty query', () => {
    assert.deepEqual(searchFaq(index, 'zzzzqx').results, []);
    assert.deepEqual(searchFaq(index, '   ').results, []);
    // A query made only of filler words still runs (on the words as typed) rather than crashing.
    assert.doesNotThrow(() => searchFaq(index, 'the a of'));
  });
});

describe('searchFaq: partial matches', () => {
  test('requires every word when some answer has them all, best match first', () => {
    // "recycling" also counts as "bin" (synonym), so both bin answers qualify;
    // the one that literally says recycling must come first.
    const out = searchFaq(index, 'bin recycling');
    assert.equal(out.partial, false);
    assert.equal(out.results[0].doc.slug, 'bin-setup');
    assert.ok(!out.results.some((r) => r.doc.slug === 'cancel-pro'));
  });
  test('falls back to answers matching some of the words, and says so', () => {
    const out = searchFaq(index, 'budget zzzzqx');
    assert.equal(out.partial, true);
    assert.equal(out.results[0].doc.slug, 'approve-budget');
  });
  test('honours the limit', () => assert.equal(searchFaq(index, 'bin', 1).results.length, 1));
});

describe('highlight', () => {
  test('marks words that start with a search term', () => {
    assert.deepEqual(highlight('Set up Bin Day bins', ['bin']), [
      { text: 'Set up ', match: false },
      { text: 'Bin', match: true },
      { text: ' Day ', match: false },
      { text: 'bins', match: true },
    ]);
  });
  test('returns the text unchanged when there is nothing to highlight', () => {
    assert.deepEqual(highlight('Hello', []), [{ text: 'Hello', match: false }]);
    assert.deepEqual(highlight('', ['a']), []);
  });
  test('treats regex characters in terms as plain text', () => {
    assert.deepEqual(highlight('a.b', ['.*']), [{ text: 'a.b', match: false }]);
  });
  test('uses the terms returned by a search', () => {
    const { terms } = searchFaq(index, 'cancelling');
    const marked = highlight('Cancelling Pro subscription', terms).filter((s) => s.match).map((s) => s.text);
    assert.deepEqual(marked, ['Cancelling']);
  });
});

describe('snippet', () => {
  const long = 'Intro sentence that is quite long and goes on for a while. '.repeat(6) + 'The scanner finds the edges of the receipt. ' + 'Trailing words follow here. '.repeat(10);
  test('centres on the first match and marks both ends as cut', () => {
    const s = snippet(long, ['scanner']);
    assert.ok(s.includes('scanner'));
    assert.ok(s.startsWith('…') && s.endsWith('…'));
    assert.ok(s.length < 260);
  });
  test('starts at the beginning when the match is early', () => {
    const s = snippet('The scanner is quick. ' + 'x '.repeat(200), ['scanner']);
    assert.ok(s.startsWith('The scanner'));
  });
  test('shows the start of the answer when nothing matches', () => {
    assert.ok(snippet(long, ['zzz']).startsWith('Intro sentence'));
  });
  test('returns short text whole', () => assert.equal(snippet('Short answer.', ['short']), 'Short answer.'));
});
