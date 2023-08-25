'use strict';

module.exports = {
    rules: {
        'semi': 'error',
        'no-dupe-keys': 'error',
        'no-const-assign': 'error',
        'no-undef': 'error',
        'no-unreachable': 'error',
        'prefer-const': 'off',

        // Warnings: style and readability concerns
        'indent': [
            'warn',
            4
        ]
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
                '@typescript-eslint/ban-ts-comment': 'off',
                '@typescript-eslint/no-non-null-assertion': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-inferrable-types': 'off',
                '@typescript-eslint/no-this-alias': 'off',
                '@typescript-eslint/no-unused-vars': 'off',
                '@typescript-eslint/no-empty-interface': 'off',
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/ban-types': 'off',
                'prefer-const': 'off'
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