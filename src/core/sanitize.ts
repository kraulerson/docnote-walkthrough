/**
 * The ONLY sanctioned HTML sink in this codebase (Bible §10, never-do rule 1).
 * Converter output is untrusted input (threat TM-002): a hostile .docx can
 * cause the converter to emit active HTML. Everything that will be inserted
 * into the live DOM must pass through here.
 */
import DOMPurify from 'dompurify';

const SANITIZE_CONFIG = {
  RETURN_DOM_FRAGMENT: true as const,
  // Document rendering needs structure, not interactivity or external content.
  // BUG-6/7: forbid subresource-loading tags (img/video/audio/source/picture)
  // so a crafted .docx cannot beacon out, and strip href/target so external
  // links are inert text (no phishing navigation) — defense that does not rely
  // on the meta CSP alone. Text-focused rendering is the documented scope.
  FORBID_TAGS: [
    'style',
    'form',
    'input',
    'button',
    'iframe',
    'object',
    'embed',
    'svg',
    'math',
    'img',
    'video',
    'audio',
    'source',
    'picture',
    'track',
    'link',
    'base',
  ],
  // BUG-6/7/16: strip navigation, inline style, and class from every element.
  FORBID_ATTR: ['href', 'target', 'style', 'class', 'srcset', 'src'],
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitize converter-produced HTML into an inert DocumentFragment.
 * DOMPurify strips script/event-handler/javascript: vectors by default;
 * the config above additionally forbids non-document content.
 */
export function sanitizeToFragment(html: string): DocumentFragment {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}
