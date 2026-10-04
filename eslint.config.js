import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // React Three Fiber idiom: three.js objects created once per component (useMemo/useState)
    // are mutated imperatively inside useFrame. The React Compiler immutability rule assumes
    // hook results are immutable React values, which does not hold for GPU resources.
    files: ['src/cinematic/**/*.tsx', 'src/lab/**/*.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
  {
    files: ['*.config.{js,ts}', 'e2e/**/*.ts', 'scripts/**/*.{ts,mjs}'],
    languageOptions: { globals: { ...globals.node } },
  },
)
