import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const MIGRATION_DURATION_PROFILE_PATH = 'config/migration-test-duration-profile.json';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

// JSON formatting, key order and checkout line endings are not measurements.
export function migrationProvenanceDigest(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function requireProvenance(condition, message) {
  if (!condition) throw new Error(`duration profile provenance: ${message}`);
}

function validateSource(profile) {
  requireProvenance(/^[a-f0-9]{40}$/.test(profile?.source?.commit ?? ''), 'source commit must be a full lowercase SHA');
  requireProvenance(Number.isSafeInteger(profile?.source?.runId) && profile.source.runId > 0, 'source runId must be a positive integer');
  requireProvenance(typeof profile?.source?.measuredAt === 'string'
    && Number.isFinite(Date.parse(profile.source.measuredAt)), 'source measuredAt must be a timestamp');
}

// Producer verification never consults a product lock or infers a mode from Git
// availability. Run against sourceRoot even when the exporter was invoked elsewhere.
export function verifySourceMigrationProfileProvenance(profile, sourceRoot) {
  validateSource(profile);
  sourceRoot = realpathSync(sourceRoot);
  const env = { ...process.env, GIT_CEILING_DIRECTORIES: dirname(sourceRoot), GIT_NO_REPLACE_OBJECTS: '1' };
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE',
    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_NAMESPACE']) delete env[key];
  const git = (args, message) => {
    const result = spawnSync('git', args, { cwd: sourceRoot, env, encoding: 'utf8' });
    requireProvenance(result.status === 0, message);
    return result.stdout.trim();
  };
  const top = git(['rev-parse', '--show-toplevel'], 'producer must have its own Git history');
  requireProvenance(realpathSync(top) === sourceRoot, 'sourceRoot must be the producer Git root');
  const producerCommit = git(['rev-parse', '--verify', 'HEAD^{commit}'], 'producer HEAD must be a commit');
  git(['cat-file', '-e', `${profile.source.commit}^{commit}`], 'source commit must exist in producer Git history');
  git(['merge-base', '--is-ancestor', profile.source.commit, producerCommit], 'source commit must be an ancestor of producer HEAD');
  return {
    schemaVersion: 1,
    verification: 'producer-git-ancestor',
    profilePath: MIGRATION_DURATION_PROFILE_PATH,
    producerCommit,
    source: structuredClone(profile.source),
    profileSha256: migrationProvenanceDigest(profile),
  };
}

// Only the generated contract calls this function, with a digest embedded by the
// producer after Git verification. This records producer verification and detects
// profile/lock drift; it is neither a publisher signature nor an independent proof
// of upstream ancestry inside the adopter's unrelated Git history.
export function verifyExportedMigrationProfileProvenance(profile, productRoot, expectedRecordDigest) {
  validateSource(profile);
  requireProvenance(/^[a-f0-9]{64}$/.test(expectedRecordDigest ?? ''), 'generated record digest is required');
  const lock = JSON.parse(readFileSync(resolve(productRoot, 'migration-product-lock.json'), 'utf8'));
  requireProvenance(lock.schemaVersion === 1 && lock.product === 'migration-tool', 'invalid product lock');
  const record = lock.durationProfileProvenance;
  requireProvenance(record?.schemaVersion === 1 && record.verification === 'producer-git-ancestor'
    && record.profilePath === MIGRATION_DURATION_PROFILE_PATH, 'verified producer record is required');
  requireProvenance(migrationProvenanceDigest(record) === expectedRecordDigest, 'producer record differs from generated contract');
  requireProvenance(/^[a-f0-9]{40}$/.test(record.producerCommit ?? ''), 'producer HEAD must be a full lowercase SHA');
  requireProvenance(migrationProvenanceDigest(record.source) === migrationProvenanceDigest(profile.source), 'profile source differs from verified producer record');
  requireProvenance(record.profileSha256 === migrationProvenanceDigest(profile), 'profile differs from verified producer digest');
  return record;
}
