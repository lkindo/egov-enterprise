/**
 * 교차 도메인 결합 census 원장(config/governance/cross-domain-coupling-census.json)의 pack 태그 계약.
 *
 * CrossDomainCouplingLinterTest 는 edge 를 정확한 집합으로 대조하되, 투영된 트리에 남은 pack 의 edge 만 기대한다.
 * edge 는 소유 서비스 파일과 참조 타입 소스가 **모두** 살아남아야 투영본에서 스캔되므로, 태그는 그 소스들이 모두
 * 살아남는 가장 작은 rank 누적 프로필이어야 한다. 문자열 속 FQN 도 스캐너는 edge 로 세지만 생성기는 의존으로 보지 않으므로,
 * 소유 파일만으로 태그를 정하면 대상 타입이 빠진 프로필에서 edge 가 조용히 사라진다 — 그래서 참조 타입 소스까지 판정에 넣는다.
 */
import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';

import {
  evaluateEntryTags,
  evaluateProjectionPresence,
  evaluateVocabulary,
  readRepoJson,
  repositoryContext,
  resolveTypeSources,
} from './pack-tagged-registry.mjs';

const REGISTRY_PATH = 'config/governance/cross-domain-coupling-census.json';
const APP_SERVICE_BASE = 'business-app/src/main/java/nuri/business/service';

export function edgeLabel(edge) {
  return `${edge.file}: ${edge.owner} -> ${edge.target} [${edge.module}]`;
}

/** edge 를 공용 판정 입력으로 바꾼다 — 소스는 소유 파일 + 참조 타입의 main 소스. */
export function toTagEntries({ root, javaFiles, registry }) {
  const entries = [];
  const violations = [];
  for (const edge of registry.edges) {
    const label = edgeLabel(edge);
    const owner = join(root, APP_SERVICE_BASE, edge.file);
    const resolved = resolveTypeSources(root, javaFiles, label, edge.types);
    const ownerPresent = javaFiles.includes(owner);
    if (!ownerPresent) violations.push(`${label}: 소유 파일이 모집단에 없다`);
    violations.push(...resolved.violations);
    entries.push({ label, pack: edge.pack, sources: [owner, ...resolved.sources], complete: ownerPresent && resolved.violations.length === 0 });
  }
  return { entries, violations };
}

test('원장의 pack 어휘는 pack manifest 와 같다(투영본에서는 남은 pack 을 포함한다)', () => {
  const { root, manifest, projection } = repositoryContext();
  const registry = readRepoJson(root, REGISTRY_PATH);
  assert.deepEqual(evaluateVocabulary({
    registryPacks: registry.packs,
    manifest,
    projection,
    entryPacks: registry.edges.map((edge) => edge.pack),
  }), []);
});

test('원장 edge pack 태그가 생성기의 실제 제거 계획과 일치한다', () => {
  const { root, javaFiles, projection, prefixPlans, presentPacks } = repositoryContext();
  const registry = readRepoJson(root, REGISTRY_PATH);
  const { entries, violations } = toTagEntries({ root, javaFiles, registry });
  if (projection) {
    // 빠진 pack edge 는 소스 해석이 실패하는 것이 정상이다 — 남은 pack edge 의 해석 실패와 존재 대조만 본다.
    const presentFailures = entries.filter((entry) => presentPacks.has(entry.pack) && !entry.complete)
      .map((entry) => `${entry.label}: 남은 pack 인데 소스를 해석하지 못했다`);
    const presence = evaluateProjectionPresence({ entries: entries.filter((entry) => entry.complete || presentPacks.has(entry.pack)), presentPacks });
    assert.deepEqual([...presentFailures, ...presence], []);
    return;
  }
  assert.deepEqual([...violations, ...evaluateEntryTags({ entries, prefixPlans })], []);
});

test('app→app·app→core edge 수는 공용 메모리 GAP-ARCH-001 이 인용할 수 있게 원장에서 파생된다', () => {
  const { root } = repositoryContext();
  const registry = readRepoJson(root, REGISTRY_PATH);
  const count = (module) => registry.edges.filter((edge) => edge.module === module).length;
  assert.equal(count('business-app') + count('business-core'), registry.edges.length, '모듈 어휘 밖 edge 가 있다');
  assert.ok(count('business-app') > 0 && count('business-core') > 0);
});

test('부정 증명: 틀린 edge pack 태그는 생성기 계획과의 대조에서 red 다', (t) => {
  const { root, javaFiles, projection, prefixPlans } = repositoryContext();
  if (projection) {
    t.diagnostic('투영본에는 제거 계획이 없어 합성 태그 대조를 저장소에서만 수행한다');
    return;
  }
  const registry = readRepoJson(root, REGISTRY_PATH);
  const tagViolations = (candidate) => {
    const { entries, violations } = toTagEntries({ root, javaFiles, registry: candidate });
    return [...violations, ...evaluateEntryTags({ entries, prefixPlans })];
  };
  const retag = (predicate, pack) => ({
    ...registry,
    edges: registry.edges.map((edge) => (predicate(edge) ? { ...edge, pack } : edge)),
  });
  const cases = [
    {
      name: 'collaboration 소유 대시보드→알림 edge 를 core 로 적는다',
      registry: retag((edge) => edge.file === 'dashboard/RealTimeDashboardService.java', 'core'),
      expect: /dashboard\/RealTimeDashboardService\.java: dashboard -> notification \[business-app\] \(pack=core\) 는 프로필 \[core\] 에서 제거된다/,
    },
    {
      name: 'demo 소유 결재 알림→메일 edge 를 collaboration 으로 적는다',
      registry: retag((edge) => edge.file === 'informalsanction/event/SanctionEventListener.java' && edge.target === 'mail', 'collaboration'),
      expect: /SanctionEventListener\.java: informalsanction -> mail \[business-app\] \(pack=collaboration\) 는 프로필 \[core,collaboration\] 에서 제거된다/,
    },
    {
      name: 'collaboration 소유 게시판→사용자 edge 를 demo 로 적는다',
      registry: retag((edge) => edge.file === 'board/BoardService.java' && edge.target === 'user', 'demo'),
      expect: /board\/BoardService\.java: board -> user \[business-core\] \(pack=demo\) 는 프로필 \[core,collaboration\] 에서 남는다/,
    },
  ];
  for (const redCase of cases) {
    const violations = tagViolations(redCase.registry);
    assert.ok(violations.some((line) => redCase.expect.test(line)), `${redCase.name}: ${JSON.stringify(violations)}`);
  }

  // 대상 타입이 소유 파일보다 먼저 빠지는 edge — 소유 파일만 보면 collaboration 으로 통과하지만 참조 타입까지 보면 red 다.
  const stringOnly = {
    ...registry,
    edges: [...registry.edges, {
      file: 'board/BoardService.java', owner: 'board', target: 'survey', module: 'business-app',
      types: ['nuri.business.service.survey.dto.SurveyInfoDto'], pack: 'collaboration',
    }],
  };
  assert.ok(tagViolations(stringOnly).some((line) => /board -> survey \[business-app\] \(pack=collaboration\) 는 프로필 \[core,collaboration\] 에서 제거된다/.test(line)));

  const ghost = {
    ...registry,
    edges: [...registry.edges, { file: 'board/NoSuchService.java', owner: 'board', target: 'user', module: 'business-core', types: ['nuri.business.service.user.NoSuchType'], pack: 'collaboration' }],
  };
  const ghostViolations = tagViolations(ghost);
  assert.ok(ghostViolations.some((line) => line.includes('소유 파일이 모집단에 없다')), ghostViolations.join('\n'));
  assert.ok(ghostViolations.some((line) => line.includes('NoSuchType 의 main 소스 파일이 정확히 하나가 아니다')), ghostViolations.join('\n'));
});
