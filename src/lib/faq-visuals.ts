import type { FeatureIcon, FeatureTint, TileColour } from './features-types';

// How each help topic looks on the help page: the same app tile as the features.
// A topic about a feature names it (`feature`) and wears that feature's in-app icon, whatever
// is currently set on the Cuppi features page (see faqTile); the general topics use a line icon
// on a coloured tile. A topic that is not listed (a new one added in Sanity) gets the fallback,
// so it still looks right with no code change.
export type FaqTile = { feature?: string; iconUrl?: string; icon: FeatureIcon; tile: TileColour };

export const FAQ_TILES: Record<string, FaqTile> = {
  basics: { icon: 'home', tile: 'amber' },
  account: { icon: 'user', tile: 'blue' },
  household: { icon: 'users', tile: 'green' },
  pro: { icon: 'star', tile: 'pink' },
  shopping: { feature: 'shopping', icon: 'sparkles', tile: 'green' },
  'bin-day': { feature: 'bin-day', icon: 'sparkles', tile: 'blue' },
  budget: { feature: 'budget', icon: 'sparkles', tile: 'amber' },
  receipts: { feature: 'receipts', icon: 'sparkles', tile: 'amber' },
  pets: { feature: 'pets', icon: 'sparkles', tile: 'green' },
  'birthdays-celebrations': { feature: 'celebrations', icon: 'sparkles', tile: 'pink' },
};

export const FALLBACK_TILE: FaqTile = { icon: 'sparkles', tile: 'amber' };

/** A topic's tile, with the icon of the feature it is about (when there is one and it has one). */
export function faqTile(topicId: string, features: { slug: string; iconUrl?: string }[]): FaqTile {
  const tile = FAQ_TILES[topicId] ?? FALLBACK_TILE;
  const iconUrl = tile.feature ? features.find((f) => f.slug === tile.feature)?.iconUrl : undefined;
  return { ...tile, iconUrl };
}

/** The colour a help topic's page wears, from its tile colour. */
export const TINT_FOR_TILE: Record<TileColour, FeatureTint> = {
  pink: 'clay',
  green: 'moss',
  blue: 'sky',
  amber: 'honey',
};
