#!/usr/bin/env node
/**
 * main 최신화 뒤 생성물 재생성(오케스트레이션 프로토콜 §6.4, DEC-OPS-178).
 *
 * 사용법:
 *   node scripts/merge-main-regenerate.mjs [--base origin/main] [--no-fetch]
 *   node scripts/merge-main-regenerate.mjs --continue   # 손으로 푼 충돌을 git add 한 뒤
 *
 * 하는 일:
 *   1. 작업 트리가 깨끗한지 확인하고 `--no-ff --no-commit` 으로 base 를 합친다(diff3 충돌 표기).
 *   2. 공용 메모리 표(결정 색인 — decisions.md·영역 색인·역사 색인 — 과 known-gaps.md·gap 영역 상세)의 충돌은 행 단위로 합친다. 같은 ID 를 양쪽이 다르게
 *      고쳤거나 같은 새 ID 를 썼으면 합치지 않고 멈춘다(프로토콜 §6.4 — 사람이 한 행으로 합치거나 번호를 바꾼다).
 *   3. 다시 만들 생성물의 충돌은 한쪽을 고르지 않고 재생성 결과로 덮는다. URL 승인 파일은 해시 줄만 다를 때 푼다.
 *      그 밖의 충돌(api-docs.json·하네스 manifest·메뉴 snapshot·소스)은 목록을 보이고 멈춘다. 하네스 manifest 는 양쪽 값이
 *      다른 키를 보이고, 다른 충돌이 다 풀렸으면 그 키의 node 계산값(`harness-baseline-manifest.mjs --keys`)도 보인다.
 *   4. 양쪽이 입력을 바꾼 생성기만 의존 순서대로 실행한다. 줄 끝만 바뀐 파일은 되돌리고 결과를 stage 한다.
 *   5. 충돌 표기가 남아 있으면 실패한다. 커밋은 하지 않는다 — `git diff --cached` 로 결과가 두 쪽 변경의
 *      합과 같은지 확인한 뒤 직접 `git commit --no-edit` 한다(합을 넘는 래칫 변화는 H2 판단이다).
 *
 * 다루지 않는 것: api-docs.json 추출(Gradle), 메뉴 snapshot 의 sourceMigrationHash(일회용 PostgreSQL) — §6.3 의 무거운
 * 실행이라 사람이 한 번씩 돌린다. 하네스 manifest 의 같은 키 충돌은 계산값만 보이고 풀지 않는다 — 그 키의 값만 옮기고 입력
 * 변경이 양쪽 모두 정당한지 확인하는 일(§6.4·H2)은 사람의 몫이다. manifest 를 `outputs` 로 두면 충돌 때 재생성이 통째로 덮어
 * 그 확인 지점이 조용히 사라진다.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
// 매니페스트는 경로·줄 형식 모듈만 읽는다(node 내장만 쓴다). 계산 도구는 재사용 투영 그래프를 끌어와, 병합 중 그 안에 충돌 표기가
// 남으면 이 도구가 시작도 못 한다 — 계산값은 다른 충돌이 다 풀렸을 때 하위 프로세스로만 얻는다.
import { adapterOutputs } from './agent-skill-adapters.mjs';
import { ALL_DECISION_INDEXES, GAP_DETAIL, GAP_INDEX } from './decision-indexes.mjs';
import { MANIFEST_PATH, parseManifest } from './harness-baseline-manifest-format.mjs';
import { slotRegistryOutputs } from './slot-registry.mjs';
// 승인 결속 범위는 생성기·승인 계약과 같은 함수 하나가 정한다(node 내장만 쓴다).
import { approvalCensusSha256 } from './ui-url-state-approval-binding.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 계약 생성기(sync-contract)의 출력 진입 파일. zod·operations 는 확장자를 뗀 같은 이름 폴더에 묶음 모듈이 있다. */
const CONTRACT_ENTRIES = ['frontend/src/types/generated-api.d.ts', 'frontend/src/types/generated-zod.ts',
  'frontend/src/types/generated-operations.ts'];
const CONTRACT_MODULE_DIRECTORIES = ['frontend/src/types/generated-zod', 'frontend/src/types/generated-operations'];

/** 진입 파일, 묶음 모듈 폴더, 그 폴더의 지금 .ts 파일(병합된 디스크에서 읽는다 — 양쪽이 새 묶음을 더해도 그 파일이 출력이다). */
export function syncContractOutputs(root) {
  const modules = CONTRACT_MODULE_DIRECTORIES.flatMap(directory => {
    const absolute = path.join(root, directory);
    if (!fs.existsSync(absolute)) return [];
    return fs.readdirSync(absolute).filter(name => name.endsWith('.ts')).sort().map(name => `${directory}/${name}`);
  });
  return [...CONTRACT_ENTRIES, ...CONTRACT_MODULE_DIRECTORIES, ...modules];
}

// 결정 색인(공용·영역·역사, DEC-OPS-381)은 ID 순서로 합친다. 한 결정은 색인 하나에만 있어야 한다(Atlas 생성기가 검사).
// gap 인덱스와 영역 상세(DEC-OPS-389)는 기존 순서를 지키고 새 행을 표 끝에 둔다.
export const MEMORY_TABLES = new Map([
  ...ALL_DECISION_INDEXES.map((file) => [file, { order: 'id' }]),
  [GAP_INDEX, { order: 'keep' }],
  [GAP_DETAIL, { order: 'keep' }],
]);

export const URL_CENSUS = 'config/ui-url-state-census.json';
export const URL_APPROVAL = 'config/ui-url-state-approval.json';
export const HARNESS_MANIFEST = MANIFEST_PATH;
export const HARNESS_MANIFEST_TOOL = 'scripts/harness-baseline-manifest.mjs';

const anyPath = () => true;
const under = (...prefixes) => file => prefixes.some(prefix => file === prefix || file.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`));

/**
 * 의존 순서대로 둔다 — 앞 단계의 출력이 뒤 단계의 입력이면 뒤 단계도 실행한다.
 * `outputs` 는 생성기가 통째로 다시 쓰는 파일이라 충돌하면 어느 쪽을 골라도 재생성이 덮는다.
 * `touches` 는 생성기가 다시 쓰기는 하지만 입력이기도 한 파일이라 충돌을 자동으로 풀지 않는다.
 * `check` 는 쓰지 않고 낡았는지만 보는 명령이다(`npm run regen -- --check`, scripts/regenerate.mjs). 생성기 자신의 검사 모드를 쓴다 —
 * 새 판정을 더하지 않는다. 운영 계약·codegen 게이트가 같은 생성물을 다시 보므로 이 목록은 실패를 앞당길 뿐이다.
 */
export const GENERATORS = [
  {
    id: 'sync-contract',
    inputs: under('api-docs.json'),
    // zod·operations 는 진입 파일 옆 같은 이름 폴더에 태그 묶음 모듈을 둔다(codegen-zod.js). 폴더 안의 지금 파일은 충돌을 재생성으로
    // 풀게 하고, 폴더 자체는 재생성이 지운 낡은 모듈까지 stage 하게 한다.
    get outputs() { return syncContractOutputs(repoRoot); },
    touches: ['api-docs.json'],
    command: ['pnpm', ['-C', 'frontend', 'run', 'syncContract']],
    // codegen:verify·codegen:verify:zod 와 같은 스크립트를 저장소 루트에서 바로 부른다(작업 트리·index 를 쓰지 않는다).
    check: [['node', ['scripts/verify-generated-contracts.mjs', 'api']], ['node', ['scripts/verify-generated-contracts.mjs', 'zod']]],
  },
  {
    id: 'permissions',
    // 권한 생성기는 생성물 표지(config/modules/presets.json 의 active)로 선택 권한 분기를 정한다(11단계 C5).
    inputs: under('config/governance/permission-catalog.json', 'config/governance/authorization-policies.json',
      'config/modules/presets.json'),
    outputs: ['business-core/src/main/java/nuri/business/security/authorization/PermissionCodes.java',
      'business-core/src/main/resources/authorization/permission-catalog.json',
      'business-core/src/main/resources/authorization/operation-bindings.json',
      'frontend/src/types/generated-permissions.ts'],
    touches: ['api-server/src/main/resources/db/migration/R__zz_seed_base_admin.sql'],
    command: ['node', ['scripts/generate-permissions.mjs']],
    check: [['node', ['scripts/generate-permissions.mjs', '--check']]],
  },
  {
    // 슬롯 레지스트리(슬롯 단계 PR-4)는 기여 파일 이름에서 만든다. 레지스트리도 frontend/src 의 소스라 그것을 읽는 census 들보다 앞이다.
    // 출력은 손으로 적지 않는다 — 병합된 디스크의 기여·레지스트리에서 읽는다(양쪽이 새 슬롯을 더해도 그 레지스트리가 출력이다).
    id: 'slot-registries',
    inputs: under('frontend/src/extensions'),
    get outputs() { return slotRegistryOutputs(repoRoot); },
    command: ['node', ['scripts/slot-registry.mjs', '--write']],
    check: [['node', ['scripts/slot-registry.mjs', '--check']]],
  },
  {
    id: 'boundary-census',
    inputs: under('frontend/src/', 'api-docs.json'),
    outputs: ['config/governance/generated-api-boundaries.json'],
    command: ['node', ['scripts/generated-boundary-census.mjs', '--write']],
    // 스냅숏 대조만 한다. 응답 모양 검사(V10)는 생성물 신선도가 아니라 소스 계약이고 그 시험이 운영 계약에서 돈다(약 1분).
    check: [['node', ['scripts/generated-boundary-census.mjs', '--check', '--snapshot-only']]],
  },
  {
    // 경계 census 의 출력(generated-api-boundaries.json)을 읽으므로 그 뒤다. 경계 census 는 이 산출물을 읽지 않는다
    // (호출 지점이 없는 생성 모듈이라 records 가 같다) — 순환이 아니다. 쓰기 귀속이 공용 컴포넌트·서비스를 따라가므로
    // 입력은 frontend/src 전체다. 권한 묶음(PERMISSION_BUNDLES)도 같은 산출물이라 묶음 원장과 묶음 문구를 검사하는
    // 화면 용어 원장도 입력이다 — 생성기의 SCREEN_REGISTRY_INPUTS 가 전부 여기 들어 있어야 한다(계약 테스트가 대조한다).
    id: 'screen-registry',
    inputs: under('frontend/src/', 'frontend/next.config.ts', 'config/governance/permission-catalog.json',
      'config/governance/authorization-policies.json', 'config/governance/generated-api-boundaries.json',
      'config/ui-route-capabilities.json', 'config/project-composer-menus.json', 'config/governance/permission-bundles.json',
      'config/frontend-visible-terms.json'),
    outputs: ['frontend/src/types/generated-screen-registry.ts'],
    command: ['node', ['scripts/generate-screen-registry.mjs']],
    check: [['node', ['scripts/generate-screen-registry.mjs', '--check']]],
  },
  {
    id: 'url-state-census',
    inputs: under('frontend/src/', 'frontend/next.config.ts', 'config/ui-route-capabilities.json'),
    outputs: [URL_CENSUS],
    touches: [URL_APPROVAL],
    command: ['node', ['scripts/ui-url-state-census.mjs', '--write']],
    check: [['node', ['scripts/ui-url-state-census.mjs', '--check']]],
    rebindUrlApproval: true,
  },
  {
    // 스킬 정본(.agent/skills)을 에이전트마다 찾는 경로(.agents/skills·.claude/skills)에 안내 파일로 노출한다. 다른 생성물을 읽지 않는다.
    id: 'agent-skill-adapters',
    requires: 'scripts/agent-skill-adapters.mjs',
    inputs: under('.agent/skills', '.agents/skills', '.claude/skills'),
    get outputs() { return adapterOutputs(repoRoot); },
    command: ['node', ['scripts/agent-skill-adapters.mjs', '--write']],
    check: [['node', ['scripts/agent-skill-adapters.mjs', '--check']]],
  },
  {
    id: 'atlas',
    // 재사용 생성물은 원본 Atlas 와 그 생성기를 걷는다. 생성기가 없는 저장소에서는 이 단계를 건너뛴다.
    requires: 'scripts/build-atlas.mjs',
    inputs: anyPath,
    outputs: ['frontend/public/governance_harness_atlas.html'],
    command: ['npm', ['run', 'atlas:build']],
    check: [['node', ['scripts/build-atlas.mjs', '--check']]],
  },
];

// ---------------------------------------------------------------- 공용 메모리 표

const ROW_ID = /^\| ([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+) \|/;
const MARK_OURS = /^<{7}(?: |$)/;
const MARK_BASE = /^\|{7}(?: |$)/;
const MARK_SPLIT = /^={7}$/;
const MARK_THEIRS = /^>{7}(?: |$)/;

function rowsById(lines, side) {
  const rows = new Map();
  for (const line of lines) {
    const id = ROW_ID.exec(line)?.[1];
    if (!id) throw new Error(`표 행이 아닌 줄이 ${side} 충돌 구역에 있어 행 단위로 합칠 수 없다: ${JSON.stringify(line.slice(0, 80))}`);
    if (rows.has(id)) throw new Error(`${side} 충돌 구역에 같은 ID(${id})가 두 줄 있다`);
    rows.set(id, line);
  }
  return rows;
}

export function compareRowIds(left, right) {
  const split = id => { const at = id.lastIndexOf('-'); return [id.slice(0, at), id.slice(at + 1)]; };
  const [lp, ln] = split(left);
  const [rp, rn] = split(right);
  if (lp !== rp) return lp < rp ? -1 : 1;
  const numeric = /^\d+$/.test(ln) && /^\d+$/.test(rn);
  return numeric ? Number(ln) - Number(rn) : (ln < rn ? -1 : ln > rn ? 1 : 0);
}

/** 한 충돌 구역을 행 단위 3-way 로 합친다. base 가 없으면(2-way) 빈 base 로 본다. */
export function mergeRows({ ours, base = [], theirs }, { order }) {
  const o = rowsById(ours, 'ours');
  const b = rowsById(base, 'base');
  const t = rowsById(theirs, 'theirs');
  const merged = new Map();
  const ids = [...new Set([...o.keys(), ...t.keys(), ...b.keys()])];
  for (const id of ids) {
    const [ol, bl, tl] = [o.get(id), b.get(id), t.get(id)];
    let pick;
    if (ol === tl) pick = ol;
    else if (ol === bl) pick = tl;
    else if (tl === bl) pick = ol;
    else if (bl === undefined) {
      throw new Error(`두 쪽이 같은 새 ID(${id})를 다른 내용으로 썼다 — 나중에 병합하는 쪽이 다음 번호로 바꾸고 참조도 고친다`);
    } else {
      throw new Error(`같은 ID(${id}) 행을 양쪽이 다르게 고쳤다 — 두 변경을 한 행으로 합쳐야 한다`);
    }
    if (pick !== undefined) merged.set(id, pick);
  }
  if (order === 'id') return [...merged.keys()].sort(compareRowIds).map(id => merged.get(id));
  const ordered = [...o.keys(), ...t.keys()].filter((id, index, all) => all.indexOf(id) === index && merged.has(id));
  return ordered.map(id => merged.get(id));
}

/** 충돌 표기가 있는 공용 메모리 표 본문을 풀어 돌려준다. 줄 끝(CRLF)은 원문을 따른다. */
export function resolveMemoryTableConflicts(text, options) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!MARK_OURS.test(lines[i])) { out.push(lines[i]); continue; }
    const hunk = { ours: [], base: [], theirs: [] };
    let section = 'ours';
    for (i += 1; i < lines.length && !MARK_THEIRS.test(lines[i]); i += 1) {
      if (MARK_BASE.test(lines[i])) section = 'base';
      else if (MARK_SPLIT.test(lines[i])) section = 'theirs';
      else hunk[section].push(lines[i]);
    }
    if (i >= lines.length) throw new Error('닫히지 않은 충돌 구역이 있다');
    out.push(...mergeRows(hunk, options));
  }
  return out.join(eol);
}

// ---------------------------------------------------------------- 충돌 표기·해시 결속

export function findConflictMarkers(text) {
  return text.split(/\r?\n/).flatMap((line, index) =>
    (MARK_OURS.test(line) || MARK_BASE.test(line) || MARK_THEIRS.test(line) ? [index + 1] : []));
}

/** 충돌 구역의 차이가 `"sha256": "<hex>"` 줄뿐이면 ours 쪽으로 풀고, 아니면 null(수동). */
export function resolveHashOnlyConflicts(text) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const hash = /^\s*"sha256": "[0-9a-f]{64}",?$/;
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!MARK_OURS.test(lines[i])) { out.push(lines[i]); continue; }
    const hunk = { ours: [], base: [], theirs: [] };
    let section = 'ours';
    for (i += 1; i < lines.length && !MARK_THEIRS.test(lines[i]); i += 1) {
      if (MARK_BASE.test(lines[i])) section = 'base';
      else if (MARK_SPLIT.test(lines[i])) section = 'theirs';
      else hunk[section].push(lines[i]);
    }
    if (i >= lines.length) return null;
    const onlyHashes = [hunk.ours, hunk.theirs].every(side => side.length === hunk.ours.length && side.every(line => hash.test(line)));
    if (!onlyHashes) return null;
    out.push(...hunk.ours);
  }
  return out.join(eol);
}

/**
 * 하네스 manifest 충돌 구역에서 양쪽(ours·theirs) 값이 다른 키. 한쪽에만 있는 키도 넣는다. 닫히지 않은 구역은 실패한다.
 * 키의 값을 고르지 않는다 — 계산값을 보여 줄 목록일 뿐이다.
 */
export function harnessManifestConflictKeys(text) {
  const lines = text.split(/\r?\n/);
  const keys = new Set();
  for (let i = 0; i < lines.length; i += 1) {
    if (!MARK_OURS.test(lines[i])) continue;
    const hunk = { ours: [], base: [], theirs: [] };
    let section = 'ours';
    for (i += 1; i < lines.length && !MARK_THEIRS.test(lines[i]); i += 1) {
      if (MARK_BASE.test(lines[i])) section = 'base';
      else if (MARK_SPLIT.test(lines[i])) section = 'theirs';
      else hunk[section].push(lines[i]);
    }
    if (i >= lines.length) throw new Error('닫히지 않은 충돌 구역이 있다');
    // 키 해석은 계산 도구·메타 게이트와 같은 줄 형식(형식 모듈)이다.
    const [ours, theirs] = [parseManifest(hunk.ours.join('\n')), parseManifest(hunk.theirs.join('\n'))];
    for (const key of new Set([...ours.keys(), ...theirs.keys()])) if (ours.get(key) !== theirs.get(key)) keys.add(key);
  }
  return [...keys].sort();
}

/**
 * unmerged manifest 를 수동 목록의 한 항목으로 만든다. 예외를 던지지 않는다 — 던지면 다른 충돌의 목록과 안내가 함께 사라진다.
 * 작업 트리에 파일이 없거나(양쪽이 다른 이름으로 옮겼거나 손으로 지웠다) 충돌 표기가 없으면(한쪽이 지우고 다른 쪽이 고쳤다)
 * 같은 키 충돌이 아니므로 키 없이 그 사정을 안내한다.
 */
function harnessManifestConflict(absolute) {
  const conflict = (keys, reason) => ({ file: HARNESS_MANIFEST, keys, reason });
  try {
    if (!fs.existsSync(absolute)) {
      return conflict([], '작업 트리에 manifest 가 없다 — 양쪽이 다른 이름으로 옮긴 충돌(rename/rename)이거나 손으로 지웠다. '
        + 'git status 로 확인하고 git add 또는 git rm 으로 정한 뒤 --continue 한다.');
    }
    const text = fs.readFileSync(absolute, 'utf8');
    if (!findConflictMarkers(text).length) {
      return conflict([], '충돌 표기가 없다 — 한쪽이 지우고 다른 쪽이 고친 충돌(modify/delete)이거나 이미 손으로 푼 파일이다. '
        + `남길지 지울지 정하고, 남기면 \`node ${HARNESS_MANIFEST_TOOL} --check\` 로 계산값과 대조한 뒤 git add(지우면 git rm) 한다.`);
    }
    const keys = harnessManifestConflictKeys(text);
    return conflict(keys, `하네스 manifest 의 같은 키 충돌 — 양쪽 값이 다른 키: ${keys.join(', ') || '없음'}. `
      + '그 키의 값만 옮기고 입력 변경이 양쪽 모두 정당한지 확인한다(§6.4·H2, 통째로 다시 쓰지 않는다).');
  } catch (error) {
    return conflict([], error.message);
  }
}

/** manifest 충돌만 남았으면 충돌 키의 node 계산값을 붙인다. 다른 충돌이 남았으면 그 입력이 아직 확정되지 않아 계산하지 않는다. */
function attachHarnessManifestValues(cwd, manual) {
  const conflict = manual.find(item => item.file === HARNESS_MANIFEST);
  if (!conflict?.keys.length) return;
  const command = `node ${HARNESS_MANIFEST_TOOL} --keys ${conflict.keys.join(' ')}`;
  if (manual.length > 1) {
    conflict.reason += `\n    다른 충돌을 모두 푼 뒤 \`${command}\` 로 계산값을 본다.`;
    return;
  }
  if (!fs.existsSync(path.join(cwd, HARNESS_MANIFEST_TOOL))) {
    conflict.reason += `\n    ${HARNESS_MANIFEST_TOOL} 이 이 저장소에 없다 — 하네스를 실행해 산출 파일에서 그 키의 값만 옮긴다.`;
    return;
  }
  const result = run(cwd, 'node', [HARNESS_MANIFEST_TOOL, '--keys', ...conflict.keys], { allowFailure: true });
  const output = `${result.stdout}${result.stderr}`.trimEnd();
  conflict.reason += result.status === 0
    ? `\n    ${command}:\n${output.split(/\r?\n/).map(line => `      ${line}`).join('\n')}`
    : `\n    ${command} 실패(${result.status}): ${output}`;
}

export function urlCensusSha256(censusText) {
  return approvalCensusSha256(JSON.parse(censusText));
}

export function rebindApprovalText(approvalText, censusText) {
  const approval = JSON.parse(approvalText);
  const previous = approval?.manifestRef?.sha256;
  if (approval?.manifestRef?.path !== URL_CENSUS || !/^[0-9a-f]{64}$/.test(previous ?? '')) {
    throw new Error(`${URL_APPROVAL} 의 manifestRef 가 ${URL_CENSUS} 를 가리키지 않는다`);
  }
  const next = urlCensusSha256(censusText);
  if (approvalText.split(previous).length !== 2) throw new Error('승인 파일에서 결속 해시가 한 번만 나와야 한다');
  return approvalText.replace(previous, next);
}

// ---------------------------------------------------------------- 재생성 계획

/**
 * 양쪽이 입력을 바꿨거나 양쪽이 출력을 바꾼(충돌 포함) 생성기를 고른다. 앞 단계가 실행되면 그 출력은
 * 뒤 단계에서 양쪽이 바꾼 입력으로 본다.
 */
export function planRegeneration({ ours, theirs }, generators = GENERATORS) {
  const both = new Set(ours.filter(file => theirs.includes(file)));
  const touchedBy = (files, predicate) => files.some(predicate);
  const plan = [];
  const produced = new Set();
  for (const generator of generators) {
    const outputHit = generator.outputs.some(file => both.has(file) || produced.has(file));
    const inputHit = (touchedBy(ours, generator.inputs) && touchedBy(theirs, generator.inputs))
      || [...produced].some(generator.inputs);
    if (outputHit || inputHit) {
      plan.push(generator);
      generator.outputs.forEach(file => produced.add(file));
    }
  }
  return plan;
}

// ---------------------------------------------------------------- git·실행

function run(cwd, command, args, { allowFailure = false } = {}) {
  // npm·pnpm 은 Windows 에서 .cmd 셸 스크립트라 셸로만 실행된다. node 는 공백이 든 경로도 그대로 실행한다.
  const executable = command === 'node' ? process.execPath : command;
  const shell = process.platform === 'win32' && (command === 'npm' || command === 'pnpm');
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8', shell });
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} 실패(${result.status})\n${result.stdout}${result.stderr}`);
  }
  return result;
}

const git = (cwd, ...args) => run(cwd, 'git', args).stdout;
const lines = text => text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

function restoreEolOnly(cwd, files) {
  const restored = [];
  for (const file of files) {
    if (!fs.existsSync(path.join(cwd, file))) continue;
    const changed = run(cwd, 'git', ['diff', '--quiet', '--', file], { allowFailure: true }).status !== 0;
    const contentChanged = run(cwd, 'git', ['diff', '--quiet', '--ignore-cr-at-eol', '--', file], { allowFailure: true }).status !== 0;
    if (changed && !contentChanged) { git(cwd, 'checkout', '--', file); restored.push(file); }
  }
  return restored;
}

/**
 * 합치기와 재생성을 수행한다. 테스트는 `generators` 로 가짜 생성기를, `log` 로 출력 수집기를 넘긴다.
 * 반환: { status: 'up-to-date' | 'manual' | 'ready', manual, plan, resolved }
 */
export function mergeMainAndRegenerate({
  cwd = repoRoot, base = 'origin/main', fetch = true, resume = false, generators = GENERATORS, log = console.log,
} = {}) {
  const gitDir = path.resolve(cwd, git(cwd, 'rev-parse', '--git-dir').trim());
  const merging = fs.existsSync(path.join(gitDir, 'MERGE_HEAD'));
  let theirsRef;
  if (resume) {
    if (!merging) throw new Error('--continue 는 진행 중인 병합이 있을 때만 쓴다');
    theirsRef = 'MERGE_HEAD';
  } else {
    if (merging) throw new Error('이미 병합이 진행 중이다 — 충돌을 풀고 --continue 로 이어 간다');
    if (git(cwd, 'status', '--porcelain', '--untracked-files=no').trim()) {
      throw new Error('커밋하지 않은 변경이 있다 — 다른 작업을 섞지 않도록 먼저 커밋하거나 치운다');
    }
    if (fetch) {
      const [remote, ...branch] = base.split('/');
      git(cwd, 'fetch', remote, branch.join('/'));
    }
    const merge = run(cwd, 'git', ['-c', 'merge.conflictStyle=diff3', 'merge', '--no-ff', '--no-commit', base],
      { allowFailure: true });
    if (!fs.existsSync(path.join(gitDir, 'MERGE_HEAD'))) {
      if (merge.status !== 0) throw new Error(`병합을 시작하지 못했다\n${merge.stdout}${merge.stderr}`);
      log('이미 최신이다 — 합칠 커밋이 없다.');
      return { status: 'up-to-date', manual: [], plan: [], resolved: [] };
    }
    theirsRef = base;
  }

  const mergeBase = git(cwd, 'merge-base', 'HEAD', theirsRef).trim();
  const ours = lines(git(cwd, 'diff', '--name-only', mergeBase, 'HEAD'));
  const theirs = lines(git(cwd, 'diff', '--name-only', mergeBase, theirsRef));
  const available = generators.filter(generator => !generator.requires || fs.existsSync(path.join(cwd, generator.requires)));
  for (const generator of generators.filter(generator => !available.includes(generator))) {
    log(`건너뜀: ${generator.id} — ${generator.requires} 이 이 저장소에 없다.`);
  }
  const plan = planRegeneration({ ours, theirs }, available);
  const regenerated = new Set(plan.flatMap(generator => generator.outputs));

  const resolved = [];
  const manual = [];
  for (const file of lines(git(cwd, 'diff', '--name-only', '--diff-filter=U'))) {
    const absolute = path.join(cwd, file);
    if (file === HARNESS_MANIFEST) {
      manual.push(harnessManifestConflict(absolute));
      continue;
    }
    const memory = MEMORY_TABLES.get(file);
    try {
      if (memory) {
        fs.writeFileSync(absolute, resolveMemoryTableConflicts(fs.readFileSync(absolute, 'utf8'), memory));
      } else if (regenerated.has(file)) {
        git(cwd, 'checkout', '--theirs', '--', file);
      } else if (file === URL_APPROVAL && regenerated.has(URL_CENSUS)) {
        const text = resolveHashOnlyConflicts(fs.readFileSync(absolute, 'utf8'));
        if (text === null) throw new Error('해시 줄 밖의 승인 항목이 충돌했다');
        fs.writeFileSync(absolute, text);
      } else {
        throw new Error('자동으로 풀 수 있는 생성물·공용 메모리 표가 아니다');
      }
      git(cwd, 'add', '--', file);
      resolved.push(file);
    } catch (error) {
      manual.push({ file, reason: error.message });
    }
  }
  attachHarnessManifestValues(cwd, manual);
  if (manual.length) {
    log('손으로 풀어야 하는 충돌이 있다. 풀고 `git add` 한 뒤 `--continue` 로 이어 간다(프로토콜 §6.4):');
    for (const { file, reason } of manual) log(`  - ${file}: ${reason}`);
    return { status: 'manual', manual, plan: plan.map(g => g.id), resolved };
  }

  for (const generator of plan) {
    log(`재생성: ${generator.id}`);
    run(cwd, generator.command[0], generator.command[1]);
    if (generator.rebindUrlApproval) {
      const approval = path.join(cwd, URL_APPROVAL);
      fs.writeFileSync(approval, rebindApprovalText(fs.readFileSync(approval, 'utf8'), fs.readFileSync(path.join(cwd, URL_CENSUS), 'utf8')));
    }
  }
  const outputs = [...new Set(plan.flatMap(generator => [...generator.outputs, ...(generator.touches ?? [])]))]
    .filter(file => fs.existsSync(path.join(cwd, file)));
  const eolOnly = restoreEolOnly(cwd, outputs);
  if (eolOnly.length) log(`줄 끝만 바뀐 파일을 되돌렸다: ${eolOnly.join(', ')}`);
  if (outputs.length) git(cwd, 'add', '--', ...outputs);

  const unmerged = lines(git(cwd, 'diff', '--name-only', '--diff-filter=U'));
  const touched = new Set([...lines(git(cwd, 'diff', '--name-only', '--cached', 'HEAD')), ...lines(git(cwd, 'diff', '--name-only'))]);
  const marked = [...touched].filter(file => fs.existsSync(path.join(cwd, file))
    && findConflictMarkers(fs.readFileSync(path.join(cwd, file), 'utf8')).length);
  if (unmerged.length || marked.length) {
    throw new Error(`충돌 표기가 남아 있다: ${[...new Set([...unmerged, ...marked])].join(', ')}`);
  }
  log(`준비됐다. 자동으로 푼 충돌: ${resolved.length ? resolved.join(', ') : '없음'}; 재생성: ${plan.map(g => g.id).join(', ') || '없음'}`);
  log('`git diff --cached` 로 결과가 두 쪽 변경의 합과 같은지 확인한 뒤 `git commit --no-edit` 한다.');
  log('api-docs.json 추출·메뉴 snapshot 은 해당하면 프로토콜 §6.4 대로 따로 실행한다. '
    + `하네스 manifest 는 \`node ${HARNESS_MANIFEST_TOOL} --check\` 로 계산값과 같은지 본다.`);
  return { status: 'ready', manual, plan: plan.map(g => g.id), resolved };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const argv = process.argv.slice(2);
  const option = name => { const at = argv.indexOf(name); return at >= 0 ? argv[at + 1] : undefined; };
  try {
    const result = mergeMainAndRegenerate({
      base: option('--base') ?? 'origin/main',
      fetch: !argv.includes('--no-fetch'),
      resume: argv.includes('--continue'),
    });
    process.exitCode = result.status === 'manual' ? 2 : 0;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
