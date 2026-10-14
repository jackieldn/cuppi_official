import type { Metadata } from 'next';

// Same share image as the Cuppi layout (src/app/(cuppi)/layout.tsx). A page's
// `openGraph` replaces the layout's wholesale, so the image is repeated here.
const SHARE_IMAGE =
  'https://firebasestorage.googleapis.com/v0/b/studio-5700093446-89b93.firebasestorage.app/o/homeos_landing%2Fheader_landing%2FHomeOS-v2%2C2.png?alt=media&token=4ae309b8-7f9e-4060-b59d-39d087e0180a';

/** Title, description, canonical URL and share preview for an FAQ page. `path` is relative to the site. */
export function faqMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const fullTitle = `${title} | Cuppi`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: 'Cuppi',
      locale: 'en_GB',
      type: 'website',
      images: [{ url: SHARE_IMAGE, width: 512, height: 512 }],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: [SHARE_IMAGE] },
  };
}
