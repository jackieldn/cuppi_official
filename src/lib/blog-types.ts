// Shape of a Sanity image field as the API returns it. (The `sanity` package,
// which this used to import from, is not a dependency of this site.)
type Image = {
  _type?: 'image';
  asset?: { _ref?: string; _type?: string };
  alt?: string;
  hotspot?: unknown;
  crop?: unknown;
};

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
