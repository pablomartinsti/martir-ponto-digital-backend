import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin'; // Certifique-se de que está instalado
import tsParser from '@typescript-eslint/parser'; // Certifique-se de que está instalado

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      globals: globals.node,
      parser: tsParser, // Define o parser para TypeScript
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Desativa a regra
    },
  },
  pluginJs.configs.recommended,
  tseslint.configs.recommended,
];
