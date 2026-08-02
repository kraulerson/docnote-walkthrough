/**
 * The ONLY sanctioned HTML sink in this codebase (Bible §10, never-do rule 1).
 * Converter output is untrusted input (threat TM-002): a hostile .docx can
 * cause the converter to emit active HTML. Everything that will be inserted
 * into the live DOM must pass through here.
 */
import DOMPurify from 'dompurify';

const SANITIZE_CONFIG = {
  RETURN_DOM_FRAGMENT: true as const,
  // Document rendering needs structure, not interactivity: forbid anything
  // that can execute, navigate, or load external content beyond images.
  FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe', 'object', 'embed', 'svg', 'math'],
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
