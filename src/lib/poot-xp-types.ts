// Content that only exists inside the Time Machine's 2006 (Poot XP):
// the pictures in My Pictures and the posts in the Journal app. Neither
// shows anywhere else on the site or in JackDOS.
//
// Managed at /admin/xp-pictures and /admin/journal.

/** Firestore: xp_pictures/{id}. Files: Storage xp_pictures/. Public read, admin write. */
export const XP_PICTURES = 'xp_pictures';

export type XpPicture = {
  id: string;
  /** Shown under the thumbnail, like a file name. */
  title: string;
  imageUrl: string;
  /** Storage path, so the file can be deleted with the picture. */
  imagePath: string;
  width?: number;
  height?: number;
  /** Folder position, lowest first. */
  order: number;
  createdAt?: unknown;
};

/**
 * Firestore: journal_posts/{id}. Anyone can read published posts; drafts
 * and writes are admin only.
 */
export const JOURNAL_POSTS = 'journal_posts';

export type JournalPost = {
  id: string;
  title: string;
  /** Plain text. Blank lines split paragraphs. */
  body: string;
  /** The day it's dated, YYYY-MM-DD. */
  date: string;
  published: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

/** Newest first; posts on the same day keep a stable order by title. */
export function sortJournal<T extends Pick<JournalPost, 'date' | 'title'>>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

/** "2026-11-04" -> "4 November 2026". Anything unparseable is shown as it is. */
export function journalDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
