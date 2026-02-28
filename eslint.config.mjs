import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import nextPlugin from 'eslint-plugin-next'

const compat = new FlatCompat()

export default [
  {
    ignores: ['.next', 'node_modules', 'out', 'dist', 'build', '.turbo'],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      next: nextPlugin,
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
    },
  },
]


