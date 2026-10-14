import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { youtubeId, youtubeEmbedUrl, youtubeWatchUrl, jpegSize, youtubeVideoSize, videoFrame } from '../../src/lib/youtube.ts';

const ID = '20x-6ifhllQ';

describe('youtubeId', () => {
  test('reads the common link shapes', () => {
    for (const url of [
      `https://www.youtube.com/watch?v=${ID}`,
      `https://youtube.com/watch?v=${ID}&t=30s`,
      `https://m.youtube.com/watch?feature=share&v=${ID}`,
      `https://youtu.be/${ID}`,
      `https://youtu.be/${ID}?si=abc`,
      `https://www.youtube.com/embed/${ID}`,
      `https://www.youtube-nocookie.com/embed/${ID}?rel=0`,
      `https://www.youtube.com/shorts/${ID}`,
      `  https://www.youtube.com/watch?v=${ID}  `,
    ]) assert.equal(youtubeId(url), ID, url);
  });

  test('rejects anything that is not a YouTube video link', () => {
    for (const url of [
      '', 'not a url', null, undefined, 42,
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      `https://evil.com/watch?v=${ID}`,
      `https://www.youtube.com.evil.com/watch?v=${ID}`,
      `https://evilyoutube.com/embed/${ID}`,
      `ftp://www.youtube.com/watch?v=${ID}`,
      'https://www.youtube.com/watch?v=short',
      'https://www.youtube.com/watch?v=' + 'a'.repeat(12),
      'https://www.youtube.com/watch?v=abc"onload="x',
      'https://www.youtube.com/channel/UC1234567890',
      'https://www.youtube.com/',
    ]) assert.equal(youtubeId(url), null, String(url));
  });

  test('builds embed and watch urls from the id only', () => {
    assert.equal(youtubeEmbedUrl(ID), `https://www.youtube-nocookie.com/embed/${ID}?rel=0`);
    assert.equal(youtubeWatchUrl(ID), `https://www.youtube.com/watch?v=${ID}`);
  });
});

// A minimal JPEG header: SOI, an APP0 segment, then a SOF0 frame header carrying the size.
function jpeg(width, height, { sof = 0xc0, pad = 12 } = {}) {
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0),
    0xff, sof, 0x00, 0x11, 0x08, height >> 8, height & 255, width >> 8, width & 255, 0x03,
    ...new Array(pad).fill(0),
  ]);
}

describe('jpegSize', () => {
  test('reads width and height from the frame header', () => {
    assert.deepEqual(jpegSize(jpeg(888, 1920)), { width: 888, height: 1920 });
    assert.deepEqual(jpegSize(jpeg(1920, 1080)), { width: 1920, height: 1080 });
  });
  test('reads progressive JPEGs too', () => assert.deepEqual(jpegSize(jpeg(320, 240, { sof: 0xc2 })), { width: 320, height: 240 }));
  test('skips segments before the frame header, including EXIF-sized ones', () => {
    const big = Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, 0x10, 0x00, ...new Array(0x0ffe).fill(7), ...jpeg(640, 360).slice(2)]);
    assert.deepEqual(jpegSize(big), { width: 640, height: 360 });
  });
  test('is not fooled by the Huffman-table marker that sits in the same range', () => {
    const dht = Uint8Array.from([0xff, 0xd8, 0xff, 0xc4, 0x00, 0x04, 0, 0, ...jpeg(100, 50).slice(2)]);
    assert.deepEqual(jpegSize(dht), { width: 100, height: 50 });
  });
  test('returns null for anything that is not a readable JPEG', () => {
    assert.equal(jpegSize(new Uint8Array()), null);
    assert.equal(jpegSize(new TextEncoder().encode('<html>Not found</html>')), null);
    assert.equal(jpegSize(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])), null); // cut off before the frame header
    assert.equal(jpegSize(jpeg(0, 0)), null);
  });
  test('stops on a corrupt segment length instead of looping', () => {
    assert.equal(jpegSize(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00, ...new Array(20).fill(0xaa)])), null);
  });
});

describe('youtubeVideoSize', () => {
  const respond = (bytes, init = {}) => async () => new Response(bytes, { status: 206, ...init });

  test('asks for the original-aspect thumbnail, only the start of it, and reads its size', async () => {
    let seen;
    const fetcher = async (url, init) => {
      seen = { url, range: init.headers.Range };
      return new Response(jpeg(888, 1920), { status: 206 });
    };
    assert.deepEqual(await youtubeVideoSize(ID, fetcher), { width: 888, height: 1920 });
    assert.equal(seen.url, `https://i.ytimg.com/vi/${ID}/oar2.jpg`);
    assert.equal(seen.range, 'bytes=0-16383');
  });

  test('is null when the thumbnail does not exist', async () => {
    assert.equal(await youtubeVideoSize(ID, respond('nope', { status: 404 })), null);
  });
  test('is null when the response is not an image', async () => {
    assert.equal(await youtubeVideoSize(ID, respond('<html>consent</html>', { status: 200 })), null);
  });
  test('is null when the request fails or times out', async () => {
    assert.equal(await youtubeVideoSize(ID, async () => { throw new TypeError('fetch failed'); }), null);
    assert.equal(await youtubeVideoSize(ID, async () => { throw new DOMException('timed out', 'TimeoutError'); }), null);
  });
});

describe('videoFrame', () => {
  test('vertical video gets a portrait frame in its own proportions', () => {
    const f = videoFrame({ width: 888, height: 1920 });
    assert.equal(f.portrait, true);
    assert.equal(f.aspectRatio, '0.4625');
  });
  test('16:9, 4:3 and square video stay landscape-style', () => {
    for (const size of [{ width: 1920, height: 1080 }, { width: 320, height: 240 }, { width: 500, height: 500 }]) {
      assert.deepEqual(videoFrame(size), { portrait: false, aspectRatio: '16 / 9' });
    }
  });
  test('an unknown size is treated as 16:9', () => assert.deepEqual(videoFrame(null), { portrait: false, aspectRatio: '16 / 9' }));
  test('absurdly thin frames are clamped so the page layout cannot break', () => {
    assert.equal(videoFrame({ width: 10, height: 1000 }).aspectRatio, '0.4');
  });
});
