import type { Image } from 'sanity'

export type CosyCornerPost = {
  _id: string;
  _createdAt: string;
  title: string;
  slug: {
    current: string;
  };
  postType?: 'Feature Announcement' | 'Guide' | 'Behind the Scenes';
  status?: 'Early Access' | 'In Development' | 'Live';
  excerpt?: string;
  mainImage?: {
    asset: {
      _id: string;
      url: string;
    };
    alt?: string;
  };
  content?: any; // Portable Text
  relatedAppFeatures?: string[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    shareImage?: Image;
  };
};
