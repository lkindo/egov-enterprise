const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const frontendDirectory = path.resolve(__dirname, '..');
function removeGeneratedDirectory(directory, name) {
  const root = fs.realpathSync(directory);
  const target = path.resolve(root, name);
  if (!['.next', '.nyc_output', 'coverage'].includes(name) || path.dirname(target) !== root) {
    throw new Error('Refusing to remove a path outside the generated frontend directories.');
  }
  const entry = fs.lstatSync(target, { throwIfNoEntry: false });
  if (entry?.isSymbolicLink()) throw new Error('Refusing to remove a linked generated directory.');
  fs.rmSync(target, { recursive: true, force: true });
}

function runInstrumentedBuild(dependencies = {}) {
  const directory = fs.realpathSync(dependencies.directory || frontendDirectory);
  const execute = dependencies.execute || execFileSync;
  const logger = dependencies.logger || console;
  const packagePath = path.join(directory, 'package.json');
  if (fs.readdirSync(directory).some(name => /^(?:\.babelrc(?:\.|$)|babel\.config\.)/.test(name))
      || (fs.existsSync(packagePath) && Object.hasOwn(JSON.parse(fs.readFileSync(packagePath, 'utf8')), 'babel'))) {
    throw new Error('An existing Babel configuration must be preserved; instrumented build refused.');
  }

  logger.log('Building Next.js with SWC and post-transform Istanbul instrumentation.');
  removeGeneratedDirectory(directory, '.next');
  execute(process.execPath, [require.resolve('next/dist/bin/next'), 'build', '--webpack'], {
    cwd: directory, stdio: 'inherit', windowsHide: true,
    env: { ...process.env, NEXT_PUBLIC_COVERAGE: 'true', NODE_OPTIONS: '--max-old-space-size=8192' },
  });
}

if (require.main === module) {
  try { runInstrumentedBuild(); } catch {
    console.error('Instrumented build failed; no Babel configuration was created or modified.');
    process.exitCode = 1;
  }
}

module.exports = { runInstrumentedBuild, removeGeneratedDirectory };
