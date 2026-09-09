import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkReport, gateExitCode, policy, repoRoot } from './sast-policy.mjs';

// Local equivalent of the CI CodeQL init/build/analyze steps. No service,
// application credentials, or running database is required.
const codeql = process.env.CODEQL_PATH || 'codeql';
const language = process.argv[2];
if (!policy.languages.includes(language) || process.argv.length !== 3) {
  console.error('Usage: CODEQL_PATH=<binary> node scripts/run-sast.mjs java|javascript');
  process.exit(2);
}
fs.mkdirSync(path.join(repoRoot, 'build'), { recursive: true });
const directory = fs.mkdtempSync(path.join(repoRoot, 'build/sast-'));
const logFile = path.join(directory, 'scan.log');
const log = fs.openSync(logFile, 'w');
function run(args) {
  const result = spawnSync(codeql, args, { cwd: repoRoot, stdio: ['ignore', log, log] });
  if (result.error || result.status !== 0) throw new Error(`CodeQL ${args.slice(0, 2).join(' ')} failed; see ${logFile}`);
}
try {
  console.log(`CodeQL ${language} evidence: ${directory}`);
  const database = path.join(directory, 'database');
  const create = ['database', 'create', database, `--language=${language}`, `--source-root=${repoRoot}`,
    '--threads=4', '--ram=6144', '--codescanning-config=config/security/codeql.yml'];
  if (language === 'java') {
    const wrapper = path.join(repoRoot, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
    create.push(`--command="${wrapper}" compileJava --no-daemon --no-build-cache --rerun-tasks --console=plain -Dfile.encoding=UTF-8`);
  } else create.push('--build-mode=none');
  run(create);
  const report = path.join(directory, `${language}.sarif`);
  run(['database', 'analyze', database,
    `codeql/${language}-queries:codeql-suites/${language}-${policy.querySuite}.qls`,
    '--threads=4', '--ram=6144', '--format=sarifv2.1.0', `--output=${report}`,
    '--no-sarif-add-snippets', '--no-sarif-add-file-contents']);
  process.exitCode = gateExitCode(checkReport(report, language,
    path.join(directory, 'sanitized', `${language}.sarif`), path.join(directory, 'publish', `${language}.sarif`)));
} catch (error) {
  console.error(error.message);
  process.exitCode = 2;
} finally { fs.closeSync(log); }
