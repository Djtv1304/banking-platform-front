import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'worker-configuration.d.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // CLAUDE.md: usar siempre el alias absoluto `@/` (nada de './' ni '../')
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['./*', '../*'],
              message: "Usa el alias absoluto '@/' (p. ej. '@/features/auth' o '@/shared/ui').",
            },
          ],
        },
      ],
    },
  },
  {
    // E0-07: en la app se habla de «clientes». Los tests quedan fuera para poder afirmar que no aparece.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...['Literal[value=/\\bsoci[oa]s?\\b/i]', 'TemplateElement[value.raw=/\\bsoci[oa]s?\\b/i]', 'JSXText[value=/\\bsoci[oa]s?\\b/i]'].map(
          (selector) => ({ selector, message: 'En la app se habla de clientes, nunca de socios (E0-07).' }),
        ),
      ],
    },
  },
  {
    // Worker de Cloudflare: corre en workerd, no en el navegador
    files: ['worker/**/*.ts'],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
  {
    // Los componentes de Shadcn exportan variantes (cva) junto al componente
    files: ['src/shared/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
