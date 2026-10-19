/**
 * 퇴역한 pack 어휘가 되살아나지 않는다 — 표 하나를 읽는 계약.
 *
 * 매니페스트 v2 전환(11단계 C3~C7)이 기능 소유의 원천을 config/modules 하나로 모으면서 pack·순위 축을 걷었다. 그 뒤 "pack 이
 * 돌아오지 않는다" 는 단언이 8개 파일에 14개로 흩어졌다(구성 카탈로그·해석된 구성·횡단 원장 셋·생성기와 관찰자 소스·수동 삭제
 * 스크립트·프런트 투영 결과). 같은 불변식을 여러 곳이 따로 말하면 대상이 늘 때 한 곳만 고쳐지고, 걷을 때 무엇이 남는지 보이지 않는다
 * (AGENTS.md 거버넌스 총량 관리). 대상·금지 어휘·근거 결정을 아래 표 한 곳에 두고, 원래 자리에는 pack 말고 다른 것을 함께 보던
 * 단언만 남겼다.
 *
 * 대상 종류:
 *   json-keys — 저장소의 JSON 파일. 어느 깊이의 객체에도 금지 키가 없어야 한다.
 *   value     — 생성기·해석기가 만드는 값(아래 VALUE_PRODUCERS). 어느 깊이의 객체에도 금지 키가 없어야 한다.
 *   code      — 스크립트 소스. 주석을 지운 코드에 금지 정규식이 맞으면 안 된다(문서 주석의 경위 설명은 대상이 아니다).
 *   text      — 주석 문법이 다른 파일(PowerShell). 원문 그대로 금지 정규식이 맞으면 안 된다.
 * 대상 파일이 없으면 통과가 아니라 실패다 — 개명·이동이면 표를 고친다(조용히 빠진 대상은 가드가 없는 것과 같다).
 *
 * 파일 이름 `scripts/pack-tagged-registry.*` 는 옛 이름일 뿐 살아 있는 원장 계약이다(그 파일의 머리 주석). 아래 관찰자 목록이 그
 * 모듈도 대상으로 둔다.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { applyFrontendProjection } from './reusable-source-frontend.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 객체 키로 되살아나면 안 되는 pack 어휘. */
const RETIRED_KEYS = Object.freeze(['pack', 'packs', 'excludedPacks', 'allowedPacks']);
/** 소스에서 읽으면 안 되는 v1 manifest 의 pack·순위 축과 그 파일 이름. */
const RETIRED_READS = /\.packs\b|\.rank\b|allowedPacks|excludedPacks|reusable-base-profiles/;

export const RETIRED_PACK_VOCABULARY = Object.freeze([
  {
    kind: 'json-keys',
    paths: [
      'config/governance/cross-domain-coupling-census.json',
      'config/governance/input-contract-mirror-census.json',
      'config/governance/privacy-access-census.json',
    ],
    forbidden: RETIRED_KEYS,
    basis: 'DEC-OPS-290',
    reason: '횡단 게이트 원장은 pack 태그를 적지 않는다 — 남고 빠지는 기대는 기능 소유에서 계산한다(11단계 C4)',
  },
  {
    kind: 'value',
    paths: ['composer catalog', 'resolved composition', 'frontend projection marker blocks'],
    forbidden: RETIRED_KEYS,
    basis: 'DEC-OPS-291',
    reason: '카탈로그·해석된 구성·lock 의 프런트 투영 집계는 기능 단위다 — pack 축을 걷었다(11단계 C5)',
  },
  {
    kind: 'code',
    paths: ['scripts/reusable-source-java.mjs', 'scripts/project-composer-deep.mjs', 'scripts/generate-reusable-base-db.mjs'],
    forbidden: RETIRED_READS,
    basis: 'DEC-OPS-289',
    reason: '생성기·정밀 점검·DB 생성기는 기능 소유로 투영한다 — pack 목록·순위로 판정하면 시작 구성이 직접 선택과 다른 경로를 탄다(11단계 C3)',
  },
  {
    kind: 'code',
    // 공유 테이블은 선언된 소비자 순서로 옮기고 pack 순위를 보지 않는다(generate-reusable-base-source.mjs, 11단계 C3)는 같은 정규식의 `.rank` 가 본다.
    paths: [
      'scripts/ui-route-capabilities-contract.mjs', 'scripts/frontend-reachability-census.mjs', 'scripts/reusable-review-scopes.mjs',
      'scripts/reusable-governance-projection.mjs', 'scripts/generate-permissions.mjs', 'scripts/pack-tagged-registry.mjs',
      'scripts/reusable-source-harness.mjs', 'scripts/ci-change-scope.mjs', 'scripts/adoption-review.mjs', 'scripts/atlas-catalog.mjs',
      'scripts/domain-deletion-plan.mjs', 'scripts/reusable-source-frontend.mjs', 'scripts/project-composer-recipe.mjs',
      'scripts/reusable-source-tree.mjs', 'scripts/reusable-db-postgres.mjs', 'scripts/generate-reusable-base-source.mjs',
      'scripts/reusable-governance-integrity.mjs', 'scripts/reusable-base-census.mjs', 'scripts/project-composer-catalog.mjs',
    ],
    forbidden: RETIRED_READS,
    basis: 'DEC-OPS-291',
    reason: '관찰자(원장·census·CI 범위·생성물 판정·Atlas·수동 삭제)와 생성기 본체는 v1 manifest 의 pack·순위를 읽지 않는다(11단계 C5)',
  },
  {
    kind: 'text',
    paths: ['scripts/delete-domain.ps1'],
    forbidden: /reusable-base-profiles|\$manifest|frontend\.removePaths/u,
    basis: 'DEC-OPS-291·294',
    reason: '수동 삭제는 기능 파일의 화면 소유(plan.frontendPaths)로 지운다 — v1 manifest 와 pack 의 제거 경로를 읽지 않는다(11단계 C5·C7)',
  },
].map(row => Object.freeze({ ...row, paths: Object.freeze([...row.paths]) })));

// 카탈로그 적재는 소스 inventory 를 읽어 느리다 — 같은 저장소에서는 한 번만 적재한다(해석기는 카탈로그를 바꾸지 않는다).
const catalogs = new Map();
const catalogOf = root => { if (!catalogs.has(root)) catalogs.set(root, loadProjectComposerCatalog(root)); return catalogs.get(root); };

/** value 대상의 값. 생성기·해석기를 그대로 부른다 — 그 값을 손으로 흉내 내지 않는다. */
export const VALUE_PRODUCERS = Object.freeze({
  'composer catalog': root => catalogOf(root),
  // 설문만 고른 구성(Phase 0c 의 종료 조건과 같은 선택). 해석 결과 전체를 본다.
  'resolved composition': root => resolveProjectRecipe({ schemaVersion: 1, project: { name: 'retired-vocabulary-probe' }, sourceRef: 'HEAD',
    selection: { domains: ['survey'] }, database: { vendor: 'postgresql' }, backendLayout: 'multi-module' }, catalogOf(root)),
  // lock.frontend.markerBlocks 는 이 함수의 반환값이다. 프런트 파일이 없는 빈 트리로 불러 반환 모양만 본다.
  'frontend projection marker blocks': () => {
    const output = mkdtempSync(join(tmpdir(), 'retired-pack-vocabulary-'));
    try {
      return applyFrontendProjection(output, { project() { throw new Error('빈 트리에는 투영할 파일이 없다'); } });
    } finally {
      const owned = resolve(output);
      assert.equal(dirname(owned), resolve(tmpdir()));
      assert.ok(basename(owned).startsWith('retired-pack-vocabulary-'));
      rmSync(owned, { recursive: true, force: true });
    }
  },
});

/** 주석을 지운 코드(project-composer-source.test.mjs 의 종전 grep 계약과 같은 규칙 — URL·문자열의 `//` 는 남긴다). */
export function codeWithoutComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\r\n]*/g, '$1');
}

function retiredKeyPaths(value, forbidden, at = '$', found = []) {
  if (Array.isArray(value)) value.forEach((item, index) => retiredKeyPaths(item, forbidden, `${at}[${index}]`, found));
  else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (forbidden.includes(key)) found.push(`${at}.${key}`);
      retiredKeyPaths(item, forbidden, `${at}.${key}`, found);
    }
  }
  return found;
}

const message = (row, target, found) => `퇴역 pack 어휘가 되살아났다 — ${target}: ${found} (${row.basis}: ${row.reason})`;

/**
 * 표의 한 행이 한 대상에서 내는 위반. `read(path)` 는 파일 원문(없으면 undefined), `produce(name)` 는 value 대상의 값이다 —
 * 시험은 둘을 바꿔 넘겨 되살아난 어휘를 심는다.
 */
export function retiredVocabularyViolations(row, target, { read, produce }) {
  if (row.kind === 'value') {
    if (!Object.hasOwn(VALUE_PRODUCERS, target)) return [`표의 value 대상을 만들 수 없다: ${target}`];
    return retiredKeyPaths(produce(target), row.forbidden).map(at => message(row, target, `키 ${at}`));
  }
  if (!['json-keys', 'code', 'text'].includes(row.kind)) return [`알 수 없는 대상 종류: ${row.kind}`];
  const text = read(target);
  if (text === undefined) return [`표의 대상이 없다: ${target} — 개명·이동이면 표를 고친다(${row.basis})`];
  if (row.kind === 'json-keys') return retiredKeyPaths(JSON.parse(text), row.forbidden).map(at => message(row, target, `키 ${at}`));
  const match = (row.kind === 'code' ? codeWithoutComments(text) : text).match(row.forbidden);
  return match ? [message(row, target, `'${match[0]}'`)] : [];
}

const readRepository = target => {
  const file = join(ROOT, target);
  return existsSync(file) ? readFileSync(file, 'utf8') : undefined;
};
const produceRepository = name => VALUE_PRODUCERS[name](ROOT);

test('퇴역 pack 어휘가 표의 어느 대상에도 되살아나지 않는다', () => {
  const targets = RETIRED_PACK_VOCABULARY.flatMap(row => row.paths.map(target => [row, target]));
  // 흩어진 단언 14개가 보던 대상 29개(원장 3·값 3·생성기 3·관찰자 19·수동 삭제 1)다. 대상을 걷으면 이 하한도 같은 변경에서 내리고 사유를 남긴다.
  assert.ok(targets.length >= 29, `표의 대상이 ${targets.length}개로 줄었다 — 흩어진 단언을 모은 모집단(29)이 조용히 비지 않게 한다`);
  assert.equal(new Set(targets.map(([, target]) => target)).size, targets.length, '같은 대상이 두 행에 있다');
  const violations = targets.flatMap(([row, target]) => retiredVocabularyViolations(row, target, { read: readRepository, produce: produceRepository }));
  assert.deepEqual(violations, []);
});

/*
 * red 증명(H5): 표의 대상마다 실제 내용에 퇴역 어휘를 다시 심으면 표의 메시지로 위반이 나야 한다. 값·원장은 실제 값에 키를 더하고,
 * 소스는 실제 코드 끝에 그 행의 금지 정규식이 잡는 읽기를 붙인다 — 주석 안의 같은 글자는 위반이 아니다.
 */
const CODE_PROBES = ['manifest.packs', 'profile.rank', 'allowedPacks', 'excludedPacks', "'config/reusable-base-profiles.json'"];
const TEXT_PROBES = ['$manifest.clusters', '$profile.frontend.removePaths', 'config/reusable-base-profiles.json'];

test('표의 대상마다 퇴역 어휘를 다시 심으면 그 행의 메시지로 붉다', () => {
  const cache = new Map();
  const real = name => { if (!cache.has(name)) cache.set(name, produceRepository(name)); return structuredClone(cache.get(name)); };
  for (const row of RETIRED_PACK_VOCABULARY) {
    for (const target of row.paths) {
      const expected = new RegExp(`퇴역 pack 어휘가 되살아났다 — ${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: .*\\(${row.basis}: `);
      if (row.kind === 'json-keys' || row.kind === 'value') {
        for (const key of row.forbidden) {
          const plant = value => { const planted = Array.isArray(value) ? { rows: value } : value; planted[key] = 'core'; return planted; };
          const options = row.kind === 'value'
            ? { produce: name => plant(real(name)) }
            : { read: path => `${JSON.stringify(plant(JSON.parse(readRepository(path))))}\n` };
          const violations = retiredVocabularyViolations(row, target, options);
          assert.match(violations.join('\n'), expected, `${target}: ${key}`);
          assert.match(violations.join('\n'), new RegExp(`키 \\$\\.${key}`), `${target}: ${key}`);
        }
        continue;
      }
      const original = readRepository(target);
      for (const probe of row.kind === 'code' ? CODE_PROBES : TEXT_PROBES) {
        const planted = row.kind === 'code' ? `${original}\nconst revived = ${probe};\n` : `${original}\r\n$revived = ${probe}\r\n`;
        assert.match(retiredVocabularyViolations(row, target, { read: () => planted }).join('\n'), expected, `${target}: ${probe}`);
      }
      if (row.kind === 'code') {
        // 주석 속 경위 설명은 대상이 아니다 — 종전 grep 계약과 같다.
        assert.deepEqual(retiredVocabularyViolations(row, target, { read: () => `${original}\n// 종전에는 manifest.packs 를 읽었다\n` }), []);
      }
    }
  }
  // 없는 대상은 조용히 통과하지 않는다.
  assert.match(retiredVocabularyViolations(RETIRED_PACK_VOCABULARY[2], 'scripts/renamed-away.mjs', { read: () => undefined }).join('\n'),
    /표의 대상이 없다: scripts\/renamed-away\.mjs/);
});
