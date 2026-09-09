import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parseWorkflowJobs, validateStaticContract } from './required-checks-contract.mjs';
import { classifyChangedFiles, githubOutputs } from './ci-change-scope.mjs';
import { policy } from './sast-policy.mjs';

const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf8').replace(/\r\n/g, '\n');
const config = fs.readFileSync('config/security/codeql.yml', 'utf8').replace(/\r\n/g, '\n');
const manifest = JSON.parse(fs.readFileSync('.github/required-checks.json', 'utf8'));

function verifyBinding(workflow) {
  const jobs = parseWorkflowJobs(workflow);
  const scan = jobs.get('sast-scope') ?? '';
  const errors = validateStaticContract({ manifest, ciContent: workflow });
  if (!/^    env:\n(?:      #[^\n]*\n)*      CODEQL_ACTION_DIFF_INFORMED_QUERIES: 'false'$/m.test(scan)) {
    errors.push('SAST job must disable PR diff-informed analysis');
  }
  for (const required of [
    'config-file: config/security/codeql.yml',
    `tools: https://github.com/github/codeql-action/releases/download/codeql-bundle-v${policy.codeqlVersion}/codeql-bundle-linux64.tar.gz`,
    "build-mode: ${{ matrix.language == 'java' && 'manual' || 'none' }}",
    'run: ./gradlew compileJava --no-daemon --no-build-cache --rerun-tasks --console=plain -Dfile.encoding=UTF-8',
    'upload: never', 'upload-database: false',
    'run: node scripts/sast-probe.mjs ${{ matrix.language }}',
    'sarif_file: build/sast/publish/${{ matrix.language }}.sarif',
    'path: build/sast/sanitized/${{ matrix.language }}.sarif',
  ]) if (!scan.split('\n').some(line => line.trim() === required)) errors.push(`Missing SAST binding: ${required}`);
  if (/continue-on-error:|skip-queries:|config:\s*\|/.test(scan)) errors.push('SAST execution cannot be bypassed');
  return errors;
}

test('secure coding is a sixth required aggregate with both language scans and executable red proof', () => {
  assert.deepEqual(verifyBinding(ci), []);
  assert.equal(manifest.requiredChecks.filter(c => c.context === 'secure-coding').length, 1);
  assert.deepEqual(policy, { schemaVersion: 1, codeqlVersion: '2.26.4', minimumBlockingScore: 7,
    languages: ['java', 'javascript'], querySuite: 'security-extended' });
});

test('deleted gate, missing language, bypass, query config drift and detached probe go red', () => {
  for (const [from, to] of [
    ['run: node scripts/sast-policy.mjs build/sast/raw/', 'run: echo build/sast/raw/'],
    ['language: [java, javascript]', 'language: [java]'],
    ['      - name: Enforce secure coding policy', '      - name: Enforce secure coding policy\n        continue-on-error: true'],
    ['config-file: config/security/codeql.yml', 'config-file: config/security/empty.yml'],
    ['run: node scripts/sast-probe.mjs', 'run: echo scripts/sast-probe.mjs'],
    ['--no-build-cache --rerun-tasks', '--no-build-cache'],
    ['sarif_file: build/sast/publish/', 'sarif_file: build/sast/raw/'],
    ['path: build/sast/sanitized/', 'path: build/sast/publish/'],
    ["CODEQL_ACTION_DIFF_INFORMED_QUERIES: 'false'", "CODEQL_ACTION_DIFF_INFORMED_QUERIES: 'true'"],
    ["CODEQL_ACTION_DIFF_INFORMED_QUERIES: 'false'", ''],
    ["LD_PRELOAD: ''", 'LD_PRELOAD: inherited-tracer'],
  ]) {
    assert.ok(ci.includes(from), from);
    assert.ok(verifyBinding(ci.replace(from, to)).length, from);
  }
});

test('all source and policy changes scan; only explicit documentation can skip', () => {
  for (const files of [[], ['frontend/src/app/page.tsx'], ['foundation/src/main/java/Example.java'],
    ['migration-tool/src/main/java/Runner.java'], ['scripts/helper.mjs'], ['config/security/codeql.yml'],
    ['.github/workflows/ci.yml'], ['new-root/file.ts']]) {
    assert.equal(githubOutputs(classifyChangedFiles(files)).sast, 'true');
  }
  assert.equal(githubOutputs(classifyChangedFiles(['README.md'])).sast, 'false');
});

test('extended queries cover all application roots without rule suppression or baseline', () => {
  assert.match(config, /^queries:\n  - uses: security-extended$/m);
  assert.doesNotMatch(config, /disable-default-queries|query-filters|paths-ignore|baseline/);
  for (const root of ['frontend/src', 'frontend/scripts', 'scripts', '.agent/scripts',
    ...['foundation', 'business-core', 'business-app', 'api-server', 'migration-tool'].map(m => `${m}/src/main`)]) {
    assert.ok(config.split('\n').includes(`  - ${root}`), root);
  }
});
