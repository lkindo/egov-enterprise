import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  AUTOMATION_OBSERVATION_KINDS,
  EXPECTED_SCENARIO_IDS,
  MANUAL_CHECK_BOUNDARIES,
  summarizeAssistedObservations,
  validateAssistedEnvironment,
  validateScenarioManifest,
} from '../frontend/scripts/ui-quality-assisted-accessibility.mjs';

const manifest = JSON.parse(
  readFileSync(new URL('../config/ui-quality-scenarios.json', import.meta.url), 'utf8'),
);

test('assisted accessibility keeps all six checks manual while exposing only bounded simulations', () => {
  assert.deepEqual(
    Object.keys(MANUAL_CHECK_BOUNDARIES).sort(),
    [
      'forced-colors',
      'keyboard-only',
      'nvda-chrome',
      'reduced-motion',
      'text-200-percent',
      'zoom-400-reflow-320',
    ],
  );
  assert.deepEqual(
    [...AUTOMATION_OBSERVATION_KINDS].sort(),
    [
      'forced-colors-simulation',
      'keyboard-smoke',
      'reduced-motion-simulation',
      'viewport-320-simulation',
      'viewport-640-simulation',
    ],
  );

  for (const boundary of Object.values(MANUAL_CHECK_BOUNDARIES)) {
    assert.equal(boundary.manualEvidenceSatisfied, false);
    assert.equal(boundary.canPromoteBaseline, false);
  }
  assert.equal(MANUAL_CHECK_BOUNDARIES['nvda-chrome'].automationObservationKind, null);
});

test('assisted accessibility validates the exact eight-scenario population without changing it', () => {
  assert.deepEqual(validateScenarioManifest(manifest), EXPECTED_SCENARIO_IDS);

  const missing = structuredClone(manifest);
  missing.scenarios.pop();
  assert.throws(
    () => validateScenarioManifest(missing),
    /assisted-accessibility-scenario-population-invalid/u,
  );
});

test('preflight accepts only an explicit isolated loopback stack and a 64-hex build identifier', () => {
  assert.deepEqual(
    validateAssistedEnvironment({
      UI_A11Y_ASSISTED_WEB_URL: 'http://127.0.0.1:3013',
      UI_A11Y_ASSISTED_STACK_CLASSIFICATION: 'isolated-synthetic',
      UI_A11Y_ASSISTED_BUILD_ID: 'a'.repeat(64),
    }),
    {
      webOrigin: 'http://127.0.0.1:3013',
      buildId: 'a'.repeat(64),
    },
  );

  const invalidEnvironments = [
    {},
    {
      UI_A11Y_ASSISTED_WEB_URL: 'https://example.test',
      UI_A11Y_ASSISTED_STACK_CLASSIFICATION: 'isolated-synthetic',
      UI_A11Y_ASSISTED_BUILD_ID: 'a'.repeat(64),
    },
    {
      UI_A11Y_ASSISTED_WEB_URL: 'http://127.0.0.1:3013/private',
      UI_A11Y_ASSISTED_STACK_CLASSIFICATION: 'isolated-synthetic',
      UI_A11Y_ASSISTED_BUILD_ID: 'a'.repeat(64),
    },
    {
      UI_A11Y_ASSISTED_WEB_URL: 'http://127.0.0.1:3013',
      UI_A11Y_ASSISTED_STACK_CLASSIFICATION: 'production',
      UI_A11Y_ASSISTED_BUILD_ID: 'a'.repeat(64),
    },
    {
      UI_A11Y_ASSISTED_WEB_URL: 'http://127.0.0.1:3013',
      UI_A11Y_ASSISTED_STACK_CLASSIFICATION: 'isolated-synthetic',
      UI_A11Y_ASSISTED_BUILD_ID: 'not-a-digest',
    },
  ];

  for (const environment of invalidEnvironments) {
    assert.throws(
      () => validateAssistedEnvironment(environment),
      /^Error: assisted-accessibility-preflight-invalid$/u,
    );
  }
});

test('summary contains aggregate counts only and can never satisfy manual evidence', () => {
  const observations = EXPECTED_SCENARIO_IDS.flatMap((scenarioId) =>
    AUTOMATION_OBSERVATION_KINDS.map((kind) => ({ scenarioId, kind, findingCount: 0 })),
  );
  const summary = summarizeAssistedObservations({
    buildId: 'b'.repeat(64),
    observations,
  });

  assert.deepEqual(summary, {
    schemaVersion: 1,
    evidenceKind: 'automation-assisted-simulation',
    buildId: 'b'.repeat(64),
    scenarioCount: 8,
    observationCount: 40,
    findingCount: 0,
    invalidCount: 0,
    observationsByKind: {
      'keyboard-smoke': 8,
      'viewport-640-simulation': 8,
      'viewport-320-simulation': 8,
      'forced-colors-simulation': 8,
      'reduced-motion-simulation': 8,
    },
    manualEvidenceSatisfied: false,
    baselinePromotionEligible: false,
  });
  const serialized = JSON.stringify(summary);
  assert.equal(serialized.includes('/admin'), false);
  assert.equal(serialized.includes('locator'), false);
  assert.equal(serialized.includes('storageState'), false);
});

test('collector source cannot persist browser artifacts or inspect authentication files itself', () => {
  const source = readFileSync(
    new URL('../frontend/scripts/ui-quality-assisted-accessibility.mjs', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(source, /(?:writeFile|appendFile|createWriteStream|screenshot\s*\(|trace\s*[:.]|video\s*:|recordHar)/u);
  assert.doesNotMatch(source, /readFile[^\n]*(?:playwright|\.auth|admin\.json|user\.json)/u);
  assert.match(source, /manualEvidenceSatisfied:\s*false/u);
  assert.match(source, /baselinePromotionEligible:\s*false/u);
});

test('operations guide states that simulations do not close manual or NVDA evidence', () => {
  const guide = readFileSync(
    new URL('../docs/04-operations/ui-quality-assisted-accessibility.md', import.meta.url),
    'utf8',
  );

  assert.match(guide, /automation-assisted-simulation/u);
  assert.match(guide, /manualEvidenceSatisfied=false/u);
  assert.match(guide, /NVDA[^\n]*자동화[^\n]*대체[^\n]*않/u);
  assert.match(guide, /실제 browser zoom[^\n]*대체[^\n]*않/u);
  assert.match(guide, /실제 Windows High Contrast[^\n]*대체[^\n]*않/u);
});
