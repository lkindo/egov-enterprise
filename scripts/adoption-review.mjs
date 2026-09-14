/** Institution-specific evidence is never inherited from a reusable source bundle (ADR-0018). */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path';

export const ADOPTION_CONTROLS = Object.freeze({
  online: ['data-classification', 'authorization', 'request-logging', 'accessibility', 'execution-artifacts'],
  'migration-tool': ['source-target-identity', 'mapping-schema-driver', 'recovery-cutover', 'execution-artifacts'],
});
const PROFILES = new Set(['core', 'collaboration', 'demo']);
const SHA256 = /^[a-f0-9]{64}$/;
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const TEXT_EXTENSIONS = new Set(['.java', '.kt', '.kts', '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json',
  '.yaml', '.yml', '.xml', '.properties', '.gradle', '.toml', '.sql', '.css', '.scss', '.html', '.md', '.txt',
  '.sh', '.bat', '.ps1', '.conf', '.lock']);

function sourceHash(file, bytes) {
  const text = TEXT_EXTENSIONS.has(extname(file)) || ['Dockerfile', 'gradlew', '.dockerignore', '.gitattributes'].includes(basename(file));
  return sha256(text ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes);
}

export function validateProductProfile(product, profile) {
  if (!Object.hasOwn(ADOPTION_CONTROLS, product)) throw new Error(`unsupported product: ${product}`);
  if (product === 'online' ? !PROFILES.has(profile) : profile !== null) {
    throw new Error(`invalid profile for ${product}: ${profile}`);
  }
}

export function createPendingAdoptionReview({ product = 'online', profile = 'demo' } = {}) {
  validateProductProfile(product, profile);
  return {
    schemaVersion: 1, authority: 'adopter-environment-review', product, profile,
    status: 'pending', environmentId: null, owner: null, reviewedAt: null,
    validUntil: null, scopeDigest: null, evidence: [],
  };
}

export function containedFile(repoRoot, file) {
  if (!nonempty(file) || isAbsolute(file) || /^[A-Za-z]:/.test(file) || file.includes('\\')
    || file.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`expected a repository-relative file: ${file}`);
  }
  const root = realpathSync(repoRoot);
  const path = realpathSync(resolve(root, file));
  const back = relative(root, path);
  if (!back || back === '..' || back.startsWith(`..${sep}`) || isAbsolute(back) || !lstatSync(path).isFile()) {
    throw new Error(`file escapes repository or is not a file: ${file}`);
  }
  return path;
}

// Conservative content binding. Evidence documents and the approval itself are excluded
// to avoid circular hashes. UI files are deliberately absent from migration-tool scope.
export function adoptionScope(repoRoot, { product, profile }) {
  validateProductProfile(product, profile);
  const common = ['build.gradle', 'settings.gradle', 'gradle.properties', 'gradle', 'buildSrc', 'gradlew', 'gradlew.bat', '.gitattributes',
    'scripts/adoption-review.mjs', 'scripts/governance-review.mjs', 'scripts/adoption-execute.mjs',
    'scripts/verify.mjs', 'scripts/verify-reusable-artifact.mjs'];
  const roots = product === 'migration-tool'
    ? [...common, 'migration-tool/src', 'migration-tool/build.gradle', 'migration-tool/Dockerfile', 'migration-tool/.dockerignore']
    : [...common, ...['foundation', 'business-core', 'business-app', 'api-server'].flatMap((module) =>
      [`${module}/src/main`, `${module}/build.gradle`]),
    'frontend/src', 'frontend/next.config.ts', 'frontend/package.json', 'frontend/pnpm-lock.yaml',
    'frontend/Dockerfile', 'frontend/.dockerignore', 'api-server/Dockerfile', 'api-server/.dockerignore', '.dockerignore',
    'docker-compose.yml', 'docker-compose.prod.yml', 'scripts/deploy.sh',
    '.github/workflows/release.yml', 'config/deployment',
    'config/ui-url-state-census.json', 'config/ui-url-state-approval.json', 'config/ui-url-state-approval.schema.json',
    'config/ui-route-capabilities.json', 'config/ui-quality-scenarios.json',
    'config/frontend-visible-terms.json', 'config/krds-profile-mapping.json',
    'config/governance/permission-catalog.json', 'config/reusable-base-profiles.json',
    'config/governance/reusable-governance-projection.json',
    'scripts/ui-url-state-census.mjs', 'scripts/ui-route-capabilities-contract.mjs', 'scripts/e2e-shard-plan.mjs'];
  const files = new Map();
  function walk(file) {
    const path = resolve(repoRoot, file);
    if (!existsSync(path)) return;
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`source scope cannot contain a symlink: ${file}`);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path).sort()) walk(`${file}/${entry}`);
    } else if (stat.isFile()) {
      files.set(file, sourceHash(file, readFileSync(containedFile(repoRoot, file))));
    }
  }
  for (const file of roots) walk(file);
  const required = product === 'migration-tool'
    ? ['migration-tool/build.gradle'] : ['frontend/package.json', 'config/ui-url-state-census.json'];
  for (const file of required) if (!files.has(file)) throw new Error(`missing product scope input: ${file}`);
  const inputs = [...files].sort(([a], [b]) => a.localeCompare(b, 'en'));
  return { product, profile, fileCount: inputs.length,
    digest: sha256(JSON.stringify({ format: 'source-scope-v1-text-lf-binary-raw', product, profile, inputs })) };
}

function instant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return NaN;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().replace('.000Z', 'Z') === value.replace('.000Z', 'Z') ? time : NaN;
}

export function validateAdoptionReview(review, { repoRoot, product, profile, environmentId, scopeDigest, nowMs = Date.now() }) {
  validateProductProfile(product, profile);
  const errors = [];
  if (!Number.isFinite(nowMs)) throw new Error('invalid review clock');
  if (!review || typeof review !== 'object' || Array.isArray(review)) return ['adoption review must be an object'];
  const template = createPendingAdoptionReview({ product, profile });
  for (const key of Object.keys(review)) if (!Object.hasOwn(template, key)) errors.push(`unknown adoption field: ${key}`);
  for (const key of Object.keys(template)) if (!Object.hasOwn(review, key)) errors.push(`missing adoption field: ${key}`);
  for (const key of ['schemaVersion', 'authority', 'product', 'profile']) {
    if (review[key] !== template[key]) errors.push(`adoption ${key} does not match requested scope`);
  }
  if (review.status !== 'approved') errors.push('adopter environment review is pending or not approved');
  if (!nonempty(environmentId) || review.environmentId !== environmentId) errors.push('explicit target environment does not match approval');
  if (!nonempty(review.owner)) errors.push('adoption owner is required');
  if (!SHA256.test(review.scopeDigest ?? '') || review.scopeDigest !== scopeDigest) errors.push('adoption source/policy scope digest mismatch');
  const reviewed = instant(review.reviewedAt);
  const expires = instant(review.validUntil);
  if (!Number.isFinite(reviewed) || reviewed > nowMs) errors.push('reviewedAt must be an actual past UTC instant');
  if (!Number.isFinite(expires) || expires <= reviewed) errors.push('validUntil must follow reviewedAt');
  if (Number.isFinite(expires) && nowMs >= expires) errors.push('adopter environment approval expired');
  const controls = new Set();
  if (!Array.isArray(review.evidence)) errors.push('evidence must be an array');
  for (const entry of Array.isArray(review.evidence) ? review.evidence : []) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)
      || Object.keys(entry).sort().join(',') !== 'control,path,sha256') {
      errors.push('evidence requires only control, path and sha256');
      continue;
    }
    if (!ADOPTION_CONTROLS[product].includes(entry.control) || controls.has(entry.control)) {
      errors.push(`unknown or duplicate evidence control: ${entry.control}`);
    }
    controls.add(entry.control);
    try {
      const content = readFileSync(containedFile(repoRoot, entry.path));
      if (content.toString('utf8').trim().length === 0) errors.push(`empty evidence: ${entry.control}`);
      if (!SHA256.test(entry.sha256 ?? '') || sha256(content) !== entry.sha256) errors.push(`evidence hash mismatch: ${entry.control}`);
    } catch (error) { errors.push(`invalid evidence ${entry.control}: ${error.message}`); }
  }
  for (const control of ADOPTION_CONTROLS[product]) if (!controls.has(control)) errors.push(`missing evidence control: ${control}`);
  return errors;
}
