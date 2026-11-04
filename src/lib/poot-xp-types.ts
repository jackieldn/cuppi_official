// Content that only exists on the desktop: the pictures in Poot XP's My
// Pictures (the Time Machine's 2006) and the posts in the Journal app, which
// is on the desktop and in Poot XP. Neither shows on the pages themselves or in JackDOS.
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
  /**
   * Posts written in the rich text editor are HTML (`format: 'html'`), with
   * uploaded pictures from Storage journal_images/. Older posts are plain text:
   * blank lines split paragraphs.
   */
  body: string;
  format?: 'html';
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

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A plain-text post as HTML (blank lines become paragraphs), so the editor can open it. */
export function plainToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** The post's body as HTML, ready to be sanitised and shown. */
export const journalHtml = (post: Pick<JournalPost, 'body' | 'format'>): string =>
  post.format === 'html' ? post.body : plainToHtml(post.body);

/** The words of a post with the markup taken out, to tell an empty post from a real one. */
export const htmlHasContent = (html: string): boolean =>
  /<img\b/i.test(html) || html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
