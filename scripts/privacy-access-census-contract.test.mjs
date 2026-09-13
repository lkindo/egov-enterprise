/**
 * 개인정보 접근 census 원장(config/governance/privacy-access-census.json)의 pack 태그 계약.
 *
 * PrivacyAccessCensusLinterTest 는 현재 트리의 pack manifest 에 남은 pack 의 항목만 기대한다. 그 판정이
 * 옳으려면 **원장의 pack 태그가 재사용 base 생성기의 실제 제거 계획과 같아야** 한다 — 태그가 틀리면
 * 축소 프로필에서 게이트가 "빠진 pack 인데 클래스가 남았다" 로 red 가 되거나, 반대로 남은 표면을
 * 빠진 것으로 보고 조용히 검사를 생략한다. 판정은 공용 모듈 scripts/pack-tagged-registry.mjs 가 생성기의
 * planJavaRemoval 을 rank 누적 프로필마다 그대로 불러 한다(시뮬레이터가 아니라 생성기 판정).
 * 게이트 파일 생존·Java 게이트 제거 승인 exact·생성기 의존 판정의 인용 무시는 scripts/pack-tagged-registry.test.mjs 가 증명한다.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  evaluateEntryTags,
  evaluateProjectionPresence,
  evaluateVocabulary,
  mainSourceOf,
  normalize,
  readRepoJson,
  repositoryContext,
} from './pack-tagged-registry.mjs';

const REGISTRY_PATH = 'config/governance/privacy-access-census.json';
const GATE_FILE = 'api-server/src/test/java/nuri/api/harness/PrivacyAccessCensusLinterTest.java';

/** 원장 항목을 (소스 파일로 확인할) 타입 단위로 편다. */
export function registryTypeEntries(registry) {
  return [
    ...registry.declaredHandlers.map((entry) => ({ type: entry.controller, pack: entry.pack, label: `${entry.controller}#${entry.method}` })),
    ...registry.sensitiveGetExemptions.map((entry) => ({ type: entry.controller, pack: entry.pack, label: `${entry.controller}#${entry.method}` })),
    ...registry.knownSensitiveResponseTypes.map((entry) => ({ type: entry.type, pack: entry.pack, label: entry.type })),
  ];
}

/** 타입 항목을 공용 판정 입력으로 바꾼다. main 소스가 정확히 하나가 아니면 위반이다. */
export function toTagEntries({ root, javaFiles, registry }) {
  const entries = [];
  const violations = [];
  for (const entry of registryTypeEntries(registry)) {
    const sources = mainSourceOf(root, javaFiles, entry.type);
    if (sources.length !== 1) {
      violations.push(`${entry.label}: main 소스 파일이 정확히 하나가 아니다 (${sources.length}건)`);
      continue;
    }
    entries.push({ label: entry.label, pack: entry.pack, sources });
  }
  return { entries, violations };
}

/** Java 게이트의 컨트롤러 하한 판정과 같은 모집단: 클래스 선언 앞에 @RequestMapping 이 붙은 main 소스. */
export function isRequestMappedController(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, '');
  const classAt = code.search(/\b(?:class|interface|record|enum)\s+[A-Z]/);
  if (classAt < 0) return false;
  return /@RequestMapping\b/.test(code.slice(0, classAt));
}

test('원장의 pack 어휘는 pack manifest 와 같다(투영본에서는 남은 pack 을 포함한다)', () => {
  const { root, manifest, projection } = repositoryContext();
  const registry = readRepoJson(root, REGISTRY_PATH);
  assert.deepEqual(evaluateVocabulary({
    registryPacks: registry.packs,
    manifest,
    projection,
    entryPacks: registryTypeEntries(registry).map((entry) => entry.pack),
  }), []);
});

test('원장 pack 태그가 생성기의 실제 제거 계획과 일치한다', () => {
  const { root, javaFiles, projection, prefixPlans, presentPacks } = repositoryContext();
  const registry = readRepoJson(root, REGISTRY_PATH);
  const { entries, violations } = toTagEntries({ root, javaFiles, registry });
  if (projection) {
    const presence = evaluateProjectionPresence({ entries, presentPacks });
    // 투영본에서는 빠진 pack 의 소스가 없어 "정확히 하나" 해석이 실패하는 것이 정상이다 — 남은 pack 항목만 해석 실패를 센다.
    const presentFailures = violations.filter((line) => registryTypeEntries(registry)
      .some((entry) => line.startsWith(`${entry.label}:`) && presentPacks.has(entry.pack)));
    assert.deepEqual([...presentFailures, ...presence], []);
    return;
  }
  assert.deepEqual([...violations, ...evaluateEntryTags({ entries, prefixPlans })], []);
});

test('남는 요청 매핑 컨트롤러가 프로필마다 CONTROLLER_FLOOR 이상이다', () => {
  const { root, projection, prefixPlans, javaFiles } = repositoryContext();
  const gateSource = readFileSync(join(root, GATE_FILE), 'utf8');
  const floor = Number(gateSource.match(/\bCONTROLLER_FLOOR\s*=\s*(\d+)\s*;/)?.[1]);
  assert.ok(Number.isInteger(floor) && floor > 0, 'CONTROLLER_FLOOR 를 게이트 소스에서 읽지 못했다');
  const controllers = javaFiles.filter((path) => normalize(path).includes('/src/main/java/')
    && isRequestMappedController(readFileSync(path, 'utf8')));
  if (projection) {
    assert.ok(controllers.length >= floor, `투영본 컨트롤러 ${controllers.length} < ${floor}`);
    return;
  }
  for (const { profile, plan } of prefixPlans) {
    const surviving = controllers.filter((path) => !plan.removed.has(path)).length;
    assert.ok(surviving >= floor, `[${profile.packs.join(',')}] 남는 컨트롤러 ${surviving} < CONTROLLER_FLOOR ${floor}`);
  }
});

test('부정 증명: 틀린 pack 태그는 생성기 계획과의 대조에서 red 다', (t) => {
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
  const retag = (section, predicate, pack) => ({
    ...registry,
    [section]: registry[section].map((entry) => (predicate(entry) ? { ...entry, pack } : entry)),
  });
  const cases = [
    {
      name: 'collaboration 소유 SMS 수신자 조회를 core 로 적는다',
      registry: retag('declaredHandlers', (entry) => entry.method === 'getSmsRecipients', 'core'),
      expect: /getSmsRecipients \(pack=core\) 는 프로필 \[core\] 에서 제거된다/,
    },
    {
      name: 'demo 소유 주소록 조회를 survey 로 적는다',
      registry: retag('declaredHandlers', (entry) => entry.method === 'getAddressBook', 'survey'),
      expect: /getAddressBook \(pack=survey\) 는 프로필 \[core,collaboration,survey\] 에서 제거된다/,
    },
    {
      name: 'core 소유 사용자 조회를 demo 로 적는다',
      registry: retag('declaredHandlers', (entry) => entry.method === 'getUsers', 'demo'),
      expect: /getUsers \(pack=demo\) 는 프로필 \[core\] 에서 남는다/,
    },
    {
      name: 'collaboration 대시보드 컨트롤러를 core 로 적는다',
      registry: {
        ...registry,
        sensitiveGetExemptions: [
          ...registry.sensitiveGetExemptions,
          { controller: 'nuri.api.controller.business.main.DashboardApiController', method: 'getDashboard', pack: 'core', reason: '합성' },
        ],
      },
      expect: /DashboardApiController#getDashboard \(pack=core\) 는 프로필 \[core\] 에서 제거된다/,
    },
  ];
  for (const redCase of cases) {
    const violations = tagViolations(redCase.registry);
    assert.ok(violations.some((line) => redCase.expect.test(line)), `${redCase.name}: ${JSON.stringify(violations)}`);
  }
  const ghost = {
    ...registry,
    knownSensitiveResponseTypes: [...registry.knownSensitiveResponseTypes, { type: 'nuri.example.NoSuchDto', pack: 'core' }],
  };
  assert.ok(tagViolations(ghost).some((line) => line.startsWith('nuri.example.NoSuchDto: main 소스 파일이 정확히 하나가 아니다')));
});

test('컨트롤러 판정은 클래스 선언 앞의 @RequestMapping 만 센다', () => {
  assert.equal(isRequestMappedController('@RestController\n@RequestMapping("/a")\npublic class A {}'), true);
  assert.equal(isRequestMappedController('@Service\npublic class A {\n  @RequestMapping("/a") void x() {}\n}'), false);
  assert.equal(isRequestMappedController('/** @RequestMapping 설명 */\npublic class A {}'), false);
});
