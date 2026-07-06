module.exports = {
  'report-dir': './coverage',
  reporter: ['html', 'text', 'json', 'lcov'],
  include: ['src/**/*'],
  exclude: [
    'src/types/**',
    '**/*.spec.ts',
    '**/__tests__/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    '.next/**',
    'vitest.setup.ts',
    'postcss.config.mjs',
    'eslint.config.mjs'
  ],
  all: true
};
