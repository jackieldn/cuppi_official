import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  etaSeconds,
  formatEta,
  formatSize,
  formatSpeed,
  hasEra,
  hash01,
  torrentFacts,
} from '../../src/lib/desktop-videos-types.ts';

describe('hasEra', () => {
  test('matches the eras a video is tagged with', () => {
    assert.equal(hasEra({ eras: ['2006'] }, '2006'), true);
    assert.equal(hasEra({ eras: ['2006'] }, '2026'), false);
    assert.equal(hasEra({ eras: ['2006', '2026'] }, '2026'), true);
    assert.equal(hasEra({}, '2006'), false);
  });
});

describe('hash01', () => {
  test('is steady for the same text and stays in range', () => {
    assert.equal(hash01('borat'), hash01('borat'));
    assert.notEqual(hash01('borat'), hash01('x-men'));
    for (const text of ['', 'a', 'The Da Vinci Code']) {
      const n = hash01(text);
      assert.ok(n >= 0 && n < 1, text);
    }
  });
});

describe('torrentFacts', () => {
  test('uses what the admin entered', () => {
    const facts = torrentFacts({
      id: 'a',
      title: 'X-Men: The Last Stand',
      torrentName: 'X-Men.The.Last.Stand.2006.DVDSCR.XviD',
      eras: ['2006'],
      order: 1,
      status: 'downloading',
      sizeMB: 1400,
      progress: 12.5,
      downloadKBps: 35,
      seeds: 8,
      peers: 21,
    });
    assert.equal(facts.name, 'X-Men.The.Last.Stand.2006.DVDSCR.XviD');
    assert.equal(facts.status, 'downloading');
    assert.equal(facts.sizeMB, 1400);
    assert.equal(facts.progress, 12.5);
    assert.equal(facts.downloadKBps, 35);
    assert.equal(facts.seeds, 8);
    assert.equal(facts.peers, 21);
  });

  test('makes up the rest from the title, the same way every time', () => {
    const video = { id: 'abc', title: 'Crazy Frog', eras: ['2006'], order: 1 };
    const a = torrentFacts(video);
    assert.deepEqual(a, torrentFacts(video));
    assert.equal(a.name, 'Crazy Frog');
    assert.equal(a.status, 'seeding');
    assert.equal(a.progress, 100);
    assert.ok(a.sizeMB >= 180 && a.sizeMB <= 800);
    assert.ok(a.seeds >= 3 && a.peers >= 1 && a.uploadKBps >= 6);
  });

  test('a seeding torrent is always complete, a download never quite is', () => {
    const base = { id: 'a', title: 't', eras: ['2006'], order: 1 };
    assert.equal(torrentFacts({ ...base, status: 'seeding', progress: 40 }).progress, 100);
    assert.equal(torrentFacts({ ...base, status: 'downloading', progress: 250 }).progress, 99.9);
    assert.equal(torrentFacts({ ...base, status: 'downloading', progress: -5 }).progress, 0);
    assert.equal(torrentFacts({ ...base, status: 'downloading' }).progress, 0);
  });
});

describe('formatSize', () => {
  test('picks a sensible unit', () => {
    assert.equal(formatSize(1400), '1.37 GB');
    assert.equal(formatSize(698.4), '698 MB');
    assert.equal(formatSize(42.54), '42.5 MB');
    assert.equal(formatSize(-1), '');
  });
});

describe('formatSpeed', () => {
  test('shows nothing for a standstill', () => {
    assert.equal(formatSpeed(0), '');
    assert.equal(formatSpeed(35.24), '35.2 kB/s');
    assert.equal(formatSpeed(1536), '1.50 MB/s');
  });
});

describe('etaSeconds and formatEta', () => {
  test('works out the time left from size, progress and speed', () => {
    // 1000 MB at 10 per cent leaves 900 MB; at 1024 kB/s that is 900 seconds.
    assert.equal(Math.round(etaSeconds(1000, 10, 1024)), 900);
    assert.equal(etaSeconds(1000, 10, 0), Infinity);
  });

  test('writes it the way a torrent client does', () => {
    assert.equal(formatEta(42), '42s');
    assert.equal(formatEta(545), '9m 05s');
    assert.equal(formatEta(9 * 3600 + 41 * 60), '9h 41m');
    assert.equal(formatEta(3 * 86400 + 2 * 3600), '3d 2h');
    assert.equal(formatEta(Infinity), '∞');
  });
});
