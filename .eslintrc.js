'use strict';

module.exports = {
    rules: {
        'semi': 'error',
        'no-dupe-keys': 'error',
        'no-const-assign': 'error',
        'no-undef': 'error',
        'no-unreachable': 'error',

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
                '@typescript-eslint/no-empty-interface': 'off',
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/ban-types': 'off',
                '@typescript-eslint/no-unused-vars': [
                    'warn',
                    // https://stackoverflow.com/questions/64052318/how-to-disable-warn-about-some-unused-params-but-keep-typescript-eslint-no-un
                    {  'argsIgnorePattern': '^_' }
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