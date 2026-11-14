#!/usr/bin/env node
/** Explicit local registration; never modifies the original lock, projection or approval records. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { containedFile } from './adoption-review.mjs';
import { createAdopterBaseline, deriveAdopterRevision, adopterHarnessProfile, readAdopterProject,
  ADOPTER_PROJECT_PATH, HARNESS_PROFILE_PATH, validateAdopterHarnessManifest, adopterContractChanged } from './reusable-adopter-project.mjs';
import { buildAdopterContractArtifacts, isAdopterContractArtifact } from './adopter-api-contract.mjs';
import { verifyReusableGovernance } from './verify-reusable-governance.mjs';
import { buildPermissionArtifacts } from './generate-permissions.mjs';
import { computeHarnessBaselineEntries, diffHarnessBaseline, MANIFEST_PATH, parseManifest,
  manifestHeader, renderHarnessBaselineManifest } from './harness-baseline-manifest.mjs';
import { verifyReusableArtifact } from './verify-reusable-artifact.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const normalized = value => value.replace(/\r\n?/gu, '\n');
const text = (root, path) => normalized(readFileSync(containedFile(root, path), 'utf8'));
const read = (root, path) => JSON.parse(text(root, path));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const render = value => `${JSON.stringify(value, null, 2)}\n`;
const check = (condition, message) => { if (!condition) throw new Error(message); };

export function initializeAdopterProject(root) {
  check(!existsSync(resolve(root, ADOPTER_PROJECT_PATH)), 'Adopter registration already exists; the original baseline cannot be replaced');
  const report = verifyReusableGovernance(root);
  check(report.errors.length === 0, `Initialize an unchanged generated project first: ${report.errors.join('; ')}`);
  const currentManifest = text(root, MANIFEST_PATH);
  check(Object.values(diffHarnessBaseline(parseManifest(currentManifest), computeHarnessBaselineEntries(root))).every(rows => rows.length === 0),
    'Original harness baseline must pass before initialization');
  const project = { schemaVersion: 1, authority: 'adopter-project-registration', baseline: createAdopterBaseline(root), revision: null };
  writeFileSync(resolve(root, ADOPTER_PROJECT_PATH), render(project), { flag: 'wx' });
  return project;
}

export function registerAdopterProject(root, reason) {
  const project = read(root, ADOPTER_PROJECT_PATH);
  check(project.schemaVersion === 1 && project.authority === 'adopter-project-registration', 'Initialize the adopter project first');
  const revision = deriveAdopterRevision(root, project.baseline, { reason });
  // Census is derived from the current Java tree below, never accepted from a hand-edited profile.
  // Previously registered Java may change, so compare the stored profile hash, not a recomputation over new inputs.
  const expectedProfileHash = project.harnessProfileSha256 ?? sha256(project.baseline.profileText);
  check(sha256(text(root, HARNESS_PROFILE_PATH)) === expectedProfileHash, 'Existing harness profile changed outside registration');
  const oldManifest = text(root, MANIFEST_PATH);
  check(sha256(oldManifest) === (project.harnessManifestSha256 ?? sha256(project.baseline.harnessManifestText)), 'Existing harness baseline changed outside registration');
  const priorCodes = JSON.parse(project.baseline.catalogText).permissions.map(row => row.code);
  check(revision.addedSources.length > 0 || revision.permissionCodes.length > priorCodes.length, 'Registration requires an additive Java source or permission');
  const harnessProfile = adopterHarnessProfile(root, project.baseline, revision);
  const artifacts = buildPermissionArtifacts(root, { adopterDraft: { revision, harnessProfile } });
  if (adopterContractChanged(project.baseline, revision)) {
    const generated = buildAdopterContractArtifacts(root);
    for (const [path] of revision.contract.artifacts) if (!generated.has(path)) artifacts[path] = null;
    for (const [path, content] of generated) {
      check(isAdopterContractArtifact(path), 'Unexpected API contract generator output');
      artifacts[path] = content;
    }
  }
  const outputs = [...Object.keys(artifacts), HARNESS_PROFILE_PATH, MANIFEST_PATH, ADOPTER_PROJECT_PATH];
  const before = new Map(outputs.map(path => [path, existsSync(resolve(root, path)) ? readFileSync(containedFile(root, path)) : null]));
  try {
    for (const [path, content] of Object.entries(artifacts)) {
      if (content === null) unlinkSync(containedFile(root, path));
      else { const target = resolve(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content); }
    }
    writeFileSync(resolve(root, HARNESS_PROFILE_PATH), render(harnessProfile));
    const actual = computeHarnessBaselineEntries(root);
    const harnessManifest = renderHarnessBaselineManifest(actual, manifestHeader(project.baseline.harnessManifestText));
    validateAdopterHarnessManifest(project.baseline, harnessManifest);
    writeFileSync(resolve(root, MANIFEST_PATH), harnessManifest);
    const sealed = { ...project, revision: deriveAdopterRevision(root, project.baseline, { reason }),
      harnessProfileSha256: sha256(render(harnessProfile)), harnessManifestSha256: sha256(harnessManifest) };
    writeFileSync(resolve(root, ADOPTER_PROJECT_PATH), render(sealed));
    readAdopterProject(root);
    const report = verifyReusableGovernance(root, { adopter: true });
    check(report.errors.length === 0, `Adopter governance failed: ${report.errors.join('; ')}`);
    return sealed;
  } catch (error) {
    // Restore only the exact generated files owned by this invocation; leave the user's input edits intact.
    for (const [path, bytes] of before) {
      if (bytes === null) { if (existsSync(resolve(root, path))) unlinkSync(containedFile(root, path)); }
      else writeFileSync(resolve(root, path), bytes);
    }
    throw error;
  }
}

/** CI/pre-push inspect the registered current project; explicit full verification remains unchanged. */
export function verifyCurrentProject(root, options = {}) {
  const adopter = readAdopterProject(root);
  return verifyReusableArtifact({ root, ...options, scope: adopter ? 'adopter' : 'full' });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, ...args] = process.argv.slice(2);
    const options = { root: ROOT };
    for (let i = 0; i < args.length; i += 2) {
      check(['--root', '--reason'].includes(args[i]) && args[i + 1], 'Usage: init|register [--root PATH] [--reason TEXT]');
      options[args[i].slice(2)] = args[i + 1];
    }
    check(['init', 'register', 'verify'].includes(command), 'Usage: init|register|verify [--root PATH] [--reason TEXT]');
    if (command === 'verify') {
      const report = verifyCurrentProject(resolve(options.root));
      console.log(JSON.stringify(report));
      process.exitCode = report.result === 'passed' ? 0 : 1;
    } else {
    const result = command === 'init' ? initializeAdopterProject(resolve(options.root)) : registerAdopterProject(resolve(options.root), options.reason);
    console.log(JSON.stringify({ initialized: true, registered: Boolean(result.revision),
      addedSources: result.revision?.addedSources.length ?? 0, certificationEligible: false, environmentApproved: false }));
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
