import { sanityClient, urlFor } from '@/lib/sanity-client';
import { PortableText } from '@/components/portable-text';
import { CosyCornerPost } from '@/lib/blog-types';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CuppiFooter } from '@/components/cuppi/footer';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { CuppiHeader } from '@/components/cuppi/header';

export const revalidate = 60; // Re-fetch post every 60 seconds

type Props = {
  params: Promise<{ slug: string }>;
};

const POST_QUERY = `*[_type == "cosyCorner" && slug.current == $slug][0] {
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
      url,
      metadata {
        dimensions
      }
    },
    alt
  },
  "content": content[]{
    ...,
    _type == "image" => {
      ...,
      asset->{
        ...,
        metadata
      }
    }
  },
  seo {
    metaTitle,
    metaDescription,
    shareImage {
      asset-> {
        _id,
        url
      }
    }
  }
}`;

// Function to generate static paths for all blog posts
export async function generateStaticParams() {
  const posts = await sanityClient.fetch<{ slug: string }[]>(`*[_type == "cosyCorner" && defined(slug.current)]{ "slug": slug.current }`);
  return posts.map((post) => ({
    slug: post.slug,
  }));
}


// Function to fetch a single post
async function getPost(slug: string) {
  const post = await sanityClient.fetch<CosyCornerPost>(POST_QUERY, { slug });
  return post;
}

// Function to generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {
      title: 'Not Found',
      description: 'The page you are looking for does not exist.',
    };
  }

  const metaTitle = post.seo?.metaTitle || post.title;
  const metaDescription = post.seo?.metaDescription || post.excerpt;
  const shareImageUrl = post.seo?.shareImage
    ? urlFor(post.seo.shareImage).width(1200).height(630).quality(100).url()
    : post.mainImage ? urlFor(post.mainImage).width(1200).height(630).quality(100).url() : undefined;

  return {
    title: `${metaTitle} | Cuppi`,
    description: metaDescription,
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      type: 'article',
      publishedTime: post._createdAt,
      url: `/blog/${post.slug.current}`,
      images: shareImageUrl ? [{ url: shareImageUrl }] : [],
    },
  };
}


export default async function CosyCornerPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  return (
     <div className="bg-background text-foreground flex flex-col min-h-screen">
      <CuppiHeader />
      <main className="w-full flex flex-col items-center p-4 flex-grow">
        <div className="w-full max-w-4xl mx-auto container px-4">
            <Button asChild variant="outline">
                <Link href="/blog" className="inline-flex items-center">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to The Cosy Corner
                </Link>
            </Button>
        </div>

        <article className="max-w-4xl mx-auto container px-4 py-12">
          <header className="mb-12 text-center">
              <div className="flex items-center justify-center flex-wrap gap-x-4 text-sm mb-4">
                  <time dateTime={post._createdAt} className="text-muted-foreground">
                      {format(new Date(post._createdAt), "MMMM dd, yyyy")}
                  </time>
                  {post.postType && <Badge variant="secondary">{post.postType}</Badge>}
                  {post.status && <Badge variant="outline">{post.status}</Badge>}
              </div>
            <h1 className="font-headline text-4xl sm:text-5xl font-bold">{post.title}</h1>
            {post.excerpt && (
                <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{post.excerpt}</p>
            )}
          </header>

          {post.mainImage && (
            <div className="relative aspect-video mb-12 rounded-2xl overflow-hidden shadow-xl">
              <Image
                src={urlFor(post.mainImage).width(1600).quality(100).url()}
                alt={post.mainImage.alt || post.title}
                width={1200}
                height={675}
                className="object-cover w-full h-full"
                priority
                quality={100}
              />
            </div>
          )}
          
          <div className="legal-content text-lg leading-relaxed text-foreground/90">
            <PortableText value={post.content} />
          </div>
        </article>

        <div className="w-full max-w-4xl mx-auto container px-4 pb-24 sm:pb-32">
            <Button asChild variant="outline">
                <Link href="/blog" className="inline-flex items-center">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to The Cosy Corner
                </Link>
            </Button>
        </div>

      </main>
      <CuppiFooter />
    </div>
  );
}
