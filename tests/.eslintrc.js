'use strict';

module.exports = {
    overrides: [
        {
            files: [
                '**/*.{ts,tsx}'
            ],
            rules: {
                '@typescript-eslint/no-non-null-assertion': 'off',
                '@typescript-eslint/ban-ts-comment': 'off'
            }
        }
    ]
};