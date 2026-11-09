'use client';

// The videos uploaded to the Work projects (see src/lib/portfolio-videos.ts),
// for the desktop's "Portfolio videos" folder. Read once per visit, the first
// time the folder or the Videos window needs them, and shared after that.

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, type Firestore } from 'firebase/firestore';

import { useFirestore } from '@/firebase';
import { portfolioVideos, type PortfolioVideo, type ProjectVideoSource } from '@/lib/portfolio-videos';

let cached: Promise<PortfolioVideo[]> | null = null;

function loadAll(firestore: Firestore): Promise<PortfolioVideo[]> {
  if (!cached) {
    // Ordered by title, like the Works page, so the folder follows the same order.
    cached = getDocs(query(collection(firestore, 'projects'), orderBy('title'))).then((snap) =>
      portfolioVideos(snap.docs.map((d) => ({ ...(d.data() as Omit<ProjectVideoSource, 'id'>), id: d.id }))),
    );
    // A failed read shouldn't stick: the next time something asks, it tries again.
    cached.catch(() => {
      cached = null;
    });
  }
  return cached;
}

/**
 * Every uploaded project video, in order. `videos` is null until they have
 * loaded. A failure stays here (`failed`) rather than going to the site-wide
 * error listener, which would take the whole page down for a bonus feature.
 * With `enabled` false nothing is read.
 */
export function usePortfolioVideos(enabled = true) {
  const firestore = useFirestore();
  const [videos, setVideos] = useState<PortfolioVideo[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!firestore || !enabled) return;
    let live = true;
    loadAll(firestore)
      .then((all) => live && setVideos(all))
      .catch((err) => {
        console.warn('Portfolio videos: could not load them.', err);
        if (live) {
          setVideos([]);
          setFailed(true);
        }
      });
    return () => {
      live = false;
    };
  }, [firestore, enabled]);

  return { videos, failed };
}
