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
                '@typescript-eslint/ban-ts-comment': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-this-alias': 'off',
                '@typescript-eslint/no-empty-interface': 'off',
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/no-unused-vars': [
                    'warn',
                    // Never warn about unused parameters
                    // See: https://eslint.org/docs/latest/rules/no-unused-vars#args
                    {'args': 'none'}
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