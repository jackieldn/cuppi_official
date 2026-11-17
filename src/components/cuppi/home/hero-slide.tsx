'use client';

import { createContext, useContext } from 'react';

/**
 * What the home page's slideshow (HeroCarousel) tells each hero inside it: which slide it is, whether it is the one on show,
 * and a way to say its opening shot has started (so the slideshow's countdown starts with it, not before). A hero on its own,
 * outside a slideshow, gets nothing and behaves as it always did.
 */
export type HeroSlide = {
  index: number;
  active: boolean;
  reportPlay: (index: number) => void;
};

export const HeroSlideContext = createContext<HeroSlide | null>(null);

export const useHeroSlide = () => useContext(HeroSlideContext);
