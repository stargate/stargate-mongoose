'use strict';

const globals = require('globals');
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = [
    {
        ignores: ['dist/**']
    },
    {
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.node
            }
        },
        files: [
            './src/**/*.ts'
        ]
    },
    {
        ...eslint.configs.recommended,
        files: [
            './src/**/*.ts'
        ],
    },
    ...tseslint.configs.recommended.map(config => ({
        ...config,
        files: [
            './src/**/*.ts'
        ],
    })),
    {
        files: [
            './src/**/*.ts',
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
            'no-extra-semi': 'warn'
        }
    },
    {
        files: [
            './src/**/*.ts'
        ],
        rules: {
            'no-dupe-keys': 'error',
            'no-unreachable': 'error',
            '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { 'argsIgnorePattern': '^_' }
            ]
        }
    },
    
];