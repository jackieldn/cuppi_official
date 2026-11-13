import { getFanStored, getFeatureOverrides } from './cuppi-site-data';
import { applyFan } from './fan-settings';
import { featuresSeed } from './features-seed';
import { GROUP_ORDER, hasPage, isPublished, mergeFeatures, validateFeatures, type Feature, type FeatureGroup, type PageFeature } from './features-types';

// One place the site asks for features: the seed (features-seed.ts) with the admin's edits
// applied (the cuppi_features collection), keeping only the published ones. If the database
// cannot be reached the seed is used as it is, so the site always has its features.
// Menu visibility is a separate switch: see inMenu() in features-types.
export async function getFeatures(): Promise<Feature[]> {
  const features = mergeFeatures(featuresSeed, await getFeatureOverrides());
  const problems = validateFeatures(features);
  if (problems.length > 0) console.error(`Cuppi features have problems:\n- ${problems.join('\n- ')}`);
  return features.filter(isPublished);
}

/** Only the features that have a page of their own. */
export async function getPageFeatures(): Promise<PageFeature[]> {
  return (await getFeatures()).filter(hasPage);
}

export async function getFeature(slug: string): Promise<PageFeature | null> {
  return (await getPageFeatures()).find((f) => f.slug === slug) ?? null;
}

export function groupFeatures(features: Feature[]): { group: FeatureGroup; items: Feature[] }[] {
  return GROUP_ORDER.map((group) => ({ group, items: features.filter((f) => f.group === group) })).filter(
    (g) => g.items.length > 0,
  );
}

/**
 * The features in the icon banner (Cuppi's icon with the in-app icons sliding out of it), in the
 * admin's order. The banner can show any feature in the Features menu; the "Your Home" ones are not
 * offered, since the banner is about what Cuppi does for the household.
 */
export async function getFanFeatures(): Promise<Feature[]> {
  const features = (await getFeatures()).filter((f) => f.group !== 'yours');
  return applyFan(features, await getFanStored());
}
