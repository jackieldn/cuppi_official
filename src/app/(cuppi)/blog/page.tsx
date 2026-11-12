import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { sanityClient, urlFor } from '@/lib/sanity-client';
import { CosyCornerPost } from '@/lib/blog-types';
import { Badge } from '@/components/ui/badge';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';
import { SpotlightPattern } from '@/components/cuppi/spotlight-pattern';

export const revalidate = 60; // Re-fetch posts every 60 seconds

// Only the articles being shown are fetched: $end is how many we want, plus one, so we know whether there are more.
const COSY_CORNER_QUERY = `*[_type == "cosyCorner"] | order(_createdAt desc) [0...$end] {
  _id,
  _createdAt,
  title,
  slug,
  postType,
  status,
  excerpt,
  mainImage {
    asset->{
      _id,
      url
    },
    alt
  }
}`;

// The newest article is the hero. Below it, this many more are listed, then "More articles" adds this many again.
const PAGE_SIZE = 5;
const MAX_LISTED = 200;

async function getPosts(listed: number) {
  const posts = await sanityClient.fetch<CosyCornerPost[]>(COSY_CORNER_QUERY, { end: 1 + listed + 1 });
  return { latest: posts[0] ?? null, list: posts.slice(1, 1 + listed), hasMore: posts.length > 1 + listed };
}

// "More articles" is a plain link to /blog?show=10, 15, ... so it works with no JavaScript.
type Props = { searchParams: Promise<{ show?: string | string[] }> };

export default async function CosyCornerPage({ searchParams }: Props) {
  const { show } = await searchParams;
  const asked = parseInt(Array.isArray(show) ? show[0] : (show ?? ''), 10);
  const listed = Number.isFinite(asked) ? Math.min(Math.max(asked, PAGE_SIZE), MAX_LISTED) : PAGE_SIZE;
  const { latest, list, hasMore } = await getPosts(listed);

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="flex-grow">
        <header className="mx-auto max-w-3xl px-6 pb-10 pt-14 text-center sm:pt-20">
          <h1 className="cuppi-fade-up font-headline text-5xl font-normal leading-[1.05] tracking-tight sm:text-6xl">The Cosy Corner</h1>
          <p className="cuppi-fade-up mt-4 text-lg text-cuppi-ink-soft" style={{ '--d': '100ms' } as React.CSSProperties}>
            Feature announcements, guides, and behind-the-scenes stories from the world of Cuppi.
          </p>
        </header>

        <div className="mx-auto w-full max-w-6xl px-3 pb-24 sm:px-6 sm:pb-32">
          {latest && <LatestHero post={latest} />}

          {list.length > 0 && (
            <div className="mx-auto mt-16 grid max-w-4xl gap-12 px-1 sm:px-4">
              {list.map((post) => (
                <Link key={post._id} href={`/blog/${post.slug.current}`} className="group grid items-center gap-8 md:grid-cols-3">
                  {post.mainImage && (
                    <div className="relative aspect-video overflow-hidden rounded-[1.5rem] transition-transform duration-500 [transition-timing-function:var(--ease-spring)] group-hover:-translate-y-1 md:col-span-1">
                      <Image
                        src={urlFor(post.mainImage).width(800).quality(100).url()}
                        alt={post.mainImage.alt || post.title}
                        width={400}
                        height={225}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        quality={100}
                      />
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-x-4 text-xs">
                      <time dateTime={post._createdAt} className="text-cuppi-ink-soft">
                        {format(new Date(post._createdAt), 'MMMM dd, yyyy')}
                      </time>
                      {post.postType && <Badge variant="secondary">{post.postType}</Badge>}
                      {post.status && <Badge variant="outline">{post.status}</Badge>}
                    </div>
                    <h2 className="mt-3 font-headline text-3xl leading-tight transition-colors group-hover:text-cuppi-brand-deep">{post.title}</h2>
                    <p className="mt-3 line-clamp-3 text-base leading-7 text-cuppi-ink-soft">{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="mt-16 text-center">
              <Link
                href={`/blog?show=${listed + PAGE_SIZE}`}
                scroll={false}
                prefetch={false}
                className="group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-lg font-semibold text-cuppi-brand-deep transition-colors hover:bg-cuppi-honey-soft"
              >
                More articles
                <ChevronDown className="h-5 w-5 transition-transform duration-300 group-hover:translate-y-0.5" aria-hidden />
              </Link>
            </div>
          )}
        </div>
      </main>
      <CuppiFooter />
    </div>
  );
}

/** The newest article, big: its picture, its headline and a few lines. The whole block is the link. */
function LatestHero({ post }: { post: CosyCornerPost }) {
  return (
    <Link
      href={`/blog/${post.slug.current}`}
      className="cuppi-fade-up group relative block overflow-hidden rounded-[2.5rem] bg-cuppi-honey-soft transition-transform duration-500 [transition-timing-function:var(--ease-spring)] hover:-translate-y-1"
      style={{ '--d': '200ms' } as React.CSSProperties}
    >
      <SpotlightPattern pattern="autumnPorch" focus="72% 50%" spot={0.5} />
      <div className={post.mainImage ? 'relative grid items-center md:grid-cols-[1fr_1.15fr]' : 'relative grid'}>
        <div className="order-2 flex flex-col items-start gap-5 px-7 py-9 sm:px-12 md:order-1 md:py-14">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <time dateTime={post._createdAt} className="text-cuppi-ink-soft">
              {format(new Date(post._createdAt), 'MMMM dd, yyyy')}
            </time>
            {post.postType && <Badge variant="secondary">{post.postType}</Badge>}
            {post.status && <Badge variant="outline">{post.status}</Badge>}
          </div>
          <h2 className="font-headline text-4xl font-normal leading-[1.05] tracking-tight text-balance sm:text-5xl">{post.title}</h2>
          {post.excerpt && <p className="line-clamp-4 max-w-xl text-lg leading-relaxed text-cuppi-ink-soft">{post.excerpt}</p>}
          <span className="mt-1 inline-flex items-center gap-2 text-lg font-semibold text-cuppi-brand-deep">
            Read the article
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </span>
        </div>

        {post.mainImage && (
          <div className="order-1 p-3 sm:p-4 md:order-2 md:p-5">
            <div className="relative aspect-video overflow-hidden rounded-[2rem]">
              <Image
                src={urlFor(post.mainImage).width(1400).quality(90).url()}
                alt={post.mainImage.alt || post.title}
                fill
                sizes="(max-width: 768px) 92vw, 600px"
                priority
                className="object-cover"
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
