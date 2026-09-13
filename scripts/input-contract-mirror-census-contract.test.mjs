/**
 * 입력 계약 미러 원장(config/governance/input-contract-mirror-census.json)의 pack 태그 계약.
 *
 * InputContractMirrorLinterTest 는 투영된 트리에 남은 pack 의 표적만 검사한다. 한 표적은 엔티티·DTO·중첩 item·검증 그룹 등
 * 여러 타입을 참조하므로, 태그는 **참조 타입 소스가 모두** 살아남는 가장 작은 rank 누적 프로필이어야 한다.
 * 실제 프로필(core·collaboration·demo)에는 survey 만 더한 프로필이 없어 Java 게이트는 survey 와 demo 태그를 구분하지
 * 못한다 — 그 구분은 합성 프로필 [core,collaboration,survey] 를 도는 이 계약만 할 수 있다.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateEntryTags,
  evaluateProjectionPresence,
  evaluateVocabulary,
  readRepoJson,
  repositoryContext,
  resolveTypeSources,
} from './pack-tagged-registry.mjs';

const REGISTRY_PATH = 'config/governance/input-contract-mirror-census.json';
const SECTIONS = [
  'lengthBindings', 'enumBindings', 'nestedValidationBindings', 'requiredBindings',
  'requiredResponseFields', 'readOnlyBindings', 'calendarDateBindings',
];

/** 표적 항목이 참조하는 타입 이진 이름. Java 게이트의 Spec.types() 와 같은 규칙이다. */
export function specTypes(section, spec) {
  switch (section) {
    case 'lengthBindings': return [spec.entity, spec.dto];
    case 'nestedValidationBindings': return [spec.parent, spec.item];
    case 'requiredBindings': return [spec.dto, ...spec.fields.flatMap((field) => field.groups)];
    default: return [spec.dto];
  }
}

export function specLabel(section, spec) {
  const owner = spec.dto ?? spec.parent;
  return `${section} ${owner}${spec.field ? `.${spec.field}` : ''}`;
}

export function toTagEntries({ root, javaFiles, registry }) {
  const entries = [];
  const violations = [];
  for (const section of SECTIONS) {
    for (const spec of registry[section]) {
      const label = specLabel(section, spec);
      const resolved = resolveTypeSources(root, javaFiles, label, specTypes(section, spec));
      violations.push(...resolved.violations);
      entries.push({ label, pack: spec.pack, sources: resolved.sources, complete: resolved.violations.length === 0 });
    }
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
    entryPacks: SECTIONS.flatMap((section) => registry[section].map((spec) => spec.pack)),
  }), []);
});

test('원장 표적 pack 태그가 생성기의 실제 제거 계획과 일치한다', () => {
  const { root, javaFiles, projection, prefixPlans, presentPacks } = repositoryContext();
  const registry = readRepoJson(root, REGISTRY_PATH);
  const { entries, violations } = toTagEntries({ root, javaFiles, registry });
  if (projection) {
    const presentFailures = entries.filter((entry) => presentPacks.has(entry.pack) && !entry.complete)
      .map((entry) => `${entry.label}: 남은 pack 인데 참조 타입 소스를 해석하지 못했다`);
    const presence = evaluateProjectionPresence({ entries: entries.filter((entry) => entry.complete), presentPacks });
    assert.deepEqual([...presentFailures, ...presence], []);
    return;
  }
  assert.deepEqual([...violations, ...evaluateEntryTags({ entries, prefixPlans })], []);
});

test('같은 DTO 의 길이·필수 표적은 같은 pack 이다(Java 게이트의 DTO 집합 대조 전제)', () => {
  const { root } = repositoryContext();
  const registry = readRepoJson(root, REGISTRY_PATH);
  const packsOf = (section) => Object.fromEntries(registry[section].map((spec) => [spec.dto, spec.pack]));
  assert.deepEqual(packsOf('requiredBindings'), packsOf('lengthBindings'));
});

test('부정 증명: 틀린 표적 pack 태그는 생성기 계획과의 대조에서 red 다', (t) => {
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
    [section]: registry[section].map((spec) => (predicate(spec) ? { ...spec, pack } : spec)),
  });
  const endsWith = (suffix) => (spec) => (spec.dto ?? spec.parent).endsWith(suffix);
  const cases = [
    {
      name: 'survey 소유 설문 날짜 표적을 demo 로 적는다(실제 프로필로는 구분 불가)',
      registry: retag('calendarDateBindings', endsWith('.SurveyInfoDto'), 'demo'),
      expect: /calendarDateBindings nuri\.business\.service\.survey\.dto\.SurveyInfoDto \(pack=demo\) 는 프로필 \[core,collaboration,survey\] 에서 남는다/,
    },
    {
      name: 'collaboration 소유 게시판 길이 표적을 core 로 적는다',
      registry: retag('lengthBindings', endsWith('.BoardMasterDto'), 'core'),
      expect: /lengthBindings nuri\.business\.service\.board\.dto\.BoardMasterDto \(pack=core\) 는 프로필 \[core\] 에서 제거된다/,
    },
    {
      name: 'core 소유 중첩 권한 표적을 collaboration 으로 적는다',
      registry: retag('nestedValidationBindings', endsWith('AuthorizationDto$ReplaceGrants'), 'collaboration'),
      expect: /nestedValidationBindings nuri\.business\.service\.auth\.dto\.AuthorizationDto\$ReplaceGrants\.grants \(pack=collaboration\) 는 프로필 \[core\] 에서 남는다/,
    },
    {
      name: 'demo 소유 엔티티를 core DTO 와 묶고 core 로 적는다(엔티티만 빠지는 표적)',
      registry: {
        ...registry,
        lengthBindings: [...registry.lengthBindings, {
          entity: 'nuri.business.domain.addressbook.AddressBook', dto: 'nuri.business.service.user.dto.UserDto',
          fields: ['userId'], pack: 'core',
        }],
      },
      expect: /lengthBindings nuri\.business\.service\.user\.dto\.UserDto \(pack=core\) 는 프로필 \[core\] 에서 제거된다/,
    },
  ];
  for (const redCase of cases) {
    const violations = tagViolations(redCase.registry);
    assert.ok(violations.some((line) => redCase.expect.test(line)), `${redCase.name}: ${JSON.stringify(violations)}`);
  }
  const ghost = retag('readOnlyBindings', endsWith('.UserDto'), 'core');
  ghost.readOnlyBindings = [...ghost.readOnlyBindings, { dto: 'nuri.business.service.user.dto.UserDto$NoSuchNested', fields: ['x'], pack: 'core' }];
  assert.deepEqual(tagViolations(ghost).filter((line) => line.includes('NoSuchNested')), [],
    '중첩 이진 이름은 바깥 클래스 소스로 해석한다 — 존재 여부는 Java 게이트의 클래스 로드가 판정한다');
});
