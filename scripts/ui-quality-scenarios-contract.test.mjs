import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { verifyDurableEvidenceFromRepository } from './ui-quality-evidence-durability.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(repoRoot, 'config', 'ui-quality-scenarios.json');
const routeTruthPath = join(repoRoot, 'config', 'ui-route-capabilities.json');
const urlStateCensusPath = join(repoRoot, 'config', 'ui-url-state-census.json');
const e2eRoot = join(repoRoot, 'frontend', 'e2e');

const REVIEWED_ON = '2026-08-21';
const CURRENT_DATE = Object.fromEntries(
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]),
);
const TODAY = `${CURRENT_DATE.year}-${CURRENT_DATE.month}-${CURRENT_DATE.day}`;
const EXPECTED_CASE_FIELDS = ['route', 'role', 'state', 'brandTheme', 'colorMode', 'viewport'];
const EXPECTED_TASK_METRICS = [
  'task-success',
  'completion-time-ms',
  'critical-error-count',
  'noncritical-error-count',
  'assistance-count',
  'first-click-correct',
  'recovery-success',
];
const EXPECTED_PERFORMANCE_METRICS = [
  'route-js-transfer-bytes',
  'lcp-ms',
  'lcp-element-resource',
  'cls',
  'interaction-latency-proxy-ms',
];
const EXPECTED_MANUAL_CHECKS = [
  'keyboard-only',
  'nvda-chrome',
  'text-200-percent',
  'zoom-400-reflow-320',
  'forced-colors',
  'reduced-motion',
];
const EXPECTED_SCENARIOS = new Map([
  ['auth-login', {
    archetype: 'authentication',
    routes: ['/login'],
  }],
  ['admin-shell-hub', {
    archetype: 'shell-hub-navigation',
    routes: ['/admin'],
  }],
  ['dense-user-logs', {
    archetype: 'dense-list',
    routes: ['/admin/system/logs/user'],
  }],
  ['user-management-hub', {
    archetype: 'master-detail-hub',
    routes: ['/admin/user/manage'],
  }],
  ['board-article-composer', {
    archetype: 'form-composer-upload-autosave',
    routes: ['/admin/community/boards/insert-board-article'],
  }],
  ['faq-admin-user-lifecycle', {
    archetype: 'cross-role-complete-process',
    routes: [
      '/admin/community/boards/insert-board-article',
      '/admin/help/faq',
      '/help',
    ],
  }],
  ['board-maker-wizard', {
    archetype: 'complex-wizard',
    routes: ['/admin/community/boards/maker'],
  }],
  ['first-use-onboarding', {
    archetype: 'first-use-guidance',
    routes: ['/admin'],
  }],
]);
const EXPECTED_MUTATION_TASK_BY_SCENARIO_STEP = new Map([
  ['user-management-hub/user-hub-ready', 'role-status-mutation-readback-executed'],
  ['user-management-hub/mutation-error', 'synthetic-role-status-rollback-complete'],
  ['faq-admin-user-lifecycle/admin-compose-faq', 'faq-authoritative-save-readback'],
  ['faq-admin-user-lifecycle/admin-faq-readback', 'admin-created-faq-readback'],
  ['faq-admin-user-lifecycle/user-faq-search', 'cross-role-created-answer-readback'],
  ['board-maker-wizard/wizard-ready', 'single-deploy-authoritative-readback'],
]);
const REQUIRED_AXE_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
];
const REQUIRED_FORBIDDEN_ARTIFACT_KEYS = [
  'authorization',
  'cookie',
  'password',
  'accessToken',
  'refreshToken',
  'userId',
  'email',
  'phone',
  'ipAddress',
  'residentRegistrationNumber',
  'rawInput',
  'freeText',
  'searchKeyword',
  'responseBody',
];

const TOP_LEVEL_KEYS = [
  'schemaVersion',
  'asOf',
  'authority',
  'protocol',
  'routeTruthSource',
  'artifactRoot',
  'caseIdentityFields',
  'unknownPolicy',
  'dimensions',
  'repeatPolicy',
  'metrics',
  'automation',
  'manualChecks',
  'privacy',
  'executionBlockers',
  'scenarios',
];

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

function normalizeKey(value) {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function hasExactMembers(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && new Set(actual).size === actual.length
    && expected.every((item) => actual.includes(item));
}

function validateExactKeys(value, required, allowed, label, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  const actual = Object.keys(value);
  for (const key of required) {
    if (!actual.includes(key)) errors.push(`${label} is missing required key '${key}'`);
  }
  for (const key of actual) {
    if (!allowed.includes(key)) errors.push(`${label} has unknown key '${key}'`);
  }
  return true;
}

function parseDate(value, label, errors) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    errors.push(`${label} must be YYYY-MM-DD`);
    return null;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    errors.push(`${label} is not a real calendar date`);
    return null;
  }
  return parsed;
}

function validateBoundedReview(value, label, asOf, maxReviewDays, errors) {
  if (!value || typeof value !== 'object') {
    errors.push(`${label} must have owner and reviewBy`);
    return;
  }
  if (typeof value.owner !== 'string' || value.owner.trim().length < 3) {
    errors.push(`${label}.owner must be bounded and non-empty`);
  }
  const base = parseDate(asOf, 'asOf', errors);
  const current = parseDate(TODAY, 'current Asia/Seoul date', errors);
  const review = parseDate(value.reviewBy, `${label}.reviewBy`, errors);
  if (!base || !current || !review) return;
  const days = (review.getTime() - base.getTime()) / 86_400_000;
  if (review < current) errors.push(`${label}.reviewBy is stale`);
  if (days < 0) errors.push(`${label}.reviewBy predates its evidence review`);
  if (days > maxReviewDays) errors.push(`${label}.reviewBy is unbounded beyond ${maxReviewDays} days`);
}

function resolveRepoPath(path, label, errors, baseRoot = repoRoot) {
  if (typeof path !== 'string' || path.length === 0 || isAbsolute(path)) {
    errors.push(`${label} must be a non-empty repository-relative path`);
    return null;
  }
  const absolute = resolve(baseRoot, path);
  const back = relative(baseRoot, absolute);
  if (back === '..' || back.startsWith(`..${sep}`)) {
    errors.push(`${label} escapes the repository`);
    return null;
  }
  return absolute;
}

function validateSourcePath(path, label, errors) {
  const absolute = resolveRepoPath(path, label, errors);
  if (absolute && !existsSync(absolute)) errors.push(`${label} does not exist: ${path}`);
}

function validateArtifactPath(path, scenarioId, artifactRoot, errors, artifactBaseRoot) {
  const label = `scenario '${scenarioId}' artifactPath`;
  const absolute = resolveRepoPath(path, label, errors, artifactBaseRoot);
  if (!absolute) return null;
  const expectedPrefix = `${artifactRoot}/${scenarioId}/`;
  if (!path.startsWith(expectedPrefix) || !path.endsWith('.json')) {
    errors.push(`${label} must be a JSON evidence path below ${expectedPrefix}`);
  }
  if (/[?#]/.test(path)) errors.push(`${label} must not contain a query or fragment`);
  return absolute;
}

function validateMeasuredDurableProjection(manifest, durability, errors) {
  if (!Array.isArray(manifest?.scenarios)) return;
  const measuredScenarios = manifest.scenarios.filter(
    ({ currentBaseline }) => currentBaseline?.status === 'measured',
  );
  if (measuredScenarios.length === 0 || durability?.verified !== true) return;
  if (measuredScenarios.length !== manifest.scenarios.length) {
    errors.push('measured baseline requires the exact eight-scenario durable projection');
    return;
  }
  const evidence = durability.scenarioEvidence;
  const expectedScenarioIds = manifest.scenarios.map(({ id }) => id).sort();
  if (!Array.isArray(evidence)
    || evidence.length !== expectedScenarioIds.length
    || new Set(evidence.map(({ scenarioId }) => scenarioId)).size !== expectedScenarioIds.length
    || !hasExactMembers(evidence.map(({ scenarioId }) => scenarioId), expectedScenarioIds)) {
    errors.push('measured baseline requires the exact eight-scenario durable projection');
    return;
  }
  const renderCaseCount = manifest.dimensions.brandThemes.length
    * manifest.dimensions.colorModes.length
    * manifest.dimensions.viewports.length;
  for (const scenario of manifest.scenarios) {
    const projection = evidence.find(({ scenarioId }) => scenarioId === scenario.id);
    const label = `durable scenario projection '${scenario.id}'`;
    if (!validateExactKeys(
      projection,
      [
        'scenarioId', 'status',
        'plannedStateCaseCount', 'observedStateCaseCount', 'invalidStateCaseCount',
        'plannedPerformanceCaseCount', 'observedPerformanceCaseCount',
        'invalidPerformanceCaseCount', 'automatedFindingCount', 'manualFindingCount',
        'findingCount',
      ],
      [
        'scenarioId', 'status',
        'plannedStateCaseCount', 'observedStateCaseCount', 'invalidStateCaseCount',
        'plannedPerformanceCaseCount', 'observedPerformanceCaseCount',
        'invalidPerformanceCaseCount', 'automatedFindingCount', 'manualFindingCount',
        'findingCount',
      ],
      label,
      errors,
    )) continue;
    const expectedStateCaseCount = scenario.journeySteps.length * renderCaseCount;
    if (projection.status !== 'measured'
      || projection.plannedStateCaseCount !== expectedStateCaseCount
      || projection.observedStateCaseCount !== expectedStateCaseCount
      || projection.invalidStateCaseCount !== 0
      || projection.plannedPerformanceCaseCount !== renderCaseCount
      || projection.observedPerformanceCaseCount !== renderCaseCount
      || projection.invalidPerformanceCaseCount !== 0
      || projection.findingCount !== projection.automatedFindingCount + projection.manualFindingCount) {
      errors.push(`${label} does not match the exact measured scenario population`);
    }
  }
}

function scanForbiddenKeys(value, forbidden, label, errors) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForbiddenKeys(item, forbidden, `${label}[${index}]`, errors));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(normalizeKey(key))) {
      errors.push(`${label}.${key} is a privacy-forbidden artifact/data key`);
    }
    scanForbiddenKeys(child, forbidden, `${label}.${key}`, errors);
  }
}

function validateManifest(
  manifest,
  routeTruthManifest,
  artifactBaseRoot = repoRoot,
  durableEvidenceReader = verifyDurableEvidenceFromRepository,
) {
  const errors = [];
  if (!validateExactKeys(manifest, TOP_LEVEL_KEYS, TOP_LEVEL_KEYS, 'manifest', errors)) return errors;
  const measuredDurability = manifest.scenarios?.some(({ currentBaseline }) => currentBaseline?.status === 'measured')
    ? durableEvidenceReader({ repoRoot: artifactBaseRoot })
    : null;

  validateMeasuredDurableProjection(manifest, measuredDurability, errors);

  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be exactly 1');
  if (manifest.asOf !== REVIEWED_ON) errors.push(`asOf must be the reviewed date ${REVIEWED_ON}`);
  if (manifest.authority !== 'baseline-input-not-results') {
    errors.push("authority must be 'baseline-input-not-results'");
  }
  validateSourcePath(manifest.protocol, 'protocol', errors);
  validateSourcePath(manifest.routeTruthSource, 'routeTruthSource', errors);
  if (manifest.artifactRoot !== 'build/reports/ui-quality-baseline') {
    errors.push('artifactRoot must remain build/reports/ui-quality-baseline');
  }
  if (!hasExactMembers(manifest.caseIdentityFields, EXPECTED_CASE_FIELDS)) {
    errors.push(`caseIdentityFields must exactly contain ${EXPECTED_CASE_FIELDS.join(', ')}`);
  }

  const unknownPolicy = manifest.unknownPolicy;
  if (validateExactKeys(
    unknownPolicy,
    ['allowedBoundedStatuses', 'maxReviewDays'],
    ['allowedBoundedStatuses', 'maxReviewDays'],
    'unknownPolicy',
    errors,
  )) {
    if (!hasExactMembers(unknownPolicy.allowedBoundedStatuses, ['unverified', 'unmeasured', 'blocked-external'])) {
      errors.push('allowedBoundedStatuses must be exact; an unknown state cannot silently widen the vocabulary');
    }
    if (unknownPolicy.maxReviewDays !== 90) errors.push('maxReviewDays must remain exactly 90');
  }
  const maxReviewDays = unknownPolicy?.maxReviewDays === 90 ? 90 : 90;

  const dimensions = manifest.dimensions;
  if (validateExactKeys(
    dimensions,
    ['brandThemes', 'colorModes', 'viewports'],
    ['brandThemes', 'colorModes', 'viewports'],
    'dimensions',
    errors,
  )) {
    if (!Array.isArray(dimensions.brandThemes) || dimensions.brandThemes.length !== 1) {
      errors.push('dimensions.brandThemes must contain the one current, explicitly unverified baseline label');
    } else {
      const theme = dimensions.brandThemes[0];
      validateExactKeys(
        theme,
        ['id', 'status', 'description', 'owner', 'reviewBy'],
        ['id', 'status', 'description', 'owner', 'reviewBy'],
        'dimensions.brandThemes[0]',
        errors,
      );
      if (theme.id !== 'current-default' || theme.status !== 'unverified') {
        errors.push("the current brand theme must remain 'current-default' and 'unverified' until product approval");
      }
      validateBoundedReview(theme, 'dimensions.brandThemes[0]', manifest.asOf, maxReviewDays, errors);
    }
    if (!hasExactMembers(dimensions.colorModes, ['light', 'dark'])) {
      errors.push('dimensions.colorModes must exactly cover light and dark');
    }
    const viewportContract = new Map([
      ['mobile-320', [320, 800]],
      ['tablet-768', [768, 1024]],
      ['desktop-1280', [1280, 800]],
    ]);
    if (!Array.isArray(dimensions.viewports) || dimensions.viewports.length !== viewportContract.size) {
      errors.push('dimensions.viewports must contain the exact three baseline viewports');
    } else {
      const ids = [];
      for (const [index, viewport] of dimensions.viewports.entries()) {
        validateExactKeys(
          viewport,
          ['id', 'width', 'height'],
          ['id', 'width', 'height'],
          `dimensions.viewports[${index}]`,
          errors,
        );
        ids.push(viewport.id);
        const expected = viewportContract.get(viewport.id);
        if (!expected || viewport.width !== expected[0] || viewport.height !== expected[1]) {
          errors.push(`viewport '${viewport.id}' does not match the fixed width/height contract`);
        }
      }
      if (new Set(ids).size !== ids.length) errors.push('viewport IDs are duplicated');
    }
  }

  const repeatPolicy = manifest.repeatPolicy;
  if (validateExactKeys(
    repeatPolicy,
    ['cold', 'warm', 'summaryStatistics'],
    ['cold', 'warm', 'summaryStatistics'],
    'repeatPolicy',
    errors,
  )) {
    for (const condition of ['cold', 'warm']) {
      const value = repeatPolicy[condition];
      validateExactKeys(
        value,
        ['repetitions', 'browserContext', 'httpCache', 'precondition'],
        ['repetitions', 'browserContext', 'httpCache', 'precondition'],
        `repeatPolicy.${condition}`,
        errors,
      );
      if (value?.repetitions !== 3) errors.push(`repeatPolicy.${condition}.repetitions must remain exactly 3`);
    }
    if (!hasExactMembers(repeatPolicy.summaryStatistics, [
      'median', 'minimum', 'maximum', 'median-absolute-deviation',
    ])) {
      errors.push('repeatPolicy.summaryStatistics must retain median, extrema and dispersion');
    }
  }

  const metrics = manifest.metrics;
  if (validateExactKeys(metrics, ['task', 'performance'], ['task', 'performance'], 'metrics', errors)) {
    for (const [kind, expected] of [
      ['task', EXPECTED_TASK_METRICS],
      ['performance', EXPECTED_PERFORMANCE_METRICS],
    ]) {
      if (!Array.isArray(metrics[kind])) {
        errors.push(`metrics.${kind} must be an array`);
        continue;
      }
      const ids = [];
      for (const [index, metric] of metrics[kind].entries()) {
        validateExactKeys(
          metric,
          ['id', 'unit', 'definition'],
          ['id', 'unit', 'definition'],
          `metrics.${kind}[${index}]`,
          errors,
        );
        ids.push(metric.id);
        if (typeof metric.definition !== 'string' || metric.definition.trim().length < 20) {
          errors.push(`metrics.${kind}[${index}].definition is not actionable`);
        }
      }
      if (!hasExactMembers(ids, expected)) {
        errors.push(`metrics.${kind} must exactly cover ${expected.join(', ')}`);
      }
    }
  }

  const axe = manifest.automation?.axe;
  validateExactKeys(
    manifest.automation,
    ['axe', 'limitations'],
    ['axe', 'limitations'],
    'automation',
    errors,
  );
  if (validateExactKeys(
    axe,
    ['runner', 'deterministic', 'browserProject', 'locale', 'timezone', 'animations', 'runOnlyTags', 'requiredRules', 'disabledRules', 'readyContract'],
    ['runner', 'deterministic', 'browserProject', 'locale', 'timezone', 'animations', 'runOnlyTags', 'requiredRules', 'disabledRules', 'readyContract'],
    'automation.axe',
    errors,
  )) {
    if (axe.deterministic !== true) errors.push('axe deterministic mode must be true');
    if (axe.browserProject !== 'chromium' || axe.locale !== 'ko-KR' || axe.timezone !== 'Asia/Seoul') {
      errors.push('axe browser, locale and timezone must remain deterministic');
    }
    if (axe.animations !== 'disabled') errors.push('axe animations must be disabled');
    if (!hasExactMembers(axe.runOnlyTags, REQUIRED_AXE_TAGS)) {
      errors.push('axe runOnlyTags must exactly cover WCAG 2.0/2.1/2.2 A+AA tags');
    }
    if (!Array.isArray(axe.requiredRules) || !axe.requiredRules.includes('color-contrast')) {
      errors.push('axe color-contrast must be an explicit required rule');
    }
    if (!Array.isArray(axe.disabledRules) || axe.disabledRules.length > 0) {
      errors.push('axe disabledRules must remain empty; color-contrast cannot be disabled');
    }
  }
  if (!Array.isArray(manifest.automation?.limitations) || manifest.automation.limitations.length < 3) {
    errors.push('automation limitations must document at least DOM scope, manual AT and contrast limits');
  }

  if (!Array.isArray(manifest.manualChecks)) {
    errors.push('manualChecks must be an array');
  } else {
    const ids = [];
    for (const [index, check] of manifest.manualChecks.entries()) {
      validateExactKeys(
        check,
        ['id', 'required', 'wcag', 'procedureRef'],
        ['id', 'required', 'wcag', 'procedureRef'],
        `manualChecks[${index}]`,
        errors,
      );
      ids.push(check.id);
      if (check.required !== true) errors.push(`manual check '${check.id}' must be required`);
      if (!Array.isArray(check.wcag) || check.wcag.length === 0) {
        errors.push(`manual check '${check.id}' must map to WCAG criteria`);
      }
      const procedurePath = typeof check.procedureRef === 'string'
        ? check.procedureRef.split('#')[0]
        : check.procedureRef;
      validateSourcePath(procedurePath, `manual check '${check.id}' procedureRef`, errors);
    }
    if (!hasExactMembers(ids, EXPECTED_MANUAL_CHECKS)) {
      errors.push(`manualChecks must exactly cover ${EXPECTED_MANUAL_CHECKS.join(', ')}`);
    }
  }

  const privacy = manifest.privacy;
  if (validateExactKeys(
    privacy,
    ['syntheticDataOnly', 'rawTraceRepositoryStorage', 'forbiddenArtifactKeys', 'redactionProcedureRef'],
    ['syntheticDataOnly', 'rawTraceRepositoryStorage', 'forbiddenArtifactKeys', 'redactionProcedureRef'],
    'privacy',
    errors,
  )) {
    if (privacy.syntheticDataOnly !== true || privacy.rawTraceRepositoryStorage !== 'forbidden') {
      errors.push('privacy must require synthetic data and forbid raw trace storage in the repository');
    }
    if (!Array.isArray(privacy.forbiddenArtifactKeys)) {
      errors.push('privacy.forbiddenArtifactKeys must be an array');
    }
    const actualForbidden = new Set(
      (Array.isArray(privacy.forbiddenArtifactKeys) ? privacy.forbiddenArtifactKeys : []).map(normalizeKey),
    );
    for (const key of REQUIRED_FORBIDDEN_ARTIFACT_KEYS) {
      if (!actualForbidden.has(normalizeKey(key))) {
        errors.push(`privacy.forbiddenArtifactKeys is missing '${key}'`);
      }
    }
    validateSourcePath(
      typeof privacy.redactionProcedureRef === 'string'
        ? privacy.redactionProcedureRef.split('#')[0]
        : privacy.redactionProcedureRef,
      'privacy.redactionProcedureRef',
      errors,
    );
  }
  const forbiddenKeys = new Set(
    (Array.isArray(privacy?.forbiddenArtifactKeys)
      ? privacy.forbiddenArtifactKeys
      : REQUIRED_FORBIDDEN_ARTIFACT_KEYS).map(normalizeKey),
  );

  if (!Array.isArray(manifest.executionBlockers) || manifest.executionBlockers.length === 0) {
    errors.push('executionBlockers must make unmeasured/blocked-external evidence explicit');
  } else {
    const blockerIds = new Set();
    for (const [index, blocker] of manifest.executionBlockers.entries()) {
      validateExactKeys(
        blocker,
        ['id', 'status', 'reason', 'owner', 'reviewBy'],
        ['id', 'status', 'reason', 'owner', 'reviewBy'],
        `executionBlockers[${index}]`,
        errors,
      );
      if (blockerIds.has(blocker.id)) errors.push(`duplicate execution blocker id '${blocker.id}'`);
      blockerIds.add(blocker.id);
      if (!['unmeasured', 'blocked-external'].includes(blocker.status)) {
        errors.push(`execution blocker '${blocker.id}' has unbounded status '${blocker.status}'`);
      }
      if (typeof blocker.reason !== 'string' || blocker.reason.trim().length < 20) {
        errors.push(`execution blocker '${blocker.id}' needs a concrete reason`);
      }
      validateBoundedReview(blocker, `execution blocker '${blocker.id}'`, manifest.asOf, maxReviewDays, errors);
    }
  }

  const routeEntries = Array.isArray(routeTruthManifest?.routes) ? routeTruthManifest.routes : [];
  const routeIndex = new Map();
  for (const entry of routeEntries) {
    if (routeIndex.has(entry.route)) errors.push(`route truth population duplicates '${entry.route}'`);
    routeIndex.set(entry.route, entry);
  }
  if (routeIndex.size === 0) errors.push('route truth population is empty');

  if (!Array.isArray(manifest.scenarios)) {
    errors.push('scenarios must be an array');
    return errors;
  }
  const scenarioIds = new Set();
  const artifactPaths = new Set();
  const mutationTaskLocationsById = new Map();
  for (const [scenarioIndex, scenario] of manifest.scenarios.entries()) {
    const label = `scenarios[${scenarioIndex}]`;
    validateExactKeys(
      scenario,
      ['id', 'archetype', 'title', 'primaryTask', 'journeySteps', 'renderMatrix', 'taskMetricIds', 'performanceMetricIds', 'performanceTargetStepId', 'currentBaseline', 'sourceEvidence'],
      ['id', 'archetype', 'title', 'primaryTask', 'journeySteps', 'renderMatrix', 'taskMetricIds', 'performanceMetricIds', 'performanceTargetStepId', 'currentBaseline', 'sourceEvidence'],
      label,
      errors,
    );
    if (scenarioIds.has(scenario.id)) errors.push(`duplicate scenario id '${scenario.id}'`);
    scenarioIds.add(scenario.id);
    const expected = EXPECTED_SCENARIOS.get(scenario.id);
    if (!expected) {
      errors.push(`unexpected scenario id '${scenario.id}'`);
    } else if (scenario.archetype !== expected.archetype) {
      errors.push(`scenario '${scenario.id}' archetype drifted from '${expected.archetype}'`);
    }
    if (typeof scenario.primaryTask !== 'string' || scenario.primaryTask.trim().length < 20) {
      errors.push(`scenario '${scenario.id}' must define an actionable primaryTask`);
    }

    const stepIds = new Set();
    const actualRoutes = new Set();
    if (!Array.isArray(scenario.journeySteps) || scenario.journeySteps.length === 0) {
      errors.push(`scenario '${scenario.id}' must contain journeySteps`);
    } else {
      for (const [stepIndex, step] of scenario.journeySteps.entries()) {
        const stepLabel = `scenario '${scenario.id}' journeySteps[${stepIndex}]`;
        validateExactKeys(
          step,
          ['id', 'route', 'source', 'role', 'state', 'truth'],
          ['id', 'route', 'queryTemplate', 'source', 'role', 'state', 'truth', 'requiredTaskEvidenceId'],
          stepLabel,
          errors,
        );
        if (stepIds.has(step.id)) errors.push(`duplicate step id '${scenario.id}/${step.id}'`);
        stepIds.add(step.id);
        if (typeof step.route !== 'string' || !step.route.startsWith('/') || /[?#]/.test(step.route)) {
          errors.push(`${stepLabel}.route must be a query-free absolute application route`);
        }
        actualRoutes.add(step.route);
        if (step.queryTemplate !== undefined
          && !/^\?(?:[A-Za-z][A-Za-z0-9_-]*=\{[A-Za-z][A-Za-z0-9]*\})(?:&[A-Za-z][A-Za-z0-9_-]*=\{[A-Za-z][A-Za-z0-9]*\})*$/.test(step.queryTemplate)) {
          errors.push(`${stepLabel}.queryTemplate must contain placeholder-only query values`);
        }
        if (!['ANONYMOUS', 'USER', 'ADMIN', 'SYSTEM'].includes(step.role)) {
          errors.push(`${stepLabel}.role is unsupported`);
        }
        const scenarioStepKey = `${scenario.id}/${step.id}`;
        const expectedTaskEvidenceId = EXPECTED_MUTATION_TASK_BY_SCENARIO_STEP.get(scenarioStepKey);
        const declaredTaskEvidenceId = step.requiredTaskEvidenceId;
        if (expectedTaskEvidenceId) {
          if (declaredTaskEvidenceId !== expectedTaskEvidenceId) {
            errors.push(`${stepLabel}.requiredTaskEvidenceId must match the approved scenario-step mutation contract`);
          }
        } else if (declaredTaskEvidenceId !== undefined && declaredTaskEvidenceId !== null) {
          errors.push(`${stepLabel}.requiredTaskEvidenceId is not approved for this scenario-step`);
        }
        if (declaredTaskEvidenceId !== undefined && declaredTaskEvidenceId !== null) {
          if (![...EXPECTED_MUTATION_TASK_BY_SCENARIO_STEP.values()].includes(declaredTaskEvidenceId)) {
            errors.push(`${stepLabel}.requiredTaskEvidenceId is unknown`);
          } else if (mutationTaskLocationsById.has(declaredTaskEvidenceId)) {
            errors.push(`${stepLabel}.requiredTaskEvidenceId duplicates ${mutationTaskLocationsById.get(declaredTaskEvidenceId)}`);
          } else {
            mutationTaskLocationsById.set(declaredTaskEvidenceId, scenarioStepKey);
          }
        }
        if (validateExactKeys(
          step.state,
          ['data', 'interaction', 'network'],
          ['data', 'interaction', 'network'],
          `${stepLabel}.state`,
          errors,
        )) {
          for (const key of ['data', 'interaction', 'network']) {
            if (typeof step.state[key] !== 'string' || step.state[key].trim() === '') {
              errors.push(`${stepLabel}.state.${key} must be explicit`);
            }
          }
        }
        validateSourcePath(step.source, `${stepLabel}.source`, errors);
        const truthEntry = routeIndex.get(step.route);
        if (!truthEntry) {
          errors.push(`${stepLabel}.route is missing from the exact repository route population`);
        } else {
          if (truthEntry.source !== step.source) {
            errors.push(`${stepLabel}.source disagrees with route truth source '${truthEntry.source}'`);
          }
          if (step.truth?.status !== truthEntry.status) {
            errors.push(`${stepLabel}.truth.status is stale; route truth currently says '${truthEntry.status}'`);
          }
        }
        validateExactKeys(
          step.truth,
          ['status', 'owner', 'reviewBy'],
          ['status', 'owner', 'reviewBy'],
          `${stepLabel}.truth`,
          errors,
        );
        if (!['live', 'partial', 'demo', 'unavailable', 'unverified'].includes(step.truth?.status)) {
          errors.push(`${stepLabel}.truth.status is unknown or unbounded`);
        }
        if (step.truth?.status === 'unverified') {
          validateBoundedReview(step.truth, `${stepLabel}.truth`, manifest.asOf, maxReviewDays, errors);
        }
      }
    }
    if (expected && !hasExactMembers([...actualRoutes], expected.routes)) {
      errors.push(`scenario '${scenario.id}' route population must exactly be ${expected.routes.join(', ')}`);
    }
    if (scenario.id === 'board-article-composer'
      && !scenario.journeySteps?.every((step) => step.route === '/admin/community/boards/insert-board-article')) {
      errors.push('board composer must use the current production-evidenced insert-board-article route, not a parallel write page');
    }
    if (scenario.id === 'first-use-onboarding') {
      const [onboardingStep] = scenario.journeySteps ?? [];
      if (scenario.journeySteps?.length !== 1
        || onboardingStep?.id !== 'onboarding-first-use'
        || onboardingStep?.state?.data !== 'synthetic-first-use-session'
        || onboardingStep?.state?.interaction !== 'onboarding-dialog-open') {
        errors.push('first-use onboarding must keep one explicit onboarding-first-use dialog-open state');
      }
    }

    const renderMatrix = scenario.renderMatrix;
    if (validateExactKeys(
      renderMatrix,
      ['brandThemes', 'colorModes', 'viewports'],
      ['brandThemes', 'colorModes', 'viewports'],
      `scenario '${scenario.id}' renderMatrix`,
      errors,
    )) {
      const themeIds = manifest.dimensions?.brandThemes?.map(({ id }) => id) ?? [];
      const viewportIds = manifest.dimensions?.viewports?.map(({ id }) => id) ?? [];
      if (!hasExactMembers(renderMatrix.brandThemes, themeIds)
        || !hasExactMembers(renderMatrix.colorModes, manifest.dimensions?.colorModes ?? [])
        || !hasExactMembers(renderMatrix.viewports, viewportIds)) {
        errors.push(`scenario '${scenario.id}' renderMatrix must exactly bind brandTheme × colorMode × viewport`);
      }
    }
    if (!hasExactMembers(scenario.taskMetricIds, EXPECTED_TASK_METRICS)) {
      errors.push(`scenario '${scenario.id}' is missing a required task metric`);
    }
    if (!hasExactMembers(scenario.performanceMetricIds, EXPECTED_PERFORMANCE_METRICS)) {
      errors.push(`scenario '${scenario.id}' is missing route JS/LCP/CLS/interaction evidence`);
    }
    if (!stepIds.has(scenario.performanceTargetStepId)) {
      errors.push(`scenario '${scenario.id}' performanceTargetStepId does not reference a journey step`);
    }

    const baseline = scenario.currentBaseline;
    validateExactKeys(
      baseline,
      ['status', 'reason', 'artifactPath', 'owner', 'reviewBy'],
      ['status', 'reason', 'artifactPath', 'owner', 'reviewBy'],
      `scenario '${scenario.id}' currentBaseline`,
      errors,
    );
    if (!['unmeasured', 'blocked-external', 'measured'].includes(baseline?.status)) {
      errors.push(`scenario '${scenario.id}' baseline status is unknown or unbounded`);
    }
    if (typeof baseline?.reason !== 'string' || baseline.reason.trim().length < 15) {
      errors.push(`scenario '${scenario.id}' currentBaseline.reason must explain the evidence state`);
    }
    if (typeof baseline?.artifactPath !== 'string') {
      errors.push(`scenario '${scenario.id}' currentBaseline is missing evidence artifactPath`);
    } else {
      validateArtifactPath(
        baseline.artifactPath,
        scenario.id,
        manifest.artifactRoot,
        errors,
        artifactBaseRoot,
      );
      if (artifactPaths.has(baseline.artifactPath)) {
        errors.push(`duplicate artifactPath '${baseline.artifactPath}'`);
      }
      artifactPaths.add(baseline.artifactPath);
    }
    if (baseline?.status !== 'measured') {
      validateBoundedReview(
        baseline,
        `scenario '${scenario.id}' currentBaseline`,
        manifest.asOf,
        maxReviewDays,
        errors,
      );
    } else if (measuredDurability?.verified !== true) {
      errors.push(
        `scenario '${scenario.id}' measured status requires a verified current combined durable summary (${measuredDurability?.reasonCode ?? 'durable-readback-unavailable'})`,
      );
    }

    if (!Array.isArray(scenario.sourceEvidence) || scenario.sourceEvidence.length === 0) {
      errors.push(`scenario '${scenario.id}' must cite sourceEvidence`);
    } else {
      const evidence = new Set();
      for (const path of scenario.sourceEvidence) {
        if (evidence.has(path)) errors.push(`scenario '${scenario.id}' duplicates source evidence '${path}'`);
        evidence.add(path);
        validateSourcePath(path, `scenario '${scenario.id}' sourceEvidence`, errors);
      }
    }
  }
  if (!hasExactMembers([...scenarioIds], [...EXPECTED_SCENARIOS.keys()])) {
    errors.push('scenario population must contain each of the eight baseline archetypes exactly once');
  }
  if (!hasExactMembers(
    [...mutationTaskLocationsById.keys()],
    [...EXPECTED_MUTATION_TASK_BY_SCENARIO_STEP.values()],
  )) {
    errors.push('mutation task evidence population must declare each approved scenario-step exactly once');
  }

  scanForbiddenKeys(
    {
      executionBlockers: manifest.executionBlockers,
      scenarios: manifest.scenarios,
    },
    forbiddenKeys,
    'manifest-runtime-data',
    errors,
  );

  return errors;
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

function queryConsumerContractErrors(manifest, urlStateCensus) {
  const errors = [];
  const consumers = Array.isArray(urlStateCensus?.records)
    ? urlStateCensus.records.filter((record) => record.kind === 'query-consumer')
    : [];

  for (const scenario of manifest.scenarios ?? []) {
    for (const step of scenario.journeySteps ?? []) {
      if (!step.queryTemplate) continue;
      const names = [...new URLSearchParams(step.queryTemplate.slice(1)).keys()];
      for (const name of names) {
        const consumed = consumers.some((record) => record.routePattern === step.route
          && record.stateItems?.some((item) => item.name === name));
        if (!consumed) {
          errors.push(`scenario '${scenario.id}' step '${step.id}' query '${name}' has no current route consumer`);
        }
      }
    }
  }

  return errors;
}

test('current UI quality scenario manifest has exact schema and repository population', () => {
  const errors = validateManifest(readJson(manifestPath), readJson(routeTruthPath));
  assert.deepEqual(errors, []);
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

test('temporary fixtures prove stale or unbounded unknown evidence turns red', () => {
  const unknown = validateTemporaryFixture((fixture) => {
    fixture.scenarios[0].currentBaseline.status = 'unknown';
  }).join('\n');
  assert.match(unknown, /baseline status is unknown or unbounded/);

  const stale = validateTemporaryFixture((fixture) => {
    fixture.scenarios[0].currentBaseline.reviewBy = '2026-08-20';
  }).join('\n');
  assert.match(stale, /reviewBy is stale/);

  const unbounded = validateTemporaryFixture((fixture) => {
    fixture.scenarios[0].journeySteps[0].truth.reviewBy = '2027-08-21';
  }).join('\n');
  assert.match(unbounded, /reviewBy is unbounded beyond 90 days/);
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
