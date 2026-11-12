import Link from 'next/link';
import Image from 'next/image';
import { sanityClient, urlFor } from '@/lib/sanity-client';
import { CosyCornerPost } from '@/lib/blog-types';
import { format } from 'date-fns';

export const revalidate = 60; // Re-fetch posts every 60 seconds

const LATEST_POSTS_QUERY = `*[_type == "cosyCorner"] | order(_createdAt desc) [0...3] {
  _id,
  _createdAt,
  title,
  slug,
  mainImage {
    asset->{
      _id,
      url
    },
    alt
  }
}`;

async function getLatestPosts() {
  try {
    const posts = await sanityClient.fetch<CosyCornerPost[]>(LATEST_POSTS_QUERY);
    return posts;
  } catch (error) {
    console.error("Failed to fetch latest posts:", error);
    return [];
  }
}

export async function WhatsNew() {
  const posts = await getLatestPosts();

  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <section id="whats-new" className="mt-16 w-full max-w-6xl scroll-mt-24 px-2 sm:px-4">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="font-headline text-3xl tracking-tight sm:text-4xl">What&rsquo;s new</h2>
        <Link href="/blog" className="text-sm font-semibold text-cuppi-brand-deep hover:underline">
          More from The Cosy Corner
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post._id}
            href={`/blog/${post.slug.current}`}
            className="group flex flex-col rounded-[2rem] bg-cuppi-card p-3 transition-transform duration-500 [transition-timing-function:var(--ease-spring)] hover:-translate-y-1"
          >
            {post.mainImage && (
              <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-[1.5rem]">
                <Image
                  src={urlFor(post.mainImage).width(800).quality(100).url()}
                  alt={post.mainImage.alt || post.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw"
                />
              </div>
            )}
            <div className="flex flex-grow flex-col justify-between gap-2 px-3 pb-3">
              <h3 className="font-headline text-2xl leading-snug">{post.title}</h3>
              <time dateTime={post._createdAt} className="text-sm text-cuppi-ink-soft">
                {format(new Date(post._createdAt), 'MMMM dd, yyyy')}
              </time>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
