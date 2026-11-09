export type AboutProfile = {
  id: string;
  name: string;
  aboutText: string;
  profilePictureUrl: string;
  /** Download URL of the uploaded CV (a PDF). Unset until one is uploaded in the admin. */
  cvUrl?: string;
  /** The CV's original file name, shown in the admin and used as the downloaded name. */
  cvFileName?: string;
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

export type MusicCover = {
  id: string;
  imageUrl: string;
  /** Optional album/artist label, used as the cover's alt text. */
  title?: string;
  order?: number;
  createdAt?: any;
};

// Apps & Websites live in showcase.ts (the model plus its helpers).
export type { App } from './showcase';

export type LegalDocument = {
  id: string;
  slug: string;
  title: string;
  content: string;
};
