// eslint.config.mjs
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import angular from '@angular-eslint/eslint-plugin';
import angularTemplate from '@angular-eslint/eslint-plugin-template';
import angularTemplateParser from '@angular-eslint/template-parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // Ignorer les fichiers
  {
    ignores: [
      'dist/**/*',
      'node_modules/**/*',
      '.angular/**/*',
      'coverage/**/*',
      '*.js',
      '*.mjs'
    ]
  },

  // Configuration pour les fichiers TypeScript
  {
    files: ['**/*.ts'],
    ignores: ['**/*.spec.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.json', './tsconfig.app.json', './tsconfig.spec.json'],
        createDefaultProgram: true
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      '@angular-eslint': angular
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescript.configs.recommended.rules,
      ...angular.configs.recommended.rules,

      // Règles Angular spécifiques
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase'
        }
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case'
        }
      ],

      // Règles TypeScript optimisées
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',

      // Règles modernes
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error'
    }
  },

  // Configuration pour les fichiers de test TypeScript
  {
    files: ['**/*.spec.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: ['./tsconfig.json', './tsconfig.app.json', './tsconfig.spec.json'],
        createDefaultProgram: true
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
        ...globals.jasmine
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      '@angular-eslint': angular
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescript.configs.recommended.rules,
      ...angular.configs.recommended.rules,

      // Règles TypeScript optimisées
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',

      // Règles modernes
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error'
    }
  },

  // Configuration pour les templates HTML
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: angularTemplateParser
    },
    plugins: {
      '@angular-eslint/template': angularTemplate
    },
    rules: {
      ...angularTemplate.configs.recommended.rules,
      '@angular-eslint/template/eqeqeq': 'error',
      '@angular-eslint/template/no-negated-async': 'error',
      '@angular-eslint/template/conditional-complexity': ['error', { maxComplexity: 3 }],
      '@angular-eslint/template/cyclomatic-complexity': ['error', { maxComplexity: 5 }]
    }
  },

  // Configuration Prettier (doit être en dernier)
  prettier
];
