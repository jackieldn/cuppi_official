import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';

export type Project = {
  id: string;
  slug: string;
  title: string;
  overview: string;
  client: string;
  timeframe: string;
  software: string[];
  tags: string[];
  coverImage: ImagePlaceholder;
  galleryImages: string[];
  videoUrls?: string[];
  featured?: boolean;
  description?: string;
  imageUrl?: string;
  blurredImageUrl?: string;
  deliveryYear?: string;
  deliveryMonth?: string;
  privacy?: {
    isPasswordProtected: boolean;
    password?: string;
  };
  noAi?: boolean;
  aiDisclaimer?: string;
};

const findImage = (id: string): ImagePlaceholder => {
    const image = PlaceHolderImages.find((img) => img.id === id);
    if (!image) {
        throw new Error(`Image with id "${id}" not found.`);
    }
    return image;
};

export const projects: Project[] = [
  {
    id: "audible-david-copperfield",
    slug: "audible-david-copperfield",
    title: "Audible - David Copperfield",
    overview: "Collaborating closely with an external VFX team, I played a key role in tackling the highly demanding character rotoscoping using Mocha Pro and providing project files for the subsequent compositing work. In addition to that, I contributed to enhancing scene transitions, creating a lightning effect (utilising a depth map created in DaVinci), performing background clean-ups, and crafting the animation for the endframe.",
    client: "Sassy Create | Audible",
    timeframe: "2.5 weeks",
    software: ["After Effects", "Photoshop", "Mocha Pro"],
    tags: ["Rotoscoping", "Compositing", "Animation", "VFX"],
    coverImage: findImage("work-3"),
    galleryImages: [
        findImage("featured-1").imageUrl,
        findImage("featured-2").imageUrl,
        findImage("featured-3").imageUrl,
        findImage("featured-4").imageUrl,
    ],
    videoUrls: ["https://www.youtube.com/embed/dQw4w9WgXcQ"],
    featured: true,
    imageUrl: findImage("work-3").imageUrl,
    description: "Audible - David Copperfield"
  }
];

    