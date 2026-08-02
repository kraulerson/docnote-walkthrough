/**
 * The React/non-React boundary (ADR-0001): React renders the container div
 * and NEVER reconciles inside it. The sanitized document fragment is adopted
 * imperatively so later features can manage a highlight layer in the same DOM.
 */
import { useEffect, useRef } from 'react';
import type { ParsedDocument } from '../core/parseDocx';

interface DocumentViewProps {
  document: ParsedDocument;
}

export function DocumentView({ document: parsed }: DocumentViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    container.replaceChildren(parsed.fragment.cloneNode(true));
    return () => {
      container.replaceChildren();
    };
  }, [parsed]);

  return <div ref={containerRef} className="document-content" />;
}
