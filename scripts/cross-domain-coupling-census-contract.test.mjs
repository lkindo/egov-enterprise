/**
 * 교차 도메인 결합 census 원장(config/governance/cross-domain-coupling-census.json)의 소유 대조 계약.
 *
 * CrossDomainCouplingLinterTest 는 edge 를 정확한 집합으로 대조하되, 생성물에서는 소유 서비스 파일과 참조 타입 소스가 **모두** 남은 edge 만
 * 기대한다(투영 기록 retainsSource). 그 판정이 옳으려면 edge 가 생성기의 실제 제거 계획대로 남고 빠져야 한다. 기대는 원장에 적지 않고
 * 소유에서 계산한다(11단계 C4): 소유 파일과 참조 타입 소스의 기능 소유가 모두 구성 안일 때만 남는다. 문자열 속 FQN 도 스캐너는 edge 로
 * 세지만 생성기는 의존으로 보지 않으므로, 소유 파일만으로 판정하면 대상 타입이 빠진 구성에서 edge 가 조용히 사라진다 — 그래서 참조 타입
 * 소스까지 판정에 넣는다.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateExpectedSurvival,
  ledgerEntries,
  ledgerViolations,
  readRepoJson,
  repositoryContext,
} from './pack-tagged-registry.mjs';

const REGISTRY_PATH = 'config/governance/cross-domain-coupling-census.json';
const APP_SERVICE_BASE = 'business-app/src/main/java/nuri/business/service';

export function edgeLabel(edge) {
  return `${edge.file}: ${edge.owner} -> ${edge.target} [${edge.module}]`;
}

/** edge 를 판정 입력으로 편다 — 소스는 소유 파일 + 참조 타입의 main 소스. */
export function registryEdgeEntries(registry) {
  return registry.edges.map((edge) => ({ label: edgeLabel(edge), paths: [`${APP_SERVICE_BASE}/${edge.file}`], types: edge.types }));
}

test('원장에는 pack 어휘가 없다 — 남고 빠지는 기대는 소유에서 계산한다', async () => {
  const { root } = await repositoryContext();
  const registry = readRepoJson(root, REGISTRY_PATH);
  assert.equal(Object.hasOwn(registry, 'packs'), false, '최상위 packs 어휘가 남아 있다');
  assert.deepEqual(registry.edges.filter((edge) => Object.hasOwn(edge, 'pack')), [], 'edge 에 pack 태그가 남아 있다');
});

test('원장 edge 가 소유대로 생성기의 실제 제거 계획에서 남고 빠진다', async () => {
  const context = await repositoryContext();
  const registry = readRepoJson(context.root, REGISTRY_PATH);
  const raw = registryEdgeEntries(registry);
  const { entries, violations } = ledgerEntries(context, raw);
  assert.ok(entries.length === raw.length && entries.length > 0, '판정할 edge 가 비었다');
  assert.deepEqual([...violations, ...ledgerViolations(context, entries)], []);
});

test('app→app·app→core edge 수는 공용 메모리 GAP-ARCH-001 이 인용할 수 있게 원장에서 파생된다', async () => {
  const { root } = await repositoryContext();
  const registry = readRepoJson(root, REGISTRY_PATH);
  const count = (module) => registry.edges.filter((edge) => edge.module === module).length;
  assert.equal(count('business-app') + count('business-core'), registry.edges.length, '모듈 어휘 밖 edge 가 있다');
  /*
    [2026-09-15] app→app 은 0 이 정상이 됐다 — GAP-ARCH-001 의 마지막 4건을 foundation 포트·이벤트로
    역전했다. 그래서 종전의 `count('business-app') > 0` floor 는 더 이상 쓸 수 없다.

    0 을 "세지 못했다" 와 구분하는 것은 이 floor 가 아니라 CrossDomainCouplingLinterTest 의 exact-set
    대조다 — 코드에 app→app 참조가 있는데 원장에 없으면 그쪽이 red 이고, 원장에만 있으면 유령 edge 로
    red 다. 여기서 막아야 하는 것은 원장이 통째로 비어 메모리 수치가 vacuous 하게 0 이 되는 경우다.
  */
  assert.ok(registry.edges.length > 0, '원장이 비면 공용 메모리의 edge 수가 vacuous 하다');
  assert.ok(count('business-core') > 0, 'app→core 축이 비면 원장이 모집단을 잃은 것이다');
});

test('부정 증명: 소유를 잘못 정하거나 참조 타입을 빠뜨리면 생성기 계획과의 대조에서 red 다', async (t) => {
  const context = await repositoryContext();
  if (context.projection) {
    t.diagnostic('투영본에는 제거 계획이 없어 합성 소유 대조를 저장소에서만 수행한다');
    return;
  }
  const registry = readRepoJson(context.root, REGISTRY_PATH);
  const survival = (candidate) => {
    const { entries, violations } = ledgerEntries(context, registryEdgeEntries(candidate));
    return [...violations, ...evaluateExpectedSurvival({ entries, compositions: context.compositions })];
  };
  const { entries } = ledgerEntries(context, registryEdgeEntries(registry));
  const reown = (labelStart, owner) => entries.map((entry) => (entry.label.startsWith(labelStart)
    ? { ...entry, owners: entry.sources.map(() => owner) } : entry));
  const cases = [
    {
      name: '협업 게시판 첨부 기여자 edge 를 core 소유로 본다',
      entries: reown('board/attachment/BoardAttachmentSourceContributor.java: board -> file', 'core'),
      expect: /^expected to survive in preset core: board\/attachment\/BoardAttachmentSourceContributor\.java: board -> file \[business-core\] — 생성기가 지운다/,
    },
    {
      name: '주소록 정리 리스너 edge 를 협업 쪽(게시판) 소유로 본다',
      entries: reown('addressbook/listener/AddressBookUserDeletionCleanupListener.java', 'board'),
      expect: /^expected to survive in preset collaboration: addressbook\/listener\/AddressBookUserDeletionCleanupListener\.java: addressbook -> user \[business-core\] — 생성기가 지운다/,
    },
  ];
  for (const redCase of cases) {
    const violations = evaluateExpectedSurvival({ entries: redCase.entries, compositions: context.compositions });
    assert.ok(violations.some((line) => redCase.expect.test(line)), `${redCase.name}: ${JSON.stringify(violations)}`);
  }

  // 대상 타입이 소유 파일보다 먼저 빠지는 edge(문자열 속 FQN 처럼 생성기가 의존으로 보지 않는 참조). 참조 타입 소스까지 소유를 보므로
  // 협업 구성에서 대상 타입과 함께 빠진다고 기대한다 — 소유 파일만 보면 남는다고 기대해, 모든 소스가 남을 때만 edge 를 기대하는
  // Java 게이트와 갈린다.
  const stringOnly = { edges: [{ file: 'board/BoardService.java', owner: 'board', target: 'survey', module: 'business-app',
    types: ['nuri.business.service.survey.dto.SurveyInfoDto'] }] };
  const [synthetic] = ledgerEntries(context, registryEdgeEntries(stringOnly)).entries;
  assert.deepEqual(synthetic.owners, ['board', 'survey'], '소유 파일과 참조 타입 소스의 소유를 함께 본다');
  assert.deepEqual(survival(stringOnly), [], '참조 타입까지 보면 소유대로 남고 빠진다');
  const collaboration = context.compositions.find((composition) => composition.preset === 'collaboration');
  assert.ok(!collaboration.plan.removed.has(synthetic.sources[0]) && collaboration.plan.removed.has(synthetic.sources[1]),
    '협업 구성은 소유 파일을 남기고 대상 타입만 지운다 — 소유 파일만으로는 이 edge 의 부재를 말할 수 없다');

  const ghost = { edges: [{ file: 'board/NoSuchService.java', owner: 'board', target: 'user', module: 'business-core',
    types: ['nuri.business.service.user.NoSuchType'] }] };
  const ghostViolations = survival(ghost);
  assert.ok(ghostViolations.some((line) => line.includes('NoSuchService.java 가 Java 모집단에 없다')), ghostViolations.join('\n'));
  assert.ok(ghostViolations.some((line) => line.includes('NoSuchType 의 main 소스 파일이 정확히 하나가 아니다')), ghostViolations.join('\n'));
});
