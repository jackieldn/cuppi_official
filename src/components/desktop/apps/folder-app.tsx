'use client';

// A folder on the desktop (Favourites, Portfolio videos): a window of video
// files. Click selects a file; double-click (or Enter) plays it in the Videos
// window, which then plays that folder's files as its playlist.

import { useId, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Film, Star, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AppWindow } from '../app-window';
import { useDesktop, type FolderId } from '../desktop-context';
import { FOLDERS, useFolderVideos, type FolderVideo } from '../use-folder-videos';
import { VideoFileIcon } from './video-app';

/** Folder art for the desktop: a blue macOS-style folder with a small symbol on its front. */
export function FolderIcon({ glyph: Glyph }: { glyph: LucideIcon }) {
  // Two folders can be on screen at once, so each needs its own gradient ids.
  const uid = useId().replace(/:/g, '');
  return (
    <span className="relative flex size-14 items-center justify-center drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)]">
      <svg viewBox="0 0 56 56" aria-hidden="true" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id={`${uid}-back`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0ea5e9" />
            <stop offset="1" stopColor="#0369a1" />
          </linearGradient>
          <linearGradient id={`${uid}-front`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7dd3fc" />
            <stop offset="1" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        {/* The back of the folder, with its tab. */}
        <path
          d="M5 13a4 4 0 0 1 4-4h12.2a4 4 0 0 1 2.9 1.2L27 13h20a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z"
          fill={`url(#${uid}-back)`}
        />
        {/* The front, with a faint light edge along the top. */}
        <rect x="3" y="19" width="50" height="30" rx="4" fill={`url(#${uid}-front)`} />
        <rect x="3.5" y="19.5" width="49" height="29" rx="3.5" fill="none" stroke="white" strokeOpacity="0.4" />
      </svg>
      <Glyph aria-hidden="true" className="relative mt-3 size-5 text-white drop-shadow" strokeWidth={2.5} />
    </span>
  );
}

export const FavouritesIcon = () => <FolderIcon glyph={Star} />;
export const PortfolioVideosIcon = () => <FolderIcon glyph={Film} />;

interface FileProps {
  video: FolderVideo;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

/** One video file in the folder window. */
function VideoFile({ video, selected, onSelect, onOpen }: FileProps) {
  const label = `${video.title}.mp4`;
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    onOpen();
  };
  return (
    <li>
      <button
        type="button"
        aria-label={`Open ${label}`}
        className="group flex w-full cursor-default select-none flex-col items-center gap-1 rounded-lg p-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(e: MouseEvent) => {
          // The click is this file's; the empty space around the files clears the selection.
          e.stopPropagation();
          onSelect();
        }}
        onDoubleClick={onOpen}
        onKeyDown={onKeyDown}
      >
        <span
          className={cn(
            'rounded-[14px] p-1 transition-colors',
            selected ? 'bg-secondary ring-2 ring-primary/70' : 'bg-transparent',
          )}
        >
          <VideoFileIcon thumbnail={video.thumbnail} />
        </span>
        <span
          className={cn(
            'line-clamp-2 max-w-full break-words rounded px-1 text-center text-[12px] font-medium leading-5',
            selected ? 'bg-primary text-primary-foreground' : 'text-foreground',
          )}
        >
          {label}
        </span>
      </button>
    </li>
  );
}

export function FolderApp({ folder }: { folder: FolderId }) {
  const { openVideo } = useDesktop();
  const { videos, failed } = useFolderVideos(folder);
  const [selected, setSelected] = useState<string | null>(null);
  const info = FOLDERS[folder];

  return (
    <AppWindow id={folder} title={info.label} width={560} height={380} minWidth={320} minHeight={240}>
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-palette-lagoon/25 p-3"
        onClick={() => setSelected(null)}
      >
        {!videos && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="mx-auto size-16 rounded-[14px]" />
            ))}
          </div>
        )}

        {videos?.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">{failed ? info.failed : info.empty}</p>
        )}

        {videos && videos.length > 0 && (
          <ul aria-label={info.label} className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-x-2 gap-y-3">
            {videos.map((video) => (
              <VideoFile
                key={video.id}
                video={video}
                selected={selected === video.id}
                onSelect={() => setSelected(video.id)}
                onOpen={() => {
                  setSelected(null);
                  openVideo(video.id, folder);
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </AppWindow>
  );
}

export const FavouritesFolder = () => <FolderApp folder="favourites" />;
export const PortfolioVideosFolder = () => <FolderApp folder="portfolio-videos" />;
