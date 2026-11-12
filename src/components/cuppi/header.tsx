import { getFeatures, groupFeatures } from '@/lib/features';
import { getMenuSettings } from '@/lib/cuppi-site-data';
import { inMenu } from '@/lib/features-types';
import { SiteHeader } from './header/site-header';

// Every Cuppi page puts this at the top. It is a server component so the menu is built from
// the same feature list as the pages themselves, and from the menu the admin has set up:
// add a feature (or switch one on for the menu) and it appears here with no further edit.
export async function CuppiHeader() {
  const [features, menu] = await Promise.all([getFeatures(), getMenuSettings()]);
  return <SiteHeader groups={groupFeatures(features.filter(inMenu))} links={menu.links.filter((l) => l.visible)} download={menu.download} />;
}
