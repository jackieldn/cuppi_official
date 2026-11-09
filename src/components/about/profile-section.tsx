'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AboutProfile } from '@/lib/about-types';

interface ProfileSectionProps {
  profile: AboutProfile;
}

// The middle initial "C" grows into "Csaba": these are the letters typed after it.
const COMPLETION = 'saba';
// How long each letter's glow takes to ease out.
const LETTER_MS = 700;
// The wait before each letter, like a typewriter: some keys come quickly, some after a
// longer pause. The first is the beat between the cursor arriving and the first key.
// Each is nudged by up to TYPING_JITTER_MS either way so it never sounds mechanical.
const TYPING_DELAYS_MS = [320, 110, 420, 140];
const TYPING_JITTER_MS = 40;

// Once the name has been typed it stays typed until the page is refreshed (a refresh
// resets this module), even if the visitor leaves the About page and comes back.
let nameTyped = false;

/**
 * The profile name ("Jack C Ward"). The first time the cursor touches it, the "C"
 * completes into "Csaba", typed out like a typewriter with quick and slow keys. Each
 * letter appears with an orange glow that eases out until it matches the rest. "Jack"
 * and "Ward" stay as they are, and the full name then stays on until the page is
 * refreshed. Mouse only; with reduced motion the full name just appears. A name without
 * a lone "C" is left alone.
 */
function ProfileName({ name }: { name: string }) {
  const [typed, setTyped] = useState(0);
  // True when the letters are being typed now (they glow), false when restored.
  const [live, setLive] = useState(true);
  const started = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const words = name.split(' ');
  const initialIndex = words.findIndex((word) => word === 'C');
  const canType = initialIndex !== -1;

  // Back on the page after typing it earlier: show the finished name at once.
  useEffect(() => {
    if (nameTyped && canType) {
      started.current = true;
      setLive(false);
      setTyped(COMPLETION.length);
    }
  }, [canType]);

  const start = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !canType || started.current) return;
    started.current = true;
    nameTyped = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLive(false);
      setTyped(COMPLETION.length);
      return;
    }
    // Typing carries on to the end even if the cursor leaves meanwhile.
    const typeNext = (count: number) => {
      setTyped(count);
      if (count < COMPLETION.length) {
        const wait = TYPING_DELAYS_MS[count] + (Math.random() * 2 - 1) * TYPING_JITTER_MS;
        timer.current = setTimeout(() => typeNext(count + 1), wait);
      }
    };
    timer.current = setTimeout(
      () => typeNext(1),
      TYPING_DELAYS_MS[0] + (Math.random() * 2 - 1) * TYPING_JITTER_MS
    );
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    // The label keeps the real name for screen readers, whatever is typed on screen.
    <h2
      aria-label={name}
      onPointerEnter={start}
      className="font-headline text-4xl font-bold"
    >
      {canType ? (
        <>
          {words.slice(0, initialIndex).join(' ')} C
          {COMPLETION.slice(0, typed)
            .split('')
            .map((letter, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={live ? 'typed-letter' : undefined}
                style={{ '--letter-ms': `${LETTER_MS}ms` } as React.CSSProperties}
              >
                {letter}
              </span>
            ))}{' '}
          {words.slice(initialIndex + 1).join(' ')}
        </>
      ) : (
        name
      )}
    </h2>
  );
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
      <ProfileName name={profile.name} />
      <p className="mt-4 max-w-3xl text-lg text-foreground/80 leading-relaxed">
        {profile.aboutText}
      </p>
      {/* Only shown once a CV has been uploaded in the admin. The file is served as an
          attachment, so the browser downloads it instead of navigating away. */}
      {profile.cvUrl && (
        <Button asChild size="lg" className="mt-8">
          <a href={profile.cvUrl} download={profile.cvFileName || 'CV.pdf'}>
            <Download aria-hidden="true" />
            Download CV
          </a>
        </Button>
      )}
    </section>
  );
}
