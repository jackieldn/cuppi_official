import 'server-only';
import { getCompareStored } from './cuppi-site-data';
import { resolveCompare } from './compare-settings';
import type { CompareContent } from './compare-data';

/** What the comparison page and its snapshots show: what the admin saved, or the default content when nothing usable is saved. */
export async function getCompare(): Promise<CompareContent> {
  return resolveCompare(await getCompareStored());
}
