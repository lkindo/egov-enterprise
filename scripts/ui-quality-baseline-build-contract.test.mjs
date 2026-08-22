import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, test } from 'node:test';

import {
  BASELINE_BUILD_ARG_NAMES,
  BASELINE_BUILD_ATTESTATION_KIND,
  BASELINE_IMAGE_LABEL_NAMES,
  assertArchiveAttributeSafety,
  assertNoGitlinks,
  buildCleanBaselineImages,
  createBaselineBuildAttestation,
  createDockerBuildInvocations,
  createDockerImageInspectInvocation,
  dockerfileMetadataErrors,
  dockerIgnorePolicyErrors,
  prepareCleanBuildContexts,
  readDockerImageId,
  validateBaselineBuildAttestationBytes,
  validateBuildMetadata,
  validateBuiltImageInspection,
  writeBaselineBuildAttestation,
} from './ui-quality-baseline-build.mjs';

const BUILD_SHA = '0123456789abcdef0123456789abcdef01234567';
const TREE_HASH = 'a'.repeat(64);
const API_IMAGE_ID = `sha256:${'b'.repeat(64)}`;
const FRONTEND_IMAGE_ID = `sha256:${'c'.repeat(64)}`;
const temporaryDirectories = [];

const ROOT_DOCKERIGNORE = `
.git
.env*
**/.env*
**/application-local.yml
**/application-local.yaml
**/application-local.properties
**/application-dev.yml
**/application-dev.yaml
**/application-dev.properties
**/application-prod.yml
**/application-prod.yaml
**/application-prod.properties
!api-server/src/main/resources/application-dev.yml
!api-server/src/main/resources/application-prod.yml
**/generated-sources
**/apt-generated
**/src/main/generated
**/build/generated
**/target/generated-sources
frontend
`;

const FRONTEND_DOCKERIGNORE = `
.git
.env*
**/.env*
**/application-local.yml
**/application-local.yaml
**/application-local.properties
**/application-dev.yml
**/application-dev.yaml
**/application-dev.properties
**/application-prod.yml
**/application-prod.yaml
**/application-prod.properties
**/generated-sources
**/apt-generated
**/src/main/generated
**/build/generated
**/target/generated-sources
node_modules
.next
`;

function temporaryDirectory(prefix) {
  const directory = mkdtempSync(path.join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

function writeFixtureFile(root, relativePath, contents) {
  const absolutePath = path.join(root, ...relativePath.split('/'));
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents, 'utf8');
}

function git(root, args, options = {}) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: options.encoding ?? 'utf8',
    input: options.input,
    stdio: options.stdio,
  });
}

function createGitFixture() {
  const root = temporaryDirectory('egov-r13-build-fixture-');
  git(root, ['init', '--quiet']);
  git(root, ['config', 'user.email', 'fixture@example.invalid']);
  git(root, ['config', 'user.name', 'Fixture']);

  writeFixtureFile(root, '.gitignore', `
**/application-local.yml
**/application-local.yaml
**/application-local.properties
**/application-dev.yml
**/application-dev.yaml
**/application-dev.properties
**/application-prod.yml
**/application-prod.yaml
**/application-prod.properties
**/generated-sources/
**/apt-generated/
**/src/main/generated/
**/build/
**/target/
`);
  writeFixtureFile(root, '.dockerignore', ROOT_DOCKERIGNORE);
  writeFixtureFile(root, 'build.gradle', '// fixture\n');
  writeFixtureFile(root, 'settings.gradle', '// fixture\n');
  writeFixtureFile(root, 'gradle.properties', 'fixture=true\n');
  writeFixtureFile(root, 'gradlew', '#!/bin/sh\n');
  writeFixtureFile(root, 'gradle/libs.versions.toml', '[versions]\n');
  writeFixtureFile(root, 'lombok.config', 'config.stopBubbling = true\n');
  writeFixtureFile(root, 'api-server/Dockerfile', 'FROM scratch\n');
  writeFixtureFile(root, 'api-server/build.gradle', '// fixture\n');
  writeFixtureFile(root, 'api-server/src/main/java/example/App.java', 'class App {}\n');
  writeFixtureFile(root, 'api-server/src/main/resources/application-dev.yml', 'tracked: dev\n');
  writeFixtureFile(root, 'api-server/src/main/resources/application-prod.yml', 'tracked: prod\n');
  writeFixtureFile(root, 'business-app/src/main/java/example/App.java', 'class App {}\n');
  writeFixtureFile(root, 'business-app/build.gradle', '// fixture\n');
  writeFixtureFile(root, 'business-core/src/main/java/example/Core.java', 'class Core {}\n');
  writeFixtureFile(root, 'business-core/build.gradle', '// fixture\n');
  writeFixtureFile(root, 'foundation/src/main/java/example/Foundation.java', 'class Foundation {}\n');
  writeFixtureFile(root, 'foundation/build.gradle', '// fixture\n');
  writeFixtureFile(root, 'migration-tool/src/main/java/example/Migration.java', 'class Migration {}\n');
  writeFixtureFile(root, 'migration-tool/build.gradle', '// fixture\n');
  writeFixtureFile(root, 'frontend/.dockerignore', FRONTEND_DOCKERIGNORE);
  writeFixtureFile(root, 'frontend/Dockerfile', 'FROM scratch\n');
  writeFixtureFile(root, 'frontend/package.json', '{"scripts":{"build":"true"}}\n');
  writeFixtureFile(root, 'frontend/pnpm-lock.yaml', 'lockfileVersion: 9\n');
  writeFixtureFile(root, 'frontend/next-env.d.ts', 'export {};\n');
  writeFixtureFile(root, 'frontend/next.config.ts', 'export default {};\n');
  writeFixtureFile(root, 'frontend/postcss.config.mjs', 'export default {};\n');
  writeFixtureFile(root, 'frontend/tsconfig.json', '{}\n');
  writeFixtureFile(root, 'frontend/public/fixture.txt', 'public\n');
  writeFixtureFile(root, 'frontend/src/page.ts', 'export const page = true;\n');
  writeFixtureFile(root, 'frontend/e2e/not-production.spec.ts', 'throw new Error();\n');
  writeFixtureFile(root, 'scripts/ui-quality-baseline-build.mjs', 'export {};\n');

  git(root, ['add', '.']);
  git(root, [
    'add', '-f',
    'api-server/src/main/resources/application-dev.yml',
    'api-server/src/main/resources/application-prod.yml',
  ]);
  git(root, ['commit', '--quiet', '-m', 'fixture']);
  const buildSha = git(root, ['rev-parse', 'HEAD']).trim();

  const ignoredPaths = [
    'business-app/src/main/resources/application-prod.yml',
    'business-app/src/main/resources/application-dev.yml',
    'business-app/src/main/resources/application-local.yml',
    'business-app/src/main/generated/Generated.java',
    'business-app/generated-sources/Generated.java',
    'business-app/build/generated/Generated.java',
    'frontend/src/main/generated/generated.ts',
  ];
  for (const relativePath of ignoredPaths) {
    writeFixtureFile(root, relativePath, `ignored fixture: ${relativePath}\n`);
  }

  return { root, buildSha, ignoredPaths };
}

function tarEntryNames(archivePath) {
  const archive = readFileSync(archivePath);
  const names = [];
  let offset = 0;
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const readString = (start, length) => header
      .subarray(start, start + length)
      .toString('utf8')
      .replace(/\0.*$/u, '');
    const name = readString(0, 100);
    const prefix = readString(345, 155);
    names.push(prefix ? `${prefix}/${name}` : name);
    const sizeText = readString(124, 12).trim();
    const size = sizeText ? Number.parseInt(sizeText, 8) : 0;
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return names;
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

test('build metadata is exact, bounded, and immutable', () => {
  assert.deepEqual(validateBuildMetadata({
    buildSha: BUILD_SHA,
    buildInputTreeHash: TREE_HASH,
  }), {
    buildSha: BUILD_SHA,
    buildInputTreeHash: TREE_HASH,
  });

  for (const invalid of [
    { buildSha: BUILD_SHA.toUpperCase(), buildInputTreeHash: TREE_HASH },
    { buildSha: BUILD_SHA.slice(1), buildInputTreeHash: TREE_HASH },
    { buildSha: BUILD_SHA, buildInputTreeHash: null },
    { buildSha: BUILD_SHA, buildInputTreeHash: 'b'.repeat(63) },
  ]) {
    assert.throws(() => validateBuildMetadata(invalid), /invalid baseline build metadata/u);
  }
});

test('Docker invocations use tar stdin, never the current working directory, and bind exact args and labels', () => {
  const invocations = createDockerBuildInvocations({
    buildSha: BUILD_SHA,
    buildInputTreeHash: TREE_HASH,
    apiImage: 'egov-uiux-r13-api:0123456789ab',
    frontendImage: 'egov-uiux-r13-frontend:0123456789ab',
    backendApiUrl: 'http://egov-uiux-r13-api:8080/api/v1',
    publicApiUrl: 'http://egov-uiux-r13-api:8080/api/v1',
    rootArchivePath: 'C:/safe/root-context.tar',
    frontendArchivePath: 'C:/safe/frontend-context.tar',
    apiImageIdPath: 'C:/safe/api-image-id.txt',
    frontendImageIdPath: 'C:/safe/frontend-image-id.txt',
  });

  assert.equal(invocations.length, 2);
  for (const invocation of invocations) {
    assert.equal(invocation.command, 'docker');
    assert.equal(invocation.args.at(-1), '-');
    assert.ok(!invocation.args.includes('.'));
    assert.ok(!invocation.args.includes(process.cwd()));
    assert.ok(invocation.stdinArchivePath.endsWith('-context.tar'));
    assert.equal(invocation.args[invocation.args.indexOf('--iidfile') + 1], invocation.imageIdPath);
    assert.ok(invocation.args.includes(
      `${BASELINE_BUILD_ARG_NAMES.buildSha}=${BUILD_SHA}`,
    ));
    assert.ok(invocation.args.includes(
      `${BASELINE_BUILD_ARG_NAMES.buildInputTreeHash}=${TREE_HASH}`,
    ));
    assert.ok(invocation.args.includes(
      `${BASELINE_IMAGE_LABEL_NAMES.buildSha}=${BUILD_SHA}`,
    ));
    assert.ok(invocation.args.includes(
      `${BASELINE_IMAGE_LABEL_NAMES.buildInputTreeHash}=${TREE_HASH}`,
    ));
  }
  assert.equal(invocations[0].stdinArchivePath, 'C:/safe/root-context.tar');
  assert.equal(invocations[1].stdinArchivePath, 'C:/safe/frontend-context.tar');
  assert.ok(invocations[0].args.includes('api-server/Dockerfile'));
  assert.ok(invocations[1].args.includes('Dockerfile'));
});

test('Docker invocation rejects unsafe URLs and image identifiers before executing Docker', () => {
  const base = {
    buildSha: BUILD_SHA,
    buildInputTreeHash: TREE_HASH,
    apiImage: 'egov-uiux-r13-api:0123456789ab',
    frontendImage: 'egov-uiux-r13-frontend:0123456789ab',
    backendApiUrl: 'http://api:8080/api/v1',
    publicApiUrl: 'http://api:8080/api/v1',
    rootArchivePath: 'C:/safe/root-context.tar',
    frontendArchivePath: 'C:/safe/frontend-context.tar',
    apiImageIdPath: 'C:/safe/api-image-id.txt',
    frontendImageIdPath: 'C:/safe/frontend-image-id.txt',
  };
  for (const mutation of [
    { backendApiUrl: 'http://user:secret@api:8080/api/v1' },
    { publicApiUrl: 'http://api:8080/api/v1?token=secret' },
    { apiImage: 'bad image' },
    { frontendImage: '--build-context=.' },
  ]) {
    assert.throws(
      () => createDockerBuildInvocations({ ...base, ...mutation }),
      /invalid baseline Docker build request/u,
    );
  }
});

test('root and frontend Docker ignore policies exclude ignored config and generated sources exactly', () => {
  const rootSource = readFileSync(new URL('../.dockerignore', import.meta.url), 'utf8');
  const frontendSource = readFileSync(new URL('../frontend/.dockerignore', import.meta.url), 'utf8');
  assert.deepEqual(dockerIgnorePolicyErrors(rootSource, { context: 'root' }), []);
  assert.deepEqual(dockerIgnorePolicyErrors(frontendSource, { context: 'frontend' }), []);
});

test('Docker ignore policy catches removed exclusions and unsafe re-inclusions', () => {
  assert.deepEqual(
    dockerIgnorePolicyErrors(
      ROOT_DOCKERIGNORE.replace(/^\*\*\/application-prod\.yml\r?\n/mu, ''),
      { context: 'root' },
    ),
    ['missing Docker context exclusion: **/application-prod.yml'],
  );
  assert.deepEqual(
    dockerIgnorePolicyErrors(
      `${ROOT_DOCKERIGNORE}!business-app/src/main/resources/application-prod.yml\n`,
      { context: 'root' },
    ),
    ['unsafe Docker context re-inclusion: !business-app/src/main/resources/application-prod.yml'],
  );
  assert.deepEqual(
    dockerIgnorePolicyErrors(
      FRONTEND_DOCKERIGNORE.replace(/^\*\*\/src\/main\/generated\r?\n/mu, ''),
      { context: 'frontend' },
    ),
    ['missing Docker context exclusion: **/src/main/generated'],
  );
});

test('Dockerfiles persist exact provenance args as OCI labels', () => {
  const apiDockerfile = readFileSync(new URL('../api-server/Dockerfile', import.meta.url), 'utf8');
  const frontendDockerfile = readFileSync(new URL('../frontend/Dockerfile', import.meta.url), 'utf8');
  assert.deepEqual(dockerfileMetadataErrors(apiDockerfile), []);
  assert.deepEqual(dockerfileMetadataErrors(frontendDockerfile), []);
});

test('Dockerfile metadata contract turns red when an arg or label is removed', () => {
  const safeFixture = `
FROM scratch
ARG BASELINE_BUILD_SHA
ARG BASELINE_BUILD_INPUT_TREE_SHA256
LABEL org.opencontainers.image.revision=\${BASELINE_BUILD_SHA} \\
  io.egov.ui-quality.build-input-tree-sha256=\${BASELINE_BUILD_INPUT_TREE_SHA256}
`;
  assert.deepEqual(dockerfileMetadataErrors(safeFixture), []);
  assert.deepEqual(
    dockerfileMetadataErrors(safeFixture.replace(/^ARG BASELINE_BUILD_SHA\r?\n/mu, '')),
    ['missing Dockerfile build arg: BASELINE_BUILD_SHA'],
  );
  assert.deepEqual(
    dockerfileMetadataErrors(
      safeFixture.replace(/org\.opencontainers\.image\.revision=\$\{BASELINE_BUILD_SHA\}/u, ''),
    ),
    ['missing Dockerfile OCI label: org.opencontainers.image.revision=${BASELINE_BUILD_SHA}'],
  );
});

test('archive safety rejects gitlinks and archive-transforming attributes', () => {
  assert.doesNotThrow(() => assertNoGitlinks([
    { mode: '100644', type: 'blob', path: 'safe.txt' },
  ]));
  assert.throws(() => assertNoGitlinks([
    { mode: '160000', type: 'commit', path: 'vendor/module' },
  ]), /gitlink is not supported by the clean baseline build archive/u);

  assert.doesNotThrow(() => assertArchiveAttributeSafety([
    { path: '.gitattributes', source: '*.sh text eol=lf\n' },
  ]));
  for (const source of [
    'private.txt export-ignore\n',
    'version.txt export-subst\n',
  ]) {
    assert.throws(
      () => assertArchiveAttributeSafety([{ path: '.gitattributes', source }]),
      /archive-transforming Git attribute is not allowed/u,
    );
  }
});

test('clean committed archives exclude ignored host config and generated sources without reading them', () => {
  const { root, buildSha, ignoredPaths } = createGitFixture();
  const outputDirectory = temporaryDirectory('egov-r13-context-output-');
  const contexts = prepareCleanBuildContexts({
    repositoryRoot: root,
    buildSha,
    expectedBuildInputTreeHash: TREE_HASH,
    outputDirectory,
  }, {
    calculateBuildInputTreeHash: () => TREE_HASH,
  });

  const rootEntries = tarEntryNames(contexts.rootArchivePath);
  const frontendEntries = tarEntryNames(contexts.frontendArchivePath);
  assert.ok(rootEntries.includes('api-server/src/main/resources/application-dev.yml'));
  assert.ok(rootEntries.includes('api-server/src/main/resources/application-prod.yml'));
  assert.ok(rootEntries.includes('lombok.config'));
  assert.ok(!rootEntries.includes('migration-tool/src/main/java/example/Migration.java'));
  assert.ok(!rootEntries.includes('frontend/src/page.ts'));
  assert.ok(!rootEntries.includes('scripts/ui-quality-baseline-build.mjs'));
  assert.ok(frontendEntries.includes('src/page.ts'));
  assert.ok(!frontendEntries.includes('e2e/not-production.spec.ts'));
  for (const ignoredPath of ignoredPaths) {
    assert.ok(!rootEntries.includes(ignoredPath), `${ignoredPath} entered root context`);
    const frontendRelative = ignoredPath.startsWith('frontend/')
      ? ignoredPath.slice('frontend/'.length)
      : ignoredPath;
    assert.ok(!frontendEntries.includes(frontendRelative), `${ignoredPath} entered frontend context`);
  }
  assert.equal(contexts.buildSha, buildSha);
  assert.equal(contexts.buildInputTreeHash, TREE_HASH);
  assert.match(contexts.commitTreeId, /^[a-f0-9]{40}$/u);
});

test('clean snapshot wrapper derives the committed build-input tree hash when the CLI supplies none', () => {
  const { root, buildSha } = createGitFixture();
  const outputDirectory = temporaryDirectory('egov-r13-derived-hash-output-');
  const contexts = prepareCleanBuildContexts({
    repositoryRoot: root,
    buildSha,
    outputDirectory,
  }, {
    calculateBuildInputTreeHash: () => TREE_HASH,
  });
  assert.equal(contexts.buildInputTreeHash, TREE_HASH);
});

test('clean snapshot wrapper rejects tracked and untracked dirty repositories', () => {
  for (const dirtyKind of ['tracked', 'untracked']) {
    const { root, buildSha } = createGitFixture();
    if (dirtyKind === 'tracked') {
      writeFixtureFile(root, 'api-server/src/main/java/example/App.java', 'class Dirty {}\n');
    } else {
      writeFixtureFile(root, 'not-ignored.txt', 'dirty\n');
    }
    const outputDirectory = temporaryDirectory(`egov-r13-${dirtyKind}-output-`);
    assert.throws(() => prepareCleanBuildContexts({
      repositoryRoot: root,
      buildSha,
      expectedBuildInputTreeHash: TREE_HASH,
      outputDirectory,
    }, {
      calculateBuildInputTreeHash: () => TREE_HASH,
    }), /baseline image build requires a clean repository/u);
  }
});

test('clean snapshot wrapper rejects HEAD and committed build-input tree mismatches', () => {
  const { root, buildSha } = createGitFixture();
  writeFixtureFile(root, 'second.txt', 'second\n');
  git(root, ['add', 'second.txt']);
  git(root, ['commit', '--quiet', '-m', 'second']);
  const outputDirectory = temporaryDirectory('egov-r13-mismatch-output-');
  assert.throws(() => prepareCleanBuildContexts({
    repositoryRoot: root,
    buildSha,
    expectedBuildInputTreeHash: TREE_HASH,
    outputDirectory,
  }, {
    calculateBuildInputTreeHash: () => TREE_HASH,
  }), /baseline build SHA must equal repository HEAD/u);

  const currentSha = git(root, ['rev-parse', 'HEAD']).trim();
  assert.throws(() => prepareCleanBuildContexts({
    repositoryRoot: root,
    buildSha: currentSha,
    expectedBuildInputTreeHash: TREE_HASH,
    outputDirectory,
  }, {
    calculateBuildInputTreeHash: () => 'b'.repeat(64),
  }), /committed build-input tree hash mismatch/u);
});

test('clean snapshot wrapper refuses an archive output directory inside the repository', () => {
  const { root, buildSha } = createGitFixture();
  const outputDirectory = path.join(root, 'context-output');
  mkdirSync(outputDirectory);
  assert.throws(() => prepareCleanBuildContexts({
    repositoryRoot: root,
    buildSha,
    expectedBuildInputTreeHash: TREE_HASH,
    outputDirectory,
  }, {
    calculateBuildInputTreeHash: () => TREE_HASH,
  }), /baseline build archives must be outside the repository/u);
});

function imageInspectionBytes({
  id,
  buildSha = BUILD_SHA,
  buildInputTreeHash = TREE_HASH,
  extra,
} = {}) {
  const projection = {
    Id: id,
    Labels: {
      BuildSha: buildSha,
      BuildInputTreeHash: buildInputTreeHash,
    },
    ...(extra === undefined ? {} : { Extra: extra }),
  };
  return Buffer.from(`${JSON.stringify(projection)}\n`, 'utf8');
}

test('image inspect is bounded, tag-bound, and returns only immutable identity labels', () => {
  const invocation = createDockerImageInspectInvocation({
    imageReference: 'egov-uiux-r13-api:0123456789ab',
  });
  assert.equal(invocation.command, 'docker');
  assert.deepEqual(invocation.args.slice(0, 3), ['image', 'inspect', '--format']);
  assert.equal(invocation.args.at(-1), 'egov-uiux-r13-api:0123456789ab');
  assert.equal(invocation.timeoutMs, 5_000);
  assert.equal(invocation.maxOutputBytes, 4_096);
  assert.match(invocation.args.at(-2), /\.Id/);
  assert.match(invocation.args.at(-2), /org\.opencontainers\.image\.revision/);
  assert.match(invocation.args.at(-2), /io\.egov\.ui-quality\.build-input-tree-sha256/);
  assert.doesNotMatch(invocation.args.at(-2), /\.Config\.Env|\.RepoTags|{{\s*json\s+\.\s*}}/);
  assert.throws(
    () => createDockerImageInspectInvocation({ imageReference: '--format={{json .}}' }),
    /invalid baseline Docker image inspect request/u,
  );
});

test('image ID and inspect projection require exact tag identity and image-level labels', () => {
  const iidRoot = temporaryDirectory('egov-r13-iid-');
  const iidPath = path.join(iidRoot, 'api-image-id.txt');
  writeFileSync(iidPath, `${API_IMAGE_ID}\n`, 'utf8');
  assert.equal(readDockerImageId(iidPath), API_IMAGE_ID);
  assert.deepEqual(validateBuiltImageInspection(
    imageInspectionBytes({ id: API_IMAGE_ID }),
    {
      expectedImageId: API_IMAGE_ID,
      buildSha: BUILD_SHA,
      buildInputTreeHash: TREE_HASH,
    },
  ), { id: API_IMAGE_ID });

  for (const [label, raw, expected] of [
    ['wrong tag ID', imageInspectionBytes({ id: FRONTEND_IMAGE_ID }), /image identity mismatch/u],
    ['wrong revision', imageInspectionBytes({ id: API_IMAGE_ID, buildSha: 'd'.repeat(40) }), /image provenance mismatch/u],
    ['wrong tree', imageInspectionBytes({ id: API_IMAGE_ID, buildInputTreeHash: 'e'.repeat(64) }), /image provenance mismatch/u],
    ['extra projection', imageInspectionBytes({ id: API_IMAGE_ID, extra: 'decoy' }), /projection shape/u],
    ['malformed', Buffer.from('{not-json', 'utf8'), /inspection is malformed/u],
    ['oversize', Buffer.alloc(4_097, 0x61), /inspection is malformed/u],
  ]) {
    assert.throws(() => validateBuiltImageInspection(raw, {
      expectedImageId: API_IMAGE_ID,
      buildSha: BUILD_SHA,
      buildInputTreeHash: TREE_HASH,
    }), expected, label);
  }

  writeFileSync(iidPath, `${API_IMAGE_ID}\ntrailing`, 'utf8');
  assert.throws(() => readDockerImageId(iidPath), /image ID file is malformed/u);
});

test('closed canonical build attestation detects payload and full-file substitution', () => {
  const attestation = createBaselineBuildAttestation({
    buildSha: BUILD_SHA,
    buildInputTreeHash: TREE_HASH,
    commitTreeId: 'd'.repeat(40),
    apiImageId: API_IMAGE_ID,
    frontendImageId: FRONTEND_IMAGE_ID,
  });
  assert.deepEqual(Object.keys(attestation).sort(), ['payload', 'payloadSha256']);
  assert.deepEqual(Object.keys(attestation.payload).sort(), [
    'baselineRunId',
    'buildInputTreeHash',
    'buildSha',
    'commitTreeId',
    'images',
    'kind',
    'schemaVersion',
  ]);
  assert.equal(attestation.payload.kind, BASELINE_BUILD_ATTESTATION_KIND);
  assert.equal(attestation.payload.baselineRunId, 'r13');
  assert.deepEqual(attestation.payload.images, {
    api: { id: API_IMAGE_ID },
    frontend: { id: FRONTEND_IMAGE_ID },
  });
  assert.match(attestation.payloadSha256, /^[a-f0-9]{64}$/u);

  const raw = Buffer.from(`${JSON.stringify(attestation)}\n`, 'utf8');
  assert.throws(
    () => validateBaselineBuildAttestationBytes(raw),
    /canonical bytes/u,
    'plain JSON key order must not masquerade as canonical bytes',
  );
});

test('build wrapper orders build then bounded inspect for each image and atomically publishes canonical attestation', () => {
  const { root, buildSha } = createGitFixture();
  const outputRoot = temporaryDirectory('egov-r13-attestation-output-');
  const attestationOutputPath = path.join(outputRoot, 'build-attestation.json');
  const events = [];
  const ids = { api: API_IMAGE_ID, frontend: FRONTEND_IMAGE_ID };

  const result = buildCleanBaselineImages({
    repositoryRoot: root,
    buildSha,
    buildInputTreeHash: TREE_HASH,
    apiImage: 'egov-uiux-r13-api:fixture',
    frontendImage: 'egov-uiux-r13-frontend:fixture',
    backendApiUrl: 'http://egov-uiux-r13-api:8080/api/v1',
    publicApiUrl: 'http://egov-uiux-r13-api:8080/api/v1',
    attestationOutputPath,
  }, {
    calculateBuildInputTreeHash: () => TREE_HASH,
    runDockerBuild: (invocation) => {
      events.push(`build:${invocation.component}`);
      writeFileSync(invocation.imageIdPath, `${ids[invocation.component]}\n`, 'utf8');
    },
    inspectDockerImage: (invocation) => {
      events.push(`inspect:${invocation.component}:${invocation.imageReference}`);
      return imageInspectionBytes({ id: ids[invocation.component], buildSha });
    },
  });

  assert.deepEqual(events, [
    'build:api',
    'inspect:api:egov-uiux-r13-api:fixture',
    'build:frontend',
    'inspect:frontend:egov-uiux-r13-frontend:fixture',
  ]);
  assert.equal(result.attestationPath, attestationOutputPath);
  assert.match(result.attestationSha256, /^[a-f0-9]{64}$/u);
  assert.equal(statSync(attestationOutputPath).isFile(), true);
  const raw = readFileSync(attestationOutputPath);
  assert.equal(raw.at(-1), 0x0a);
  assert.deepEqual(validateBaselineBuildAttestationBytes(raw, {
    expectedAttestationSha256: result.attestationSha256,
  }), result.attestation.payload);

  const substituted = Buffer.from(raw);
  const needle = Buffer.from(API_IMAGE_ID, 'utf8');
  const replacement = Buffer.from(FRONTEND_IMAGE_ID, 'utf8');
  replacement.copy(substituted, substituted.indexOf(needle));
  assert.throws(
    () => validateBaselineBuildAttestationBytes(substituted),
    /payload digest mismatch/u,
  );
  assert.throws(
    () => validateBaselineBuildAttestationBytes(raw, {
      expectedAttestationSha256: 'f'.repeat(64),
    }),
    /file digest mismatch/u,
  );
});

test('dirty repositories and inspect CLI failures fail closed without downstream Docker or publication', () => {
  const { root, buildSha } = createGitFixture();
  writeFixtureFile(root, 'dirty-untracked.txt', 'dirty\n');
  const outputRoot = temporaryDirectory('egov-r13-dirty-attestation-output-');
  const attestationOutputPath = path.join(outputRoot, 'build-attestation.json');
  let dockerBuilds = 0;
  let imageInspections = 0;
  assert.throws(() => buildCleanBaselineImages({
    repositoryRoot: root,
    buildSha,
    buildInputTreeHash: TREE_HASH,
    apiImage: 'egov-uiux-r13-api:fixture',
    frontendImage: 'egov-uiux-r13-frontend:fixture',
    backendApiUrl: 'http://egov-uiux-r13-api:8080/api/v1',
    publicApiUrl: 'http://egov-uiux-r13-api:8080/api/v1',
    attestationOutputPath,
  }, {
    calculateBuildInputTreeHash: () => TREE_HASH,
    runDockerBuild: () => { dockerBuilds += 1; },
    inspectDockerImage: () => { imageInspections += 1; },
  }), /requires a clean repository/u);
  assert.equal(dockerBuilds, 0);
  assert.equal(imageInspections, 0);

  const clean = createGitFixture();
  assert.throws(() => buildCleanBaselineImages({
    repositoryRoot: clean.root,
    buildSha: clean.buildSha,
    buildInputTreeHash: TREE_HASH,
    apiImage: 'egov-uiux-r13-api:fixture',
    frontendImage: 'egov-uiux-r13-frontend:fixture',
    backendApiUrl: 'http://egov-uiux-r13-api:8080/api/v1',
    publicApiUrl: 'http://egov-uiux-r13-api:8080/api/v1',
    attestationOutputPath,
  }, {
    calculateBuildInputTreeHash: () => TREE_HASH,
    runDockerBuild: (invocation) => {
      writeFileSync(invocation.imageIdPath, `${idsForComponent(invocation.component)}\n`, 'utf8');
    },
    inspectDockerImage: () => { throw new Error('raw docker CLI failure'); },
  }), /baseline api image inspection failed/u);
  assert.equal(statSync(outputRoot).isDirectory(), true);
  assert.throws(() => statSync(attestationOutputPath));
});

function idsForComponent(component) {
  return component === 'api' ? API_IMAGE_ID : FRONTEND_IMAGE_ID;
}

test('attestation output rejects repository paths and existing targets', () => {
  const { root } = createGitFixture();
  const attestation = createBaselineBuildAttestation({
    buildSha: BUILD_SHA,
    buildInputTreeHash: TREE_HASH,
    commitTreeId: 'd'.repeat(40),
    apiImageId: API_IMAGE_ID,
    frontendImageId: FRONTEND_IMAGE_ID,
  });
  assert.throws(() => writeBaselineBuildAttestation({
    repositoryRoot: root,
    outputPath: path.join(root, 'attestation.json'),
    attestation,
  }), /outside the repository/u);

  const outputRoot = temporaryDirectory('egov-r13-existing-attestation-');
  const outputPath = path.join(outputRoot, 'attestation.json');
  writeFileSync(outputPath, 'existing\n', 'utf8');
  assert.throws(() => writeBaselineBuildAttestation({
    repositoryRoot: root,
    outputPath,
    attestation,
  }), /must not already exist/u);

  const canonicalRoot = temporaryDirectory('egov-r13-canonical-attestation-');
  const nested = path.join(canonicalRoot, 'nested');
  mkdirSync(nested);
  const nonCanonicalPath = `${nested}${path.sep}..${path.sep}attestation.json`;
  assert.throws(() => writeBaselineBuildAttestation({
    repositoryRoot: root,
    outputPath: nonCanonicalPath,
    attestation,
  }), /absolute canonical path/u);
});

test('supported package and protocol paths bind contract-first build and runner attestation consumption', () => {
  const rootPackage = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const protocol = readFileSync(
    new URL('../docs/04-operations/ui-ux-baseline-protocol.md', import.meta.url),
    'utf8',
  );
  assert.equal(
    rootPackage.scripts['ui-quality:baseline:build'],
    'node --test scripts/ui-quality-baseline-build-contract.test.mjs && node scripts/ui-quality-baseline-build.mjs',
  );
  assert.match(protocol, /npm run ui-quality:baseline:build --/u);
  assert.match(protocol, /--attestation-output/u);
  assert.match(protocol, /UI_BASELINE_BUILD_ATTESTATION_PATH/u);
  assert.match(protocol, /UI_BASELINE_BUILD_ATTESTATION_SHA256/u);
  assert.match(protocol, /docker image inspect/u);
});
