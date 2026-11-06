// Picks the colour an icon is "about", for tinting the backgrounds around it.
// The picking is pure (no DOM), so it's unit tested (tests/unit/icon-colour.test.mjs);
// colourFromImageUrl() is the thin browser wrapper that feeds it a picture's pixels.

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

/**
 * The dominant colour of RGBA pixel data, as #rrggbb, or null when there is nothing
 * to go on (fully transparent). Pixels are grouped into coarse colour buckets and each
 * counts for how colourful it is, so an icon's brand colour beats the white glyph or the
 * black outline that may cover more of its area. A plain white or black icon still
 * resolves, because every pixel keeps a small base weight.
 */
export function dominantColour(data: ArrayLike<number>): string | null {
  const buckets = new Map<number, { weight: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // see-through pixels carry no colour
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    const weight = 0.05 + chroma;
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.weight += weight;
      bucket.r += r * weight;
      bucket.g += g * weight;
      bucket.b += b * weight;
    } else {
      buckets.set(key, { weight, r: r * weight, g: g * weight, b: b * weight });
    }
  }
  let best: { weight: number; r: number; g: number; b: number } | null = null;
  for (const bucket of buckets.values()) if (!best || bucket.weight > best.weight) best = bucket;
  if (!best) return null;
  return `#${hex(best.r / best.weight)}${hex(best.g / best.weight)}${hex(best.b / best.weight)}`;
}

const SAMPLE = 48;

/**
 * Loads a picture and returns its dominant colour. Works for a file just chosen (a local
 * blob: address) and for a stored one when the storage bucket allows cross-origin reads;
 * resolves to null rather than throwing when it can't read the pixels.
 */
export function colourFromImageUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE;
        canvas.height = SAMPLE;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
        resolve(dominantColour(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data));
      } catch {
        resolve(null); // a tainted canvas: the picture can be shown but not read
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
