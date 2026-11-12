import { getFeatures, groupFeatures } from '@/lib/features';
import { SiteHeader } from './header/site-header';

// Every Cuppi page puts this at the top. It is a server component so the
// Features menu is built from the same feature list as the pages themselves:
// add a feature and it appears in the menu with no further edit.
export async function CuppiHeader() {
  const groups = groupFeatures(await getFeatures());
  return <SiteHeader groups={groups} />;
}
