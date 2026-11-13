/** Additive adopter inputs are an explicit revision, never a new upstream approval. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { containedFile } from './adoption-review.mjs';
import { projectedCodeEntries, projectedCodeScope, codeScopeForEntries } from './reusable-source-evidence.mjs';
import { PERMISSION_ARTIFACT_PATHS, PERMISSION_BUNDLES_PATH } from './permission-artifact-paths.mjs';
import { stripJavaComments } from './reusable-source-java.mjs';
import { computeReusableHarnessCensus } from './reusable-harness-census.mjs';
import { MANIFEST_PATH, parseManifest } from './harness-baseline-manifest-format.mjs';
import { API_DOCS_PATH, API_GENERATOR_PATH, isAdopterContractArtifact, validateAdditiveApiDocs } from './adopter-api-contract.mjs';

export const ADOPTER_PROJECT_PATH = 'adopter-project.json';
export const HARNESS_PROFILE_PATH = 'config/governance/reusable-harness-profile.json';
const PROJECTION_PATH = 'config/governance/reusable-governance-projection.json';
const CATALOG = 'config/governance/permission-catalog.json';
const POLICIES = 'config/governance/authorization-policies.json';
const JAVA = /^(?:foundation|business-core|business-app|api-server)\/src\/main\/java\/.+\.java$/u;
const DERIVED = new Set(PERMISSION_ARTIFACT_PATHS);
const sha256 = text => createHash('sha256').update(text).digest('hex');
const text = (root, path) => readFileSync(containedFile(root, path), 'utf8').replace(/\r\n?/gu, '\n');
const json = (root, path) => JSON.parse(text(root, path));
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const requireThat = (value, message) => { if (!value) throw new Error(message); };
export const ADOPTER_BASELINE_KEYS = new Set([`__registry.${HARNESS_PROFILE_PATH}`, '__registry.config/governance/authorization-policies.json']);

export function validateAdopterHarnessManifest(baseline, manifest) {
  const before = parseManifest(baseline.harnessManifestText);
  const current = parseManifest(manifest);
  requireThat([...new Set([...before.keys(), ...current.keys()])].every(key => ADOPTER_BASELINE_KEYS.has(key)
    || before.get(key) === current.get(key)), 'Registration cannot change other harness rules, exceptions, gates or thresholds');
}

export function adopterContractChanged(baseline, revision) {
  return Boolean(revision.contract) && (revision.contract.apiDocsSha256 !== sha256(baseline.apiDocsText)
    || !equal(revision.contract.artifacts, baseline.entries.filter(([path]) => isAdopterContractArtifact(path))));
}

/** Caller must first pass the original strict governance gate; snapshots remain bound to its digest. */
export function createAdopterBaseline(root) {
  const entries = projectedCodeEntries(root);
  const codeScope = codeScopeForEntries(entries);
  requireThat(equal(json(root, PROJECTION_PATH).codeScope, codeScope), 'Initialize before changing the original source evidence');
  const baseline = { schemaVersion: 1, authority: 'original-generated-evidence-not-adopter-approval', codeScope, entries,
    lockSha256: sha256(text(root, 'reusable-base-lock.json')), projectionSha256: sha256(text(root, PROJECTION_PATH)),
    catalogText: text(root, CATALOG), policiesText: text(root, POLICIES), profileText: text(root, HARNESS_PROFILE_PATH),
    bundlesText: text(root, PERMISSION_BUNDLES_PATH),
    apiDocsText: existsSync(join(root, API_DOCS_PATH)) ? text(root, API_DOCS_PATH) : null,
    harnessManifestText: existsSync(join(root, MANIFEST_PATH)) ? text(root, MANIFEST_PATH) : null };
  validateBaseline(root, baseline);
  return baseline;
}

function validateBaseline(root, baseline) {
  requireThat(baseline?.schemaVersion === 1 && baseline.authority === 'original-generated-evidence-not-adopter-approval', 'Invalid adopter original baseline');
  requireThat(sha256(text(root, 'reusable-base-lock.json')) === baseline.lockSha256, 'Original source lock changed');
  requireThat(sha256(text(root, PROJECTION_PATH)) === baseline.projectionSha256, 'Original governance projection changed');
  const entries = baseline.entries;
  requireThat(Array.isArray(entries) && entries.every(row => Array.isArray(row) && row.length === 2
    && typeof row[0] === 'string' && /^[a-f0-9]{64}$/u.test(row[1])), 'Invalid original source entry');
  requireThat(new Set(entries.map(([path]) => path)).size === entries.length
    && equal([...entries].sort(([a], [b]) => a.localeCompare(b, 'en')), entries), 'Original source entries must be unique and ordered');
  requireThat(equal(codeScopeForEntries(entries), baseline.codeScope)
    && equal(baseline.codeScope, json(root, PROJECTION_PATH).codeScope), 'Original source baseline does not match the inherited evidence');
  const originals = new Map(entries);
  requireThat(sha256(baseline.catalogText) === originals.get(CATALOG)
    && sha256(baseline.policiesText) === originals.get(POLICIES), 'Original permission snapshots do not match source evidence');
  const anchor = json(root, 'reusable-base-lock.json').adopterBaseline;
  if (baseline.apiDocsText !== null && baseline.apiDocsText !== undefined) {
    requireThat(anchor?.apiDocsSha256 === sha256(baseline.apiDocsText)
      && anchor.apiContractGeneratorSha256 === sha256(text(root, API_GENERATOR_PATH)), 'Original API contract/generator snapshots do not match the source lock');
  }
  requireThat(anchor?.harnessProfileSha256 === sha256(baseline.profileText)
    && anchor.permissionBundlesSha256 === sha256(baseline.bundlesText)
    && typeof baseline.harnessManifestText === 'string' && anchor.harnessManifestSha256 === sha256(baseline.harnessManifestText),
  'Original harness snapshots do not match the source lock; generate with adopter registration support');
  return originals;
}

function additivePermissions(root, baseline, addedSources) {
  const original = JSON.parse(baseline.catalogText);
  const catalog = json(root, CATALOG);
  const before = new Map(original.permissions.map(row => [row.code, row]));
  const codes = catalog.permissions.map(row => row.code);
  requireThat(new Set(codes).size === codes.length && codes.every(code => /^[A-Z][A-Z0-9_]{0,19}$/u.test(code)), 'Invalid/duplicate adopter permission code');
  requireThat(equal(catalog.permissions.filter(row => before.has(row.code)), original.permissions), 'Original permission definitions/order must be retained');
  const { permissions: ignoredOriginal, ...oldOther } = original;
  const { permissions: ignoredCurrent, ...newOther } = catalog;
  requireThat(equal(oldOther, newOther), 'Original page permissions and catalog policy must be retained');
  const upstreamPath = 'config/governance/upstream-review/permission-catalog.json';
  const upstream = existsSync(join(root, upstreamPath)) ? new Set(json(root, upstreamPath).permissions.map(row => row.code)) : new Set();
  const addedCodes = new Set(codes.filter(code => !before.has(code)));
  for (const row of catalog.permissions.filter(row => addedCodes.has(row.code))) {
    requireThat(Array.isArray(row.defaultGroups) && row.defaultGroups.length === 0, 'New adopter permissions must be unassigned: defaultGroups=[]');
    requireThat(!upstream.has(row.code), `Removed upstream permission cannot be resurrected: ${row.code}`);
  }
  const originalBundles = JSON.parse(baseline.bundlesText);
  const bundles = json(root, PERMISSION_BUNDLES_PATH);
  const { excluded: originalExcluded = [], ...oldBundlePolicy } = originalBundles;
  const { excluded = [], ...newBundlePolicy } = bundles;
  requireThat(equal(oldBundlePolicy, newBundlePolicy) && equal(excluded.slice(0, originalExcluded.length), originalExcluded),
    'Original permission bundles and exclusions must be retained');
  const classified = excluded.slice(originalExcluded.length);
  requireThat(classified.length === addedCodes.size && new Set(classified.map(row => row.code)).size === addedCodes.size
    && classified.every(row => addedCodes.has(row.code) && typeof row.reason === 'string' && row.reason.trim().length >= 10),
  'Every new unassigned permission requires its own explicit bundle exclusion reason; original permissions cannot be excluded');
  const originalPolicies = JSON.parse(baseline.policiesText);
  const policies = json(root, POLICIES);
  const collections = ['operationBindings', 'endpointPolicies', 'serviceGuardPolicies', 'manualGuardPolicies'];
  const oldOtherPolicy = Object.fromEntries(Object.entries(originalPolicies).filter(([key]) => !collections.includes(key)));
  const newOtherPolicy = Object.fromEntries(Object.entries(policies).filter(([key]) => !collections.includes(key)));
  requireThat(equal(oldOtherPolicy, newOtherPolicy), 'Original authorization policy settings must be retained');
  const types = new Set(addedSources.map(row => row.type));
  const paths = new Set(addedSources.map(row => row.path));
  const addedType = target => typeof target === 'string' && types.has(target.split('#')[0]);
  for (const key of collections) {
    const prior = originalPolicies[key] ?? [];
    const current = policies[key] ?? [];
    requireThat(Array.isArray(current) && equal(current.slice(0, prior.length), prior), `Original authorization ${key} must be retained`);
    for (const row of current.slice(prior.length)) {
      if (key === 'operationBindings') {
        requireThat(row.method === 'GET' && row.access === 'PERMISSION' && addedCodes.has(row.permission),
          'New operation bindings require a new PERMISSION on a GET API');
        requireThat(addedType(row.handler), 'New operation binding must name a registered added Java handler');
      } else if (key === 'endpointPolicies') {
        requireThat(addedType(row.handler), 'New endpoint policy must name an added Java handler');
      } else if (key === 'serviceGuardPolicies') {
        const name = row.target?.split('#')[0];
        requireThat(addedSources.filter(source => source.type.split('.').at(-1) === name).length === 1,
          'New service guard must name a unique added Java simple class name, matching the native harness');
      } else requireThat(paths.has(row.source), 'New manual guard must name an added Java source');
    }
  }
  return { catalog, policies, bundles, permissionCodes: codes };
}

export function deriveAdopterRevision(root, baseline, { reason } = {}) {
  requireThat(typeof reason === 'string' && reason.trim().length >= 10 && reason.length <= 1000, 'Registration requires a concrete reason (10–1000 characters)');
  const originals = validateBaseline(root, baseline);
  const entries = projectedCodeEntries(root);
  const current = new Map(entries);
  const profile = JSON.parse(baseline.profileText);
  const derived = path => DERIVED.has(path) || (Boolean(baseline.apiDocsText) && isAdopterContractArtifact(path));
  const removedPaths = new Set(profile.removed.map(row => row.path));
  const knownTypes = new Set([...profile.retained, ...profile.removed].map(row => row.type));
  for (const [path, hash] of originals) {
    requireThat(current.has(path) || (Boolean(baseline.apiDocsText) && isAdopterContractArtifact(path)), `Original retained source cannot be removed: ${path}`);
    requireThat(current.get(path) === hash || derived(path) || [CATALOG, POLICIES].includes(path), `Original retained source changed: ${path}`);
  }
  const addedSources = [];
  for (const [path, hash] of entries.filter(([path]) => !originals.has(path))) {
    if (Boolean(baseline.apiDocsText) && isAdopterContractArtifact(path)) continue;
    requireThat(JAVA.test(path), `Unsupported adopter source scope; only new Java sources may be added: ${path}`);
    requireThat(!removedPaths.has(path), `Removed original source cannot be resurrected: ${path}`);
    const source = stripJavaComments(text(root, path));
    const packageName = source.match(/^\s*package\s+([\w.]+)\s*;/mu)?.[1];
    requireThat(packageName, `Added Java package missing: ${path}`);
    const type = `${packageName}.${basename(path, '.java')}`;
    requireThat(!knownTypes.has(type), `Duplicate/removed original Java type: ${type}`);
    requireThat(![...knownTypes].some(prior => prior.split('.').at(-1) === basename(path, '.java')),
      `Ambiguous added Java simple class name: ${type}`);
    knownTypes.add(type);
    addedSources.push({ path, type, sha256: hash });
  }
  const permissions = additivePermissions(root, baseline, addedSources);
  let contract = null;
  if (baseline.apiDocsText) {
    validateAdditiveApiDocs(JSON.parse(baseline.apiDocsText), json(root, API_DOCS_PATH),
      permissions.policies.operationBindings.slice(JSON.parse(baseline.policiesText).operationBindings.length));
    contract = { apiDocsSha256: sha256(text(root, API_DOCS_PATH)),
      artifacts: entries.filter(([path]) => isAdopterContractArtifact(path)) };
  }
  return { schemaVersion: 1, authority: 'registered-adopter-technical-revision', reason: reason.trim(),
    certificationEligible: false, environmentApproved: false,
    inputs: [...entries.filter(([path]) => !derived(path)), [PERMISSION_BUNDLES_PATH, sha256(text(root, PERMISSION_BUNDLES_PATH))],
      ...(contract ? [[API_DOCS_PATH, contract.apiDocsSha256]] : [])]
      .sort(([a], [b]) => a.localeCompare(b, 'en')), codeScope: codeScopeForEntries(entries),
    addedSources, contract, ...permissions };
}

export function validateAdopterRevision(root, baseline, revision) {
  try {
    const actual = deriveAdopterRevision(root, baseline, { reason: revision?.reason });
    requireThat(equal(actual, revision), 'Registered adopter revision changed; register the current inputs and regenerate before verification');
    return [];
  } catch (error) { return [error.message]; }
}

export function adopterHarnessProfile(root, baseline, revision) {
  const original = JSON.parse(baseline.profileText);
  const retained = [...original.retained, ...revision.addedSources.map(({ path, type }) => ({ path, type }))]
    .sort((a, b) => a.path.localeCompare(b.path));
  const sources = new Map(retained.map(row => [row.path, stripJavaComments(text(root, row.path))]));
  const activeType = target => {
    if (target.startsWith('EXTERNAL#')) return true;
    const type = target.split('#')[0];
    const matches = [...retained, ...original.removed].filter(row => row.type === type || row.type.split('.').at(-1) === type);
    requireThat(matches.length === 1, `Ambiguous/unregistered adopter policy type: ${type}`);
    return sources.has(matches[0].path);
  };
  return { ...original, retained, census: computeReusableHarnessCensus(root, { sources, activeType,
    authorization: revision.policies, schemaTables: original.census.schemaTables,
    productionSources: retained.length, permissionCatalog: revision.permissionCodes.length }) };
}

/** Regeneration may repair derived artifacts; changed registered inputs always require explicit registration. */
export function readAdopterProject(root, { derivedMayDrift = false } = {}) {
  if (!existsSync(join(root, ADOPTER_PROJECT_PATH))) return null;
  const project = json(root, ADOPTER_PROJECT_PATH);
  requireThat(project.schemaVersion === 1 && project.authority === 'adopter-project-registration', 'Invalid adopter project registration');
  if (!project.revision) {
    validateBaseline(root, project.baseline);
    requireThat(equal(projectedCodeScope(root), project.baseline.codeScope), 'Adopter project is initialized; register additions before regeneration/verification');
    requireThat(text(root, HARNESS_PROFILE_PATH) === project.baseline.profileText, 'Original harness profile changed');
    return null;
  }
  const actual = deriveAdopterRevision(root, project.baseline, { reason: project.revision.reason });
  if (derivedMayDrift) requireThat(equal(actual.inputs, project.revision.inputs), 'Adopter inputs changed; explicit registration is required');
  else requireThat(equal(actual, project.revision), 'Registered adopter revision changed');
  const harnessProfile = adopterHarnessProfile(root, project.baseline, actual);
  if (!derivedMayDrift) requireThat(equal(json(root, HARNESS_PROFILE_PATH), harnessProfile), 'Adopter harness census/profile changed');
  if (!derivedMayDrift) requireThat(sha256(text(root, MANIFEST_PATH)) === project.harnessManifestSha256, 'Adopter harness baseline changed');
  validateAdopterHarnessManifest(project.baseline, text(root, MANIFEST_PATH));
  return { ...project, harnessProfile };
}
