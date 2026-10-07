import Link from 'next/link';
import Image from 'next/image';
import { sanityClient, urlFor } from '@/lib/sanity-client';
import { CosyCornerPost } from '@/lib/blog-types';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

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
    <section id="whats-new" className="w-full max-w-6xl scroll-mt-24 py-3 sm:py-4">
        <div className="px-4">
          <div className="text-left max-w-3xl mb-4">
            <h2 className="text-xl font-semibold text-muted-foreground">What's new?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link key={post._id} href={`/blog/${post.slug.current}`} className="group flex flex-col items-start justify-between rounded-2xl bg-card p-4 hover:shadow-lg transition-shadow">
                {post.mainImage && (
                  <div className="relative w-full aspect-video mb-4 overflow-hidden rounded-lg">
                    <Image
                      src={urlFor(post.mainImage).width(800).quality(100).url()}
                      alt={post.mainImage.alt || post.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  </div>
                )}
                <div className="flex-grow">
                  <h4 className="font-headline text-xl font-bold group-hover:text-primary">{post.title}</h4>
                </div>
                <time dateTime={post._createdAt} className="text-sm text-muted-foreground mt-2">
                  {format(new Date(post._createdAt), "MMMM dd, yyyy")}
                </time>
              </Link>
            ))}
          </div>
        </div>
    </section>
  );
}
