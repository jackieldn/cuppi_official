import DOMPurify from 'dompurify';

// Project overviews and app descriptions are stored as HTML and rendered with
// dangerouslySetInnerHTML. Run them through this first so a bad value in the
// database can never run script on the page. Only basic text formatting and
// plain links survive; no images, scripts, styles, iframes or event handlers.
const ALLOWED_TAGS = [
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'a',
  'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre',
];

// Journal posts (Poot XP) are written in the admin's rich text editor, so they
// may also carry uploaded pictures: https images only, with alt text.
const JOURNAL_TAGS = [...ALLOWED_TAGS, 'img', 'hr'];

let linksHardened = false;

function sanitize(dirty: string | null | undefined, tags: string[], attrs: string[]): string {
  if (!dirty) return '';
  // DOMPurify needs a DOM. These pages only render this data in the browser;
  // on the server render nothing rather than risk passing it through.
  if (typeof window === 'undefined') return '';

  if (!linksHardened) {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('rel', 'noopener noreferrer');
        node.setAttribute('target', '_blank');
      }
      // DOMPurify lets data: pictures through whatever the URI pattern says; only web pictures here.
      if (node.tagName === 'IMG' && !/^https?:/i.test(node.getAttribute('src') ?? '')) node.remove();
    });
    linksHardened = true;
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: tags,
    ALLOWED_ATTR: attrs,
    // Links and pictures must be https, http or mailto: no javascript: or data: URLs.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
  });
}

export function sanitizeHtml(dirty: string | null | undefined): string {
  return sanitize(dirty, ALLOWED_TAGS, ['href']);
}

/** Like sanitizeHtml, but keeps https pictures (and rules) for Journal posts. */
export function sanitizeJournalHtml(dirty: string | null | undefined): string {
  return sanitize(dirty, JOURNAL_TAGS, ['href', 'src', 'alt']);
}
