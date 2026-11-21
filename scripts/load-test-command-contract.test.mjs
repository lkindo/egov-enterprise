import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const runner = fs.readFileSync('scripts/run-load-test.ps1', 'utf8');
const installer = fs.readFileSync('scripts/install-k6.ps1', 'utf8');
const scenario = fs.readFileSync('test/load-tests/scenarios/load-levels.js', 'utf8');
const workflow = fs.readFileSync('.github/workflows/load-test.yml', 'utf8').replaceAll('\r\n', '\n');
const scenarioSources = fs.readdirSync('test/load-tests/scenarios')
  .filter((name) => name.endsWith('.js'))
  .map((name) => fs.readFileSync(`test/load-tests/scenarios/${name}`, 'utf8'))
  .join('\n');

test('PowerShell load-test entry points select scenarios through the script environment contract', () => {
  assert.match(runner, /-e\s+"K6_SCENARIO=\$scenario"/);
  assert.match(installer, /k6 run -e K6_SCENARIO=users-100/);
  assert.doesNotMatch(`${runner}\n${installer}\n${scenarioSources}`, /--scenario\b/);
});

test('the k6 scenario script rejects an unknown selection instead of widening it', () => {
  assert.match(scenario, /const name = __ENV\.K6_SCENARIO/);
  assert.match(scenario, /if \(!picked\)[\s\S]*?throw new Error/);
  assert.match(scenario, /return \{ \[name\]: picked \}/);
});

test('weekly load uploads the generated summary on threshold failure and keeps setup data out of all reports', () => {
  const upload = workflow.split(/\n\s*- name: /).find(step => step.startsWith('Upload Test Results\n'));
  assert.ok(upload?.includes('if: always()'));
  assert.match(upload, /^\s*test\/load-tests\/results\/summary-\*\.json\s*$/m);

  const start = scenario.indexOf('export function handleSummary(');
  assert.notEqual(start, -1);
  const handler = scenario.slice(start + 'export '.length);
  const measurements = { root_group: {}, options: {}, state: {}, metrics: { checks: { values: { rate: 0.9 } } } };
  const reports = runInNewContext(handler + '\nhandleSummary(input)', {
    __ENV: { K6_SCENARIO: 'users-100' },
    input: { ...measurements, setup_data: { token: 'synthetic-test-marker' } },
    createHtmlReport: data => JSON.stringify(data),
    textSummary: data => JSON.stringify(data),
  }, { timeout: 1000 });
  const files = Object.keys(reports);
  const json = files.find(name => name.endsWith('.json'));
  const html = files.find(name => name.endsWith('.html'));
  assert.ok(json && html);
  assert.ok(upload.split('\n').some(line => path.posix.matchesGlob(json, line.trim())));
  for (const name of [json, html, 'stdout']) assert.deepEqual(JSON.parse(reports[name]), measurements);
});

test('only an explicitly selected local fixture seeds empty reference boards', () => {
  assert.ok(scenario.includes("const seedEmpty = loopback && __ENV.LOAD_TEST_SEED_EMPTY_BOARDS === 'true'"));
  assert.ok(scenario.includes('const references = readDashboardReferences(token, seedEmpty)'));
  assert.ok(workflow.includes("LOAD_TEST_SEED_EMPTY_BOARDS: ${{ secrets.LOAD_TEST_BASE_URL && 'false' || 'true' }}"));
});
