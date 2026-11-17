import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/reveal';
import { PortableText } from '@/components/portable-text';
import { pick, type FeatureContent } from '@/lib/feature-content-types';
import type { Feature, FeatureBlock } from '@/lib/features-types';
import { AppTile } from '../feature-icon';
import { FaqItem } from './faq-item';
import { TINTS } from './tints';
import { MarkedText } from '../marked-text';

type Faqs = Extract<FeatureBlock, { type: 'faqs' }>;

/**
 * Hand-picked FAQs on a colour band: the heading on one side, the questions on the other. Each is a native
 * <details> that slides open and shut (see faq-item.tsx), so the whole answer is in the page's HTML (search engines,
 * no-JavaScript visitors and Ctrl+F all see it). Every answer links to its place in the full FAQ. A question that has
 * since been deleted in Sanity is left out, and a band with nothing left to show is not drawn at all.
 * The page's own app icon sits above the heading; without a feature (never on the site) it is left out.
 */
export function FaqsBlock({ block, content, feature }: { block: Faqs; content?: FeatureContent; feature?: Pick<Feature, 'iconUrl' | 'icon' | 'tile' | 'name'> }) {
  const items = pick(block.ids, content?.faqs);
  if (items.length === 0) return null;
  const tint = TINTS[block.tint];

  return (
    <Reveal className="px-3 py-3 sm:px-6">
      <section className={cn('mx-auto grid max-w-6xl gap-8 rounded-[2.5rem] px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14', tint.surface, tint.text)}>
        <div className="lg:pt-2">
          {feature && <AppTile feature={feature} eager className="mb-5 h-16 w-16 drop-shadow-[0_10px_16px_rgb(var(--c-shadow)/0.18)] sm:h-20 sm:w-20" />}
          <h2 className="font-headline text-3xl font-normal leading-tight tracking-tight sm:text-4xl">
            <MarkedText text={block.title} />
          </h2>
          {block.intro && (
            <p className={cn('mt-3 text-lg', tint.muted)}>
              <MarkedText text={block.intro} />
            </p>
          )}
          <Link href="/faq" className="group mt-6 inline-flex items-center gap-1.5 font-semibold underline-offset-4 hover:underline">
            Browse all FAQs
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>

        <div className="self-start overflow-hidden rounded-[1.75rem] bg-cuppi-card text-cuppi-ink">
          {items.map((item) => (
            <FaqItem key={item.id} question={item.question}>
              <div className="max-w-prose leading-relaxed">
                <PortableText value={item.answer} variant="answer" />
              </div>
              <Link href={`/faq/${item.sectionId}#${item.slug}`} className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-cuppi-brand-deep underline-offset-4 hover:underline">
                Read this in the FAQ
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </FaqItem>
          ))}
        </div>
      </section>
    </Reveal>
  );
}
