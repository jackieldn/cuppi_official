'use client';

// The desktop's videos (see src/lib/desktop-videos-types.ts), read once per
// visit and shared: the 2026 desktop icons, the Videos window and the 2006
// torrent client all ask for them and only the first one hits Firestore.

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, type Firestore } from 'firebase/firestore';

import { useFirestore } from '@/firebase';
import { DESKTOP_VIDEOS, hasEra, type DesktopVideo, type VideoEra } from '@/lib/desktop-videos-types';

let cached: Promise<DesktopVideo[]> | null = null;

function loadAll(firestore: Firestore): Promise<DesktopVideo[]> {
  if (!cached) {
    cached = getDocs(query(collection(firestore, DESKTOP_VIDEOS), orderBy('order'))).then((snap) =>
      snap.docs.map((d) => ({ ...(d.data() as Omit<DesktopVideo, 'id'>), id: d.id })),
    );
    // A failed read shouldn't stick: the next time something asks, it tries again.
    cached.catch(() => {
      cached = null;
    });
  }
  return cached;
}

/**
 * The videos tagged for an era, in order. `videos` is null until they have
 * loaded. A failure stays here (`failed`) rather than going to the site-wide
 * error listener, which would take the whole page down for a bonus feature.
 */
export function useDesktopVideos(era: VideoEra) {
  const firestore = useFirestore();
  const [all, setAll] = useState<DesktopVideo[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!firestore) return;
    let live = true;
    loadAll(firestore)
      .then((videos) => live && setAll(videos))
      .catch((err) => {
        console.warn('Desktop videos: could not load them.', err);
        if (live) {
          setAll([]);
          setFailed(true);
        }
      });
    return () => {
      live = false;
    };
  }, [firestore]);

  return { videos: all ? all.filter((v) => hasEra(v, era)) : null, failed };
}
