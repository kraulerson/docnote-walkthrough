import '@testing-library/jest-dom/vitest';

// jsdom does not implement scrollIntoView; provide a no-op so click-to-jump
// (Feature 5) can be exercised and spied on in tests.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {
    /* no-op for jsdom */
  };
}
