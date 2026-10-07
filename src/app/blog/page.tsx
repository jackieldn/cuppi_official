
import Link from 'next/link';
import Image from 'next/image';
import { sanityClient, urlFor } from '@/lib/sanity-client';
import { CosyCornerPost } from '@/lib/blog-types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CuppiFooter } from '@/components/cuppi/footer';
import { CuppiHeader } from '@/components/cuppi/header';

export const revalidate = 60; // Re-fetch posts every 60 seconds

const COSY_CORNER_QUERY = `*[_type == "cosyCorner"] | order(_createdAt desc) {
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

async function getPosts() {
  const posts = await sanityClient.fetch<CosyCornerPost[]>(COSY_CORNER_QUERY);
  return posts;
}

export default async function CosyCornerPage() {
  const posts = await getPosts();

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="w-full flex flex-col items-center p-4 flex-grow">
        <div className="max-w-4xl mx-auto container px-4 pb-24 sm:pb-32 w-full">
          <h1 className="font-headline text-4xl sm:text-5xl font-bold mb-4 text-center">The Cosy Corner</h1>
          <p className="text-lg text-muted-foreground text-center mb-16">
            Feature announcements, guides, and behind-the-scenes stories from the world of Cuppi.
          </p>

          <div className="grid gap-12">
            {posts.map((post) => (
              <Link key={post._id} href={`/blog/${post.slug.current}`} className="group grid md:grid-cols-3 gap-8 items-center">
                {post.mainImage && (
                  <div className="relative aspect-video md:col-span-1 overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ease-in-out group-hover:shadow-xl group-hover:ring-4 group-hover:ring-accent">
                    <Image
                      src={urlFor(post.mainImage).width(800).quality(100).url()}
                      alt={post.mainImage.alt || post.title}
                      width={400}
                      height={225}
                      className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                      quality={100}
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <div className="flex items-center gap-x-4 text-xs">
                    <time dateTime={post._createdAt} className="text-muted-foreground">
                      {format(new Date(post._createdAt), "MMMM dd, yyyy")}
                    </time>
                    {post.postType && <Badge variant="secondary">{post.postType}</Badge>}
                    {post.status && <Badge variant="outline">{post.status}</Badge>}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold leading-tight text-foreground group-hover:text-primary">
                    {post.title}
                  </h2>
                  <p className="mt-4 line-clamp-3 text-base leading-7 text-muted-foreground">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <CuppiFooter />
    </div>
  );
}
