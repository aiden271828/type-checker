module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  extends: ['standard'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'no-var': 'error',
    'prefer-const': 'error',
    semi: [
      'error',
      'always',
    ],
    quotes: [
      'error',
      'single',
    ],
    complexity: [
      'error',
      20,
    ],
    indent: [
      'error',
      2,
      {
        SwitchCase: 1,
      },
    ],
    'no-multiple-empty-lines': [
      'error',
      {
        max: 1,
        maxBOF: 0,
        maxEOF: 0,
      },
    ],
    'eol-last': 'error',
    'array-bracket-newline': [
      'error',
      {
        minItems: 2,
      },
    ],
    'array-element-newline': [
      'error',
      'always',
    ],
    'comma-dangle': [
      'error',
      'always-multiline',
    ],
    'object-curly-newline': [
      'error',
      {
        multiline: true,
        minProperties: 1,
      },
    ],
    'object-property-newline': [
      'error',
      {
        allowAllPropertiesOnSameLine: false,
      },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/member-delimiter-style': [
      'error',
      {
        multiline: {
          delimiter: 'semi',
          requireLast: true,
        },
        singleline: {
          delimiter: 'semi',
          requireLast: true,
        },
        multilineDetection: 'brackets',
      },
    ],
    '@typescript-eslint/array-type': 'error',
    '@typescript-eslint/explicit-member-accessibility': 'error',
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/consistent-type-definitions': [
      'error',
      'interface',
    ],
  },
};
