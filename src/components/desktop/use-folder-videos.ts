'use client';

// What is inside each desktop folder, in one shape so the folder window and the
// Videos window (which plays a folder's files as its playlist) treat them alike.
//
//   Favourites:       the 2026 videos from /admin/videos (YouTube links or files)
//   Portfolio videos: the videos uploaded to the Work projects

import { useMemo } from 'react';

import { videoSource, videoThumbnail } from '@/lib/desktop-video-source';
import type { FolderId } from './desktop-context';
import { useDesktopVideos } from './use-desktop-videos';
import { usePortfolioVideos } from './use-portfolio-videos';

/** A video file in a folder. */
export interface FolderVideo {
  /** Unique within its folder. */
  id: string;
  title: string;
  /** A link the Videos window can play. */
  url: string;
  /** A still for the file's icon, or null for the plain film icon. */
  thumbnail: string | null;
}

export const FOLDERS: Record<FolderId, { label: string; empty: string; failed: string }> = {
  favourites: {
    label: 'Favourites',
    empty: 'No favourites yet. Check back soon.',
    failed: 'The folder could not be opened.',
  },
  'portfolio-videos': {
    label: 'Portfolio videos',
    empty: 'No portfolio videos yet. Check back soon.',
    failed: 'The folder could not be opened.',
  },
};

/**
 * The files in a folder, in order. `videos` is null until they have loaded.
 * Only the folder asked for is read from Firestore.
 */
export function useFolderVideos(folder: FolderId): { videos: FolderVideo[] | null; failed: boolean } {
  const favourites = useDesktopVideos('2026', folder === 'favourites');
  const portfolio = usePortfolioVideos(folder === 'portfolio-videos');

  const favouriteFiles = useMemo(
    () =>
      favourites.videos
        ? favourites.videos
            // Only videos with a link the player can use.
            .filter((v) => videoSource(v.url))
            .map((v) => ({ id: v.id, title: v.title, url: v.url as string, thumbnail: videoThumbnail(v.url) }))
        : null,
    [favourites.videos],
  );

  return folder === 'favourites'
    ? { videos: favouriteFiles, failed: favourites.failed }
    : { videos: portfolio.videos, failed: portfolio.failed };
}
