import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginSecurity from 'eslint-plugin-security';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  pluginSecurity.configs.recommended,
  {
    rules: {
      // Bible §10 never-do rules that ESLint can police mechanically:
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Never-do rule 4: no network APIs in app code (Bible §10).' },
        { name: 'XMLHttpRequest', message: 'Never-do rule 4: no network APIs in app code (Bible §10).' },
        { name: 'WebSocket', message: 'Never-do rule 4: no network APIs in app code (Bible §10).' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'navigator',
          property: 'sendBeacon',
          message: 'Never-do rule 4: no network APIs in app code (Bible §10).',
        },
      ],
    },
  },
);
