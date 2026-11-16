import type { ReactNode } from 'react';
import type { Feature, FeatureBlock } from '@/lib/features-types';
import { BannerBlock } from './banner-block';
import { CalloutBlock } from './callout-block';
import { CardsBlock } from './cards-block';
import { PlansBlock } from './plans-block';
import { PointsBlock } from './points-block';
import { ShowcaseBlock } from './showcase-block';
import { TabsBlock } from './tabs-block';
import { VideoBlock } from './video-block';

function renderBlock(block: FeatureBlock, feature?: Feature): ReactNode {
  switch (block.type) {
    case 'showcase':
      return <ShowcaseBlock block={block} />;
    case 'cards':
      return <CardsBlock block={block} />;
    case 'callout':
      return <CalloutBlock block={block} />;
    case 'points':
      return <PointsBlock block={block} />;
    case 'tabs':
      return <TabsBlock block={block} />;
    case 'banner':
      return <BannerBlock block={block} />;
    case 'video':
      return <VideoBlock block={block} />;
    case 'plans':
      return <PlansBlock block={block} feature={feature} />;
  }
}

/**
 * Turns a feature's list of blocks into the page body, in order. `feature` is the page's own feature, for
 * the layouts that show its app icon. `wrap` lets the admin's preview put each section in a box it can
 * select; the site does not use it.
 * To add a layout: write it here, add its type in features-types.ts and its template in feature-sections.ts.
 */
export function BlockRenderer({ blocks, feature, wrap }: { blocks: FeatureBlock[]; feature?: Feature; wrap?: (block: FeatureBlock, node: ReactNode) => ReactNode }) {
  return (
    <>
      {blocks.map((block) => {
        const node = renderBlock(block, feature);
        return wrap ? <div key={block.id}>{wrap(block, node)}</div> : <div key={block.id} className="contents">{node}</div>;
      })}
    </>
  );
}
