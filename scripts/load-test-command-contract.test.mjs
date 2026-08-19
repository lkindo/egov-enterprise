import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const runner = fs.readFileSync('scripts/run-load-test.ps1', 'utf8');
const installer = fs.readFileSync('scripts/install-k6.ps1', 'utf8');
const scenario = fs.readFileSync('test/load-tests/scenarios/load-levels.js', 'utf8');
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
