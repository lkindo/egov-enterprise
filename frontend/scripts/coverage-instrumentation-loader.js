const path = require('node:path');
const { createRequire } = require('node:module');
// Resolve the instrumenter's declared dependency from its installed package under pnpm.
const instrumentationRequire = createRequire(require.resolve('babel-plugin-istanbul'));
const { createInstrumenter } = instrumentationRequire('istanbul-lib-instrument');
const TestExclude = instrumentationRequire('test-exclude');

// Preserve the previous instrumented build's exclusions, independently of report formatting.
const exclude = [
  '**/*.spec.ts',
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  'node_modules/**',
  '.next/**',
  'e2e/**',
  'src/app/layout.tsx',
  'src/proxy.ts',
  'src/services/**',
  'src/lib/api/**',
];

module.exports = function coverageInstrumentationLoader(source, inputSourceMap) {
  this.cacheable?.();
  const cwd = this.getOptions().cwd;
  const files = new TestExclude({ cwd, exclude, excludeNodeModules: true,
    extension: ['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx'] });
  if (!files.shouldInstrument(this.resourcePath)) {
    this.callback(null, source, inputSourceMap);
    return;
  }
  const instrumenter = createInstrumenter({
    esModules: true, produceSourceMap: true, compact: false, preserveComments: true,
    // The application CSP forbids eval and Function constructors.
    coverageGlobalScope: 'globalThis', coverageGlobalScopeFunc: false,
  });
  const map = typeof inputSourceMap === 'string' ? JSON.parse(inputSourceMap) : inputSourceMap;
  const instrumented = instrumenter.instrumentSync(source, path.resolve(this.resourcePath), map || undefined);
  this.callback(null, instrumented, instrumenter.lastSourceMap());
};
