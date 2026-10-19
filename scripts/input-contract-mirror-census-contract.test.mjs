/**
 * 입력 계약 미러 원장(config/governance/input-contract-mirror-census.json)의 소유 대조 계약.
 *
 * InputContractMirrorLinterTest 는 저장소에서 원장 전체를, 생성물에서는 참조 타입 소스가 **모두** 남은 표적만 검사한다(투영 기록 retainsType).
 * 한 표적은 엔티티·DTO·중첩 item·검증 그룹 등 여러 타입을 참조하므로, 기대는 참조 타입 소스의 기능 소유가 모두 구성 안일 때만 남는다
 * (11단계 C4 — 원장에 소유를 적지 않고 계산한다). 설문 소유를 다른 demo 기능으로 잘못 정하면 '공통 기반 + 설문' 시작 구성(13b)만
 * 그 둘을 가른다 — 13b 전에는 합성 구성 [collaboration + survey] 를 따로 돌아 이 구분을 했다.
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

export function registrySpecEntries(registry) {
  return SECTIONS.flatMap((section) => registry[section].map((spec) => ({ label: specLabel(section, spec), types: specTypes(section, spec),
    section, dto: spec.dto ?? spec.parent })));
}

// 원장에 pack 어휘가 돌아오지 않는지는 retired-pack-vocabulary.test.mjs 의 표가 본다(원장 셋을 한 행으로).

test('원장 표적이 소유대로 생성기의 실제 제거 계획에서 남고 빠진다', async () => {
  const context = await repositoryContext();
  const registry = readRepoJson(context.root, REGISTRY_PATH);
  const raw = registrySpecEntries(registry);
  const { entries, violations } = ledgerEntries(context, raw);
  assert.ok(entries.length === raw.length && entries.length > 0, '판정할 표적이 비었다');
  assert.deepEqual([...violations, ...ledgerViolations(context, entries)], []);
});

/*
 * Java 게이트는 남은 길이·필수 표적의 DTO 집합이 같아야 하고, 응답 전용 필수 필드는 필수 표적 안에서만 검사된다. 그래서 같은 DTO 의 길이·필수·
 * 응답 전용 표적은 **어느 구성에서나 함께** 남고 빠져야 한다 — 소유 기능 집합이 같으면 그렇다(종전의 '같은 pack' 규칙을 소유로 옮겼다).
 */
test('같은 DTO 의 길이·필수·응답 전용 표적은 소유 기능 집합이 같다(Java 게이트의 DTO 집합 대조 전제)', async (t) => {
  const context = await repositoryContext();
  if (context.projection) {
    t.diagnostic('투영본에는 소유를 계산할 카탈로그가 없다 — 같은 성질은 Java 게이트의 DTO 집합 대조가 투영본에서 직접 본다');
    return;
  }
  const registry = readRepoJson(context.root, REGISTRY_PATH);
  const { entries } = ledgerEntries(context, registrySpecEntries(registry));
  const raw = registrySpecEntries(registry);
  const ownersBy = (section) => new Map(raw.map((row, index) => [row, entries[index]]).filter(([row]) => row.section === section)
    .map(([row, entry]) => [row.dto, JSON.stringify([...new Set(entry.owners.filter((owner) => owner !== 'core'))].sort())]));
  const length = ownersBy('lengthBindings');
  const required = ownersBy('requiredBindings');
  assert.deepEqual([...required.keys()].sort(), [...length.keys()].sort(), '필수·길이 표적의 DTO 집합이 다르다');
  const differing = [...required].filter(([dto, owners]) => length.get(dto) !== owners).map(([dto, owners]) => `${dto}: 필수 ${owners} · 길이 ${length.get(dto)}`);
  assert.deepEqual(differing, []);
  const response = [...ownersBy('requiredResponseFields')].filter(([dto, owners]) => required.get(dto) !== owners).map(([dto]) => dto);
  assert.deepEqual(response, [], '응답 전용 필수 필드의 소유가 필수 표적과 다르다');
});

test('부정 증명: 소유를 잘못 정하면 생성기 계획과의 대조에서 red 다 — 설문 오인은 설문 시작 구성이 잡는다', async (t) => {
  const context = await repositoryContext();
  if (context.projection) {
    t.diagnostic('투영본에는 제거 계획이 없어 합성 소유 대조를 저장소에서만 수행한다');
    return;
  }
  const registry = readRepoJson(context.root, REGISTRY_PATH);
  const { entries } = ledgerEntries(context, registrySpecEntries(registry));
  const reown = (predicate, owner) => entries.map((entry) => (predicate(entry) ? { ...entry, owners: entry.sources.map(() => owner) } : entry));
  const surveyDate = (entry) => entry.label === 'calendarDateBindings nuri.business.service.survey.dto.SurveyInfoDto';
  assert.ok(entries.some(surveyDate), '설문 날짜 표적이 원장에 있어야 이 부정 증명이 vacuous 하지 않다');
  const cases = [
    {
      name: '설문 날짜 표적을 홍보(다른 demo 기능) 소유로 본다',
      entries: reown(surveyDate, 'promotion'),
      expect: /^expected to be removed in preset survey: calendarDateBindings nuri\.business\.service\.survey\.dto\.SurveyInfoDto — 구성 밖 소유 기능 \[promotion\] 인데 생성기가 남긴다/,
    },
    {
      name: '게시판 길이 표적을 core 소유로 본다',
      entries: reown((entry) => entry.label === 'lengthBindings nuri.business.service.board.dto.BoardMasterDto', 'core'),
      expect: /^expected to survive in preset core: lengthBindings nuri\.business\.service\.board\.dto\.BoardMasterDto — 생성기가 지운다/,
    },
  ];
  for (const redCase of cases) {
    const violations = evaluateExpectedSurvival({ entries: redCase.entries, compositions: context.compositions });
    assert.ok(violations.some((line) => redCase.expect.test(line)), `${redCase.name}: ${JSON.stringify(violations)}`);
  }
  // 대조군: 설문 시작 구성을 빼면 설문 오인은 보이지 않는다 — 그 구성이 이 신호를 받친다(13b 전의 합성 구성과 같은 몫).
  assert.deepEqual(evaluateExpectedSurvival({ entries: reown(surveyDate, 'promotion'),
    compositions: context.presets.filter((row) => row.preset !== 'survey') }), [],
  '설문 시작 구성 없이도 설문 오인이 잡힌다면 그 구성이 받친다는 근거를 다시 본다');

  // 엔티티만 빠지는 표적 — 주소록 엔티티를 core DTO 와 묶으면 core 에서 빠진다고 기대하고 계획도 그렇다(참조 타입을 모두 본다).
  const mixed = { ...registry, lengthBindings: [{ entity: 'nuri.business.domain.addressbook.AddressBook', dto: 'nuri.business.service.user.dto.UserDto',
    fields: ['userId'] }], enumBindings: [], nestedValidationBindings: [], requiredBindings: [], requiredResponseFields: [], readOnlyBindings: [],
  calendarDateBindings: [] };
  const [synthetic] = ledgerEntries(context, registrySpecEntries(mixed)).entries;
  assert.deepEqual(synthetic.owners, ['addressbook', 'core']);
  assert.deepEqual(evaluateExpectedSurvival({ entries: [synthetic], compositions: context.compositions }), []);
  const ghost = { ...mixed, lengthBindings: [], readOnlyBindings: [{ dto: 'nuri.business.service.user.dto.UserDto$NoSuchNested', fields: ['x'] }] };
  assert.deepEqual(ledgerEntries(context, registrySpecEntries(ghost)).violations, [],
    '중첩 이진 이름은 바깥 클래스 소스로 해석한다 — 존재 여부는 Java 게이트의 클래스 로드가 판정한다');
});
