import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { portfolioVideos, uploadedVideoUrl } from '../../src/lib/portfolio-videos.ts';

const FILE = 'https://firebasestorage.googleapis.com/v0/b/x/o/projects%2Fvideos%2F1_0_reel.mp4?alt=media&token=abc';
const FILE_2 = 'https://firebasestorage.googleapis.com/v0/b/x/o/projects%2Fvideos%2F2_1_cut.mp4?alt=media&token=def';
const COVER = 'https://firebasestorage.googleapis.com/v0/b/x/o/projects%2Fcover.jpg?alt=media&token=ghi';

describe('uploadedVideoUrl', () => {
  test('accepts an https link to a file, untouched', () => {
    assert.equal(uploadedVideoUrl(FILE), FILE);
  });

  test('rejects YouTube links in every form', () => {
    for (const url of [
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ]) {
      assert.equal(uploadedVideoUrl(url), null, url);
    }
  });

  test('a lookalike host is not mistaken for YouTube', () => {
    assert.equal(uploadedVideoUrl('https://notyoutube.com/clip.mp4'), 'https://notyoutube.com/clip.mp4');
  });

  test('rejects anything that is not an https address', () => {
    for (const url of ['http://example.com/a.mp4', 'javascript:alert(1)', 'data:video/mp4;base64,AAAA', 'nonsense', '', 42, null, undefined]) {
      assert.equal(uploadedVideoUrl(url), null, String(url));
    }
  });
});

describe('portfolioVideos', () => {
  test('a project with one uploaded video gives one file named after the project', () => {
    const files = portfolioVideos([{ id: 'p1', title: 'Audible', imageUrl: COVER, videoUrls: [FILE] }]);
    assert.deepEqual(files, [{ id: 'p1:0', title: 'Audible', url: FILE, thumbnail: COVER }]);
  });

  test('several videos in one project are numbered, in order', () => {
    const files = portfolioVideos([{ id: 'p1', title: 'Audible', videoUrls: [FILE, FILE_2] }]);
    assert.deepEqual(
      files.map((f) => f.title),
      ['Audible (1)', 'Audible (2)'],
    );
  });

  test('keeps the projects in the order given', () => {
    const files = portfolioVideos([
      { id: 'b', title: 'B', videoUrls: [FILE] },
      { id: 'a', title: 'A', videoUrls: [FILE_2] },
    ]);
    assert.deepEqual(
      files.map((f) => f.id),
      ['b:0', 'a:0'],
    );
  });

  test('leaves out YouTube links but keeps the uploaded files beside them', () => {
    const files = portfolioVideos([
      { id: 'p1', title: 'Mixed', videoUrls: ['https://www.youtube.com/embed/dQw4w9WgXcQ', FILE] },
    ]);
    // One file left, so no number; its id still points at its place in the project's list.
    assert.deepEqual(files, [{ id: 'p1:1', title: 'Mixed', url: FILE, thumbnail: null }]);
  });

  test('a project with only YouTube links, or none, adds nothing', () => {
    assert.deepEqual(
      portfolioVideos([
        { id: 'a', title: 'A', videoUrls: ['https://youtu.be/dQw4w9WgXcQ'] },
        { id: 'b', title: 'B', videoUrls: [] },
        { id: 'c', title: 'C' },
      ]),
      [],
    );
  });

  test('projects behind a password stay out', () => {
    const files = portfolioVideos([
      { id: 'secret', title: 'Secret', videoUrls: [FILE], privacy: { isPasswordProtected: true, password: 'x' } },
      { id: 'open', title: 'Open', videoUrls: [FILE_2], privacy: { isPasswordProtected: false } },
    ]);
    assert.deepEqual(
      files.map((f) => f.id),
      ['open:0'],
    );
  });

  test('copes with a missing title, a bad cover link and a videoUrls that is not a list', () => {
    const files = portfolioVideos([
      { id: 'p1', title: '   ', imageUrl: 'http://insecure/cover.jpg', videoUrls: [FILE] },
      { id: 'p2', title: 'Broken', videoUrls: 'not a list' },
    ]);
    assert.deepEqual(files, [{ id: 'p1:0', title: 'Untitled project', url: FILE, thumbnail: null }]);
  });
});
