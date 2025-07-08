'use strict';

const globals = require('globals');
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = [
    {
        ignores: ['dist/**', 'coverage']
    },
    {
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.node
            }
        },
        files: [
            'src/**/*.ts',
            'tests/**/*.ts'
        ]
    },
    {
        ...eslint.configs.recommended,
        files: [
            'src/**/*.ts',
            'tests/**/*.ts'
        ],
    },
    ...tseslint.configs.recommended.map(config => ({
        ...config,
        files: [
            'src/**/*.ts',
            'tests/**/*.ts'
        ],
    })),
    {
        files: [
            'src/**/*.ts',
            'tests/**/*.ts'
        ],
        rules: {
            'semi': 'error',

            // Warnings: style and readability concerns
            'indent': [
                'warn',
                4
            ],
            'quotes': ['warn', 'single'],
            'prefer-const': 'warn',
            'no-extra-semi': 'warn',
            'no-trailing-spaces': 'warn',
            'no-dupe-keys': 'error',
            'no-unreachable': 'error',
            '@typescript-eslint/consistent-type-definitions': ['error', 'interface']
        }
    }
];
