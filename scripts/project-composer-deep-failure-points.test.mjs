// 정밀 점검 계약(project-composer-deep.test.mjs)에서 가장 오래 걸리는 시험 가운데 하나(약 8분)를 따로 둔다 — node 는 한
// 파일의 시험을 차례로 돌리고 파일끼리는 함께 돌리므로, 나눈 만큼 운영 계약 전체 실행이 짧아진다. 준비물은 함께 쓴다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { compositionDigest } from './project-composer-catalog.mjs';
import { DEEP_BLOCKER_LABELS, compositionDeepPlan, deepSummary } from './project-composer-deep.mjs';
import { supportFileOwners } from './project-composer-source.mjs';
import { readRouteRows } from './reusable-page-survival.mjs';
import { normalize } from './reusable-source-tree.mjs';
import { root, catalog, modules, ownership, withExpectations, files, compose, codes } from './project-composer-deep.test-helpers.mjs';

/*
 * 생성기가 실패할 자리마다 정밀 점검도 차단 사유를 낸다. 실제 저장소를 그대로 쓰고 입력(선언·파일 목록)만 바꿔 각 사유를 만든다.
 */
test('every generator failure point becomes a labelled blocker before Docker starts', () => {
  const core = compose({ preset: 'core' });
  const coreGates = modules.extras.presetExpectations.core.gates;
  assert.ok(coreGates.length > 1, 'the core preset acknowledges removed gates');

  // 승인 목록에서 실제로 지워지는 게이트 하나를 빼면 승인되지 않은 제거다. 승인은 시작 구성 선언(presets.json)에서 온다.
  const unacknowledged = withExpectations('core', expected => { expected.gates = coreGates.slice(1); });
  let deep = compositionDeepPlan({ root, catalog, modules: unacknowledged, composition: core, files });
  assert.deepEqual(codes(deep), ['GATE_UNACKNOWLEDGED']);
  assert.deepEqual(deep.blockers[0].files, [coreGates[0].file]);
  assert.equal(deep.blockers[0].label, DEEP_BLOCKER_LABELS.GATE_UNACKNOWLEDGED);

  // 지워지지 않는 게이트를 승인 목록에 두면 낡은 승인이다.
  const stale = withExpectations('core', expected => { expected.gates.push({ file: 'api-server/src/test/java/nuri/api/NotRemovedTest.java', reason: '시험용' }); });
  deep = compositionDeepPlan({ root, catalog, modules: stale, composition: core, files });
  assert.deepEqual(codes(deep), ['GATE_STALE']);
  assert.deepEqual(deep.blockers[0].files, ['api-server/src/test/java/nuri/api/NotRemovedTest.java']);

  // 시작 구성이 연쇄로 지우는 Java 도 생성기처럼 커밋된 기대치와 대조한다(설계서 C4).
  const coreCascade = modules.extras.presetExpectations.core.javaCascade;
  assert.ok(coreCascade.length > 1, 'the core preset acknowledges cascaded Java');
  const cascadeUnacknowledged = withExpectations('core', expected => { expected.javaCascade = coreCascade.slice(1); });
  deep = compositionDeepPlan({ root, catalog, modules: cascadeUnacknowledged, composition: core, files });
  assert.deepEqual(codes(deep), ['JAVA_CASCADE_UNACKNOWLEDGED']);
  assert.deepEqual(deep.blockers[0].files, [coreCascade[0]]);
  assert.equal(deep.blockers[0].label, DEEP_BLOCKER_LABELS.JAVA_CASCADE_UNACKNOWLEDGED);
  const cascadeStale = withExpectations('core', expected => { expected.javaCascade.push('api-server/src/main/java/nuri/api/NotCascaded.java'); });
  deep = compositionDeepPlan({ root, catalog, modules: cascadeStale, composition: core, files });
  assert.deepEqual(codes(deep), ['JAVA_CASCADE_STALE']);
  assert.deepEqual(deep.blockers[0].files, ['api-server/src/main/java/nuri/api/NotCascaded.java']);
  const cascadeDeclaration = withExpectations('core', expected => { expected.javaCascade = coreCascade[0]; });
  deep = compositionDeepPlan({ root, catalog, modules: cascadeDeclaration, composition: core, files });
  assert.deepEqual(codes(deep), ['JAVA_CASCADE_DECLARATION', 'JAVA_CASCADE_UNACKNOWLEDGED']);

  // 승인 항목의 형식(사유 없음, 모르는 규칙)은 생성기가 대조 전에 거부한다.
  const declaration = withExpectations('core', expected => {
    expected.gates[0] = { file: coreGates[0].file };
    expected.gateRemovalRules.push({ rule: 'no-such-rule', reason: '시험용' });
  });
  deep = compositionDeepPlan({ root, catalog, modules: declaration, composition: core, files });
  assert.deepEqual(codes(deep), ['GATE_DECLARATION', 'GATE_UNACKNOWLEDGED']);
  assert.match(deep.blockers[0].message, /no-such-rule/);

  // 규칙 제거도 승인과 대조한다: 승인하지 않은 규칙, 더 이상 적용되지 않는 규칙.
  const rules = withExpectations('core', expected => { expected.gateRemovalRules = []; });
  deep = compositionDeepPlan({ root, catalog, modules: rules, composition: core, files });
  assert.deepEqual(codes(deep), ['RULE_UNACKNOWLEDGED']);
  assert.deepEqual(deep.blockers[0].files, ['historical-migration-tests', 'upstream-atlas']);
  const historical = deep.ruleRemovals['historical-migration-tests'];
  assert.ok(historical.length > 0, 'the rule selects historical tests');
  const withoutHistorical = files.filter(file => !historical.includes(normalize(file)));
  deep = compositionDeepPlan({ root, catalog, composition: core, files: withoutHistorical });
  assert.deepEqual(codes(deep), ['RULE_STALE']);
  assert.deepEqual(deep.blockers[0].files, ['historical-migration-tests']);

  // 원본 Atlas 자산이 생성물에 없으면 생성기는 규칙 제거에서 실패한다.
  deep = compositionDeepPlan({ root, catalog, composition: core, files: files.filter(file => normalize(file) !== 'scripts/build-atlas.mjs') });
  assert.deepEqual(codes(deep), ['RULE_REMOVAL']);
  assert.match(deep.blockers[0].message, /Upstream Atlas asset is missing; review the Atlas removal rule: scripts\/build-atlas\.mjs/);

  // 화면 제외 경로가 루트 레이아웃을 지우면 생성기는 투영 뒤 진입점 검사에서 실패한다(라우트가 아닌 진입점). 생성기·정밀 점검은
  // 제외 경로를 구성(해석기)에서 받는다 — 구성을 고쳐 그 경로를 만든다.
  const entry = { ...core, frontend: { ...core.frontend, removePaths: [...core.frontend.removePaths, 'src/app/layout.tsx'] } };
  deep = compositionDeepPlan({ root, catalog, composition: entry, files });
  assert.deepEqual(codes(deep), ['FRONTEND_ENTRY']);
  assert.deepEqual(deep.blockers[0].files, ['frontend/src/app/layout.tsx']);

  // 화면 생존 대조(slot 단계 PR-1): 구성이 남겨야 할 화면이 지워지면 SOURCE_SURVIVAL, 구성에 없는 화면이 남으면 FRONTEND_SCREEN_EXTRA 다.
  // 두 차단의 판정 경로는 아래 합성 저장소 시험이 생성기와 함께 본다. 여기서는 실제 카탈로그로만 보이는 경우를 본다.
  // 기대값은 제외 경로로 거르지 않고 기능 소유에서 계산한다. 그래서 제외 경로가 선택한 기능의 화면을 품으면(댓글 관리) 그 화면이 빠진다.
  const collaboration = compose({ preset: 'collaboration' });
  assert.ok(collaboration.frontend.retainedRoutes.includes('/admin/system/comments'), 'the resolver keeps the screen of a selected feature');
  const misplacedComposition = { ...collaboration, frontend: { ...collaboration.frontend,
    removePaths: [...collaboration.frontend.removePaths, 'src/app/admin/system/comments'] } };
  deep = compositionDeepPlan({ root, catalog, composition: misplacedComposition, files });
  assert.deepEqual(codes(deep), ['SOURCE_SURVIVAL']);
  assert.deepEqual(deep.blockers[0].files, ['frontend/src/app/admin/system/comments/page.tsx']);

  // 선택한 기능의 소스가 생성물에 없으면(복사되지 않거나 연쇄로 지워지면) 생존 검사에서 실패한다.
  const mail = compose({ domains: ['mail'] });
  const mailService = 'business-app/src/main/java/nuri/business/service/mail/MailService.java';
  assert.ok(files.map(normalize).includes(mailService), 'the mail service is part of the source tree');
  deep = compositionDeepPlan({ root, catalog, composition: mail, files: files.filter(file => normalize(file) !== mailService) });
  assert.deepEqual(codes(deep), ['SOURCE_SURVIVAL']);
  assert.deepEqual(deep.blockers[0].files, [mailService]);
  // 시작 구성도 같은 생존 검사를 받는다(11단계 C3). 종전에는 직접 선택만 봐서, 시작 구성의 선택 기능 소스가 빠지면 화면 대조 말고는 말하지 않았다.
  deep = compositionDeepPlan({ root, catalog, composition: compose({ preset: 'collaboration' }), files: files.filter(file => normalize(file) !== mailService) });
  assert.deepEqual(codes(deep), ['SOURCE_SURVIVAL'], 'a preset checks the survival of its selected sources');
  assert.deepEqual(deep.blockers[0].files, [mailService]);

  // 선언된 지원 파일이 디스크에는 있어도 복사되지 않으면 생성기는 Java 투영에서 실패한다(무시된 파일).
  const supportFile = [...ownership.supportFiles.values()].flat()[0];
  assert.ok(supportFile, 'the feature files declare domain support files');
  deep = compositionDeepPlan({ root, catalog, composition: core, files: files.filter(file => normalize(file) !== supportFile) });
  assert.deepEqual(codes(deep), ['JAVA_PROJECTION']);
  assert.equal(deep.blockers[0].message, `Missing domain support file: ${supportFile}`);

  // 요구가 빠지면 선택한 기능의 API·화면이 연쇄로 지워진다. 생존 검사가 지워질 파일을 밝힌다(커뮤니티 → 게시판, DEC-OPS-280).
  const broken = structuredClone(catalog);
  const community = broken.capabilities.find(row => row.id === 'community');
  assert.ok(community.requires.some(edge => edge.domain === 'board'), 'community -> board must exist');
  community.requires = community.requires.filter(edge => edge.domain !== 'board');
  const { catalogHash: ignored, ...body } = broken;
  broken.catalogHash = compositionDigest(body);
  deep = compositionDeepPlan({ root, catalog, composition: compose({ domains: ['community'] }, broken), files });
  const lost = deep.blockers.find(blocker => blocker.code === 'SOURCE_SURVIVAL');
  assert.ok(lost?.files.length > 0, JSON.stringify(codes(deep)));
  // 잃은 소스는 계획이 지우는 파일이거나, 목적지(지식 허브)가 지워져 거버넌스 수렴으로 함께 빠지는 리다이렉트 화면이다.
  const redirects = new Set([...readRouteRows(root).values()].filter(row => row.kind !== 'page').map(row => row.source));
  assert.ok(lost.files.every(file => deep.frontend.files.includes(file) || deep.java.files.includes(file) || redirects.has(file)),
    'every lost source is one the plan removes or a redirect page whose destination it removes');
  // 커뮤니티 사용자 API 는 게시판 타입을 참조해 연쇄로 지워진다 — 디렉터리 소유 기능이 선택된 컨트롤러는 남아야 한다.
  assert.ok(lost.files.includes('api-server/src/main/java/nuri/api/controller/business/community/CommunityUserApiController.java'), 'the community user API is lost through its board reference');
  assert.ok(lost.files.some(file => file.startsWith('frontend/')) && lost.files.some(file => file.endsWith('.java')), 'both frontend and Java sources are lost');

  // 프런트 투영이 실패하면(대소문자만 다른 제외 경로) 생성기는 프런트 단계에서 실패한다. 게이트·생존 판정은 하지 않는다.
  const caseOnly = { ...core, frontend: { ...core.frontend, removePaths: [...core.frontend.removePaths, 'src/app/Login'] } };
  deep = compositionDeepPlan({ root, catalog, composition: caseOnly, files });
  assert.deepEqual(codes(deep), ['FRONTEND_PROJECTION']);
  assert.match(deep.blockers[0].message, /frontend removePath 의 대소문자가 실제 경로와 다르다: src\/app\/Login/);
  assert.equal(deep.frontend, null);

  // 지원 파일 선언이 잘못되면 생성기는 Java 투영에서 실패한다(선언 검사는 기능 소유를 풀 때 한다). 셀 수 없는 개수는 말하지 않는다.
  const support = { ...modules, declarations: { ...modules.declarations, supportFiles: () => supportFileOwners(root,
    [{ owner: 'core', owned: [], domain: 'nothing', files: ['business-core/src/main/java/nuri/X.java'] }], ownership.domains) } };
  deep = compositionDeepPlan({ root, catalog, modules: support, composition: core, files });
  assert.deepEqual(codes(deep), ['JAVA_PROJECTION']);
  assert.equal(deep.java, null);
  assert.equal(deepSummary(deep), '투영이 실패해 지워질 파일과 검증 게이트를 셀 수 없습니다');
});
