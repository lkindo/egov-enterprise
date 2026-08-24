import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  canonicalTextSha256,
  createUnreviewedProposal,
  findDispositionSourceReferences,
  validateDispositionContract,
  validateOperationalBinding,
  validateSchemaDefinition,
} from './ui-navigation-disposition-contract.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestRaw = readFileSync(path.join(repoRoot, 'config', 'ui-route-capabilities.json'));
const manifest = JSON.parse(manifestRaw);
const overlay = JSON.parse(
  readFileSync(path.join(repoRoot, 'config', 'ui-navigation-disposition-proposal.json'), 'utf8'),
);
const schema = JSON.parse(
  readFileSync(path.join(repoRoot, 'config', 'ui-navigation-disposition.schema.json'), 'utf8'),
);

function clone(value) {
  return structuredClone(value);
}

function validate(candidate, options = {}) {
  return validateDispositionContract({
    manifest: options.manifest ?? manifest,
    manifestRaw: options.manifestRaw ?? manifestRaw,
    overlay: candidate,
    schema: options.schema ?? schema,
    repoRoot,
    sourceReferences: options.sourceReferences ?? [],
  });
}

const PROVISIONAL_HYBRID_SCOPE = [
  'prototype-and-research-default',
  'preserve-canonical-urls',
  'separate-navigation-metadata-from-route-and-authorization',
  'isolate-high-risk-administration-in-management-center',
];
const PROVISIONAL_HYBRID_UNRESOLVED = [
  'exact-labels-groups-order-and-route-dispositions',
  'live-menu-authority-and-effective-role-exposure',
  'route-level-authorization-privacy-and-profile-ownership',
  'url-privacy-allowlists-and-external-telemetry',
  'user-research-thresholds-and-g1-approval',
];

// D5 웨이브 1 (2026-08-23): 저위험 8건만 owner PR 리뷰로 개별 approved 전이
// (ADR-0007 §Decision 4, 승인 채널 DEC-OPS-013). 종전의 "승인 0건" 고정은 이 값으로
// 갱신하고, 잔여 113건에는 기존 population·null 검사를 그대로 유지한다.
const WAVE1_APPROVED_ROUTES = [
  '/admin/sanctn/forms',
  '/admin/sanctn/workflow',
  '/admin/survey/polls/manage',
  '/admin/system/network',
  '/admin/workflow',
  '/approvals/draft',
];
const WAVE1_APPROVED_ALIASES = [
  '/admin/community/boards/insertBoardArticle',
  '/admin/community/boards/selectBoardList',
];
const WAVE1_REVIEWER = 'lkindo (DEC-OPS-013)';
const WAVE1_REVIEWED_AT = '2026-08-23';

function isWave1Approval(approval) {
  return approval !== null
    && approval.reviewer === WAVE1_REVIEWER
    && approval.reviewedAt === WAVE1_REVIEWED_AT
    && Array.isArray(approval.evidence)
    && approval.evidence.length > 0
    && approval.evidence.every((entry) => typeof entry === 'string' && entry.trim() !== '');
}

test('the recommended hybrid is selected only as a bounded provisional direction', () => {
  assert.equal(overlay.state, 'proposed');
  assert.equal(overlay.acceptedDecision, null);
  assert.equal(overlay.provisionalDirection?.status, 'accepted-provisional-direction');
  assert.equal(overlay.provisionalDirection?.optionId, 'hybrid-task-centered-management-center');
  assert.equal(overlay.provisionalDirection?.adrId, 'ADR-0004');
  assert.equal(
    overlay.provisionalDirection?.adrPath,
    'docs/02-architecture/decisions/ADR-0004-provisional-hybrid-information-architecture.md',
  );
  assert.equal(overlay.provisionalDirection?.decidedAt, '2026-08-21');
  assert.equal(overlay.provisionalDirection?.decisionAuthority, 'repository-owner');
  assert.deepEqual(overlay.provisionalDirection?.scope, PROVISIONAL_HYBRID_SCOPE);
  assert.deepEqual(overlay.provisionalDirection?.unresolved, PROVISIONAL_HYBRID_UNRESOLVED);
  assert.equal(overlay.provisionalDirection?.reviewBy, '2026-10-31');
  assert.match(overlay.provisionalDirection?.adrSha256 ?? '', /^[a-f0-9]{64}$/u);
  assert.equal(overlay.consumerBindings.menu.enabled, false);
  assert.equal(overlay.consumerBindings.generator.enabled, false);
  assert.ok(overlay.routes.every(({ reviewState }) => ['proposed', 'approved'].includes(reviewState)));
  assert.deepEqual(
    overlay.routes.filter(({ reviewState }) => reviewState === 'approved').map(({ route }) => route),
    WAVE1_APPROVED_ROUTES,
  );
  assert.deepEqual(
    overlay.externalAliases.filter(({ reviewState }) => reviewState === 'approved').map(({ source }) => source),
    WAVE1_APPROVED_ALIASES,
  );
});

test('the proposed overlay drafts dispositions over the sparse 120 + 2 review population', () => {
  const initial = createUnreviewedProposal(manifest, manifestRaw);
  const manifestLf = manifestRaw.toString('utf8').replace(/\r\n?/gu, '\n');
  assert.equal(initial.provisionalDirection, null);
  assert.equal(overlay.state, 'proposed');
  assert.equal(overlay.authority, 'non-normative-pre-decision-evidence');
  assert.deepEqual(overlay.manifestRef, {
    path: 'config/ui-route-capabilities.json',
    sha256: canonicalTextSha256(manifestRaw),
  });
  assert.equal(
    canonicalTextSha256(manifestRaw),
    canonicalTextSha256(manifestLf.replaceAll('\n', '\r\n')),
    'manifest identity must not drift between Windows CRLF and CI LF checkouts',
  );
  assert.deepEqual(overlay.routes.map(({ route }) => route), initial.routes.map(({ route }) => route));
  assert.deepEqual(
    overlay.externalAliases.map(({ source }) => source),
    initial.externalAliases.map(({ source }) => source),
  );
  assert.equal(overlay.routes.length, 120);
  assert.equal(overlay.externalAliases.length, 2);
  assert.ok(overlay.routes.every((record, index) => {
    const shared = record.disposition !== 'blocked-review'
      && record.owner === manifest.routes[index].review.owner
      && record.reviewBy === manifest.routes[index].review.reviewBy;
    if (WAVE1_APPROVED_ROUTES.includes(record.route)) {
      return shared
        && record.reviewState === 'approved'
        && record.authorizationReview === 'verified'
        && record.privacyReview === 'verified'
        && record.effectiveMenuExposureReview === 'not-applicable'
        && record.capabilityReview === 'verified'
        && record.profileOwnershipReview === 'verified'
        && Object.values(record.approvals).every(isWave1Approval);
    }
    return shared
      && record.reviewState === 'proposed'
      && record.authorizationReview === 'unverified'
      && record.privacyReview === 'unverified'
      && record.effectiveMenuExposureReview === 'unverified'
      && record.capabilityReview === 'unverified'
      && record.profileOwnershipReview === 'unverified'
      && Object.values(record.approvals).every((approval) => approval === null);
  }));
  assert.ok(overlay.externalAliases.every((record) => (
    record.reviewState === 'approved'
      && record.disposition === 'retain-alias-permanent'
      && record.consumerEvidenceReview === 'verified'
      && record.queryMappingReview === 'verified'
      && record.privacyReview === 'verified'
      && record.authorizationReview === 'verified'
      && record.owner === 'product/IA + domain owner'
      && record.reviewBy === '2026-10-31'
      && Object.values(record.approvals).every(isWave1Approval)
  )));
});

test('the current proposed artifact is structurally green but explicitly blocked from acceptance', () => {
  const result = validate(overlay, { sourceReferences: findDispositionSourceReferences(repoRoot) });
  assert.deepEqual(result.errors, []);
  assert.ok(result.blockers.length > 0);
  assert.ok(result.blockers.includes('acceptedDecision is blocked-input'));
  assert.ok(result.blockers.some((blocker) => /authorizationReview remains unverified/.test(blocker)));
  assert.ok(result.blockers.some((blocker) => /privacyReview remains unverified/.test(blocker)));
  // D5 2단계 (ADR-0007 §Decision 3): 연구·live census 계열 4축은 기관 채택 시점의
  // 재검증 의무로 이전 기록됐으므로 더 이상 blocked-input이 아니다.
  assert.ok(!result.blockers.some((blocker) => blocker.startsWith('acceptanceEvidence.')));
  assert.deepEqual(findDispositionSourceReferences(repoRoot), []);
});

test('acceptance evidence deferral must bind the reference-default ADR exactly', () => {
  // 전건 이전 기록: 4축 모두 exact deferral 레코드이고 ADR-0007 본문 hash에 결속된다.
  for (const key of [
    'researchArtifactSha256',
    'liveMenuArtifactSha256',
    'authorityAssignmentArtifactSha256',
    'effectiveMenuArtifactSha256',
  ]) {
    const record = overlay.acceptanceEvidence[key];
    assert.equal(record.status, 'deferred-to-institution-adoption');
    assert.equal(record.adrId, 'ADR-0007');
    assert.equal(
      record.adrPath,
      'docs/02-architecture/decisions/ADR-0007-reference-default-ia-approval.md',
    );
    assert.equal(record.acceptedRisk, 'approved-without-user-research');
    assert.equal(
      record.adrSha256,
      canonicalTextSha256(readFileSync(path.join(repoRoot, record.adrPath), 'utf8')),
    );
  }

  const driftedAdr = clone(overlay);
  driftedAdr.acceptanceEvidence.researchArtifactSha256.adrSha256 = '0'.repeat(64);
  assert.match(
    validate(driftedAdr).errors.join('\n'),
    /acceptanceEvidence\.researchArtifactSha256\.adrSha256 drifted from the reference-default ADR/i,
  );

  const fabricatedStatus = clone(overlay);
  fabricatedStatus.acceptanceEvidence.liveMenuArtifactSha256.status = 'measured';
  assert.match(
    validate(fabricatedStatus).errors.join('\n'),
    /acceptanceEvidence\.liveMenuArtifactSha256\.status must equal deferred-to-institution-adoption/i,
  );

  const extraField = clone(overlay);
  extraField.acceptanceEvidence.effectiveMenuArtifactSha256.measuredAt = '2026-08-24';
  assert.match(
    validate(extraField).errors.join('\n'),
    /acceptanceEvidence\.effectiveMenuArtifactSha256 keys must exactly equal/i,
  );

  const wrongAdr = clone(overlay);
  wrongAdr.acceptanceEvidence.authorityAssignmentArtifactSha256.adrId = 'ADR-0004';
  assert.match(
    validate(wrongAdr).errors.join('\n'),
    /acceptanceEvidence\.authorityAssignmentArtifactSha256\.adrId must equal ADR-0007/i,
  );

  // null은 여전히 blocked-input이다 — 이전 기록이 지워지면 다시 acceptance blocker가 된다.
  const erasedDeferral = clone(overlay);
  erasedDeferral.acceptanceEvidence.researchArtifactSha256 = null;
  const erasedResult = validate(erasedDeferral);
  assert.deepEqual(erasedResult.errors, []);
  assert.ok(erasedResult.blockers.includes('acceptanceEvidence.researchArtifactSha256 is blocked-input'));
});

test('route and external alias populations fail closed on missing, duplicate, and extra keys', () => {
  const missingRoute = clone(overlay);
  const [removedRoute] = missingRoute.routes.splice(7, 1);
  assert.match(validate(missingRoute).errors.join('\n'), new RegExp(`missing manifest keys: ${removedRoute.route}`));

  const duplicateRoute = clone(overlay);
  duplicateRoute.routes.push(clone(duplicateRoute.routes[0]));
  assert.match(validate(duplicateRoute).errors.join('\n'), /duplicate route:/i);

  const extraRoute = clone(overlay);
  extraRoute.routes.push({ ...clone(extraRoute.routes[0]), route: '/__unreviewed-extra' });
  assert.match(validate(extraRoute).errors.join('\n'), /contains extra keys: \/__unreviewed-extra/i);

  const missingAlias = clone(overlay);
  const [removedAlias] = missingAlias.externalAliases.splice(0, 1);
  assert.match(
    validate(missingAlias).errors.join('\n'),
    new RegExp(`missing manifest keys: ${removedAlias.source.replaceAll('/', '\\/')}`),
  );

  const duplicateAlias = clone(overlay);
  duplicateAlias.externalAliases.push(clone(duplicateAlias.externalAliases[0]));
  assert.match(validate(duplicateAlias).errors.join('\n'), /duplicate source:/i);

  const extraAlias = clone(overlay);
  extraAlias.externalAliases.push({
    ...clone(extraAlias.externalAliases[0]),
    source: '/__unreviewed-external-alias',
  });
  assert.match(
    validate(extraAlias).errors.join('\n'),
    /contains extra keys: \/__unreviewed-external-alias/i,
  );
});

test('invalid disposition and manifest/schema drift are semantic red fixtures', () => {
  const invalidDisposition = clone(overlay);
  invalidDisposition.routes[0].disposition = 'keep-because-it-looks-useful';
  assert.match(validate(invalidDisposition).errors.join('\n'), /routes\[0\]\.disposition is invalid/i);

  const staleHash = clone(overlay);
  staleHash.manifestRef.sha256 = '0'.repeat(64);
  assert.match(validate(staleHash).errors.join('\n'), /manifestRef\.sha256 drifted/i);

  const weakenedSchema = clone(schema);
  weakenedSchema.$defs.disposition.enum = ['blocked-review'];
  assert.match(validateSchemaDefinition(weakenedSchema).join('\n'), /disposition enum must exactly match/i);

  const missingDirectionSchema = clone(schema);
  delete missingDirectionSchema.$defs.provisionalDirection;
  assert.match(
    validateSchemaDefinition(missingDirectionSchema).join('\n'),
    /provisionalDirection must reject extra fields and require the exact bounded decision/i,
  );

  const weakenedDeferralSchema = clone(schema);
  delete weakenedDeferralSchema.$defs.adoptionDeferredEvidence.properties.acceptedRisk.const;
  assert.match(
    validateSchemaDefinition(weakenedDeferralSchema).join('\n'),
    /adoptionDeferredEvidence must reject extra fields and pin the exact ADR-0007 deferral record/i,
  );

  const detachedEvidenceSchema = clone(schema);
  detachedEvidenceSchema.properties.acceptanceEvidence.properties.researchArtifactSha256 = {
    $ref: '#/$defs/nullableSha256',
  };
  assert.match(
    validateSchemaDefinition(detachedEvidenceSchema).join('\n'),
    /acceptanceEvidence\.researchArtifactSha256 must admit the ADR-0007 deferral record/i,
  );

  const droppedConsumerGuardSchema = clone(schema);
  droppedConsumerGuardSchema.allOf = [];
  assert.match(
    validateSchemaDefinition(droppedConsumerGuardSchema).join('\n'),
    /proposed-state consumer and accepted-decision guard/i,
  );
});

test('the provisional direction cannot erase evidence blockers or drift from its accepted ADR', () => {
  const wrongOption = clone(overlay);
  wrongOption.provisionalDirection.optionId = 'role-portals';
  assert.match(
    validate(wrongOption).errors.join('\n'),
    /provisionalDirection\.optionId must equal hybrid-task-centered-management-center/i,
  );

  const missingUnresolvedBoundary = clone(overlay);
  missingUnresolvedBoundary.provisionalDirection.unresolved.pop();
  assert.match(
    validate(missingUnresolvedBoundary).errors.join('\n'),
    /provisionalDirection\.unresolved must preserve every final-acceptance blocker/i,
  );

  const staleAdr = clone(overlay);
  staleAdr.provisionalDirection.adrSha256 = '0'.repeat(64);
  assert.match(
    validate(staleAdr).errors.join('\n'),
    /provisionalDirection\.adrSha256 drifted from the bounded ADR/i,
  );

  const fabricatedFinalAcceptance = clone(overlay);
  fabricatedFinalAcceptance.provisionalDirection.status = 'accepted-final-ia';
  const result = validate(fabricatedFinalAcceptance);
  assert.match(
    result.errors.join('\n'),
    /provisionalDirection\.status must equal accepted-provisional-direction/i,
  );
  assert.ok(result.blockers.includes('acceptedDecision is blocked-input'));
});

test('unverified authorization/privacy and missing approvals cannot impersonate accepted state', () => {
  const falseRouteApproval = clone(overlay);
  falseRouteApproval.routes[0].reviewState = 'approved';
  assert.match(
    validate(falseRouteApproval).errors.join('\n'),
    /approved route review is incomplete: routes\[0\]\.authorizationReview remains unverified/i,
  );

  const falseAccepted = clone(overlay);
  falseAccepted.state = 'accepted';
  const errors = validate(falseAccepted).errors.join('\n');
  assert.match(errors, /accepted transition blocked: acceptedDecision is blocked-input/i);
  assert.match(errors, /accepted transition blocked: routes\[0\]\.authorizationReview remains unverified/i);
  assert.match(errors, /accepted transition blocked: routes\[0\]\.privacyReview remains unverified/i);
  assert.match(errors, /accepted transition blocked: routes\[0\]\.approvals\.domain is blocked-input/i);
});

test('proposed consumers unlock only through the ADR-0007 gates and stay fail-closed otherwise', () => {
  const prematureDecision = clone(overlay);
  prematureDecision.acceptedDecision = {};
  assert.match(
    validate(prematureDecision).errors.join('\n'),
    /proposed overlay must not carry acceptedDecision metadata/i,
  );

  const consumerEntrypoint = 'frontend/src/app/components/layout/sidebar.tsx';

  // 해제 경로(green): 참조-기본 결정 4축 기록 + 개별 approved record ≥ 1 + 등록된 entrypoint.
  const gatedMenu = clone(overlay);
  gatedMenu.consumerBindings.menu = { enabled: true, entrypoints: [consumerEntrypoint] };
  assert.deepEqual(
    validate(gatedMenu, { sourceReferences: [consumerEntrypoint] }).errors,
    [],
  );

  // red: 개별 approved record가 하나도 없으면 소비를 열 수 없다(일괄 승인 창작 금지).
  const noApprovedRecords = clone(gatedMenu);
  for (const record of noApprovedRecords.routes) {
    if (record.reviewState === 'approved') record.reviewState = 'proposed';
  }
  for (const record of noApprovedRecords.externalAliases) {
    if (record.reviewState === 'approved') record.reviewState = 'proposed';
  }
  assert.match(
    validate(noApprovedRecords).errors.join('\n'),
    /proposed consumers require at least one individually approved record/i,
  );

  // red: acceptanceEvidence 축이 하나라도 미기록(null)이면 소비를 열 수 없다.
  const missingEvidence = clone(gatedMenu);
  missingEvidence.acceptanceEvidence.researchArtifactSha256 = null;
  assert.match(
    validate(missingEvidence).errors.join('\n'),
    /proposed consumers require every acceptanceEvidence axis/i,
  );

  // red: entrypoint에 등록되지 않은 실행 소비자는 binding disabled 여부와 무관하게 차단된다.
  assert.match(
    validate(overlay, { sourceReferences: [consumerEntrypoint] }).errors.join('\n'),
    /proposed executable consumer is not registered/i,
  );

  // red: enabled인데 entrypoints가 비면 실행 소비자를 특정하지 못한다.
  const anonymousConsumer = clone(overlay);
  anonymousConsumer.consumerBindings.menu = { enabled: true, entrypoints: [] };
  assert.match(
    validate(anonymousConsumer).errors.join('\n'),
    /entrypoints must identify an executable consumer while enabled/i,
  );
});

test('package and governance bindings fail red when the operational catalog is narrowed', () => {
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const registry = JSON.parse(readFileSync(path.join(repoRoot, 'config', 'governance', 'gates.json'), 'utf8'));
  const governanceTestSource = readFileSync(
    path.join(repoRoot, 'scripts', 'governance-gates-contract.test.mjs'),
    'utf8',
  );
  assert.deepEqual(validateOperationalBinding({ packageJson, registry, governanceTestSource }), []);

  const narrowedPackage = clone(packageJson);
  narrowedPackage.scripts['test:operational-contracts'] = 'node --test scripts/required-checks-contract.test.mjs';
  assert.match(
    validateOperationalBinding({
      packageJson: narrowedPackage,
      registry,
      governanceTestSource,
    }).join('\n'),
    /package operational runner no longer covers/i,
  );

  const narrowedRegistry = clone(registry);
  const operational = narrowedRegistry.gateSets.find(
    ({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS',
  );
  operational.selector.catalogs = operational.selector.catalogs.filter(({ root }) => root !== 'scripts');
  assert.match(
    validateOperationalBinding({
      packageJson,
      registry: narrowedRegistry,
      governanceTestSource,
    }).join('\n'),
    /governance operational catalog no longer covers/i,
  );

  for (const asset of [
    'config/ui-navigation-disposition-proposal.json',
    'docs/02-architecture/decisions/ADR-0004-provisional-hybrid-information-architecture.md',
  ]) {
    const bindingLine = `  '${asset}',`;
    assert.equal(
      governanceTestSource.split(/\r?\n/u).filter((line) => line === bindingLine).length,
      1,
      `negative fixture requires exactly one governance binding for ${asset}`,
    );
    const missingFoundationBinding = governanceTestSource.replace(bindingLine, '');
    assert.notEqual(missingFoundationBinding, governanceTestSource);
    assert.match(
      validateOperationalBinding({
        packageJson,
        registry,
        governanceTestSource: missingFoundationBinding,
      }).join('\n'),
      new RegExp(`governance UI/UX foundation binding is missing ${asset.replaceAll('/', '\\/').replaceAll('.', '\\.')}`, 'i'),
    );
  }
});
