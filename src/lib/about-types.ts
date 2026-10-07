export type AboutProfile = {
  id: string;
  name: string;
  aboutText: string;
  profilePictureUrl: string;
};

export type TechnicalSkill = {
  id:string;
  name: string;
  level: number;
  order?: number;
  iconUrl: string;
};

export type WorkExperience = {
  id: string;
  companyName: string;
  position: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description?: string;
  logoUrl: string;
  order?: number;
};

export type Fact = {
  id: string;
  title: string;
  description: string;
  order?: number;
};

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  company: string;
  text: string;
  order?: number;
  date?: string;
};

export type GalleryImage = {
  url: string;
  width: number;
  height: number;
};

export type Update = {
  id: string;
  date: string;
  version: string;
  description: string;
};

export type App = {
  id: string;
  title: string;
  slug: string;
  description: string;
  tags: string[];
  platforms: ('Web' | 'iOS' | 'Android' | 'MacOS' | 'Windows')[];
  availability: 'Available' | 'In Development' | 'Beta' | 'Retired';
  releaseDate: string;
  link: string;
  galleryImages: GalleryImage[];
  updateHistory: Update[];
  coverImage: GalleryImage;
};

export type LegalDocument = {
  id: string;
  slug: string;
  title: string;
  content: string;
};
