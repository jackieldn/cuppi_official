'use client';

import Image from 'next/image';
import { useFetchCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { AboutProfile, TechnicalSkill, WorkExperience, Fact, Testimonial, MusicCover } from '@/lib/about-types';
import { MusicTasteSection } from '@/components/about/music-taste-section';
import { ShineCard } from '@/components/about/shine-card';
import { ProfileSection } from '@/components/about/profile-section';
import { SkillsSection } from '@/components/about/skills-section';
import { ExperienceSection } from '@/components/about/experience-section';
import { FactsSection } from '@/components/about/facts-section';
import { useMemo, useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Reveal } from '@/components/ui/reveal';
import { TestimonialsSection } from '@/components/about/testimonials-section';

export default function AboutPage() {
  const firestore = useFirestore();

  const profilesQuery = useMemo(() => 
    firestore ? query(collection(firestore, 'about_profile')) : null, 
    [firestore]
  );
  const { data: profiles, isLoading: isProfileLoading } = useFetchCollection<AboutProfile>(profilesQuery);
  
  const skillsQuery = useMemo(() =>
    firestore ? query(collection(firestore, 'technical_skills'), orderBy('order')) : null,
    [firestore]
  );
  const { data: skills, isLoading: areSkillsLoading } = useFetchCollection<TechnicalSkill>(skillsQuery);

  const experiencesQuery = useMemo(() =>
    firestore ? query(collection(firestore, 'work_experience')) : null,
    [firestore]
  );
  const { data: experiences, isLoading: areExperiencesLoading } = useFetchCollection<WorkExperience>(experiencesQuery);
  
  const testimonialsQuery = useMemo(() =>
    firestore ? query(collection(firestore, 'testimonials'), orderBy('order')) : null,
    [firestore]
  );
  const { data: testimonials, isLoading: areTestimonialsLoading } = useFetchCollection<Testimonial>(testimonialsQuery);

  const factsQuery = useMemo(() =>
    firestore ? query(collection(firestore, 'facts'), orderBy('order')) : null,
    [firestore]
  );
  const { data: facts, isLoading: areFactsLoading } = useFetchCollection<Fact>(factsQuery);
  
  // Music taste is optional, so unlike the sections above a failed fetch (for example
  // the rules not being deployed yet) just hides it instead of taking the page down.
  const [musicCovers, setMusicCovers] = useState<MusicCover[]>([]);
  const [areMusicCoversLoading, setAreMusicCoversLoading] = useState(true);
  useEffect(() => {
    if (!firestore) return;
    let isMounted = true;
    getDocs(query(collection(firestore, 'music_covers'), orderBy('order')))
      .then((snapshot) => {
        if (isMounted) setMusicCovers(snapshot.docs.map((d) => ({ ...(d.data() as Omit<MusicCover, 'id'>), id: d.id })));
      })
      .catch((error) => console.warn('Could not load music covers:', error))
      .finally(() => {
        if (isMounted) setAreMusicCoversLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [firestore]);

  const sortedExperiences = useMemo(() => {
    if (!experiences) return [];
    return [...experiences].sort((a, b) => {
      const orderA = a.order ?? Infinity;
      const orderB = b.order ?? Infinity;
      if (orderA !== Infinity || orderB !== Infinity) {
        if (orderA !== orderB) return orderA - orderB;
      }
      // Fallback to date if order is the same or not present
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      return dateB - dateA; // Most recent first
    });
  }, [experiences]);


  const profile = profiles?.[0];
  const isLoading = isProfileLoading || areSkillsLoading || areExperiencesLoading || areFactsLoading || areTestimonialsLoading || areMusicCoversLoading;

  useEffect(() => {
    // Only run this logic on the client, after the initial render and when data is loaded.
    if (!isLoading && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash) {
        // A small delay can help ensure all elements are painted before we try to scroll.
        setTimeout(() => {
          const element = document.querySelector(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    }
  }, [isLoading]);

  return (
    <div className="bg-background text-foreground">
      <header className="pt-24 pb-8 sm:pt-32">
        <Reveal className="container mx-auto px-4 text-center">
          <h1 className="font-headline text-5xl font-bold tracking-tight text-accent sm:text-6xl">
            History & Fun Facts
          </h1>
        </Reveal>
      </header>

      <main className="pb-16 sm:pb-24">
        {!isLoading && (
          <>
            <div className="container mx-auto px-4">
            <div className="space-y-16">
              {profile && (
                <Reveal className="max-w-3xl mx-auto">
                    <ShineCard className="bg-card p-8 sm:p-12 rounded-2xl border shadow-sm">
                        <ProfileSection profile={profile} />
                    </ShineCard>
                </Reveal>
              )}
              {skills && skills.length > 0 && <SkillsSection skills={skills} />}
            </div>
            {sortedExperiences && sortedExperiences.length > 0 && (
                <div className="my-16">
                    <ExperienceSection experiences={sortedExperiences} />
                </div>
            )}
            {testimonials && testimonials.length > 0 && <TestimonialsSection testimonials={testimonials} />}
            </div>
            {/* Outside the padded container: the covers run edge to edge. */}
            {musicCovers.length > 0 && <MusicTasteSection covers={musicCovers} />}
            <div className="container mx-auto px-4">
              {facts && facts.length > 0 && <FactsSection facts={facts} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
