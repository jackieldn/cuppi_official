import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const sanityClient = createClient({
  projectId: '0uvqbyjc',
  dataset: 'production',
  apiVersion: '2024-07-25', // use a UTC date in YYYY-MM-DD format
  useCdn: process.env.NODE_ENV === 'production', // `false` if you want to ensure fresh data
});

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: any) {
  return builder.image(source);
}
