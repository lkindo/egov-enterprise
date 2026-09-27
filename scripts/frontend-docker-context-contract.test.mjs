import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const REQUIRED_CONTEXT_EXCLUSIONS = [
  '.env*',
  '.pnpm-store',
  '.nyc_output',
  '*.tsbuildinfo',
  'coverage',
  'e2e',
  'playwright/.auth',
  'playwright-report',
  'test-results',
];

const API_BUILD_ARGUMENTS = ['BACKEND_API_URL', 'NEXT_PUBLIC_API_URL'];
const API_BUILD_VALIDATION_MARKER = '# FRONTEND_API_BUILD_URL_VALIDATION';
const NPM_RUNTIME_REMOVAL = 'RUN rm -rf /usr/local/lib/node_modules/npm && rm -f /usr/local/bin/npm /usr/local/bin/npx';
const GENERIC_BUILD_ERROR = 'Invalid frontend API build configuration.\n';
const EXPECTED_RELEASE_BUILD_ARGUMENTS = [
  'BACKEND_API_URL=${{ vars.BACKEND_API_URL }}',
  'NEXT_PUBLIC_API_URL=${{ vars.NEXT_PUBLIC_API_URL }}',
];
const RELEASE_RUNTIME_HANDOFF_MARKER = '<!-- FRONTEND_RELEASE_RUNTIME_API_HANDOFF -->';
const REQUIRED_RELEASE_RUNTIME_HANDOFF_LINES = [
  'publisher: image-only',
  'requiredEnvironment: [BACKEND_API_URL, NEXT_PUBLIC_API_URL]',
  'buildArgsSubstituteRuntimeEnvironment: false',
  'evidenceValuePolicy: names-and-validation-only',
];
const EXPECTED_REWRITE_DESTINATIONS = new Map([
  [
    '/api/v1/:path*',
    "destination: `${(process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api/v1/').replace(/\\/$/, '')}/:path*`,",
  ],
  [
    '/actuator/:path*',
    "destination: `${(process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/').replace(/api\\/v1\\/?$/, '')}actuator/:path*`,",
  ],
  [
    '/ws/:path*',
    "destination: `${(process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/').replace(/api\\/v1\\/?$/, '')}ws/:path*`,",
  ],
]);

function dockerfileLines(source) {
  return source
    .replace(/\\\r?\n[ \t]*/gu, ' ')
    .split(/\r?\n/u)
    .map((line) => line.trim());
}

function onlyLineIndex(lines, expected) {
  const indexes = lines
    .map((line, index) => (line === expected ? index : -1))
    .filter((index) => index >= 0);

  assert.equal(indexes.length, 1, `Dockerfile must contain exactly one: ${expected}`);
  return indexes[0];
}

function extractApiBuildValidation(source) {
  const lines = dockerfileLines(source);
  const markerIndex = onlyLineIndex(lines, API_BUILD_VALIDATION_MARKER);
  const validationLine = lines[markerIndex + 1] ?? '';
  assert.equal(validationLine, 'RUN node scripts/validate-api-build-urls.mjs',
    'API build URL validation must use the shared module immediately after its marker');
  const copyIndex = lines.indexOf('COPY . .');
  assert.ok(copyIndex >= 0 && copyIndex < markerIndex, 'shared validator must be copied before execution');
  return { lines, markerIndex };
}

function assertApiBuildContract(source) {
  const { lines, markerIndex } = extractApiBuildValidation(source);
  const buildIndex = onlyLineIndex(lines, 'RUN pnpm run build');
  const stageIndex = (stage) => {
    const pattern = new RegExp(`^FROM\\s+\\S+\\s+AS\\s+${stage}$`, 'iu');
    const indexes = lines
      .map((line, index) => (pattern.test(line) ? index : -1))
      .filter((index) => index >= 0);
    assert.equal(indexes.length, 1, `Dockerfile must contain exactly one ${stage} stage`);
    return indexes[0];
  };
  const builderIndex = stageIndex('builder');
  const runnerIndex = stageIndex('runner');
  const nextStageIndex = lines.findIndex(
    (line, index) => index > builderIndex && /^FROM\s/iu.test(line),
  );

  assert.equal(nextStageIndex, runnerIndex, 'API validation and build must stay in the builder stage');
  assert.ok(
    builderIndex < markerIndex && buildIndex < runnerIndex,
    'API validation and build must stay in the builder stage',
  );

  for (const argument of API_BUILD_ARGUMENTS) {
    const argumentIndex = onlyLineIndex(lines, `ARG ${argument}`);
    const exportLine = `ENV ${argument}=$${argument}`;
    const exportIndex = onlyLineIndex(lines, exportLine);

    assert.ok(builderIndex < argumentIndex, `${argument} must be declared in the builder stage`);
    assert.ok(argumentIndex < markerIndex, `${argument} must be declared before validation`);
    assert.ok(markerIndex < exportIndex, `${argument} must be exported only after validation`);
    assert.ok(exportIndex < buildIndex, `${argument} must reach the Next.js build unchanged`);

    const laterAssignments = lines
      .slice(markerIndex + 1, buildIndex)
      .filter((line) => /^(?:ARG|ENV)\s/u.test(line))
      .filter((line) => new RegExp(`(?:^|\\s)${argument}(?:=|\\s|$)`, 'u').test(line))
      .filter((line) => line !== exportLine);
    assert.deepEqual(
      laterAssignments,
      [],
      `${argument} must not be reassigned after validation`,
    );
  }
}

function assertStandaloneRuntimeContract(dockerfile, nextConfig) {
  const lines = dockerfileLines(dockerfile).filter((line) => line && !line.startsWith('#'));
  const builderIndex = lines.findIndex((line) => /^FROM\s+\S+\s+AS builder$/iu.test(line));
  const runnerIndex = lines.findIndex((line) => /^FROM\s+\S+\s+AS runner$/iu.test(line));
  const flagIndex = onlyLineIndex(lines, 'ENV NEXT_DOCKER_STANDALONE=true');
  const buildIndex = onlyLineIndex(lines, 'RUN pnpm run build');
  assert.ok(builderIndex >= 0 && builderIndex < flagIndex && flagIndex < buildIndex
    && buildIndex < runnerIndex, 'standalone must be enabled only in the Docker builder');
  assert.match(nextConfig, /const dockerStandalone = process\.env\.NEXT_DOCKER_STANDALONE === 'true';/u);
  assert.match(nextConfig, /output: dockerStandalone \? 'standalone' : undefined,/u);
  assert.match(nextConfig, /root: fileURLToPath\(new URL\(dockerStandalone \? '\.' : '\.\.', import\.meta\.url\)\),/u,
    'Docker tracing root must be the app directory while host builds retain the repository root');

  const runner = lines.slice(runnerIndex + 1);
  assert.deepEqual(runner.filter((line) => /^(?:COPY|ADD)\s/iu.test(line)), [
    'COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./',
    'COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static',
    'COPY --from=builder --chown=nextjs:nodejs /app/public ./public',
  ], 'runner must contain only traced dependencies, compiled assets, and public assets');
  for (const required of ['WORKDIR /app', 'ENV NODE_ENV=production', 'ENV NEXT_TELEMETRY_DISABLED=1',
    'USER nextjs', 'EXPOSE 3000', 'ENV PORT=3000', 'ENV HOSTNAME=0.0.0.0', 'CMD ["node", "server.js"]']) {
    onlyLineIndex(runner, required);
  }
  assert.ok(runner.indexOf('USER nextjs') < runner.indexOf('CMD ["node", "server.js"]'));
  const removalIndex = onlyLineIndex(runner, NPM_RUNTIME_REMOVAL);
  assert.ok(removalIndex < runner.indexOf('USER nextjs'), 'remove base npm before dropping root privileges');
  assert.equal(runner.some((line) => line !== NPM_RUNTIME_REMOVAL && (
    /^(?:RUN|ENV|ARG).*\b(?:NEXT_DOCKER_STANDALONE|pnpm|npm|yarn|corepack)\b/iu.test(line)
    || /^RUN\s.*\brm\b/iu.test(line)
  )), false, 'runtime permits only the exact base npm removal, not dependency installation or arbitrary deletion');
}

function runApiBuildValidation(source, values) {
  extractApiBuildValidation(source);
  const env = Object.fromEntries(
    [
      ['SystemRoot', process.env.SystemRoot],
      ['WINDIR', process.env.WINDIR],
      ...API_BUILD_ARGUMENTS.map((name) => [name, values[name]]),
    ].filter(([, value]) => typeof value === 'string'),
  );

  return spawnSync(process.execPath, [fileURLToPath(new URL('../frontend/scripts/validate-api-build-urls.mjs', import.meta.url))], {
    encoding: 'utf8',
    env,
    windowsHide: true,
  });
}

function releaseFrontendBuildArguments(source) {
  const workflowLines = source.split(/\r?\n/u);
  const stepIndex = onlyLineIndex(workflowLines, '      - name: Build Frontend locally');
  const nextStepOffset = workflowLines
    .slice(stepIndex + 1)
    .findIndex((line) => /^ {6}(?:- name:|#)/u.test(line));
  assert.notEqual(nextStepOffset, -1, 'release frontend build step must have a bounded end');
  const lines = workflowLines.slice(stepIndex + 1, stepIndex + 1 + nextStepOffset);
  const buildArgumentsIndex = onlyLineIndex(
    lines.map((line) => line.trim()),
    'build-args: |',
  );
  const indentation = lines[buildArgumentsIndex].match(/^\s*/u)?.[0].length ?? 0;
  const buildArguments = [];

  for (const line of lines.slice(buildArgumentsIndex + 1)) {
    const trimmed = line.trim();
    const lineIndentation = line.match(/^\s*/u)?.[0].length ?? 0;
    if (!trimmed || lineIndentation <= indentation) break;
    buildArguments.push(trimmed);
  }

  return buildArguments;
}

function assertReleaseFrontendBuildArguments(source) {
  assert.deepEqual(
    releaseFrontendBuildArguments(source),
    EXPECTED_RELEASE_BUILD_ARGUMENTS,
    'release frontend build args must exactly bind the two repository variables',
  );
}

function assertReleaseRuntimeHandoff(source) {
  assert.equal(
    source.split(RELEASE_RUNTIME_HANDOFF_MARKER).length - 1,
    1,
    'release runtime handoff marker must occur exactly once',
  );
  for (const line of REQUIRED_RELEASE_RUNTIME_HANDOFF_LINES) {
    assert.ok(source.includes(line), `release runtime handoff must retain: ${line}`);
  }
  assert.match(source, /BACKEND_API_URL[^\n]*absolute[^\n]*\/api\/v1/u);
  assert.match(source, /NEXT_PUBLIC_API_URL[^\n]*absolute[^\n]*\/api\/v1/u);
  assert.match(source, /credential[^\n]*query[^\n]*fragment/u);
}

function rewriteDestination(source, routeSource) {
  const lines = source.split(/\r?\n/u).map((line) => line.trim());
  const sourceIndex = onlyLineIndex(lines, `source: '${routeSource}',`);
  const objectEndOffset = lines.slice(sourceIndex + 1).findIndex((line) => line === '},');
  assert.notEqual(objectEndOffset, -1, `${routeSource} rewrite must have a bounded object`);
  const destinations = lines
    .slice(sourceIndex + 1, sourceIndex + 1 + objectEndOffset)
    .filter((line) => line.startsWith('destination:'));
  assert.equal(destinations.length, 1, `${routeSource} rewrite must have exactly one destination`);
  return destinations[0];
}

function assertValidatedRewriteInputs(source) {
  for (const [routeSource, expectedDestination] of EXPECTED_REWRITE_DESTINATIONS) {
    assert.equal(
      rewriteDestination(source, routeSource),
      expectedDestination,
      `${routeSource} must consume the validated API build arguments with exact precedence`,
    );
  }
}

function composeBuildArguments(source, serviceName) {
  const lines = source.split(/\r?\n/u);
  const serviceIndex = onlyLineIndex(lines, `  ${serviceName}:`);
  const nextServiceOffset = lines
    .slice(serviceIndex + 1)
    .findIndex((line) => /^ {2}[a-zA-Z0-9_-]+:\s*$/u.test(line));
  const serviceEnd = nextServiceOffset < 0
    ? lines.length
    : serviceIndex + 1 + nextServiceOffset;
  const serviceLines = lines.slice(serviceIndex + 1, serviceEnd);
  const buildIndex = onlyLineIndex(serviceLines, '    build:');
  const buildEndOffset = serviceLines
    .slice(buildIndex + 1)
    .findIndex((line) => line.trim() && (line.match(/^\s*/u)?.[0].length ?? 0) <= 4);
  const buildEnd = buildEndOffset < 0
    ? serviceLines.length
    : buildIndex + 1 + buildEndOffset;
  const buildLines = serviceLines.slice(buildIndex + 1, buildEnd);
  const argsIndexes = buildLines
    .map((line, index) => (line === '      args:' ? index : -1))
    .filter((index) => index >= 0);
  assert.equal(
    argsIndexes.length,
    1,
    `${serviceName} build must contain exactly one args map`,
  );
  const argsIndex = argsIndexes[0];
  const entries = [];

  for (const line of buildLines.slice(argsIndex + 1)) {
    const indentation = line.match(/^\s*/u)?.[0].length ?? 0;
    if (!line.trim()) continue;
    if (indentation <= 6) break;
    const match = line.match(/^ {8}([A-Z][A-Z0-9_]*):\s*(\S.*)$/u);
    assert.ok(match, `${serviceName} build args must use explicit scalar mappings`);
    entries.push([match[1], match[2]]);
  }

  return entries;
}

function assertComposeFrontendHealth(base, production) {
  const expected = [
    'test: ["CMD-SHELL", "wget --spider -q http://127.0.0.1:3000/login || exit 1"]',
    'interval: 10s', 'timeout: 10s', 'retries: 12', 'start_period: 30s',
  ];
  for (const [source, required] of [[base, true], [production, false]]) {
    const lines = source.split(/\r?\n/u);
    const start = onlyLineIndex(lines, '  frontend:');
    const end = lines.findIndex((line, index) => index > start && /^(?:\S| {2}[\w-]+:)/u.test(line));
    const service = lines.slice(start + 1, end < 0 ? undefined : end)
      .filter((line) => line.trim() && !line.trimStart().startsWith('#'));
    const health = service.reduce((indexes, line, index) => {
      if (/^ {4}healthcheck:/u.test(line)) indexes.push(index);
      return indexes;
    }, []);
    if (!required && health.length === 0) continue;
    assert.equal(health.length, 1, 'frontend must retain one effective healthcheck');
    assert.equal(service[health[0]], '    healthcheck:', 'frontend healthcheck must not be disabled or reset');
    const healthEnd = service.findIndex((line, index) => index > health[0] && /^ {0,4}\S/u.test(line));
    assert.deepEqual(service.slice(health[0] + 1, healthEnd < 0 ? undefined : healthEnd).map((line) => line.trim()),
      expected, 'frontend readiness must use the IPv4 login endpoint and retain its readiness budget');
  }
}

function composeRuntimeEnvironment(source, serviceName) {
  const lines = source.split(/\r?\n/u);
  const serviceIndex = onlyLineIndex(lines, `  ${serviceName}:`);
  const nextServiceOffset = lines
    .slice(serviceIndex + 1)
    .findIndex((line) => /^ {2}[a-zA-Z0-9_-]+:\s*$/u.test(line));
  const serviceEnd = nextServiceOffset < 0
    ? lines.length
    : serviceIndex + 1 + nextServiceOffset;
  const serviceLines = lines.slice(serviceIndex + 1, serviceEnd);
  const environmentIndexes = serviceLines
    .map((line, index) => (line === '    environment:' ? index : -1))
    .filter((index) => index >= 0);
  assert.equal(
    environmentIndexes.length,
    1,
    `${serviceName} runtime must contain exactly one environment map`,
  );
  const environmentIndex = environmentIndexes[0];
  const entries = [];

  for (const line of serviceLines.slice(environmentIndex + 1)) {
    const indentation = line.match(/^\s*/u)?.[0].length ?? 0;
    if (!line.trim()) continue;
    if (line.trimStart().startsWith('#')) continue;
    if (indentation <= 4) break;
    const match = line.match(/^ {6}([A-Z][A-Z0-9_]*):\s*(\S.*)$/u);
    assert.ok(match, `${serviceName} runtime environment must use explicit scalar mappings`);
    entries.push([match[1], match[2]]);
  }

  return entries;
}

function assertComposeApiBuildArguments(source, serviceName, expectedValues) {
  const entries = composeBuildArguments(source, serviceName);
  assert.deepEqual(
    entries.map(([name]) => name).sort(),
    [...API_BUILD_ARGUMENTS].sort(),
    `${serviceName} build args must contain exactly both API URL keys`,
  );
  const values = Object.fromEntries(entries);
  if (expectedValues) {
    assert.deepEqual(values, expectedValues, `${serviceName} must preserve its approved build URLs`);
  }

  const dockerfile = readFileSync(new URL('../frontend/Dockerfile', import.meta.url), 'utf8');
  const result = runApiBuildValidation(dockerfile, values);
  assert.equal(result.status, 0, `${serviceName} build args must satisfy the Docker URL validator`);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
}

function assertComposeRuntimeApiEnvironment(source, serviceName, expectedValues) {
  const entries = composeRuntimeEnvironment(source, serviceName)
    .filter(([name]) => API_BUILD_ARGUMENTS.includes(name));
  assert.deepEqual(
    entries.map(([name]) => name).sort(),
    [...API_BUILD_ARGUMENTS].sort(),
    `${serviceName} runtime environment must contain exactly both API URL keys`,
  );
  const values = Object.fromEntries(entries);
  if (expectedValues) {
    assert.deepEqual(values, expectedValues, `${serviceName} must preserve its approved runtime URLs`);
  }

  const dockerfile = readFileSync(new URL('../frontend/Dockerfile', import.meta.url), 'utf8');
  const result = runApiBuildValidation(dockerfile, values);
  assert.equal(result.status, 0, `${serviceName} runtime URLs must satisfy the Docker URL validator`);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
}

function normalizedRules(source) {
  return new Set(
    source
      .split(/\r?\n/u)
      .map((line) => line.trim().replace(/\\/gu, '/').replace(/\/$/u, ''))
      .filter((line) => line && !line.startsWith('#')),
  );
}

function missingPrivatePaths(source) {
  const rules = normalizedRules(source);
  return REQUIRED_CONTEXT_EXCLUSIONS.filter((path) => !rules.has(path));
}

function reIncludedPrivatePaths(source) {
  const rules = normalizedRules(source);
  return [...rules]
    .filter((rule) => rule.startsWith('!'))
    .sort();
}

function assertOwnedRuntimeEvidenceExcluded(source) {
  const rules = normalizedRules(source);
  assert.ok(rules.has('.agent/temp'), 'root Docker context must exclude owned runtime credentials and backup evidence');
  assert.ok(rules.has('**/hs_err_pid*.log'), 'root Docker context must exclude JVM crash diagnostics');
  const approvedRuntimeConfigs = new Set([
    '!api-server/src/main/resources/application-dev.yml',
    '!api-server/src/main/resources/application-prod.yml',
  ]);
  assert.deepEqual(reIncludedPrivatePaths(source).filter((rule) => !approvedRuntimeConfigs.has(rule)), [],
    'root Docker context may re-include only the tracked runtime configuration files');
}

test('root Docker context excludes owned runtime credentials and backup evidence', () => {
  assertOwnedRuntimeEvidenceExcluded(readFileSync(new URL('../.dockerignore', import.meta.url), 'utf8'));
});

test('owned runtime evidence exclusion removal and re-inclusion are reproducible reds', () => {
  const source = readFileSync(new URL('../.dockerignore', import.meta.url), 'utf8');
  const safeFixture = `${source}\n.agent/temp\n**/hs_err_pid*.log\n`;
  assertOwnedRuntimeEvidenceExcluded(safeFixture);
  assert.throws(() => assertOwnedRuntimeEvidenceExcluded(safeFixture.replaceAll('.agent/temp', '.agent/other')),
    /must exclude owned runtime credentials/u);
  assert.throws(() => assertOwnedRuntimeEvidenceExcluded(safeFixture.replaceAll('**/hs_err_pid*.log', '**/other-diagnostic.log')),
    /must exclude JVM crash diagnostics/u);
  for (const reinclude of ['!.agent/temp', '!.agent/temp/synthetic/owned.env', '!.agent/**', '!**/owned.env', '!**/hs_err_pid*.log']) {
    assert.throws(() => assertOwnedRuntimeEvidenceExcluded(`${safeFixture}\n${reinclude}`),
      /may re-include only/u);
  }
});

test('frontend Docker context excludes Playwright credentials and generated evidence', () => {
  const source = readFileSync(new URL('../frontend/.dockerignore', import.meta.url), 'utf8');
  assert.deepEqual(missingPrivatePaths(source), []);
  assert.deepEqual(
    reIncludedPrivatePaths(source),
    [],
    'credentials, environment files, and generated evidence must not be re-included',
  );
});

test('the contract fails when the credential exclusion is removed', () => {
  const unsafeFixture = REQUIRED_CONTEXT_EXCLUSIONS
    .filter((path) => path !== 'playwright/.auth')
    .join('\n');
  assert.deepEqual(missingPrivatePaths(unsafeFixture), ['playwright/.auth']);
});

test('the contract fails when the environment-file exclusion is removed', () => {
  const unsafeFixture = REQUIRED_CONTEXT_EXCLUSIONS
    .filter((path) => path !== '.env*')
    .join('\n');
  assert.deepEqual(missingPrivatePaths(unsafeFixture), ['.env*']);
});

test('the contract fails when private context paths are explicitly re-included', () => {
  const base = REQUIRED_CONTEXT_EXCLUSIONS.join('\n');
  const cases = [
    '!playwright/.auth',
    '!playwright/.auth/admin.json',
    '!test-results',
    '!.env*',
    '!./playwright/.auth/admin.json',
    '!/test-results',
    '!**/.env.local',
    '!nested/.env.production',
    '!playwright/./.auth',
  ];

  for (const reinclude of cases) {
    assert.deepEqual(
      reIncludedPrivatePaths(`${base}\n${reinclude}`),
      [reinclude],
      `${reinclude} must make the Docker context contract red`,
    );
  }
});

test('the root operational runner binds this contract without a narrowed file list', () => {
  const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  );
  assert.equal(
    packageJson.scripts?.['test:operational-contracts'],
    'node --test "scripts/*.test.mjs" ".agent/scripts/*.test.js"',
  );
});

test('the frontend builder validates both API URL arguments before compiling rewrites', () => {
  const source = readFileSync(new URL('../frontend/Dockerfile', import.meta.url), 'utf8');
  assertApiBuildContract(source);
});

test('Docker alone enables standalone output and the runner copies only traced runtime files', () => {
  assertStandaloneRuntimeContract(
    readFileSync(new URL('../frontend/Dockerfile', import.meta.url), 'utf8'),
    readFileSync(new URL('../frontend/next.config.ts', import.meta.url), 'utf8'),
  );
});

test('full dependencies, missing static assets, root drift, and host standalone are reproducible reds', () => {
  const dockerfile = readFileSync(new URL('../frontend/Dockerfile', import.meta.url), 'utf8');
  const config = readFileSync(new URL('../frontend/next.config.ts', import.meta.url), 'utf8');
  assertStandaloneRuntimeContract(dockerfile, config);
  const badDockerfiles = [
    dockerfile.replace('ENV NEXT_DOCKER_STANDALONE=true', 'ENV NEXT_DOCKER_STANDALONE=false'),
    dockerfile.replace('COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./',
      'COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules'),
    dockerfile.replace('COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static', ''),
    dockerfile.replace('USER nextjs', 'USER root'),
    dockerfile.replace('ENV HOSTNAME=0.0.0.0', 'ENV HOSTNAME=localhost'),
    dockerfile.replace('CMD ["node", "server.js"]', 'CMD ["node", "node_modules/.bin/next", "start"]'),
    `${dockerfile}\nCOPY --from=builder /app/next.config.ts ./next.config.ts\n`,
    `${dockerfile}\nRUN corepack enable\n`,
    `${dockerfile}\nRUN npm install\n`,
    dockerfile.replace(NPM_RUNTIME_REMOVAL, ''),
    dockerfile.replace(NPM_RUNTIME_REMOVAL, NPM_RUNTIME_REMOVAL.replace('/usr/local/lib/node_modules/npm', '/usr/local/lib/node_modules/*')),
    dockerfile.replace(NPM_RUNTIME_REMOVAL, `${NPM_RUNTIME_REMOVAL} && npm install`),
    `${dockerfile}\nRUN rm -rf /app\n`,
  ];
  for (const changed of badDockerfiles) {
    assert.notEqual(changed, dockerfile, 'negative Docker fixture must actually change the source');
    assert.throws(() => assertStandaloneRuntimeContract(changed, config));
  }
  for (const changed of [
    config.replace("output: dockerStandalone ? 'standalone' : undefined,", "output: 'standalone',"),
    config.replace("dockerStandalone ? '.' : '..'", "'..'"),
  ]) {
    assert.notEqual(changed, config, 'negative config fixture must actually change the source');
    assert.throws(() => assertStandaloneRuntimeContract(dockerfile, changed));
  }
});

test('the build URL validator accepts exact API paths for Docker and loopback hosts', () => {
  const source = readFileSync(new URL('../frontend/Dockerfile', import.meta.url), 'utf8');
  const validCases = [
    {
      BACKEND_API_URL: 'http://api:8080/api/v1',
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8080/api/v1/',
    },
    {
      BACKEND_API_URL: 'https://backend.internal:8443/api/v1/',
      NEXT_PUBLIC_API_URL: 'http://localhost:8080/api/v1',
    },
    {
      BACKEND_API_URL: 'http://api-server:8080/api/v1/',
      NEXT_PUBLIC_API_URL: 'http://[::1]:8080/api/v1',
    },
  ];

  for (const values of validCases) {
    const result = runApiBuildValidation(source, values);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  }
});

test('the build URL validator rejects missing or unsafe inputs without printing their values', () => {
  const source = readFileSync(new URL('../frontend/Dockerfile', import.meta.url), 'utf8');
  const valid = 'http://api:8080/api/v1';
  const invalidCases = [
    { NEXT_PUBLIC_API_URL: valid },
    { BACKEND_API_URL: valid },
    { BACKEND_API_URL: 'http://api:8080', NEXT_PUBLIC_API_URL: valid },
    { BACKEND_API_URL: valid, NEXT_PUBLIC_API_URL: 'http://api:8080/wrong' },
    { BACKEND_API_URL: 'http://api:8080/other/../api/v1', NEXT_PUBLIC_API_URL: valid },
    { BACKEND_API_URL: valid, NEXT_PUBLIC_API_URL: 'http://api:8080/api/v1/.' },
    { BACKEND_API_URL: 'http://user:password@api:8080/api/v1', NEXT_PUBLIC_API_URL: valid },
    { BACKEND_API_URL: valid, NEXT_PUBLIC_API_URL: 'http://api:8080/api/v1?mode=unsafe' },
    { BACKEND_API_URL: 'http://api:8080/api/v1#unsafe', NEXT_PUBLIC_API_URL: valid },
    { BACKEND_API_URL: "http://api\t:8080/api/v1", NEXT_PUBLIC_API_URL: valid },
    { BACKEND_API_URL: 'ftp://api:8080/api/v1', NEXT_PUBLIC_API_URL: valid },
    { BACKEND_API_URL: valid, NEXT_PUBLIC_API_URL: '//api:8080/api/v1' },
  ];

  for (const values of invalidCases) {
    const result = runApiBuildValidation(source, values);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, GENERIC_BUILD_ERROR);

    for (const value of Object.values(values)) {
      assert.equal(result.stderr.includes(value), false, 'invalid URL values must not reach build logs');
    }
  }
});

test('post-validation ARG or ENV overrides cannot reintroduce an unchecked build URL', () => {
  const source = readFileSync(new URL('../frontend/Dockerfile', import.meta.url), 'utf8');
  const unsafeOverrides = [
    'ARG BACKEND_API_URL=http://api:8080',
    'ENV BACKEND_API_URL=http://api:8080',
    'ARG NEXT_PUBLIC_API_URL=http://api:8080',
    'ENV NEXT_PUBLIC_API_URL=http://api:8080',
    'ENV SAFE_MARKER=1 BACKEND_API_URL=http://api:8080',
    'ENV SAFE_MARKER=1 \\\n      NEXT_PUBLIC_API_URL=http://api:8080',
  ];

  for (const override of unsafeOverrides) {
    const fixture = source.replace('RUN pnpm run build', `${override}\nRUN pnpm run build`);
    assert.throws(
      () => assertApiBuildContract(fixture),
      /must not be reassigned after validation/u,
    );
  }
});

test('moving validation out of the builder stage is a reproducible red', () => {
  const source = readFileSync(new URL('../frontend/Dockerfile', import.meta.url), 'utf8');
  const misplacedFixture = source
    .replace(/ AS builder$/mu, ' AS build-decoy')
    .replace(/ AS deps$/mu, ' AS builder');

  assert.throws(
    () => assertApiBuildContract(misplacedFixture),
    /builder stage/u,
  );
});

test('the release frontend build binds both API URLs to exact repository variables', () => {
  const source = readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8');
  assertReleaseFrontendBuildArguments(source);
});

test('missing, relative, secret, or defaulted release build args are reproducible reds', () => {
  const safeFixture = [
    '      - name: Build Frontend locally',
    '        uses: docker/build-push-action@example',
    '        with:',
    '          context: ./frontend',
    '          build-args: |',
    '            BACKEND_API_URL=${{ vars.BACKEND_API_URL }}',
    '            NEXT_PUBLIC_API_URL=${{ vars.NEXT_PUBLIC_API_URL }}',
    '',
    '      # next step',
  ].join('\n');
  const unsafeFixtures = [
    safeFixture.replace('            BACKEND_API_URL=${{ vars.BACKEND_API_URL }}\n', ''),
    safeFixture.replace('            NEXT_PUBLIC_API_URL=${{ vars.NEXT_PUBLIC_API_URL }}\n', ''),
    safeFixture.replace(
      'BACKEND_API_URL=${{ vars.BACKEND_API_URL }}',
      'BACKEND_API_URL=/api/v1',
    ),
    safeFixture.replace(
      'NEXT_PUBLIC_API_URL=${{ vars.NEXT_PUBLIC_API_URL }}',
      'NEXT_PUBLIC_API_URL=/api/v1',
    ),
    safeFixture.replace('vars.BACKEND_API_URL', 'secrets.BACKEND_API_URL'),
    safeFixture.replace(
      'vars.NEXT_PUBLIC_API_URL',
      "vars.NEXT_PUBLIC_API_URL || 'http://api:8080/api/v1'",
    ),
  ];

  assertReleaseFrontendBuildArguments(safeFixture);
  for (const fixture of unsafeFixtures) {
    assert.throws(
      () => assertReleaseFrontendBuildArguments(fixture),
      /must exactly bind the two repository variables/u,
    );
  }
});

test('release guide hands both API URLs from image publication to the runtime deploy owner', () => {
  const source = readFileSync(
    new URL('../docs/03-guides/cicd-pipeline.md', import.meta.url),
    'utf8',
  );
  assertReleaseRuntimeHandoff(source);
});

test('missing runtime owner, environment, non-substitution, or redaction policy is a reproducible red', () => {
  const safeFixture = [
    RELEASE_RUNTIME_HANDOFF_MARKER,
    ...REQUIRED_RELEASE_RUNTIME_HANDOFF_LINES,
    'BACKEND_API_URL absolute http(s) URL ending /api/v1',
    'NEXT_PUBLIC_API_URL absolute http(s) URL ending /api/v1',
    'credential query fragment are forbidden',
  ].join('\n');
  assertReleaseRuntimeHandoff(safeFixture);

  const unsafeFixtures = [
    safeFixture.replace(RELEASE_RUNTIME_HANDOFF_MARKER, ''),
    ...REQUIRED_RELEASE_RUNTIME_HANDOFF_LINES.map((line) => safeFixture.replace(line, 'removed')),
    safeFixture.replace('BACKEND_API_URL absolute http(s) URL ending /api/v1', 'BACKEND_API_URL relative'),
    safeFixture.replace('NEXT_PUBLIC_API_URL absolute http(s) URL ending /api/v1', 'NEXT_PUBLIC_API_URL relative'),
    safeFixture.replace('credential query fragment are forbidden', 'unsafe values allowed'),
  ];
  for (const fixture of unsafeFixtures) {
    assert.throws(() => assertReleaseRuntimeHandoff(fixture));
  }
});

test('API, actuator, and WebSocket rewrites consume the validated build arguments', () => {
  const source = readFileSync(new URL('../frontend/next.config.ts', import.meta.url), 'utf8');
  assertValidatedRewriteInputs(source);
});

test('hardcoded rewrite destinations or build argument precedence drift are reproducible reds', () => {
  const source = readFileSync(new URL('../frontend/next.config.ts', import.meta.url), 'utf8');

  for (const [routeSource, expectedDestination] of EXPECTED_REWRITE_DESTINATIONS) {
    const fixture = source.replace(
      expectedDestination,
      `destination: 'http://hardcoded.invalid${routeSource}',`,
    );
    assert.notEqual(fixture, source, `${routeSource} negative fixture must alter current source`);
    assert.throws(
      () => assertValidatedRewriteInputs(fixture),
      /must consume the validated API build arguments with exact precedence/u,
    );
  }
});

test('default and E2E Compose builds provide both validated API URL arguments', () => {
  const defaultCompose = readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8');
  const e2eCompose = readFileSync(new URL('../docker-compose.e2e.yml', import.meta.url), 'utf8');

  assertComposeApiBuildArguments(defaultCompose, 'frontend', {
    BACKEND_API_URL: 'http://api:8080/api/v1',
    NEXT_PUBLIC_API_URL: 'http://api:8080/api/v1',
  });
  assertComposeApiBuildArguments(e2eCompose, 'frontend-e2e');
});

test('frontend Compose health checks the IPv4 login endpoint with the existing readiness budget', () => {
  assertComposeFrontendHealth(
    readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8'),
    readFileSync(new URL('../docker-compose.prod.yml', import.meta.url), 'utf8'),
  );
});

test('localhost, redirecting roots, disabled readiness and production health overrides are reproducible reds', () => {
  const base = ['services:', '  frontend:', '    healthcheck:',
    '      test: ["CMD-SHELL", "wget --spider -q http://127.0.0.1:3000/login || exit 1"]',
    '      interval: 10s', '      timeout: 10s', '      retries: 12', '      start_period: 30s',
    '    networks:', '      egov-net:', '        ipv4_address: 172.30.0.10',
  ].join('\n');
  const production = 'services:\n  frontend:\n    ports: !reset []\n  edge:\n    depends_on:\n      frontend:\n        condition: service_healthy';
  assertComposeFrontendHealth(base, production);
  for (const changed of [
    base.replace('127.0.0.1:3000/login', 'localhost:3000/login'),
    base.replace('127.0.0.1:3000/login', '127.0.0.1:3000/'),
    base.replace('    healthcheck:', '    ignored_healthcheck:'),
    base.replace('    healthcheck:', '    healthcheck: !reset {}'),
    base.replace('      interval: 10s', '      disable: true\n      interval: 10s'),
    base.replace('      retries: 12', '      retries: 1'),
  ]) assert.throws(() => assertComposeFrontendHealth(changed, production), /frontend/u);
  for (const override of ['disable: true', 'test: ["NONE"]',
    'test: ["CMD-SHELL", "wget --spider -q http://localhost:3000/ || exit 1"]']) {
    assert.throws(() => assertComposeFrontendHealth(base,
      production.replace('    ports: !reset []', `    ports: !reset []\n    healthcheck:\n      ${override}`)), /frontend/u);
  }
});

test('default and E2E Compose runtimes provide both validated API URLs', () => {
  const defaultCompose = readFileSync(new URL('../docker-compose.yml', import.meta.url), 'utf8');
  const e2eCompose = readFileSync(new URL('../docker-compose.e2e.yml', import.meta.url), 'utf8');

  assertComposeRuntimeApiEnvironment(defaultCompose, 'frontend', {
    BACKEND_API_URL: 'http://api:8080/api/v1',
    NEXT_PUBLIC_API_URL: 'http://api:8080/api/v1',
  });
  assertComposeRuntimeApiEnvironment(e2eCompose, 'frontend-e2e', {
    BACKEND_API_URL: 'http://api-e2e:8080/api/v1',
    NEXT_PUBLIC_API_URL: 'http://localhost:8080/api/v1',
  });
});

test('missing or relative Compose build arguments are reproducible reds', () => {
  const safeFixture = [
    'services:',
    '  frontend:',
    '    build:',
    '      context: ./frontend',
    '      args:',
    '        BACKEND_API_URL: http://api:8080/api/v1',
    '        NEXT_PUBLIC_API_URL: http://api:8080/api/v1',
    '    environment:',
    '      NEXT_PUBLIC_API_URL: http://api:8080/api/v1',
  ].join('\n');
  const unsafeFixtures = [
    safeFixture.replace('        BACKEND_API_URL: http://api:8080/api/v1\n', ''),
    safeFixture.replace('        NEXT_PUBLIC_API_URL: http://api:8080/api/v1\n', ''),
    safeFixture.replace('BACKEND_API_URL: http://api:8080/api/v1', 'BACKEND_API_URL: /api/v1'),
    safeFixture.replace(
      'NEXT_PUBLIC_API_URL: http://api:8080/api/v1',
      'NEXT_PUBLIC_API_URL: /api/v1',
    ),
  ];

  assertComposeApiBuildArguments(safeFixture, 'frontend');
  for (const fixture of unsafeFixtures) {
    assert.throws(
      () => assertComposeApiBuildArguments(fixture, 'frontend'),
      /build args must (?:contain exactly both API URL keys|satisfy the Docker URL validator)/u,
    );
  }
});

test('missing, relative, or wrong-path Compose runtime BACKEND_API_URL values are reproducible reds', () => {
  const safeFixture = [
    'services:',
    '  frontend:',
    '    build:',
    '      context: ./frontend',
    '    environment:',
    '      BACKEND_API_URL: http://api:8080/api/v1',
    '      NEXT_PUBLIC_API_URL: http://api:8080/api/v1',
    '      JWT_SECRET: local-test-only',
  ].join('\n');
  const unsafeFixtures = [
    safeFixture.replace('      BACKEND_API_URL: http://api:8080/api/v1\n', ''),
    safeFixture.replace('BACKEND_API_URL: http://api:8080/api/v1', 'BACKEND_API_URL: /api/v1'),
    safeFixture.replace(
      'BACKEND_API_URL: http://api:8080/api/v1',
      'BACKEND_API_URL: http://api:8080/wrong',
    ),
  ];

  assertComposeRuntimeApiEnvironment(safeFixture, 'frontend');
  for (const fixture of unsafeFixtures) {
    assert.throws(
      () => assertComposeRuntimeApiEnvironment(fixture, 'frontend'),
      /runtime (?:environment must contain exactly both API URL keys|URLs must satisfy the Docker URL validator)/u,
    );
  }
});
