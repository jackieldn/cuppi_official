import type { FeatureIcon, FeatureTint, TileColour } from './features-types';

// How each help topic looks on the help page: the same app tile as the features.
// Topics about a feature use that feature's in-app icon; the general topics use a
// line icon on a coloured tile. A topic that is not listed (a new one added in
// Sanity) gets the fallback, so it still looks right with no code change.
export type FaqTile = { iconUrl?: string; icon: FeatureIcon; tile: TileColour };

export const FAQ_TILES: Record<string, FaqTile> = {
  basics: { icon: 'home', tile: 'amber' },
  account: { icon: 'user', tile: 'blue' },
  household: { icon: 'users', tile: 'green' },
  pro: { icon: 'star', tile: 'pink' },
  shopping: { iconUrl: '/icons/groceryAppIcon.png', icon: 'sparkles', tile: 'green' },
  'bin-day': { iconUrl: '/icons/trash-bin.png', icon: 'sparkles', tile: 'blue' },
  budget: { iconUrl: '/icons/007-3d-wallet.png', icon: 'sparkles', tile: 'amber' },
  receipts: { iconUrl: '/icons/receiptAppIcon.png', icon: 'sparkles', tile: 'amber' },
  pets: { iconUrl: '/icons/medical-report.png', icon: 'sparkles', tile: 'green' },
  'birthdays-celebrations': { iconUrl: '/icons/confetti-ball.png', icon: 'sparkles', tile: 'pink' },
};

export const FALLBACK_TILE: FaqTile = { icon: 'sparkles', tile: 'amber' };

/** The colour a help topic's page wears, from its tile colour. */
export const TINT_FOR_TILE: Record<TileColour, FeatureTint> = {
  pink: 'clay',
  green: 'moss',
  blue: 'sky',
  amber: 'honey',
};
