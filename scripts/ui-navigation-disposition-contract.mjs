import crypto from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_RELATIVE_PATH = 'config/ui-route-capabilities.json';
const SCHEMA_RELATIVE_PATH = 'config/ui-navigation-disposition.schema.json';
const PROPOSAL_RELATIVE_PATH = 'config/ui-navigation-disposition-proposal.json';
const PROVISIONAL_DIRECTION_ADR_PATH = 'docs/02-architecture/decisions/ADR-0004-provisional-hybrid-information-architecture.md';
const PROVISIONAL_DIRECTION_SCOPE = [
  'prototype-and-research-default',
  'preserve-canonical-urls',
  'separate-navigation-metadata-from-route-and-authorization',
  'isolate-high-risk-administration-in-management-center',
];
const PROVISIONAL_DIRECTION_UNRESOLVED = [
  'exact-labels-groups-order-and-route-dispositions',
  'live-menu-authority-and-effective-role-exposure',
  'route-level-authorization-privacy-and-profile-ownership',
  'url-privacy-allowlists-and-external-telemetry',
  'user-research-thresholds-and-g1-approval',
];

const DISPOSITIONS = [
  'retain-canonical',
  'retain-alias-permanent',
  'retain-alias-temporary',
  'non-menu-child',
  'profile-conditional',
  'demo-isolated',
  'unavailable-hidden',
  'consolidate-to-canonical',
  'retire-candidate',
  'blocked-review',
];
const ROUTE_REVIEW_STATUSES = ['unverified', 'verified', 'not-applicable'];
const ALIAS_REVIEW_STATUSES = ['unverified', 'verified', 'blocked'];
const REVIEW_STATES = ['blocked-input', 'proposed', 'approved'];
const APPROVAL_KEYS = ['domain', 'productIa', 'securityPrivacy', 'accessibility'];
const EVIDENCE_KEYS = [
  'researchArtifactSha256',
  'liveMenuArtifactSha256',
  'authorityAssignmentArtifactSha256',
  'effectiveMenuArtifactSha256',
];
const REQUIRED_FOUNDATION_ASSETS = [
  'config/ui-navigation-disposition-proposal.json',
  'config/ui-navigation-disposition.schema.json',
  PROVISIONAL_DIRECTION_ADR_PATH,
  'scripts/ui-navigation-disposition-contract.mjs',
  'scripts/ui-navigation-disposition-contract.test.mjs',
];
const ALLOWED_SOURCE_REFERENCES = new Set([
  'scripts/governance-gates-contract.test.mjs',
  'scripts/ui-navigation-disposition-contract.mjs',
  'scripts/ui-navigation-disposition-contract.test.mjs',
]);
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function posix(value) {
  return value.replaceAll(path.sep, '/');
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expected, label, errors) {
  if (!isObject(value)) {
    errors.push(`${label} must be an object`);
    return false;
  }

  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.join('\n') !== wanted.join('\n')) {
    errors.push(`${label} keys must exactly equal: ${wanted.join(', ')}`);
    return false;
  }
  return true;
}

function validateStringArray(value, label, errors, { nonEmpty = false } = {}) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || entry.trim() === '')) {
    errors.push(`${label} must be an array of non-empty strings`);
    return;
  }
  if (new Set(value).size !== value.length) errors.push(`${label} must not contain duplicates`);
  if (nonEmpty && value.length === 0) errors.push(`${label} must not be empty`);
}

function validateOptionalHash(value, label, errors) {
  if (value !== null && (typeof value !== 'string' || !HASH_PATTERN.test(value))) {
    errors.push(`${label} must be null or a lowercase SHA-256`);
  }
}

function validateApproval(value, label, errors) {
  if (value === null) return;
  if (!exactKeys(value, ['reviewer', 'reviewedAt', 'evidence'], label, errors)) return;
  if (typeof value.reviewer !== 'string' || value.reviewer.trim() === '') {
    errors.push(`${label}.reviewer must identify a named reviewer or accountable role`);
  }
  if (typeof value.reviewedAt !== 'string' || !ISO_DATE_PATTERN.test(value.reviewedAt)) {
    errors.push(`${label}.reviewedAt must be an ISO date`);
  }
  validateStringArray(value.evidence, `${label}.evidence`, errors, { nonEmpty: true });
}

function validateApprovals(value, label, errors) {
  if (!exactKeys(value, APPROVAL_KEYS, label, errors)) return;
  for (const key of APPROVAL_KEYS) validateApproval(value[key], `${label}.${key}`, errors);
}

function validateOwnerAndReviewBy(record, label, errors) {
  if (record.owner !== null && (typeof record.owner !== 'string' || record.owner.trim() === '')) {
    errors.push(`${label}.owner must be null or a named owner/role`);
  }
  if (record.reviewBy !== null
    && (typeof record.reviewBy !== 'string' || !ISO_DATE_PATTERN.test(record.reviewBy))) {
    errors.push(`${label}.reviewBy must be null or an ISO date`);
  }
}

function validateRouteRecord(record, index, errors) {
  const label = `routes[${index}]`;
  const keys = [
    'route',
    'reviewState',
    'disposition',
    'authorizationReview',
    'privacyReview',
    'effectiveMenuExposureReview',
    'capabilityReview',
    'profileOwnershipReview',
    'owner',
    'reviewBy',
    'approvals',
  ];
  if (!exactKeys(record, keys, label, errors)) return;
  if (typeof record.route !== 'string' || !record.route.startsWith('/')) {
    errors.push(`${label}.route must be an absolute route pattern`);
  }
  if (!REVIEW_STATES.includes(record.reviewState)) {
    errors.push(`${label}.reviewState is invalid`);
  }
  if (!DISPOSITIONS.includes(record.disposition)) {
    errors.push(`${label}.disposition is invalid`);
  }
  for (const key of [
    'authorizationReview',
    'privacyReview',
    'effectiveMenuExposureReview',
    'profileOwnershipReview',
  ]) {
    if (!ROUTE_REVIEW_STATUSES.includes(record[key])) errors.push(`${label}.${key} is invalid`);
  }
  if (!['unverified', 'verified'].includes(record.capabilityReview)) {
    errors.push(`${label}.capabilityReview is invalid`);
  }
  validateOwnerAndReviewBy(record, label, errors);
  validateApprovals(record.approvals, `${label}.approvals`, errors);
}

function validateAliasRecord(record, index, errors) {
  const label = `externalAliases[${index}]`;
  const keys = [
    'source',
    'reviewState',
    'disposition',
    'consumerEvidenceReview',
    'queryMappingReview',
    'privacyReview',
    'authorizationReview',
    'owner',
    'reviewBy',
    'approvals',
  ];
  if (!exactKeys(record, keys, label, errors)) return;
  if (typeof record.source !== 'string' || !record.source.startsWith('/')) {
    errors.push(`${label}.source must be an absolute route`);
  }
  if (!REVIEW_STATES.includes(record.reviewState)) {
    errors.push(`${label}.reviewState is invalid`);
  }
  if (!DISPOSITIONS.includes(record.disposition)) {
    errors.push(`${label}.disposition is invalid`);
  }
  for (const key of ['consumerEvidenceReview', 'queryMappingReview']) {
    if (!['unverified', 'verified'].includes(record[key])) errors.push(`${label}.${key} is invalid`);
  }
  for (const key of ['privacyReview', 'authorizationReview']) {
    if (!ALIAS_REVIEW_STATUSES.includes(record[key])) errors.push(`${label}.${key} is invalid`);
  }
  validateOwnerAndReviewBy(record, label, errors);
  validateApprovals(record.approvals, `${label}.approvals`, errors);
}

function collectExactKeys(records, key, label, errors) {
  if (!Array.isArray(records) || records.length === 0) {
    errors.push(`${label} must be a non-empty array`);
    return [];
  }
  const values = records.map((record) => record?.[key]);
  const duplicates = [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
  if (duplicates.length > 0) errors.push(`${label} contains duplicate ${key}: ${duplicates.join(', ')}`);
  return values;
}

function comparePopulation(actual, expected, label, errors) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((entry) => !actualSet.has(entry));
  const extra = actual.filter((entry) => !expectedSet.has(entry));
  if (missing.length > 0) errors.push(`${label} is missing manifest keys: ${missing.join(', ')}`);
  if (extra.length > 0) errors.push(`${label} contains extra keys: ${extra.join(', ')}`);
}

function validateConsumerBinding(binding, label, errors) {
  if (!exactKeys(binding, ['enabled', 'entrypoints'], label, errors)) return;
  if (typeof binding.enabled !== 'boolean') errors.push(`${label}.enabled must be boolean`);
  validateStringArray(binding.entrypoints, `${label}.entrypoints`, errors);
  if (binding.enabled === false && binding.entrypoints.length !== 0) {
    errors.push(`${label}.entrypoints must be empty while disabled`);
  }
  if (binding.enabled === true && binding.entrypoints.length === 0) {
    errors.push(`${label}.entrypoints must identify an executable consumer while enabled`);
  }
}

function validateProvisionalDirection(value, repoRoot, errors) {
  const label = 'provisionalDirection';
  const keys = [
    'status',
    'optionId',
    'adrId',
    'adrPath',
    'decidedAt',
    'decisionAuthority',
    'scope',
    'unresolved',
    'reviewBy',
    'adrSha256',
  ];
  if (!exactKeys(value, keys, label, errors)) return;
  const expectedScalars = {
    status: 'accepted-provisional-direction',
    optionId: 'hybrid-task-centered-management-center',
    adrId: 'ADR-0004',
    adrPath: PROVISIONAL_DIRECTION_ADR_PATH,
    decidedAt: '2026-08-21',
    decisionAuthority: 'repository-owner',
    reviewBy: '2026-10-31',
  };
  for (const [key, expected] of Object.entries(expectedScalars)) {
    if (value[key] !== expected) errors.push(`${label}.${key} must equal ${expected}`);
  }
  if (!Array.isArray(value.scope)
    || value.scope.join('\n') !== PROVISIONAL_DIRECTION_SCOPE.join('\n')) {
    errors.push(`${label}.scope must preserve the exact bounded provisional scope`);
  }
  if (!Array.isArray(value.unresolved)
    || value.unresolved.join('\n') !== PROVISIONAL_DIRECTION_UNRESOLVED.join('\n')) {
    errors.push(`${label}.unresolved must preserve every final-acceptance blocker`);
  }
  if (typeof value.adrSha256 !== 'string' || !HASH_PATTERN.test(value.adrSha256)) {
    errors.push(`${label}.adrSha256 must be a lowercase SHA-256`);
  }

  const absolute = path.resolve(repoRoot, PROVISIONAL_DIRECTION_ADR_PATH);
  if (!existsSync(absolute)) {
    errors.push(`${label}.adrPath does not exist`);
    return;
  }
  const content = readFileSync(absolute, 'utf8');
  if (value.adrSha256 !== canonicalTextSha256(content)) {
    errors.push(`${label}.adrSha256 drifted from the bounded ADR`);
  }
  if (!/(?:status|상태)[^\n]*accepted[^\n]*provisional/iu.test(content)) {
    errors.push(`${label}.adrPath must record accepted provisional-only status`);
  }
  for (const requiredText of ['ADR-0004', 'state=proposed', 'acceptedDecision=null', 'PD-UX-001', 'G1']) {
    if (!content.includes(requiredText)) {
      errors.push(`${label}.adrPath does not preserve boundary ${requiredText}`);
    }
  }
}

function validateAcceptedDecision(value, manifestSha256, repoRoot, errors) {
  const label = 'acceptedDecision';
  const keys = [
    'adrId',
    'adrPath',
    'approvedAt',
    'productOwner',
    'productIaOwner',
    'securityPrivacyOwner',
    'accessibilityOwner',
    'manifestSha256',
    'proposedOverlaySha256',
  ];
  if (!exactKeys(value, keys, label, errors)) return;
  if (typeof value.adrId !== 'string' || !/^ADR-\d{4}$/.test(value.adrId)) {
    errors.push(`${label}.adrId must be an ADR identifier`);
  }
  if (typeof value.adrPath !== 'string'
    || !value.adrPath.startsWith('docs/02-architecture/decisions/')
    || path.isAbsolute(value.adrPath)
    || value.adrPath.includes('..')) {
    errors.push(`${label}.adrPath must be a safe accepted ADR path`);
  }
  if (typeof value.approvedAt !== 'string' || !ISO_DATE_PATTERN.test(value.approvedAt)) {
    errors.push(`${label}.approvedAt must be an ISO date`);
  }
  for (const ownerKey of [
    'productOwner',
    'productIaOwner',
    'securityPrivacyOwner',
    'accessibilityOwner',
  ]) {
    if (typeof value[ownerKey] !== 'string' || value[ownerKey].trim() === '') {
      errors.push(`${label}.${ownerKey} must identify an accountable owner`);
    }
  }
  if (value.manifestSha256 !== manifestSha256) {
    errors.push(`${label}.manifestSha256 must equal manifestRef.sha256`);
  }
  if (typeof value.proposedOverlaySha256 !== 'string'
    || !HASH_PATTERN.test(value.proposedOverlaySha256)) {
    errors.push(`${label}.proposedOverlaySha256 must be a lowercase SHA-256`);
  }

  if (typeof value.adrPath === 'string' && !value.adrPath.includes('..')) {
    const absolute = path.resolve(repoRoot, value.adrPath);
    if (!existsSync(absolute)) {
      errors.push(`${label}.adrPath does not exist`);
    } else {
      const content = readFileSync(absolute, 'utf8');
      if (!new RegExp(`(?:status|상태)[^\n]*accepted`, 'i').test(content)) {
        errors.push(`${label}.adrPath does not record accepted status`);
      }
      for (const requiredText of [value.adrId, value.manifestSha256, value.proposedOverlaySha256]) {
        if (typeof requiredText === 'string' && !content.includes(requiredText)) {
          errors.push(`${label}.adrPath does not bind ${requiredText}`);
        }
      }
    }
  }
}

function recordAcceptanceBlockers(record, label) {
  const blockers = [];
  if (record.reviewState !== 'approved') blockers.push(`${label}.reviewState is not approved`);
  if (record.disposition === 'blocked-review') blockers.push(`${label}.disposition remains blocked-review`);
  for (const key of [
    'authorizationReview',
    'privacyReview',
    'effectiveMenuExposureReview',
    'capabilityReview',
    'profileOwnershipReview',
  ]) {
    if (record[key] === 'unverified' || record[key] === 'blocked') {
      blockers.push(`${label}.${key} remains ${record[key]}`);
    }
  }
  if (record.owner === null) blockers.push(`${label}.owner is blocked-input`);
  if (record.reviewBy === null) blockers.push(`${label}.reviewBy is blocked-input`);
  for (const key of APPROVAL_KEYS) {
    if (record.approvals?.[key] === null) blockers.push(`${label}.approvals.${key} is blocked-input`);
  }
  return blockers;
}

function aliasAcceptanceBlockers(record, label) {
  const blockers = [];
  if (record.reviewState !== 'approved') blockers.push(`${label}.reviewState is not approved`);
  if (record.disposition === 'blocked-review') blockers.push(`${label}.disposition remains blocked-review`);
  for (const key of [
    'consumerEvidenceReview',
    'queryMappingReview',
    'privacyReview',
    'authorizationReview',
  ]) {
    if (record[key] === 'unverified' || record[key] === 'blocked') {
      blockers.push(`${label}.${key} remains ${record[key]}`);
    }
  }
  if (record.owner === null) blockers.push(`${label}.owner is blocked-input`);
  if (record.reviewBy === null) blockers.push(`${label}.reviewBy is blocked-input`);
  for (const key of APPROVAL_KEYS) {
    if (record.approvals?.[key] === null) blockers.push(`${label}.approvals.${key} is blocked-input`);
  }
  return blockers;
}

export function canonicalTextSha256(content) {
  const text = Buffer.isBuffer(content) ? content.toString('utf8') : String(content);
  return crypto.createHash('sha256').update(text.replace(/\r\n?/g, '\n'), 'utf8').digest('hex');
}

export function createUnreviewedProposal(manifest, manifestRaw) {
  const emptyApprovals = () => Object.fromEntries(APPROVAL_KEYS.map((key) => [key, null]));
  return {
    schemaVersion: 1,
    state: 'proposed',
    authority: 'non-normative-pre-decision-evidence',
    schemaRef: SCHEMA_RELATIVE_PATH,
    manifestRef: {
      path: MANIFEST_RELATIVE_PATH,
      sha256: canonicalTextSha256(manifestRaw),
    },
    provisionalDirection: null,
    acceptedDecision: null,
    acceptanceEvidence: Object.fromEntries(EVIDENCE_KEYS.map((key) => [key, null])),
    consumerBindings: {
      menu: { enabled: false, entrypoints: [] },
      generator: { enabled: false, entrypoints: [] },
    },
    routes: manifest.routes.map(({ route, review }) => ({
      route,
      reviewState: 'blocked-input',
      disposition: 'blocked-review',
      authorizationReview: 'unverified',
      privacyReview: 'unverified',
      effectiveMenuExposureReview: 'unverified',
      capabilityReview: 'unverified',
      profileOwnershipReview: 'unverified',
      owner: review?.owner ?? null,
      reviewBy: review?.reviewBy ?? null,
      approvals: emptyApprovals(),
    })),
    externalAliases: manifest.externalAliases.map(({ source }) => ({
      source,
      reviewState: 'blocked-input',
      disposition: 'blocked-review',
      consumerEvidenceReview: 'unverified',
      queryMappingReview: 'unverified',
      privacyReview: 'unverified',
      authorizationReview: 'unverified',
      owner: 'product/IA + domain owner',
      reviewBy: '2026-10-31',
      approvals: emptyApprovals(),
    })),
  };
}

export function validateSchemaDefinition(schema) {
  const errors = [];
  if (!isObject(schema) || schema.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    errors.push('schema must declare JSON Schema draft 2020-12');
    return errors;
  }
  if (schema.$id !== SCHEMA_RELATIVE_PATH) errors.push('schema $id must equal its repository path');
  if (schema.additionalProperties !== false) errors.push('schema root must reject additional properties');
  const rootRequired = [
    'schemaVersion',
    'state',
    'authority',
    'schemaRef',
    'manifestRef',
    'provisionalDirection',
    'acceptedDecision',
    'acceptanceEvidence',
    'consumerBindings',
    'routes',
    'externalAliases',
  ];
  if (!Array.isArray(schema.required)
    || [...schema.required].sort().join('\n') !== [...rootRequired].sort().join('\n')) {
    errors.push('schema root required fields must exactly match the overlay contract');
  }
  if ([...(schema.properties?.state?.enum ?? [])].sort().join('\n') !== 'accepted\nproposed') {
    errors.push('schema state enum must exactly contain proposed and accepted');
  }
  const manifestRef = schema.properties?.manifestRef;
  if (manifestRef?.additionalProperties !== false
    || !Array.isArray(manifestRef.required)
    || [...manifestRef.required].sort().join('\n') !== 'path\nsha256') {
    errors.push('schema manifestRef must be sparse and require only path plus sha256');
  }
  const provisionalDirection = schema.$defs?.provisionalDirection;
  const provisionalDirectionRequired = [
    'status',
    'optionId',
    'adrId',
    'adrPath',
    'decidedAt',
    'decisionAuthority',
    'scope',
    'unresolved',
    'reviewBy',
    'adrSha256',
  ];
  if (provisionalDirection?.additionalProperties !== false
    || !Array.isArray(provisionalDirection.required)
    || [...provisionalDirection.required].sort().join('\n')
      !== [...provisionalDirectionRequired].sort().join('\n')) {
    errors.push('schema $defs.provisionalDirection must reject extra fields and require the exact bounded decision');
  }
  const schemaScope = provisionalDirection?.properties?.scope?.items?.enum;
  if (!Array.isArray(schemaScope)
    || schemaScope.join('\n') !== PROVISIONAL_DIRECTION_SCOPE.join('\n')) {
    errors.push('schema provisional direction scope must remain exact');
  }
  const schemaUnresolved = provisionalDirection?.properties?.unresolved?.items?.enum;
  if (!Array.isArray(schemaUnresolved)
    || schemaUnresolved.join('\n') !== PROVISIONAL_DIRECTION_UNRESOLVED.join('\n')) {
    errors.push('schema provisional direction unresolved blockers must remain exact');
  }
  for (const key of ['routeRecord', 'externalAliasRecord', 'approval']) {
    if (!isObject(schema.$defs?.[key])) errors.push(`schema must define $defs.${key}`);
  }
  const dispositionEnum = schema.$defs?.disposition?.enum;
  if (!Array.isArray(dispositionEnum)
    || [...dispositionEnum].sort().join('\n') !== [...DISPOSITIONS].sort().join('\n')) {
    errors.push('schema disposition enum must exactly match the IA contract');
  }
  for (const population of ['routes', 'externalAliases']) {
    const definition = schema.properties?.[population];
    if (definition?.type !== 'array' || definition.minItems !== 1 || definition.uniqueItems !== true) {
      errors.push(`schema ${population} must be a non-empty unique array`);
    }
  }
  const recordRequirements = {
    routeRecord: [
      'route',
      'reviewState',
      'disposition',
      'authorizationReview',
      'privacyReview',
      'effectiveMenuExposureReview',
      'capabilityReview',
      'profileOwnershipReview',
      'owner',
      'reviewBy',
      'approvals',
    ],
    externalAliasRecord: [
      'source',
      'reviewState',
      'disposition',
      'consumerEvidenceReview',
      'queryMappingReview',
      'privacyReview',
      'authorizationReview',
      'owner',
      'reviewBy',
      'approvals',
    ],
  };
  for (const [key, required] of Object.entries(recordRequirements)) {
    const definition = schema.$defs?.[key];
    if (definition?.additionalProperties !== false
      || !Array.isArray(definition.required)
      || [...definition.required].sort().join('\n') !== [...required].sort().join('\n')) {
      errors.push(`schema $defs.${key} must reject extra fields and require the exact sparse record`);
    }
  }
  const proposedRule = JSON.stringify(schema.allOf ?? []);
  if (!proposedRule.includes('disabledConsumerBinding') || !proposedRule.includes('acceptedDecision')) {
    errors.push('schema must keep the proposed-state consumer and accepted-decision guard');
  }
  return errors;
}

export function validateOperationalBinding({ packageJson, registry, governanceTestSource }) {
  const errors = [];
  const expectedCommand = 'node --test "scripts/*.test.mjs" ".agent/scripts/*.test.js"';
  if (packageJson?.scripts?.['test:operational-contracts'] !== expectedCommand) {
    errors.push('package operational runner no longer covers scripts/*.test.mjs exactly');
  }
  const operational = registry?.gateSets?.find(({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS');
  if (!operational) {
    errors.push('governance registry is missing GATESET-NODE-OPERATIONAL-CONTRACTS');
  } else {
    const hasCatalog = operational.selector?.catalogs?.some(
      ({ root, suffixes, recursive }) => root === 'scripts'
        && recursive === false
        && Array.isArray(suffixes)
        && suffixes.includes('.test.mjs'),
    );
    if (!hasCatalog) errors.push('governance operational catalog no longer covers scripts/*.test.mjs');
    if (operational.selector?.packageScript?.command !== expectedCommand) {
      errors.push('governance package binding no longer matches the operational runner');
    }
  }
  for (const asset of REQUIRED_FOUNDATION_ASSETS) {
    if (typeof governanceTestSource !== 'string' || !governanceTestSource.includes(`'${asset}'`)) {
      errors.push(`governance UI/UX foundation binding is missing ${asset}`);
    }
  }
  return errors;
}

export function findDispositionSourceReferences(repoRoot = REPO_ROOT) {
  const candidates = [];
  const collect = (relativeRoot, extensions) => {
    const absoluteRoot = path.join(repoRoot, relativeRoot);
    if (!existsSync(absoluteRoot)) return;
    const walk = (current) => {
      for (const entry of readdirSync(current)) {
        const absolute = path.join(current, entry);
        if (statSync(absolute).isDirectory()) walk(absolute);
        else if (extensions.some((extension) => entry.endsWith(extension))) candidates.push(absolute);
      }
    };
    walk(absoluteRoot);
  };
  collect('frontend/src', ['.js', '.jsx', '.ts', '.tsx']);
  collect('scripts', ['.js', '.mjs', '.ts', '.tsx']);
  collect('.agent/scripts', ['.js', '.mjs', '.ts', '.tsx']);
  const nextConfig = path.join(repoRoot, 'frontend', 'next.config.ts');
  if (existsSync(nextConfig)) candidates.push(nextConfig);

  const token = path.basename(PROPOSAL_RELATIVE_PATH);
  return [...new Set(candidates)].flatMap((absolute) => {
    const relative = posix(path.relative(repoRoot, absolute));
    if (ALLOWED_SOURCE_REFERENCES.has(relative)) return [];
    const content = readFileSync(absolute, 'utf8');
    return content.includes(token) ? [relative] : [];
  }).sort();
}

export function validateDispositionContract({
  manifest,
  manifestRaw,
  overlay,
  schema,
  repoRoot = REPO_ROOT,
  sourceReferences = findDispositionSourceReferences(repoRoot),
}) {
  const errors = validateSchemaDefinition(schema);
  const blockers = [];
  const rootKeys = [
    'schemaVersion',
    'state',
    'authority',
    'schemaRef',
    'manifestRef',
    'provisionalDirection',
    'acceptedDecision',
    'acceptanceEvidence',
    'consumerBindings',
    'routes',
    'externalAliases',
  ];
  if (!exactKeys(overlay, rootKeys, 'overlay', errors)) return { errors, blockers };
  if (overlay.schemaVersion !== 1) errors.push('overlay.schemaVersion must equal 1');
  if (!['proposed', 'accepted'].includes(overlay.state)) errors.push('overlay.state must be proposed or accepted');
  if (overlay.authority !== 'non-normative-pre-decision-evidence') {
    errors.push('overlay.authority must remain non-normative-pre-decision-evidence');
  }
  if (overlay.schemaRef !== SCHEMA_RELATIVE_PATH) errors.push('overlay.schemaRef is invalid');

  if (exactKeys(overlay.manifestRef, ['path', 'sha256'], 'manifestRef', errors)) {
    if (overlay.manifestRef.path !== MANIFEST_RELATIVE_PATH) errors.push('manifestRef.path is invalid');
    const actualHash = canonicalTextSha256(manifestRaw);
    if (overlay.manifestRef.sha256 !== actualHash) {
      errors.push(`manifestRef.sha256 drifted from the current manifest: expected ${actualHash}`);
    }
  }
  if (overlay.provisionalDirection === null) {
    blockers.push('provisionalDirection is blocked-input');
  } else {
    validateProvisionalDirection(overlay.provisionalDirection, repoRoot, errors);
  }
  if (!Array.isArray(manifest?.routes) || manifest.routes.length === 0) {
    errors.push('manifest routes population must not be empty');
  }
  if (!Array.isArray(manifest?.externalAliases) || manifest.externalAliases.length === 0) {
    errors.push('manifest externalAliases population must not be empty');
  }

  const manifestRoutes = collectExactKeys(manifest?.routes, 'route', 'manifest.routes', errors);
  const overlayRoutes = collectExactKeys(overlay.routes, 'route', 'overlay.routes', errors);
  comparePopulation(overlayRoutes, manifestRoutes, 'overlay.routes', errors);
  if (Array.isArray(overlay.routes)) overlay.routes.forEach((record, index) => validateRouteRecord(record, index, errors));

  const manifestAliases = collectExactKeys(
    manifest?.externalAliases,
    'source',
    'manifest.externalAliases',
    errors,
  );
  const overlayAliases = collectExactKeys(
    overlay.externalAliases,
    'source',
    'overlay.externalAliases',
    errors,
  );
  comparePopulation(overlayAliases, manifestAliases, 'overlay.externalAliases', errors);
  if (Array.isArray(overlay.externalAliases)) {
    overlay.externalAliases.forEach((record, index) => validateAliasRecord(record, index, errors));
  }

  if (exactKeys(overlay.acceptanceEvidence, EVIDENCE_KEYS, 'acceptanceEvidence', errors)) {
    for (const key of EVIDENCE_KEYS) validateOptionalHash(overlay.acceptanceEvidence[key], `acceptanceEvidence.${key}`, errors);
  }
  if (exactKeys(overlay.consumerBindings, ['menu', 'generator'], 'consumerBindings', errors)) {
    validateConsumerBinding(overlay.consumerBindings.menu, 'consumerBindings.menu', errors);
    validateConsumerBinding(overlay.consumerBindings.generator, 'consumerBindings.generator', errors);
  }

  if (overlay.state === 'proposed') {
    if (overlay.acceptedDecision !== null) {
      errors.push('proposed overlay must not carry acceptedDecision metadata');
    }
    if (overlay.consumerBindings?.menu?.enabled !== false
      || overlay.consumerBindings?.generator?.enabled !== false) {
      errors.push('proposed overlay must not enable menu or generator consumers');
    }
    if (sourceReferences.length > 0) {
      errors.push(`proposed overlay is referenced by executable consumers: ${sourceReferences.join(', ')}`);
    }
  }

  if (overlay.acceptedDecision === null) {
    blockers.push('acceptedDecision is blocked-input');
  } else {
    validateAcceptedDecision(overlay.acceptedDecision, overlay.manifestRef?.sha256, repoRoot, errors);
  }
  for (const key of EVIDENCE_KEYS) {
    if (overlay.acceptanceEvidence?.[key] === null) blockers.push(`acceptanceEvidence.${key} is blocked-input`);
  }
  if (Array.isArray(overlay.routes)) {
    overlay.routes.forEach((record, index) => {
      const recordBlockers = recordAcceptanceBlockers(record, `routes[${index}]`);
      blockers.push(...recordBlockers);
      if (record.reviewState === 'approved' && recordBlockers.length > 0) {
        errors.push(...recordBlockers.map((blocker) => `approved route review is incomplete: ${blocker}`));
      }
    });
  }
  if (Array.isArray(overlay.externalAliases)) {
    overlay.externalAliases.forEach((record, index) => {
      const recordBlockers = aliasAcceptanceBlockers(record, `externalAliases[${index}]`);
      blockers.push(...recordBlockers);
      if (record.reviewState === 'approved' && recordBlockers.length > 0) {
        errors.push(...recordBlockers.map((blocker) => `approved alias review is incomplete: ${blocker}`));
      }
    });
  }

  if (overlay.state === 'accepted') {
    if (blockers.length > 0) errors.push(...blockers.map((blocker) => `accepted transition blocked: ${blocker}`));
    const registeredEntrypoints = [
      ...(overlay.consumerBindings?.menu?.entrypoints ?? []),
      ...(overlay.consumerBindings?.generator?.entrypoints ?? []),
    ];
    for (const source of sourceReferences) {
      if (!registeredEntrypoints.includes(source)) {
        errors.push(`accepted executable consumer is not registered: ${source}`);
      }
    }
  }

  return { errors: [...new Set(errors)], blockers: [...new Set(blockers)] };
}

function loadJson(relativePath) {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, relativePath), 'utf8'));
}

function runCli() {
  const manifestAbsolute = path.join(REPO_ROOT, MANIFEST_RELATIVE_PATH);
  const manifestRaw = readFileSync(manifestAbsolute);
  const manifest = JSON.parse(manifestRaw);
  const proposalAbsolute = path.join(REPO_ROOT, PROPOSAL_RELATIVE_PATH);

  if (process.argv.includes('--init-proposal')) {
    const proposal = createUnreviewedProposal(manifest, manifestRaw);
    writeFileSync(proposalAbsolute, `${JSON.stringify(proposal, null, 2)}\n`, { flag: 'wx' });
    console.log(`Created ${PROPOSAL_RELATIVE_PATH} with ${proposal.routes.length} routes and ${proposal.externalAliases.length} aliases.`);
    return;
  }

  const overlay = loadJson(PROPOSAL_RELATIVE_PATH);
  const schema = loadJson(SCHEMA_RELATIVE_PATH);
  const result = validateDispositionContract({ manifest, manifestRaw, overlay, schema });
  console.log(JSON.stringify({
    state: overlay.state,
    provisionalDirection: overlay.provisionalDirection?.status ?? 'blocked-input',
    manifestSha256: overlay.manifestRef?.sha256,
    routeCount: overlay.routes?.length,
    externalAliasCount: overlay.externalAliases?.length,
    structuralErrors: result.errors,
    acceptance: result.blockers.length === 0 ? 'eligible' : 'blocked-input',
    acceptanceBlockerCount: result.blockers.length,
    acceptanceBlockerSample: result.blockers.slice(0, 8),
  }, null, 2));
  if (result.errors.length > 0) process.exitCode = 1;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) runCli();
