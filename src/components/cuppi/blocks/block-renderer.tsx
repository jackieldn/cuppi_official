import type { ReactNode } from 'react';
import type { FeatureBlock } from '@/lib/features-types';
import { BannerBlock } from './banner-block';
import { CalloutBlock } from './callout-block';
import { CardsBlock } from './cards-block';
import { PointsBlock } from './points-block';
import { ShowcaseBlock } from './showcase-block';
import { TabsBlock } from './tabs-block';
import { VideoBlock } from './video-block';

function renderBlock(block: FeatureBlock): ReactNode {
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
  }
}

/**
 * Turns a feature's list of blocks into the page body, in order. `wrap` lets the admin's preview put
 * each section in a box it can select; the site does not use it.
 * To add a layout: write it here, add its type in features-types.ts and its template in feature-sections.ts.
 */
export function BlockRenderer({ blocks, wrap }: { blocks: FeatureBlock[]; wrap?: (block: FeatureBlock, node: ReactNode) => ReactNode }) {
  return (
    <>
      {blocks.map((block) => {
        const node = renderBlock(block);
        return wrap ? <div key={block.id}>{wrap(block, node)}</div> : <div key={block.id} className="contents">{node}</div>;
      })}
    </>
  );
}
