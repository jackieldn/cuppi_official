// Little mid-2000s style icons for Poot XP, drawn as SVG: glossy, rounded,
// a bit too colourful. All original art.

import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

const base = (p: P) => ({ 'aria-hidden': true as const, focusable: false as const, ...p });

/** The jackie_poot brand mark: a glossy black orb with an icy ring and a "j". */
export function BrandMark(p: P) {
  return (
    <svg viewBox="0 0 32 32" {...base(p)}>
      <defs>
        <radialGradient id="xp-orb" cx="0.4" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#5b6b78" />
          <stop offset="0.55" stopColor="#141a20" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <linearGradient id="xp-orb-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9f4ff" />
          <stop offset="0.5" stopColor="#6fd3ff" />
          <stop offset="1" stopColor="#1f7fb8" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#xp-orb)" stroke="url(#xp-orb-ring)" strokeWidth="2" />
      <path d="M18.5 8.5v11.2c0 3-1.8 4.8-4.6 4.8-1.4 0-2.6-.4-3.4-1.1" fill="none" stroke="#e8f8ff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="18.5" cy="5.6" r="1.6" fill="#6fd3ff" />
      <ellipse cx="13" cy="9" rx="7" ry="3.5" fill="#fff" opacity="0.14" />
    </svg>
  );
}

/** The web browser: a globe with a little orbit. */
export function BrowserIcon(p: P) {
  return (
    <svg viewBox="0 0 32 32" {...base(p)}>
      <defs>
        <radialGradient id="xp-globe" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#bdeaff" />
          <stop offset="0.5" stopColor="#2f8fd6" />
          <stop offset="1" stopColor="#0b3f75" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="11" fill="url(#xp-globe)" stroke="#06284c" />
      <path d="M8 12c3-1 4 1.5 6.5 1.2S16 10 19 9.5M9 21c1.5-2.5 4-2 5.5-1.2s3 .8 5-1.5M21 14c1.5.3 3 1.5 3.5 3" fill="none" stroke="#5fd06a" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="16" cy="16" rx="15" ry="5" fill="none" stroke="#6fd3ff" strokeWidth="1.3" transform="rotate(-25 16 16)" opacity="0.9" />
    </svg>
  );
}
export function ComputerIcon(p: P) {
  return (
    <svg viewBox="0 0 32 32" {...base(p)}>
      <rect x="3" y="3" width="22" height="17" rx="1.5" fill="#d9d6c6" stroke="#6d6a5c" />
      <rect x="5" y="5" width="18" height="13" fill="#3a7bd5" />
      <path d="M5 13c4-3 9-4 18-2v7H5z" fill="#5fae3a" />
      <rect x="11" y="20" width="6" height="3" fill="#b9b5a3" />
      <rect x="7" y="23" width="14" height="2.5" rx="1" fill="#d9d6c6" stroke="#6d6a5c" />
      <rect x="20" y="15" width="10" height="15" rx="1" fill="#e9e6d6" stroke="#6d6a5c" />
      <rect x="22" y="18" width="6" height="1.5" fill="#8b887a" />
      <circle cx="25" cy="26" r="1" fill="#41b13a" />
    </svg>
  );
}

export function NotepadIcon(p: P) {
  return (
    <svg viewBox="0 0 32 32" {...base(p)}>
      <path d="M7 3h13l5 5v21H7z" fill="#fff" stroke="#7a8796" />
      <path d="M20 3v5h5" fill="#e2e8f0" stroke="#7a8796" />
      {[12, 15, 18, 21, 24].map((y) => (
        <path key={y} d={`M10 ${y}h12`} stroke="#5b8ad6" strokeWidth="1.2" />
      ))}
    </svg>
  );
}

/** The Journal: a black notebook with an icy-blue strap. */
export function JournalIcon(p: P) {
  return (
    <svg viewBox="0 0 32 32" {...base(p)}>
      <rect x="6" y="3" width="20" height="26" rx="2" fill="#1c1c1c" stroke="#000" />
      <rect x="6" y="3" width="4" height="26" rx="1" fill="#333" />
      <path d="M10 6h14M10 26h14" stroke="#444" />
      <rect x="21" y="3" width="3" height="26" fill="#6fd3ff" opacity="0.9" />
      <path d="M13 11h6M13 14h5" stroke="#8a8a8a" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** Poot Amp: a black speaker with an icy cone and a little spectrum. */
export function PlayerIcon(p: P) {
  return (
    <svg viewBox="0 0 32 32" {...base(p)}>
      <defs>
        <radialGradient id="xp-amp-cone" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#d9f4ff" />
          <stop offset="0.5" stopColor="#2f8fd6" />
          <stop offset="1" stopColor="#0b3f75" />
        </radialGradient>
      </defs>
      <rect x="4" y="3" width="24" height="26" rx="3" fill="#1c1c1c" stroke="#000" />
      <rect x="7" y="6" width="18" height="6" rx="1" fill="#04080b" stroke="#333" />
      <path d="M9 11V9m3 2V8m3 3V9.5m3 1.5V8m3 3V9.5" stroke="#6fd3ff" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="16" cy="21" r="6" fill="#0c0c0c" stroke="#444" />
      <circle cx="16" cy="21" r="4" fill="url(#xp-amp-cone)" />
      <circle cx="16" cy="21" r="1.2" fill="#06284c" />
    </svg>
  );
}

export function FolderIcon(p: P & { tint?: string }) {
  const { tint = '#f6d35c', ...rest } = p;
  return (
    <svg viewBox="0 0 32 32" {...base(rest)}>
      <path d="M2 7h10l2 3h16v17H2z" fill="#e7b73a" stroke="#a7801c" />
      <path d="M2 12h28l-2 15H4z" fill={tint} stroke="#a7801c" />
    </svg>
  );
}

export function PicturesIcon(p: P) {
  return (
    <svg viewBox="0 0 32 32" {...base(p)}>
      <path d="M2 7h10l2 3h16v17H2z" fill="#e7b73a" stroke="#a7801c" />
      <rect x="9" y="9" width="16" height="12" fill="#fff" stroke="#888" transform="rotate(-6 17 15)" />
      <path d="M11 19l4-4 3 3 2-2 4 4z" fill="#4e9a3a" transform="rotate(-6 17 15)" />
      <path d="M2 14h28l-2 13H4z" fill="#f6d35c" stroke="#a7801c" opacity="0.92" />
    </svg>
  );
}

export function FloppyIcon(p: P) {
  return (
    <svg viewBox="0 0 32 32" {...base(p)}>
      <rect x="4" y="4" width="24" height="24" rx="2" fill="#3b4a6b" stroke="#1c2436" />
      <rect x="9" y="4" width="13" height="9" fill="#c9ced8" />
      <rect x="17" y="5.5" width="3" height="6" fill="#3b4a6b" />
      <rect x="8" y="17" width="16" height="10" fill="#f2f2f2" />
      <path d="M10 20h12M10 23h9" stroke="#b33" strokeWidth="1" />
    </svg>
  );
}

export function DiskIcon(p: P) {
  return (
    <svg viewBox="0 0 32 32" {...base(p)}>
      <path d="M3 13l4-6h18l4 6v10H3z" fill="#dcdad0" stroke="#6d6a5c" />
      <rect x="3" y="13" width="26" height="10" fill="#c8c5b8" stroke="#6d6a5c" />
      <circle cx="25" cy="18" r="1.2" fill="#41d13a" />
      <path d="M6 18h12" stroke="#8b887a" strokeWidth="1.5" />
    </svg>
  );
}

export function SpeakerIcon({ muted, ...p }: P & { muted?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" {...base(p)}>
      <path d="M2 6h3l4-3v10l-4-3H2z" fill="#f1f1f1" stroke="#555" strokeWidth="0.6" />
      {muted ? (
        <path d="M11 6l4 4m0-4l-4 4" stroke="#e33" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <path d="M11 5.5c1.2 1.3 1.2 3.7 0 5M12.8 4c2 2.2 2 5.8 0 8" fill="none" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function InfoIcon(p: P) {
  return (
    <svg viewBox="0 0 32 32" {...base(p)}>
      <circle cx="16" cy="16" r="13" fill="#3a76d8" stroke="#1d4596" />
      <circle cx="16" cy="16" r="11" fill="none" stroke="#8fb5f2" strokeWidth="1" opacity="0.6" />
      <rect x="14.2" y="13.5" width="3.6" height="10" rx="1" fill="#fff" />
      <circle cx="16" cy="9.5" r="2.1" fill="#fff" />
    </svg>
  );
}

export function PowerIcon(p: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <rect x="1" y="1" width="22" height="22" rx="4" fill="#e04f1d" stroke="#fff" />
      <path d="M12 5v7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M8 7.5a6 6 0 1 0 8 0" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function LogOffIcon(p: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <rect x="1" y="1" width="22" height="22" rx="4" fill="#e7a81d" stroke="#fff" />
      <path d="M6 5h7v14H6z" fill="none" stroke="#fff" strokeWidth="1.6" />
      <path d="M11 12h8m-3-3 3 3-3 3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function RestartIcon(p: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <rect x="1" y="1" width="22" height="22" rx="4" fill="#3d9a32" stroke="#fff" />
      <path d="M17 12a5 5 0 1 1-1.6-3.7" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M17.5 5v4.2h-4.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function ClockIcon(p: P) {
  return (
    <svg viewBox="0 0 32 32" {...base(p)}>
      <circle cx="16" cy="16" r="13" fill="#fff" stroke="#3a6ac0" strokeWidth="2.5" />
      <path d="M16 8v8l5 3" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowIcon({ dir = 'left', ...p }: P & { dir?: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 28 28" {...base(p)}>
      <defs>
        <radialGradient id={`xp-arrow-${dir}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#a6e38f" />
          <stop offset="0.6" stopColor="#3da737" />
          <stop offset="1" stopColor="#1d7a1d" />
        </radialGradient>
      </defs>
      <circle cx="14" cy="14" r="12.5" fill={`url(#xp-arrow-${dir})`} stroke="#1c6b1a" />
      <path
        d={dir === 'left' ? 'M16.5 8 10 14l6.5 6M10.5 14H20' : 'M11.5 8 18 14l-6.5 6M17.5 14H8'}
        fill="none"
        stroke="#fff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RefreshIcon(p: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <rect x="3" y="2" width="16" height="20" rx="1" fill="#fff" stroke="#7a8796" />
      <path d="M17 13a5 5 0 1 1-1.4-3.6" fill="none" stroke="#2a9a2a" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M17.6 6.5v4h-4" fill="none" stroke="#2a9a2a" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function HomeIcon(p: P) {
  return (
    <svg viewBox="0 0 24 24" {...base(p)}>
      <path d="M3 11 12 3l9 8" fill="none" stroke="#a3361c" strokeWidth="2" strokeLinejoin="round" />
      <path d="M5 10v11h14V10l-7-6z" fill="#f7e3b0" stroke="#9a6b1c" />
      <rect x="10" y="14" width="4" height="7" fill="#3a76d8" />
    </svg>
  );
}

export function GlobeSmall(p: P) {
  return (
    <svg viewBox="0 0 16 16" {...base(p)}>
      <circle cx="8" cy="8" r="6.5" fill="#5aa8ef" stroke="#1d5ab0" />
      <path d="M3.5 6c2-.5 2.5 1 4 1s1.5-2 3-2.5M5 12c.5-2 2-2 3-1.5s2 .5 3-1" fill="none" stroke="#3a9a2a" strokeWidth="1.6" />
    </svg>
  );
}

/** Title bar glyphs: minimise, maximise, restore, close. */
export function TitleGlyph({ kind }: { kind: 'min' | 'max' | 'restore' | 'close' }) {
  return (
    <svg viewBox="0 0 13 13" aria-hidden="true" focusable="false">
      {kind === 'min' && <rect x="3" y="8.5" width="6" height="2" fill="#fff" />}
      {kind === 'max' && <path d="M2.5 2.5h8v8h-8z M2.5 3.5h8" fill="none" stroke="#fff" strokeWidth="1.5" />}
      {kind === 'restore' && (
        <>
          <path d="M4.5 1.5h7v7" fill="none" stroke="#fff" strokeWidth="1.3" />
          <path d="M1.5 4.5h7v7h-7z M1.5 5.5h7" fill="none" stroke="#fff" strokeWidth="1.3" />
        </>
      )}
      {kind === 'close' && <path d="M3 3l7 7m0-7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}
