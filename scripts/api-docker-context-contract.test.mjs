import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const REQUIRED_CONTEXT_EXCLUSION = 'frontend';
const REQUIRED_SECRET_EXCLUSIONS = ['.env*', '**/.env*'];
const REQUIRED_LOCAL_SPRING_CONFIG_EXCLUSIONS = [
  '**/application-local.yml',
  '**/application-local.yaml',
  '**/application-local.properties',
];
const REQUIRED_PRIVATE_MATERIAL_EXCLUSIONS = [
  '*.key', '**/*.key',
  '*.pem', '**/*.pem',
  '*.p12', '**/*.p12',
  '*.pfx', '**/*.pfx',
  '*.jks', '**/*.jks',
  '*.keystore', '**/*.keystore',
  '.ssh', '**/.ssh',
  '.aws', '**/.aws',
  '.kube', '**/.kube',
  '.gnupg', '**/.gnupg',
];
const OPERATIONAL_RUNNER = 'node --test "scripts/*.test.mjs" ".agent/scripts/*.test.js"';

function normalizedRules(source) {
  return source
    .split(/\r?\n/u)
    .map((line) => line.trim().replace(/\\/gu, '/').replace(/^\.\//u, '').replace(/\/$/u, ''))
    .filter((line) => line && !line.startsWith('#'));
}

function missingFrontendExclusion(source) {
  return normalizedRules(source).includes(REQUIRED_CONTEXT_EXCLUSION)
    ? []
    : [REQUIRED_CONTEXT_EXCLUSION];
}

function missingSecretExclusions(source) {
  const rules = normalizedRules(source);
  return REQUIRED_SECRET_EXCLUSIONS.filter((rule) => !rules.includes(rule));
}

function reIncludedSecretPaths(source) {
  return normalizedRules(source)
    .filter((rule) => rule.startsWith('!'))
    .filter((rule) => /(?:^|\/)\.env(?:$|[.*])/u.test(rule.slice(1).replace(/^\//u, '')))
    .sort();
}

function missingLocalSpringConfigExclusions(source) {
  const rules = normalizedRules(source);
  return REQUIRED_LOCAL_SPRING_CONFIG_EXCLUSIONS.filter((rule) => !rules.includes(rule));
}

function reIncludedLocalSpringConfigPaths(source) {
  return normalizedRules(source)
    .filter((rule) => rule.startsWith('!'))
    .filter((rule) => /(?:^|\/)application-local\.(?:properties|ya?ml)$/iu.test(
      rule.slice(1).replace(/^\//u, ''),
    ))
    .sort();
}

function missingPrivateMaterialExclusions(source) {
  const rules = normalizedRules(source);
  return REQUIRED_PRIVATE_MATERIAL_EXCLUSIONS.filter((rule) => !rules.includes(rule));
}

function reIncludedPrivateMaterialPaths(source) {
  return normalizedRules(source)
    .filter((rule) => rule.startsWith('!'))
    .filter((rule) => {
      const candidate = rule.slice(1).replace(/^\//u, '');
      return /(?:^|\/)(?:\.ssh|\.aws|\.kube|\.gnupg)(?:\/|$)/u.test(candidate)
        || /\.(?:key|pem|p12|pfx|jks|keystore)$/iu.test(candidate);
    })
    .sort();
}

function reIncludedFrontendPaths(source) {
  return normalizedRules(source)
    .filter((rule) => rule.startsWith('!'))
    .filter((rule) => {
      const path = rule.slice(1).replace(/^\//u, '');
      return path === REQUIRED_CONTEXT_EXCLUSION
        || path.startsWith(`${REQUIRED_CONTEXT_EXCLUSION}/`);
    })
    .sort();
}

function dockerfileFrontendCopies(source) {
  const logicalLines = source
    .replace(/\\\r?\n[ \t]*/gu, ' ')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  return logicalLines.filter((line) => {
    const match = /^(?:COPY|ADD)\s+(.+)$/iu.exec(line);
    if (!match) return false;
    return /(?:^|[\s["'])\.?\/?frontend(?:\/|[\s"',\]]|$)/u.test(match[1]);
  });
}

function operationalRunnerErrors(packageJson) {
  return packageJson.scripts?.['test:operational-contracts'] === OPERATIONAL_RUNNER
    ? []
    : [`test:operational-contracts must equal: ${OPERATIONAL_RUNNER}`];
}

test('API Docker root context excludes frontend without re-including it', () => {
  const source = readFileSync(new URL('../.dockerignore', import.meta.url), 'utf8');
  assert.deepEqual(missingFrontendExclusion(source), []);
  assert.deepEqual(
    reIncludedFrontendPaths(source),
    [],
    'frontend and its descendants must not be re-included in the API build context',
  );
});

test('API Docker root context excludes environment files without re-including them', () => {
  const source = readFileSync(new URL('../.dockerignore', import.meta.url), 'utf8');
  assert.deepEqual(missingSecretExclusions(source), []);
  assert.deepEqual(
    reIncludedSecretPaths(source),
    [],
    'environment files must never be re-included in the API build context',
  );
});

test('API Docker root context excludes ignored local Spring configuration without re-including it', () => {
  const source = readFileSync(new URL('../.dockerignore', import.meta.url), 'utf8');
  assert.deepEqual(missingLocalSpringConfigExclusions(source), []);
  assert.deepEqual(
    reIncludedLocalSpringConfigPaths(source),
    [],
    'root Docker context negations are fail-closed because they can bypass local Spring config exclusions',
  );
});

test('API Docker root context excludes private keys and local credential directories', () => {
  const source = readFileSync(new URL('../.dockerignore', import.meta.url), 'utf8');
  assert.deepEqual(missingPrivateMaterialExclusions(source), []);
  assert.deepEqual(
    reIncludedPrivateMaterialPaths(source),
    [],
    'private key material and local credential directories must never be re-included',
  );
});

test('the API Dockerfile does not directly copy frontend', () => {
  const source = readFileSync(new URL('../api-server/Dockerfile', import.meta.url), 'utf8');
  assert.deepEqual(dockerfileFrontendCopies(source), []);
});

test('the contract fails when the frontend exclusion is removed', () => {
  const safeFixture = `node_modules\nfrontend\ndocs\n`;
  const unsafeFixture = safeFixture.replace(/^frontend\r?\n/mu, '');
  assert.deepEqual(missingFrontendExclusion(unsafeFixture), ['frontend']);
});

test('the contract fails when frontend is explicitly re-included', () => {
  const unsafeFixture = `node_modules\nfrontend\n!frontend\n`;
  assert.deepEqual(reIncludedFrontendPaths(unsafeFixture), ['!frontend']);
});

test('the contract fails when an environment exclusion is removed', () => {
  const safeFixture = `.env*\n**/.env*\nfrontend\n`;
  const unsafeFixture = safeFixture.replace(/^\.env\*\r?\n/mu, '');
  assert.deepEqual(missingSecretExclusions(unsafeFixture), ['.env*']);
});

test('the contract fails when an environment file is explicitly re-included', () => {
  const unsafeFixture = `.env*\n**/.env*\n!.env\n!api-server/.env.local\n`;
  assert.deepEqual(reIncludedSecretPaths(unsafeFixture), ['!.env', '!api-server/.env.local']);
});

test('the contract fails when a local Spring config exclusion is removed or bypassed', () => {
  const safeFixture = `${REQUIRED_LOCAL_SPRING_CONFIG_EXCLUSIONS.join('\n')}\n`;
  const missingYaml = safeFixture.replace(/^\*\*\/application-local\.yaml\r?\n/mu, '');
  assert.deepEqual(missingLocalSpringConfigExclusions(missingYaml), ['**/application-local.yaml']);

  const bypassed = `${safeFixture}!api-server/src/main/resources/application-local.yml\n`;
  assert.deepEqual(reIncludedLocalSpringConfigPaths(bypassed), [
    '!api-server/src/main/resources/application-local.yml',
  ]);
});

test('canonical tracked dev and prod Spring config re-inclusions do not weaken local exclusion', () => {
  const safeFixture = `${REQUIRED_LOCAL_SPRING_CONFIG_EXCLUSIONS.join('\n')}\n`
    + '**/application-dev.yml\n'
    + '**/application-prod.yml\n'
    + '!api-server/src/main/resources/application-dev.yml\n'
    + '!api-server/src/main/resources/application-prod.yml\n';
  assert.deepEqual(reIncludedLocalSpringConfigPaths(safeFixture), []);
});

test('the contract fails when a private-key exclusion is removed', () => {
  const safeFixture = `${REQUIRED_PRIVATE_MATERIAL_EXCLUSIONS.join('\n')}\n`;
  const unsafeFixture = safeFixture.replace(/^\*\.key\r?\n/mu, '');
  assert.deepEqual(missingPrivateMaterialExclusions(unsafeFixture), ['*.key']);
});

test('the contract fails when private material is explicitly re-included', () => {
  const unsafeFixture = `${REQUIRED_PRIVATE_MATERIAL_EXCLUSIONS.join('\n')}\n!ssh-key.key\n!api-server/private.pem\n!.ssh/id_ed25519\n`;
  assert.deepEqual(reIncludedPrivateMaterialPaths(unsafeFixture), [
    '!.ssh/id_ed25519',
    '!api-server/private.pem',
    '!ssh-key.key',
  ]);
});

test('the contract detects a direct frontend COPY instruction', () => {
  const unsafeFixture = `FROM scratch\nCOPY frontend /app/frontend\n`;
  assert.deepEqual(
    dockerfileFrontendCopies(unsafeFixture),
    ['COPY frontend /app/frontend'],
  );
});

test('the root operational runner binds this contract', () => {
  const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(operationalRunnerErrors(packageJson), []);
});

test('the contract fails when its operational runner binding is removed', () => {
  const unsafePackageJson = { scripts: {} };
  assert.deepEqual(operationalRunnerErrors(unsafePackageJson), [
    `test:operational-contracts must equal: ${OPERATIONAL_RUNNER}`,
  ]);
});
