import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const EXPECTED_SCENARIO_IDS = Object.freeze([
  'auth-login',
  'admin-shell-hub',
  'dense-user-logs',
  'user-management-hub',
  'board-article-composer',
  'faq-admin-user-lifecycle',
  'board-maker-wizard',
  'first-use-onboarding',
]);

export const AUTOMATION_OBSERVATION_KINDS = Object.freeze([
  'keyboard-smoke',
  'viewport-640-simulation',
  'viewport-320-simulation',
  'forced-colors-simulation',
  'reduced-motion-simulation',
]);

export const MANUAL_CHECK_BOUNDARIES = Object.freeze({
  'keyboard-only': Object.freeze({
    automationObservationKind: 'keyboard-smoke',
    manualEvidenceSatisfied: false,
    canPromoteBaseline: false,
  }),
  'nvda-chrome': Object.freeze({
    automationObservationKind: null,
    manualEvidenceSatisfied: false,
    canPromoteBaseline: false,
  }),
  'text-200-percent': Object.freeze({
    automationObservationKind: 'viewport-640-simulation',
    manualEvidenceSatisfied: false,
    canPromoteBaseline: false,
  }),
  'zoom-400-reflow-320': Object.freeze({
    automationObservationKind: 'viewport-320-simulation',
    manualEvidenceSatisfied: false,
    canPromoteBaseline: false,
  }),
  'forced-colors': Object.freeze({
    automationObservationKind: 'forced-colors-simulation',
    manualEvidenceSatisfied: false,
    canPromoteBaseline: false,
  }),
  'reduced-motion': Object.freeze({
    automationObservationKind: 'reduced-motion-simulation',
    manualEvidenceSatisfied: false,
    canPromoteBaseline: false,
  }),
});

const MANIFEST_URL = new URL('../../config/ui-quality-scenarios.json', import.meta.url);
const AUTH_STATE_BY_ROLE = Object.freeze({
  ADMIN: fileURLToPath(new URL('../playwright/.auth/admin.json', import.meta.url)),
  USER: fileURLToPath(new URL('../playwright/.auth/user.json', import.meta.url)),
});
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const SAFE_BOARD_ID = 'BBSMSTR_AAAAAAAAAAAA';

function failPreflight() {
  throw new Error('assisted-accessibility-preflight-invalid');
}

export function validateAssistedEnvironment(environment) {
  const rawWebUrl = environment.UI_A11Y_ASSISTED_WEB_URL;
  const stackClassification = environment.UI_A11Y_ASSISTED_STACK_CLASSIFICATION;
  const buildId = environment.UI_A11Y_ASSISTED_BUILD_ID;
  if (
    typeof rawWebUrl !== 'string'
    || rawWebUrl.length === 0
    || rawWebUrl !== rawWebUrl.trim()
    || stackClassification !== 'isolated-synthetic'
    || typeof buildId !== 'string'
    || !/^[a-f0-9]{64}$/u.test(buildId)
  ) {
    failPreflight();
  }

  let parsed;
  try {
    parsed = new URL(rawWebUrl);
  } catch {
    failPreflight();
  }
  if (
    !['http:', 'https:'].includes(parsed.protocol)
    || !LOOPBACK_HOSTS.has(parsed.hostname)
    || parsed.username !== ''
    || parsed.password !== ''
    || parsed.pathname !== '/'
    || parsed.search !== ''
    || parsed.hash !== ''
    || parsed.origin !== rawWebUrl
  ) {
    failPreflight();
  }

  return { webOrigin: parsed.origin, buildId };
}

export function validateScenarioManifest(manifest) {
  const scenarioIds = Array.isArray(manifest?.scenarios)
    ? manifest.scenarios.map(({ id }) => id)
    : [];
  const valid = scenarioIds.length === EXPECTED_SCENARIO_IDS.length
    && scenarioIds.every((id, index) => id === EXPECTED_SCENARIO_IDS[index])
    && manifest.scenarios.every(({ journeySteps }) => (
      Array.isArray(journeySteps)
      && journeySteps.length > 0
      && ['ANONYMOUS', 'ADMIN', 'USER'].includes(journeySteps[0]?.role)
      && typeof journeySteps[0]?.route === 'string'
      && journeySteps[0].route.startsWith('/')
    ));
  if (!valid) {
    throw new Error('assisted-accessibility-scenario-population-invalid');
  }
  return [...EXPECTED_SCENARIO_IDS];
}

export function summarizeAssistedObservations({ buildId, observations }) {
  if (!/^[a-f0-9]{64}$/u.test(buildId) || !Array.isArray(observations)) {
    throw new Error('assisted-accessibility-observation-population-invalid');
  }
  const expectedPairs = new Set(
    EXPECTED_SCENARIO_IDS.flatMap((scenarioId) => (
      AUTOMATION_OBSERVATION_KINDS.map((kind) => `${scenarioId}:${kind}`)
    )),
  );
  const observedPairs = new Set();
  const observationsByKind = Object.fromEntries(
    AUTOMATION_OBSERVATION_KINDS.map((kind) => [kind, 0]),
  );
  let findingCount = 0;
  let invalidCount = 0;

  for (const observation of observations) {
    const key = `${observation?.scenarioId}:${observation?.kind}`;
    if (
      !expectedPairs.has(key)
      || observedPairs.has(key)
      || !Number.isSafeInteger(observation?.findingCount)
      || observation.findingCount < 0
      || (observation.invalid !== undefined && typeof observation.invalid !== 'boolean')
    ) {
      throw new Error('assisted-accessibility-observation-population-invalid');
    }
    observedPairs.add(key);
    observationsByKind[observation.kind] += 1;
    findingCount += observation.findingCount;
    invalidCount += observation.invalid === true ? 1 : 0;
  }
  if (observedPairs.size !== expectedPairs.size) {
    throw new Error('assisted-accessibility-observation-population-invalid');
  }

  return {
    schemaVersion: 1,
    evidenceKind: 'automation-assisted-simulation',
    buildId,
    scenarioCount: EXPECTED_SCENARIO_IDS.length,
    observationCount: observations.length,
    findingCount,
    invalidCount,
    observationsByKind,
    manualEvidenceSatisfied: false,
    baselinePromotionEligible: false,
  };
}

function routeForStep(step) {
  const query = (step.queryTemplate ?? '')
    .replace('{safeRelativeRoute}', '/admin')
    .replace('{syntheticBoardId}', SAFE_BOARD_ID)
    .replace('{syntheticFaqBoardId}', SAFE_BOARD_ID);
  if (query.includes('{') || query.includes('}')) {
    throw new Error('assisted-accessibility-route-template-invalid');
  }
  return `${step.route}${query}`;
}

function contextOptionsForRole(role) {
  const storageState = AUTH_STATE_BY_ROLE[role];
  return {
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    viewport: { width: 1280, height: 800 },
    colorScheme: 'light',
    ...(storageState ? { storageState } : {}),
  };
}

async function navigateToReadyState(page, targetUrl, expectedPathname) {
  const response = await page.goto(targetUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  });
  if (!response || response.status() >= 400) {
    throw new Error('assisted-accessibility-navigation-invalid');
  }
  await page.waitForFunction(() => (
    document.title.trim().length > 0
    && document.querySelector('main') instanceof HTMLElement
  ), undefined, { timeout: 20_000 });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  if (new URL(page.url()).pathname !== expectedPathname) {
    throw new Error('assisted-accessibility-unexpected-destination');
  }
}

async function keyboardSmoke(page) {
  const positiveTabIndexCount = await page.evaluate(() => (
    document.querySelectorAll('[tabindex]').values()
      .filter((element) => element instanceof HTMLElement && element.tabIndex > 0)
      .toArray().length
  ));
  let visibleFocusCount = 0;
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press('Tab');
    const visible = await page.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement) || element === document.body) return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.visibility !== 'hidden'
        && style.display !== 'none'
        && rect.width > 0
        && rect.height > 0
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth;
    });
    visibleFocusCount += visible ? 1 : 0;
  }
  return Number(positiveTabIndexCount > 0) + Number(visibleFocusCount === 0);
}

async function viewportSimulation(page, width) {
  await page.setViewportSize({ width, height: 800 });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  return page.evaluate(() => {
    const root = document.documentElement;
    const main = document.querySelector('main');
    const overflow = Math.max(0, root.scrollWidth - root.clientWidth);
    const mainVisible = main instanceof HTMLElement
      && main.getBoundingClientRect().width > 0
      && main.getBoundingClientRect().height > 0;
    return Number(overflow > 1) + Number(!mainVisible);
  });
}

async function forcedColorsSimulation(page) {
  return page.evaluate(() => {
    const mediaMatches = matchMedia('(forced-colors: active)').matches;
    const interactiveCount = document.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ).length;
    return Number(!mediaMatches) + Number(interactiveCount === 0);
  });
}

async function reducedMotionSimulation(page) {
  return page.evaluate(() => {
    const mediaMatches = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const repeatedRunningAnimations = document.getAnimations().filter((animation) => {
      if (animation.playState !== 'running' || !(animation.effect instanceof AnimationEffect)) {
        return false;
      }
      const timing = animation.effect.getComputedTiming();
      return timing.iterations === Infinity || timing.iterations > 1;
    }).length;
    return Number(!mediaMatches) + repeatedRunningAnimations;
  });
}

function invalidObservationsForScenario(scenarioId) {
  return AUTOMATION_OBSERVATION_KINDS.map((kind) => ({
    scenarioId,
    kind,
    findingCount: 0,
    invalid: true,
  }));
}

async function collectScenarioObservations(browser, scenario, webOrigin) {
  const step = scenario.journeySteps[0];
  const relativeTarget = routeForStep(step);
  const target = new URL(relativeTarget, webOrigin);
  const context = await browser.newContext(contextOptionsForRole(step.role));
  const page = await context.newPage();
  try {
    await navigateToReadyState(page, target.href, target.pathname);
    const keyboardFindings = await keyboardSmoke(page);
    const viewport640Findings = await viewportSimulation(page, 640);
    const viewport320Findings = await viewportSimulation(page, 320);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
    await navigateToReadyState(page, target.href, target.pathname);
    const forcedColorsFindings = await forcedColorsSimulation(page);

    await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
    await navigateToReadyState(page, target.href, target.pathname);
    const reducedMotionFindings = await reducedMotionSimulation(page);

    return [
      { scenarioId: scenario.id, kind: 'keyboard-smoke', findingCount: keyboardFindings },
      { scenarioId: scenario.id, kind: 'viewport-640-simulation', findingCount: viewport640Findings },
      { scenarioId: scenario.id, kind: 'viewport-320-simulation', findingCount: viewport320Findings },
      { scenarioId: scenario.id, kind: 'forced-colors-simulation', findingCount: forcedColorsFindings },
      { scenarioId: scenario.id, kind: 'reduced-motion-simulation', findingCount: reducedMotionFindings },
    ];
  } catch {
    return invalidObservationsForScenario(scenario.id);
  } finally {
    await context.close();
  }
}

async function execute() {
  const { webOrigin, buildId } = validateAssistedEnvironment(process.env);
  const manifest = JSON.parse(await readFile(MANIFEST_URL, 'utf8'));
  validateScenarioManifest(manifest);
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  try {
    const observations = [];
    for (const scenario of manifest.scenarios) {
      observations.push(...await collectScenarioObservations(browser, scenario, webOrigin));
    }
    const summary = summarizeAssistedObservations({ buildId, observations });
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    if (summary.findingCount > 0 || summary.invalidCount > 0) {
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
}

const isEntryPoint = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isEntryPoint) {
  if (process.argv.length !== 3 || process.argv[2] !== '--execute') {
    process.stderr.write('{"status":"invalid","reasonCode":"assisted-accessibility-command-invalid"}\n');
    process.exitCode = 1;
  } else {
    execute().catch(() => {
      process.stderr.write('{"status":"invalid","reasonCode":"assisted-accessibility-probe-invalid","manualEvidenceSatisfied":false,"baselinePromotionEligible":false}\n');
      process.exitCode = 1;
    });
  }
}
