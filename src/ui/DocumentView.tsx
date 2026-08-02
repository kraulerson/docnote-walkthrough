/**
 * The React/non-React boundary (ADR-0001): React renders the container div
 * and NEVER reconciles inside it. The sanitized document fragment is adopted
 * imperatively; the highlight layer is repainted from scratch on every
 * annotation change (deterministic full repaint — Bible §3 pattern).
 */
import { useEffect, useRef } from 'react';
import { applyHighlightMarks } from '../core/anchors';
import { log } from '../core/log';
import type { ParsedDocument } from '../core/parseDocx';
import type { Highlight } from '../core/types';

interface DocumentViewProps {
  document: ParsedDocument;
  highlights: readonly Highlight[];
  /** Reports highlight ids whose anchors failed to resolve (unlocated). */
  onUnlocated?: (ids: string[]) => void;
  /** Exposes the live document container to the app shell. */
  containerRef?: (element: HTMLDivElement | null) => void;
}

export function DocumentView({
  document: parsed,
  highlights,
  onUnlocated,
  containerRef,
}: DocumentViewProps) {
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = innerRef.current;
    if (!container) {
      return;
    }
    container.replaceChildren(parsed.fragment.cloneNode(true));
    const unlocated: string[] = [];
    for (const highlight of highlights) {
      if (!applyHighlightMarks(container, highlight)) {
        unlocated.push(highlight.id);
      }
    }
    if (unlocated.length > 0) {
      log('warn', 'anchors.unlocated', { count: unlocated.length });
    }
    onUnlocated?.(unlocated);
    return () => {
      container.replaceChildren();
    };
  }, [parsed, highlights, onUnlocated]);

  return (
    <div
      ref={(el) => {
        innerRef.current = el;
        containerRef?.(el);
      }}
      className="document-content"
    />
  );
}
