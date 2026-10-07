'use client';

import Image from 'next/image';
import { AboutProfile } from '@/lib/about-types';

interface ProfileSectionProps {
  profile: AboutProfile;
}

export function ProfileSection({ profile }: ProfileSectionProps) {
  return (
    <section className="flex flex-col items-center text-center">
      <div className="relative w-40 h-40 md:w-48 md:h-48 mb-6">
        <Image
          src={profile.profilePictureUrl}
          alt={`Profile picture of ${profile.name}`}
          fill
          className="object-cover rounded-[3rem] shadow-lg"
          sizes="(max-width: 768px) 160px, 192px"
        />
      </div>
      <h2 className="font-headline text-4xl font-bold">{profile.name}</h2>
      <p className="mt-4 max-w-3xl text-lg text-foreground/80 leading-relaxed">
        {profile.aboutText}
      </p>
    </section>
  );
}
