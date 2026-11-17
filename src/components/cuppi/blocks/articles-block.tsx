import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/ui/reveal';
import { FadeImage } from '@/components/cuppi/fade-image';
import { pick, type ArticleCard, type FeatureContent } from '@/lib/feature-content-types';
import type { FeatureBlock } from '@/lib/features-types';
import { TINTS } from './tints';
import { MarkedText } from '../marked-text';

type Articles = Extract<FeatureBlock, { type: 'articles' }>;

// How many columns the cards get, so a row is never one lonely card at the end.
const COLUMNS: Record<number, string> = {
  2: 'sm:grid-cols-2',
  4: 'sm:grid-cols-2',
};

/**
 * Hand-picked Cosy Corner articles on a colour band: a row of cards, each a link to its article. One article is
 * shown wide, picture beside words. An article that has since been deleted in Sanity is left out, and a band with
 * nothing left to show is not drawn at all.
 */
export function ArticlesBlock({ block, content }: { block: Articles; content?: FeatureContent }) {
  const posts = pick(block.ids, content?.articles);
  if (posts.length === 0) return null;
  const tint = TINTS[block.tint];
  const solo = posts.length === 1;

  return (
    <Reveal className="px-3 py-3 sm:px-6">
      <section className={cn('mx-auto max-w-6xl rounded-[2.5rem] px-5 py-10 sm:px-10 sm:py-14', tint.surface, tint.text)}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 pb-8">
          <div className="max-w-2xl">
            <h2 className="font-headline text-3xl font-normal leading-tight tracking-tight sm:text-4xl">
              <MarkedText text={block.title} />
            </h2>
            {block.intro && (
              <p className={cn('mt-3 text-lg', tint.muted)}>
                <MarkedText text={block.intro} />
              </p>
            )}
          </div>
          <Link href="/blog" className="group inline-flex shrink-0 items-center gap-1.5 font-semibold underline-offset-4 hover:underline">
            All articles
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>

        <div className={cn('grid gap-4', !solo && (COLUMNS[posts.length] ?? 'sm:grid-cols-2 lg:grid-cols-3'))}>
          {posts.map((post) => (
            <ArticleCardLink key={post.id} post={post} solo={solo} />
          ))}
        </div>
      </section>
    </Reveal>
  );
}

function ArticleCardLink({ post, solo }: { post: ArticleCard; solo: boolean }) {
  return (
    <Reveal stagger={90}>
      <Link
        href={`/blog/${post.slug}`}
        className={cn(
          'group flex h-full flex-col rounded-[1.75rem] bg-cuppi-card p-3 text-cuppi-ink transition-transform duration-500 [transition-timing-function:var(--ease-spring)] hover:-translate-y-1',
          solo && 'md:flex-row md:items-center md:gap-3',
        )}
      >
        {post.image && (
          <div className={cn('relative mb-4 aspect-video w-full shrink-0 overflow-hidden rounded-[1.25rem]', solo && 'md:mb-0 md:w-1/2')}>
            <FadeImage
              src={post.image.url}
              alt={post.image.alt}
              fill
              sizes={solo ? '(max-width: 768px) 90vw, 560px' : '(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 360px'}
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        )}
        <div className={cn('flex flex-1 flex-col gap-2 px-2 pb-2', solo && 'md:px-6 md:py-4')}>
          <time dateTime={post.date} className="text-sm text-cuppi-ink-soft">
            {format(new Date(post.date), 'd MMM yyyy')}
          </time>
          <h3 className={cn('font-headline font-normal leading-snug', solo ? 'text-2xl sm:text-3xl' : 'text-xl')}>{post.title}</h3>
          {post.excerpt && <p className={cn('text-cuppi-ink-soft', solo ? 'line-clamp-4 leading-relaxed' : 'line-clamp-3 text-sm leading-relaxed')}>{post.excerpt}</p>}
          <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-cuppi-brand-deep">
            Read the article
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </span>
        </div>
      </Link>
    </Reveal>
  );
}
