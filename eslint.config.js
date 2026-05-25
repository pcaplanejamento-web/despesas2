import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
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
  // shadcn primitives, components com companion exports (Context+hook, ColumnSpecs+drawer),
  // layouts e router exportam helpers/types junto com componentes. Padrão idiomático
  // shadcn + React Context. Fast Refresh é DX, não correctness — relaxar nesses paths.
  // pages/ e hooks/ continuam estritos (1 export por arquivo é norma).
  {
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/layouts/**/*.{ts,tsx}',
      'src/router.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
