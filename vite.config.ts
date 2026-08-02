/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Production CSP is injected at build time only: the dev server needs a
// WebSocket for HMR, which `connect-src 'none'` would block (Bible §11/§15).
// `frame-ancestors` is header-only and cannot ship via <meta> on GitHub Pages
// — recorded residual risk (Bible §4, platform module §4.4).
const CSP =
  "default-src 'self'; connect-src 'none'; form-action 'none'; " +
  "base-uri 'none'; object-src 'none'";

function injectProductionCsp(): Plugin {
  return {
    name: 'inject-production-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), injectProductionCsp()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
