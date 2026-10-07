import DOMPurify from 'dompurify';

// Project overviews and app descriptions are stored as HTML and rendered with
// dangerouslySetInnerHTML. Run them through this first so a bad value in the
// database can never run script on the page. Only basic text formatting and
// plain links survive; no images, scripts, styles, iframes or event handlers.
const ALLOWED_TAGS = [
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'a',
  'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre',
];

let linksHardened = false;

export function sanitizeHtml(dirty: string | null | undefined): string {
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
    });
    linksHardened = true;
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ['href'],
    // Links must be https, http or mailto: no javascript: or data: URLs.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
  });
}
