import { getFeatures, groupFeatures } from '@/lib/features';
import { getBanners, getMenuSettings, getTools } from '@/lib/cuppi-site-data';
import { menuTools } from '@/lib/tools/settings';
import { pickBanner, ukDay } from '@/lib/banners';
import { inMenu } from '@/lib/features-types';
import { SiteBanner } from './site-banner';
import { SiteHeader } from './header/site-header';

// Every Cuppi page puts this at the top. It is a server component so the menu is built from
// the same feature list as the pages themselves, and from the menu the admin has set up:
// add a feature (or switch one on for the menu) and it appears here with no further edit.
// The banner, if one is scheduled for today (Cuppi > Banners), sits just under the menu.
export async function CuppiHeader() {
  const [features, menu, banners, tools] = await Promise.all([getFeatures(), getMenuSettings(), getBanners(), getTools()]);
  const banner = pickBanner(banners, ukDay());
  return (
    <>
      <SiteHeader groups={groupFeatures(features.filter(inMenu))} tools={menuTools(tools)} links={menu.links.filter((l) => l.visible)} download={menu.download} />
      {banner && <SiteBanner banner={banner} />}
    </>
  );
}
