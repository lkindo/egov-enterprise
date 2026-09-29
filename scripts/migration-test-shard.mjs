#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultProfilePath = join(repoRoot, 'config', 'migration-test-duration-profile.json');

function walkJavaFiles(root, current = root, files = []) {
  for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) walkJavaFiles(root, path, files);
    else if (entry.isFile() && entry.name.endsWith('.java')) files.push(path);
  }
  return files;
}

function walkFiles(current, files = []) {
  if (!existsSync(current)) return files;
  for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) walkFiles(path, files);
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

export function discoverMigrationTestClasses(root = repoRoot) {
  const sourceRoot = join(root, 'migration-tool', 'src', 'test', 'java');
  if (!existsSync(sourceRoot)) throw new Error(`migration test source root is missing: ${relative(root, sourceRoot)}`);
  return walkJavaFiles(sourceRoot).flatMap((file) => {
    const className = basename(file, '.java');
    if (!/(?:Test|Tests|IntegrationTest)$/.test(className)) return [];
    const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const packageName = source.match(/^package\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*;/m)?.[1];
    if (!packageName) throw new Error(`migration test has no literal package declaration: ${relative(root, file)}`);
    return [`${packageName}.${className}`];
  }).sort();
}

export function loadMigrationDurationProfile(path = defaultProfilePath) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function validateMigrationDurationProfile(profile, classes = discoverMigrationTestClasses()) {
  const errors = [];
  if (profile?.schemaVersion !== 1) errors.push('duration profile schemaVersion must be 1');
  if (profile?.shardCount !== 3) errors.push('duration profile shardCount must be exactly 3');
  if (!Number.isInteger(profile?.source?.runId) || profile.source.runId <= 0) errors.push('duration profile source.runId must be a positive integer');
  if (!/^[a-f0-9]{40}$/.test(profile?.source?.commit ?? '')) errors.push('duration profile source.commit must be a full lowercase SHA');
  const durations = profile?.durationsMs;
  if (!durations || typeof durations !== 'object' || Array.isArray(durations)) {
    errors.push('duration profile durationsMs must be an object');
    return errors;
  }
  const keys = Object.keys(durations).sort();
  const missing = classes.filter((name) => !Object.hasOwn(durations, name));
  const stale = keys.filter((name) => !classes.includes(name));
  if (missing.length) errors.push(`duration profile is missing test classes: ${missing.join(', ')}`);
  if (stale.length) errors.push(`duration profile contains stale test classes: ${stale.join(', ')}`);
  for (const [name, duration] of Object.entries(durations)) {
    if (!Number.isInteger(duration) || duration <= 0) errors.push(`duration must be a positive integer for ${name}`);
  }
  return errors;
}

export function buildMigrationShardPlan(profile, classes = discoverMigrationTestClasses()) {
  const errors = validateMigrationDurationProfile(profile, classes);
  if (errors.length) throw new Error(errors.join('\n'));
  const shards = Array.from({ length: profile.shardCount }, (_, index) => ({
    shard: `${index + 1}/${profile.shardCount}`,
    durationMs: 0,
    classes: [],
  }));
  const ordered = [...classes].sort((left, right) => profile.durationsMs[right] - profile.durationsMs[left]
    || left.localeCompare(right));
  for (const className of ordered) {
    const target = [...shards].sort((left, right) => left.durationMs - right.durationMs
      || left.shard.localeCompare(right.shard))[0];
    target.classes.push(className);
    target.durationMs += profile.durationsMs[className];
  }
  for (const shard of shards) shard.classes.sort();
  return shards;
}

export function parseShard(value, shardCount) {
  const match = /^(\d+)\/(\d+)$/.exec(value ?? '');
  if (!match || Number(match[2]) !== shardCount || Number(match[1]) < 1 || Number(match[1]) > shardCount) {
    throw new Error(`invalid migration shard '${value ?? ''}'; expected 1/${shardCount}..${shardCount}/${shardCount}`);
  }
  return Number(match[1]) - 1;
}

export function migrationShardGradleArguments(shard, profile = loadMigrationDurationProfile(), classes = discoverMigrationTestClasses()) {
  const plan = buildMigrationShardPlan(profile, classes);
  const selected = plan[parseShard(shard, profile.shardCount)];
  return [
    ':migration-tool:test',
    '--no-daemon',
    '--warning-mode', 'fail',
    '--console=plain',
    '-Dfile.encoding=UTF-8',
    ...selected.classes.flatMap((className) => ['--tests', className]),
  ];
}

export function verifyMigrationShardResults(selectedClasses, resultRoot) {
  const actual = [...new Set(walkFiles(resultRoot)
    .map((file) => basename(file).match(/^TEST-(.+?)(?:\$.*)?\.xml$/)?.[1])
    .filter(Boolean))].sort();
  const expected = [...selectedClasses].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const missing = expected.filter((name) => !actual.includes(name));
    const unexpected = actual.filter((name) => !expected.includes(name));
    throw new Error(`migration shard result census mismatch; missing=${missing.join(',')} unexpected=${unexpected.join(',')}`);
  }
  return actual;
}

export function verifyMigrationShardArtifacts(artifactRoot, profile = loadMigrationDurationProfile(), classes = discoverMigrationTestClasses()) {
  const errors = validateMigrationDurationProfile(profile, classes);
  if (!existsSync(artifactRoot)) return [...errors, `migration shard artifact root is missing: ${artifactRoot}`];
  const plan = errors.length ? [] : buildMigrationShardPlan(profile, classes);
  const files = walkFiles(artifactRoot);
  const manifests = files.filter((file) => basename(file) === 'migration-shard-manifest.json');
  const executionData = files.filter((file) => file.endsWith('.exec'));
  if (manifests.length !== profile.shardCount) errors.push(`expected ${profile.shardCount} shard manifests, found ${manifests.length}`);
  if (executionData.length !== profile.shardCount) errors.push(`expected ${profile.shardCount} JaCoCo exec files, found ${executionData.length}`);
  executionData.filter((file) => statSync(file).size === 0).forEach((file) => errors.push(`empty JaCoCo exec file: ${file}`));
  const seen = new Set();
  const boundExecutionData = new Set();
  for (const file of manifests) {
    let manifest;
    try { manifest = JSON.parse(readFileSync(file, 'utf8')); } catch { errors.push(`invalid shard manifest JSON: ${file}`); continue; }
    if (manifest.schemaVersion !== 1) errors.push(`invalid migration shard manifest schema: ${file}`);
    if (seen.has(manifest.shard)) errors.push(`duplicate migration shard manifest: ${manifest.shard}`);
    seen.add(manifest.shard);
    const expected = plan.find((candidate) => candidate.shard === manifest.shard);
    if (!expected) errors.push(`unknown migration shard manifest: ${manifest.shard}`);
    else if (JSON.stringify(manifest.classes) !== JSON.stringify(expected.classes)) errors.push(`migration shard class drift: ${manifest.shard}`);
    if (manifest.profileCommit !== profile.source.commit) errors.push(`migration shard profile commit drift: ${manifest.shard}`);
    const buildRoot = dirname(file);
    const executionFile = join(buildRoot, 'jacoco', 'test.exec');
    boundExecutionData.add(executionFile);
    if (!existsSync(executionFile) || statSync(executionFile).size === 0) {
      errors.push(`migration shard manifest has no nonempty bound JaCoCo exec: ${manifest.shard}`);
    }
    if (expected) {
      try {
        verifyMigrationShardResults(expected.classes, join(buildRoot, 'test-results', 'test'));
      } catch (error) {
        errors.push(`${manifest.shard} ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  for (const expected of plan) if (!seen.has(expected.shard)) errors.push(`missing migration shard manifest: ${expected.shard}`);
  for (const file of executionData) {
    if (!boundExecutionData.has(file)) errors.push(`unbound migration shard JaCoCo exec: ${file}`);
  }
  return errors;
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (invokedDirectly) {
  try {
    const artifactRoot = argument('--verify-artifacts');
    if (artifactRoot) {
      const errors = verifyMigrationShardArtifacts(resolve(repoRoot, artifactRoot));
      if (errors.length) throw new Error(errors.join('\n'));
      console.log('Migration shard artifacts exactly cover the measured test population.');
      process.exit(0);
    }
    const shard = argument('--shard');
    const profile = loadMigrationDurationProfile();
    const plan = buildMigrationShardPlan(profile);
    const selected = plan[parseShard(shard, profile.shardCount)];
    console.log(`[migration-shard ${selected.shard}] ${selected.classes.length} classes, measured ${(selected.durationMs / 1000).toFixed(3)}s`);
    const executable = process.platform === 'win32' ? join(repoRoot, 'gradlew.bat') : join(repoRoot, 'gradlew');
    const result = spawnSync(executable, migrationShardGradleArguments(shard, profile), {
      cwd: repoRoot,
      env: { ...process.env, TZ: 'Asia/Seoul' },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (result.error) throw result.error;
    if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
    const resultRoot = join(repoRoot, 'migration-tool', 'build', 'test-results', 'test');
    verifyMigrationShardResults(selected.classes, resultRoot);
    writeFileSync(join(repoRoot, 'migration-tool', 'build', 'migration-shard-manifest.json'), `${JSON.stringify({
      schemaVersion: 1,
      shard: selected.shard,
      profileCommit: profile.source.commit,
      classes: selected.classes,
    }, null, 2)}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}
