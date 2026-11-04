'use client';

// The site's own content for the 2006 portal page, read once from Firestore
// when the trip to 2006 starts (the same collections JackDOS reads).

import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, type Firestore, type QueryConstraint } from 'firebase/firestore';

import { useFirestore } from '@/firebase';
import type { AboutProfile, Fact, TechnicalSkill, Testimonial, WorkExperience } from '@/lib/about-types';
import type { Project } from '@/lib/projects';
import { PLAYER_TRACKS, type PlayerTrack } from '@/lib/music-player-types';

type WithId<T> = T & { id: string };

export interface PortalData {
  profile: AboutProfile | null;
  projects: WithId<Project>[];
  testimonials: WithId<Testimonial>[];
  facts: WithId<Fact>[];
  skills: WithId<TechnicalSkill>[];
  career: WithId<WorkExperience>[];
  tracks: WithId<PlayerTrack>[];
}

async function load<T>(firestore: Firestore, name: string, ...constraints: QueryConstraint[]): Promise<WithId<T>[]> {
  const snap = await getDocs(query(collection(firestore, name), ...constraints));
  return snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
}

// Kept for the whole visit, so travelling back and forth doesn't read again.
let cached: Promise<PortalData> | null = null;

function loadAll(firestore: Firestore): Promise<PortalData> {
  if (!cached) {
    cached = Promise.all([
      load<AboutProfile>(firestore, 'about_profile'),
      load<Project>(firestore, 'projects', orderBy('title')),
      load<Testimonial>(firestore, 'testimonials', orderBy('order')),
      load<Fact>(firestore, 'facts', orderBy('order')),
      load<TechnicalSkill>(firestore, 'technical_skills', orderBy('order')),
      load<WorkExperience>(firestore, 'work_experience'),
      // The music box is a nice extra: no tracks is fine.
      load<PlayerTrack>(firestore, PLAYER_TRACKS, orderBy('order')).catch(() => []),
    ]).then(([profiles, projects, testimonials, facts, skills, career, tracks]) => ({
      profile: profiles[0] ?? null,
      projects,
      testimonials,
      facts,
      skills,
      career: [...career].sort((a, b) =>
        a.order !== undefined && b.order !== undefined
          ? a.order - b.order
          : (b.startDate ?? '').localeCompare(a.startDate ?? ''),
      ),
      tracks,
    }));
    // A failed read shouldn't stick: Refresh tries again.
    cached.catch(() => {
      cached = null;
    });
  }
  return cached;
}

export function usePortalData() {
  const firestore = useFirestore();
  const [data, setData] = useState<PortalData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!firestore) return;
    let live = true;
    setFailed(false);
    loadAll(firestore)
      .then((d) => live && setData(d))
      .catch((err) => {
        console.warn('Poot XP: could not load the portal.', err);
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [firestore, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, failed, retry };
}

/** Rich text from the CMS to plain text. */
export function plain(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).trimEnd()}.......`;
}

export const projectImage = (p: Project): string | undefined =>
  p.privacy?.isPasswordProtected ? p.blurredImageUrl || undefined : p.imageUrl || p.coverImage?.imageUrl || undefined;
