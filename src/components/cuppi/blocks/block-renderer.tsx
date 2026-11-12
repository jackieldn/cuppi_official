import type { FeatureBlock } from '@/lib/features-types';
import { CalloutBlock } from './callout-block';
import { CardsBlock } from './cards-block';
import { PointsBlock } from './points-block';
import { ShowcaseBlock } from './showcase-block';

/** Turns a feature's list of blocks into the page body, in order. To add a layout: write it here, add its type in features-types.ts. */
export function BlockRenderer({ blocks }: { blocks: FeatureBlock[] }) {
  return (
    <>
      {blocks.map((block) => {
        switch (block.type) {
          case 'showcase':
            return <ShowcaseBlock key={block.id} block={block} />;
          case 'cards':
            return <CardsBlock key={block.id} block={block} />;
          case 'callout':
            return <CalloutBlock key={block.id} block={block} />;
          case 'points':
            return <PointsBlock key={block.id} block={block} />;
        }
      })}
    </>
  );
}
