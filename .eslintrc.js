'use strict';

module.exports = {
    rules: {
        'semi': 'error',

        // Warnings: style and readability concerns
        'indent': [
            'warn',
            4
        ],
        'quotes': ['warn', 'single'],
        'prefer-const': 'warn',
        'no-extra-semi': 'warn'
    },
    ignorePatterns: [
        'dist',
        'node_modules',
        '.github'
    ],
    overrides: [
        {
            files: [
                '**/*.{ts,tsx}',
                '**/*.md/*.ts',
                '**/*.md/*.typescript'
            ],
            extends: [
                'plugin:@typescript-eslint/eslint-recommended',
                'plugin:@typescript-eslint/recommended'
            ],
            plugins: [
                '@typescript-eslint'
            ],
            rules: {
                'no-dupe-keys': 'error',
                'no-unreachable': 'error',
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
                '@typescript-eslint/no-unused-vars': [
                    'warn',
                    { 'argsIgnorePattern': '^_' }
                ]
            }
        }
    ],
    parserOptions: {
        ecmaVersion: 2020
    },
    env: {
        node: true,
        es6: true
    }
};