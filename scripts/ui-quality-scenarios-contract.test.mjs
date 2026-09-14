import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { REVIEWED_ON, queryConsumerContractErrors, validateUiQuality } from './ui-quality-scenarios-contract.mjs';
import { verifyDurableEvidenceFromRepository } from './ui-quality-evidence-durability.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(repoRoot, 'config', 'ui-quality-scenarios.json');
const routeTruthPath = join(repoRoot, 'config', 'ui-route-capabilities.json');
const urlStateCensusPath = join(repoRoot, 'config', 'ui-url-state-census.json');
const e2eRoot = join(repoRoot, 'frontend', 'e2e');

// Upstream measured-evidence regression explicitly supplies its eight-scenario reader.
// Artifact source validation has no runtime evidence reader or import-time plan execution.
function validateManifest(manifest, routeTruth, artifactRoot = repoRoot, reader = verifyDurableEvidenceFromRepository) {
  return validateUiQuality(manifest, routeTruth, artifactRoot, reader);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function clone(value) {
  return structuredClone(value);
}

function collectFiles(root, predicate) {
  const files = [];
  for (const entry of readdirSync(root)) {
    const absolute = join(root, entry);
    if (statSync(absolute).isDirectory()) files.push(...collectFiles(absolute, predicate));
    else if (predicate(absolute)) files.push(absolute);
  }
  return files;
}

function disablesColorContrast(source) {
  return /\.disableRules\s*\(\s*\[[^\]]*['"]color-contrast['"][^\]]*\]\s*\)/s.test(source);
}

function validateTemporaryFixture(mutator, durableEvidenceReader) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'ui-quality-scenarios-'));
  try {
    const fixtureConfig = join(fixtureRoot, 'config');
    mkdirSync(fixtureConfig, { recursive: true });
    const fixturePath = join(fixtureConfig, 'ui-quality-scenarios.json');
    const fixture = clone(readJson(manifestPath));
    mutator(fixture, fixtureRoot);
    writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
    return validateManifest(
      readJson(fixturePath),
      readJson(routeTruthPath),
      fixtureRoot,
      durableEvidenceReader,
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

test('current UI quality scenario manifest has exact schema and repository population', () => {
  const errors = validateManifest(readJson(manifestPath), readJson(routeTruthPath));
  assert.deepEqual(errors, []);
});

test('UI quality technical evidence stays unchanged when its review plan becomes overdue', (t) => {
  const manifest = readJson(manifestPath);
  const routeTruth = readJson(routeTruthPath);
  const baseline = validateManifest(manifest, routeTruth);
  assert.deepEqual(baseline, []);
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(`${REVIEWED_ON}T12:00:00Z`) });
  for (const timestamp of [
    `${REVIEWED_ON}T12:00:00Z`,
    '2026-12-07T15:00:00Z',
    '2036-01-01T00:00:00Z',
  ]) {
    t.mock.timers.setTime(Date.parse(timestamp));
    assert.deepEqual(validateManifest(manifest, routeTruth), baseline, timestamp);
  }
});

test('scenario query templates are consumed by their current route and unknown keys turn red', () => {
  const manifest = readJson(manifestPath);
  const census = readJson(urlStateCensusPath);
  assert.deepEqual(queryConsumerContractErrors(manifest, census), []);

  const fixture = clone(manifest);
  fixture.scenarios[0].journeySteps[0].queryTemplate = '?unknownIntent={safeRelativeRoute}';
  assert.match(
    queryConsumerContractErrors(fixture, census).join('\n'),
    /query 'unknownIntent' has no current route consumer/,
  );
});

test('temporary fixtures prove schema, duplicate ID and route population violations turn red', () => {
  const cases = [
    {
      name: 'unknown schema field',
      mutate: (fixture) => { fixture.scenarios[0].surprise = true; },
      expected: /unknown key 'surprise'/,
    },
    {
      name: 'duplicate scenario ID',
      mutate: (fixture) => { fixture.scenarios.push(clone(fixture.scenarios[0])); },
      expected: /duplicate scenario id/,
    },
    {
      name: 'missing first-use onboarding scenario',
      mutate: (fixture) => {
        fixture.scenarios = fixture.scenarios.filter(({ id }) => id !== 'first-use-onboarding');
      },
      expected: /eight baseline archetypes/,
    },
    {
      name: 'duplicate journey step ID',
      mutate: (fixture) => {
        fixture.scenarios[0].journeySteps[1].id = fixture.scenarios[0].journeySteps[0].id;
      },
      expected: /duplicate step id/,
    },
    {
      name: 'unknown mutation task evidence ID',
      mutate: (fixture) => {
        const scenario = fixture.scenarios.find(({ id }) => id === 'user-management-hub');
        scenario.journeySteps[0].requiredTaskEvidenceId = 'unreviewed-mutation-evidence';
      },
      expected: /requiredTaskEvidenceId.*(?:approved scenario-step|unknown)/,
    },
    {
      name: 'duplicate mutation task evidence ID',
      mutate: (fixture) => {
        const scenario = fixture.scenarios.find(({ id }) => id === 'user-management-hub');
        scenario.journeySteps[1].requiredTaskEvidenceId = scenario.journeySteps[0].requiredTaskEvidenceId;
      },
      expected: /requiredTaskEvidenceId.*(?:approved scenario-step|duplicates)/,
    },
    {
      name: 'mutation task evidence moved to the wrong scenario-step',
      mutate: (fixture) => {
        const source = fixture.scenarios.find(({ id }) => id === 'board-maker-wizard').journeySteps[0];
        const target = fixture.scenarios.find(({ id }) => id === 'auth-login').journeySteps[0];
        target.requiredTaskEvidenceId = source.requiredTaskEvidenceId;
        delete source.requiredTaskEvidenceId;
      },
      expected: /requiredTaskEvidenceId.*(?:not approved|approved scenario-step)/,
    },
    {
      name: 'stale parallel board route',
      mutate: (fixture) => {
        const scenario = fixture.scenarios.find(({ id }) => id === 'board-article-composer');
        scenario.journeySteps[0].route = '/admin/community/boards/write';
        scenario.journeySteps[0].source = 'frontend/src/app/admin/community/boards/write/page.tsx';
      },
      expected: /route population must exactly|current production-evidenced/,
    },
  ];

  for (const fixtureCase of cases) {
    const errors = validateTemporaryFixture(fixtureCase.mutate).join('\n');
    assert.match(errors, fixtureCase.expected, `${fixtureCase.name} fixture did not turn red`);
  }
});

test('temporary fixtures prove disabled contrast and weakened measurement coverage turn red', () => {
  const contrastDisabled = validateTemporaryFixture((fixture) => {
    fixture.automation.axe.disabledRules.push('color-contrast');
  }).join('\n');
  assert.match(contrastDisabled, /disabledRules must remain empty/);

  const nonDeterministic = validateTemporaryFixture((fixture) => {
    fixture.automation.axe.deterministic = false;
  }).join('\n');
  assert.match(nonDeterministic, /deterministic mode must be true/);

  const missingTaskMetric = validateTemporaryFixture((fixture) => {
    fixture.scenarios[0].taskMetricIds.pop();
  }).join('\n');
  assert.match(missingTaskMetric, /missing a required task metric/);

  const missingPerformanceMetric = validateTemporaryFixture((fixture) => {
    fixture.scenarios[0].performanceMetricIds.pop();
  }).join('\n');
  assert.match(missingPerformanceMetric, /missing route JS\/LCP\/CLS\/interaction evidence/);
});

test('executable axe specs keep color contrast enabled and a disabled-rule fixture turns red', () => {
  assert.equal(
    disablesColorContrast("new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()"),
    true,
    'the deliberate disabled-rule fixture must be detected',
  );
  const offenders = collectFiles(e2eRoot, (path) => path.endsWith('.spec.ts'))
    .filter((path) => disablesColorContrast(readFileSync(path, 'utf8')))
    .map((path) => relative(repoRoot, path).replaceAll('\\', '/'));
  assert.deepEqual(offenders, [], `color-contrast is disabled in executable specs: ${offenders.join(', ')}`);
});

test('temporary fixtures prove malformed or unbounded unknown evidence turns red', () => {
  const unknown = validateTemporaryFixture((fixture) => {
    fixture.scenarios[0].currentBaseline.status = 'unknown';
  }).join('\n');
  assert.match(unknown, /baseline status is unknown or unbounded/);

  const predatesReview = validateTemporaryFixture((fixture) => {
    fixture.scenarios[0].currentBaseline.reviewBy = '2026-08-20';
  }).join('\n');
  assert.match(predatesReview, /reviewBy predates its evidence review/);

  const unbounded = validateTemporaryFixture((fixture) => {
    fixture.scenarios[0].journeySteps[0].truth.reviewBy = '2027-08-21';
  }).join('\n');
  assert.match(unbounded, /reviewBy is unbounded beyond 90 days/);

  for (const mutate of [
    (fixture) => { fixture.scenarios[0].currentBaseline.reviewBy = '2026-11-31'; },
    (fixture) => { fixture.executionBlockers[0].reviewBy = '2026-11-31'; },
    (fixture) => { fixture.dimensions.brandThemes[0].reviewBy = '2026-11-31'; },
  ]) {
    assert.match(validateTemporaryFixture(mutate).join('\n'), /reviewBy is not a real calendar date/);
  }
  const missingOwner = validateTemporaryFixture((fixture) => {
    delete fixture.scenarios[0].journeySteps[0].truth.owner;
  }).join('\n');
  assert.match(missingOwner, /owner must be bounded and non-empty/);

  const widenedPolicy = validateTemporaryFixture((fixture) => {
    fixture.unknownPolicy.maxReviewDays = 900;
  }).join('\n');
  assert.match(widenedPolicy, /maxReviewDays must remain exactly 90/);

  const silentlyRenewed = validateTemporaryFixture((fixture) => {
    fixture.asOf = '2026-09-09';
  }).join('\n');
  assert.match(silentlyRenewed, /asOf must be the reviewed date 2026-09-08/);
});

test('temporary fixtures prove missing evidence paths and privacy-forbidden keys turn red', () => {
  const missingPath = validateTemporaryFixture((fixture) => {
    delete fixture.scenarios[0].currentBaseline.artifactPath;
  }).join('\n');
  assert.match(missingPath, /missing required key 'artifactPath'|missing evidence artifactPath/);

  const falseMeasured = validateTemporaryFixture((fixture) => {
    fixture.scenarios[0].currentBaseline.status = 'measured';
    fixture.scenarios[0].currentBaseline.artifactPath =
      'build/reports/ui-quality-baseline/auth-login/nonexistent-result.json';
  }).join('\n');
  assert.doesNotMatch(falseMeasured, /marked measured but the evidence file is missing/);
  assert.match(falseMeasured, /verified current combined durable summary/);

  const leakedIdentity = validateTemporaryFixture((fixture) => {
    fixture.scenarios[0].currentBaseline.userId = 'synthetic-decoy';
  }).join('\n');
  assert.match(leakedIdentity, /privacy-forbidden artifact\/data key/);

  const leakedMeasuredArtifact = validateTemporaryFixture((fixture, fixtureRoot) => {
    const baseline = fixture.scenarios[0].currentBaseline;
    baseline.status = 'measured';
    const absolute = join(fixtureRoot, ...baseline.artifactPath.split('/'));
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, `${JSON.stringify({
      scenarioId: fixture.scenarios[0].id,
      userId: 'synthetic-decoy',
    })}\n`, 'utf8');
  }).join('\n');
  assert.doesNotMatch(leakedMeasuredArtifact, /measured artifact\.userId is a privacy-forbidden artifact\/data key/);
  assert.match(leakedMeasuredArtifact, /verified current combined durable summary/);
});

function verifiedCombinedProjection(fixture) {
  const scenarioEvidence = fixture.scenarios
    .map((scenario) => ({
      scenarioId: scenario.id,
      status: 'measured',
      plannedStateCaseCount: scenario.journeySteps.length * 6,
      observedStateCaseCount: scenario.journeySteps.length * 6,
      invalidStateCaseCount: 0,
      plannedPerformanceCaseCount: 6,
      observedPerformanceCaseCount: 6,
      invalidPerformanceCaseCount: 0,
      automatedFindingCount: 0,
      manualFindingCount: 0,
      findingCount: 0,
    }))
    .sort((left, right) => left.scenarioId.localeCompare(right.scenarioId));
  return {
    verified: true,
    reasonCode: 'durable-combined-summary-measured-eligible',
    baselineRunId: 'r13',
    executionId: '123e4567-e89b-42d3-a456-426614174000',
    currentDigest: 'a'.repeat(64),
    scenarioEvidence,
  };
}

test('measured scenarios use the verified tracked combined projection without ignored raw files', () => {
  let projection;
  const errors = validateTemporaryFixture((fixture) => {
    for (const scenario of fixture.scenarios) scenario.currentBaseline.status = 'measured';
    projection = verifiedCombinedProjection(fixture);
  }, () => projection);

  assert.deepEqual(errors, []);
});

test('measured scenarios reject missing, duplicate, and substituted durable projections', () => {
  for (const mutateProjection of [
    (projection) => projection.scenarioEvidence.pop(),
    (projection) => projection.scenarioEvidence.push(structuredClone(projection.scenarioEvidence[0])),
    (projection) => { projection.scenarioEvidence[0].scenarioId = 'substituted-scenario'; },
  ]) {
    let projection;
    const errors = validateTemporaryFixture((fixture) => {
      for (const scenario of fixture.scenarios) scenario.currentBaseline.status = 'measured';
      projection = verifiedCombinedProjection(fixture);
      mutateProjection(projection);
    }, () => projection).join('\n');

    assert.match(errors, /exact eight-scenario durable projection/);
  }
});
