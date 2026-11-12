import { featuresSeed } from './features-seed';
import { GROUP_ORDER, hasPage, validateFeatures, type Feature, type FeatureGroup, type PageFeature } from './features-types';

// One place the site asks for features. Today it returns the seed. When the
// admin arrives this becomes "read the cuppi_features collection, and fall back
// to the seed if it is empty or unreachable" (the same pattern as the home
// page), and nothing that calls it has to change.
export async function getFeatures(): Promise<Feature[]> {
  const problems = validateFeatures(featuresSeed);
  if (problems.length > 0) console.error(`Cuppi features have problems:\n- ${problems.join('\n- ')}`);
  return [...featuresSeed].sort((a, b) => a.order - b.order);
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
