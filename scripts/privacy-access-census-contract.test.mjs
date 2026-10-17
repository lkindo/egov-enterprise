/**
 * 개인정보 접근 census 원장(config/governance/privacy-access-census.json)의 소유 대조 계약.
 *
 * PrivacyAccessCensusLinterTest 는 저장소에서 원장 전체를, 생성물에서는 생성기가 남긴 타입의 항목만 기대한다(투영 기록 retainsType).
 * 그 판정이 옳으려면 **원장 항목이 생성기의 실제 제거 계획대로 남고 빠져야** 한다 — 어긋나면 생성물에서 게이트가 "지운 타입인데 클래스가
 * 남았다" 로 red 가 되거나, 남은 표면을 빠진 것으로 보고 조용히 검사를 생략한다. 기대는 원장에 적지 않고 소유에서 계산한다(11단계 C4):
 * 항목 타입 소스의 기능 소유가 모두 구성 안일 때만 남는다. 판정은 공용 모듈 scripts/pack-tagged-registry.mjs 가 시작 구성마다
 * 생성기의 planJavaRemoval 을 그대로 불러 양방향으로 한다(시뮬레이터가 아니라 생성기 판정).
 * 게이트 파일 생존·시작 구성 Java 게이트·연쇄 exact·생성기 의존 판정의 인용 무시는 scripts/pack-tagged-registry.test.mjs 가 증명한다.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  evaluateExpectedSurvival,
  ledgerEntries,
  ledgerViolations,
  normalize,
  readRepoJson,
  repositoryContext,
} from './pack-tagged-registry.mjs';

const REGISTRY_PATH = 'config/governance/privacy-access-census.json';
const GATE_FILE = 'api-server/src/test/java/nuri/api/harness/PrivacyAccessCensusLinterTest.java';

/** 원장 항목을 (소스 파일로 확인할) 타입 단위로 편다. */
export function registryTypeEntries(registry) {
  return [
    ...registry.declaredHandlers.map((entry) => ({ types: [entry.controller], label: `${entry.controller}#${entry.method}` })),
    ...registry.sensitiveGetExemptions.map((entry) => ({ types: [entry.controller], label: `${entry.controller}#${entry.method}` })),
    ...registry.knownSensitiveResponseTypes.map((entry) => ({ types: [entry.type], label: entry.type })),
  ];
}

/** Java 게이트의 컨트롤러 하한 판정과 같은 모집단: 클래스 선언 앞에 @RequestMapping 이 붙은 main 소스. */
export function isRequestMappedController(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '');
  const classAt = code.search(/\b(?:class|interface|record|enum)\s+[A-Z]/);
  if (classAt < 0) return false;
  return /@RequestMapping\b/.test(code.slice(0, classAt));
}

test('원장에는 pack 어휘가 없다 — 남고 빠지는 기대는 소유에서 계산한다', async () => {
  const { root } = await repositoryContext();
  const registry = readRepoJson(root, REGISTRY_PATH);
  assert.equal(Object.hasOwn(registry, 'packs'), false, '최상위 packs 어휘가 남아 있다');
  const tagged = [...registry.declaredHandlers, ...registry.sensitiveGetExemptions, ...registry.knownSensitiveResponseTypes]
    .filter((entry) => Object.hasOwn(entry, 'pack'));
  assert.deepEqual(tagged, [], '항목에 pack 태그가 남아 있다');
});

test('원장 항목이 소유대로 생성기의 실제 제거 계획에서 남고 빠진다', async () => {
  const context = await repositoryContext();
  const registry = readRepoJson(context.root, REGISTRY_PATH);
  const raw = registryTypeEntries(registry);
  const { entries, violations } = ledgerEntries(context, raw);
  assert.ok(entries.length === raw.length && entries.length > 0, '판정할 항목이 비었다');
  assert.deepEqual([...violations, ...ledgerViolations(context, entries)], []);
});

test('남는 요청 매핑 컨트롤러가 구성마다 CONTROLLER_FLOOR 이상이다', async () => {
  const { root, projection, compositions, javaFiles, readSource = (path) => readFileSync(path, 'utf8') } = await repositoryContext();
  const gateSource = readFileSync(join(root, GATE_FILE), 'utf8');
  const floor = Number(gateSource.match(/\bCONTROLLER_FLOOR\s*=\s*(\d+)\s*;/)?.[1]);
  assert.ok(Number.isInteger(floor) && floor > 0, 'CONTROLLER_FLOOR 를 게이트 소스에서 읽지 못했다');
  // 저장소 문맥은 계획이 이미 읽은 원문을 함께 쓴다(contextSourceReader). 투영본 문맥에는 그 읽기가 없어 디스크에서 읽는다.
  const controllers = javaFiles.filter((path) => normalize(path).includes('/src/main/java/')
    && isRequestMappedController(readSource(path)));
  if (projection) {
    assert.ok(controllers.length >= floor, `투영본 컨트롤러 ${controllers.length} < ${floor}`);
    return;
  }
  for (const { name, plan } of compositions) {
    const surviving = controllers.filter((path) => !plan.removed.has(path)).length;
    assert.ok(surviving >= floor, `${name} 남는 컨트롤러 ${surviving} < CONTROLLER_FLOOR ${floor}`);
  }
});

test('부정 증명: 소유를 잘못 정하면 생성기 계획과의 대조에서 red 다', async (t) => {
  const context = await repositoryContext();
  if (context.projection) {
    t.diagnostic('투영본에는 제거 계획이 없어 합성 소유 대조를 저장소에서만 수행한다');
    return;
  }
  const registry = readRepoJson(context.root, REGISTRY_PATH);
  const { entries } = ledgerEntries(context, registryTypeEntries(registry));
  const reown = (labelEnd, owner) => entries.map((entry) => (entry.label.endsWith(labelEnd)
    ? { ...entry, owners: entry.sources.map(() => owner) } : entry));
  const cases = [
    {
      name: '협업 SMS 수신자 조회를 core 소유로 본다',
      entries: reown('#getSmsRecipients', 'core'),
      expect: /^expected to survive in preset core: .*SmsApiController#getSmsRecipients — 생성기가 지운다/,
    },
    {
      name: 'core 사용자 조회를 주소록 소유로 본다',
      entries: reown('UserApiController#getUsers', 'addressbook'),
      expect: /^expected to be removed in preset core: .*UserApiController#getUsers — 구성 밖 소유 기능 \[addressbook\] 인데 생성기가 남긴다/,
    },
  ];
  for (const redCase of cases) {
    const violations = evaluateExpectedSurvival({ entries: redCase.entries, compositions: context.compositions });
    assert.ok(violations.some((line) => redCase.expect.test(line)), `${redCase.name}: ${JSON.stringify(violations)}`);
  }
  const ghost = { ...registry, knownSensitiveResponseTypes: [...registry.knownSensitiveResponseTypes, { type: 'nuri.example.NoSuchDto' }] };
  assert.ok(ledgerEntries(context, registryTypeEntries(ghost)).violations
    .some((line) => line.startsWith('nuri.example.NoSuchDto: nuri.example.NoSuchDto 의 main 소스 파일이 정확히 하나가 아니다')));
});

test('컨트롤러 판정은 클래스 선언 앞의 @RequestMapping 만 센다', () => {
  assert.equal(isRequestMappedController('@RestController\n@RequestMapping("/a")\npublic class A {}'), true);
  assert.equal(isRequestMappedController('@Service\npublic class A {\n  @RequestMapping("/a") void x() {}\n}'), false);
  assert.equal(isRequestMappedController('/** @RequestMapping 설명 */\npublic class A {}'), false);
});
