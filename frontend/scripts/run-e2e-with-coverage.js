const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { removeGeneratedDirectory } = require('./build-instrumented.js');

const frontendDirectory = path.resolve(__dirname, '..');

function assertCollectedCoverage(directory) {
  const failure = () => new Error('E2E coverage results are missing or invalid.');
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const isCounter = value => Number.isSafeInteger(value) && value >= 0;
  let collected = false;
  try {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const coverage = JSON.parse(fs.readFileSync(path.join(directory, entry.name), 'utf8'));
      if (!isObject(coverage)) throw failure();
      for (const file of Object.values(coverage)) {
        if (!isObject(file) || typeof file.path !== 'string' || !file.path
            || !['statementMap', 'fnMap', 'branchMap', 's', 'f', 'b'].every(key => isObject(file[key]))
            || !Object.values(file.s).every(isCounter) || !Object.values(file.f).every(isCounter)
            || !Object.values(file.b).every(branch => Array.isArray(branch) && branch.every(isCounter))) throw failure();
        collected = true;
      }
    }
  } catch { throw failure(); }
  if (!collected) throw failure();
}

/** The isolation runner owns application startup, environment and child cleanup. */
async function runCoverageWorkflow(dependencies = {}, arguments_ = process.argv.slice(2)) {
  const runner = dependencies.runner || await import('../../scripts/run-isolated-e2e.mjs');
  const execute = dependencies.execute || execFileSync;
  const clean = dependencies.clean || removeGeneratedDirectory;
  const assertCoverage = dependencies.assertCoverage || assertCollectedCoverage;
  const coverageDirectory = dependencies.coverageDirectory || path.join(frontendDirectory, '.nyc_output');
  const logger = dependencies.logger || console;

  logger.log('Cleaning previous E2E coverage results.');
  clean(frontendDirectory, '.nyc_output');
  clean(frontendDirectory, 'coverage');

  let primaryFailure;
  let reportFailure;
  try {
    // With no project arguments the complete configured suite remains selected.
    await runner.main(['--coverage', '--', ...arguments_]);
    assertCoverage(coverageDirectory);
  } catch (error) {
    primaryFailure = error;
    logger.error('Isolated E2E coverage run failed.');
  } finally {
    logger.log('Generating the E2E coverage report.');
    try {
      execute(process.execPath, [require.resolve('nyc/bin/nyc.js'), 'report', '--reporter=html', '--reporter=text'], {
        cwd: frontendDirectory, stdio: 'inherit', windowsHide: true, env: runner.closedEnvironment(),
      });
    } catch (error) {
      reportFailure = error;
      logger.error('E2E coverage report generation failed.');
    }
  }

  const failures = [primaryFailure, reportFailure].filter(Boolean);
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, 'E2E coverage workflow failed in multiple stages.');
}

if (require.main === module) {
  void runCoverageWorkflow().catch(() => {
    console.error('E2E coverage workflow failed; inspect the isolated run and report results.');
    process.exitCode = 1;
  });
}

module.exports = { runCoverageWorkflow, assertCollectedCoverage };
