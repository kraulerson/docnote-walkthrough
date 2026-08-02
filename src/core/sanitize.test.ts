/**
 * Feature 1 — sanitizer choke point tests (TM-002 defense).
 * Every payload here is a concrete attack from the threat model: content
 * that a hostile .docx could cause a converter to emit.
 */
import { describe, expect, it } from 'vitest';
import { sanitizeToFragment } from './sanitize';

function html(fragment: DocumentFragment): string {
  const div = document.createElement('div');
  div.append(fragment.cloneNode(true));
  return div.innerHTML;
}

describe('sanitizeToFragment (the ONLY sanctioned HTML sink — Bible §10 rule 1)', () => {
  it('should return a DocumentFragment, not a string', () => {
    expect(sanitizeToFragment('<p>hello</p>')).toBeInstanceOf(DocumentFragment);
  });

  it('should strip <script> elements entirely', () => {
    const out = html(sanitizeToFragment('<p>a</p><script>alert(1)</script><p>b</p>'));
    expect(out).not.toContain('script');
    expect(out).toContain('<p>a</p>');
    expect(out).toContain('<p>b</p>');
  });

  it('should strip event handler attributes (onerror, onclick, onload)', () => {
    const out = html(
      sanitizeToFragment('<img src="x" onerror="alert(1)"><p onclick="steal()">t</p><body onload="x()">'),
    );
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('onload');
  });

  it('should neutralize javascript: URLs in links', () => {
    const out = html(sanitizeToFragment('<a href="javascript:alert(1)">click</a>'));
    expect(out).not.toContain('javascript:');
    expect(out).toContain('click');
  });

  it('should strip iframe, object, and embed elements', () => {
    const out = html(
      sanitizeToFragment('<iframe src="https://evil.example"></iframe><object></object><embed>'),
    );
    expect(out).not.toContain('iframe');
    expect(out).not.toContain('object');
    expect(out).not.toContain('embed');
  });

  it('should strip style elements (CSS exfiltration vectors)', () => {
    const out = html(sanitizeToFragment('<style>body{background:url("https://evil.example")}</style><p>x</p>'));
    expect(out).not.toContain('style>');
    expect(out).toContain('<p>x</p>');
  });

  it('should preserve benign document structure', () => {
    const input =
      '<h1>Title</h1><p>Text with <strong>bold</strong> and <em>italic</em>.</p>' +
      '<ul><li>one</li><li>two</li></ul><table><tbody><tr><td>cell</td></tr></tbody></table>';
    const out = html(sanitizeToFragment(input));
    expect(out).toContain('<h1>Title</h1>');
    expect(out).toContain('<strong>bold</strong>');
    expect(out).toContain('<em>italic</em>');
    expect(out).toContain('<li>one</li>');
    expect(out).toContain('<td>cell</td>');
  });

  it('should keep text content intact while stripping active content (paranoia check)', () => {
    // A payload nesting text inside an attack wrapper must not lose the text.
    const out = sanitizeToFragment('<p><a href="javascript:x">Budget figures</a></p>');
    expect(out.textContent).toContain('Budget figures');
  });
});
