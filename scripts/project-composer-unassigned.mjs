import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadComposerModules } from './composer-modules.mjs';

/*
 * 기본 그룹이 없어 생성 직후 아무에게도 배정되지 않는 권한(설계서 B8). 권한 원장의 defaultGroups:[] 행과 정확히
 * 대응해야 한다 — 원장에 그런 권한이 늘거나 줄면 이 표를 같은 변경에서 고친다. 문장은 계획 화면에 그대로 나가므로
 * 모든 구성에서 참이어야 한다(예: 알림이 없는 구성에도 맞게 후속 작업을 '첨부 삭제 같은' 으로 말한다).
 * 이 표는 카탈로그 해시에 들어가지 않는다. 문구를 고쳐도 구성 해시와 로컬 DB 번들이 바뀌지 않는다.
 * 표는 그 권한을 소유한 기능 파일(없으면 core.json)의 unassignedPermissions 에 둔다(11단계 C7 — 이 모듈의 상수를 걷었다).
 * 공지·FAQ 편집 권한은 기본 설정처럼 두 게시판이 같으면 둘 다 있어야 쓴다(BoardService) — 문장이 그 사실을 말한다.
 */
const bundleHow = name => `권한 작업대에서 '${name}' 묶음을 그룹에 더하면 함께 배정됩니다.`;
const DIRECT_HOW = '권한 작업대의 기능별 권한 표에서 필요한 그룹에 직접 줍니다.';
const PROTECTED_HOW = " 보호 권한이라 권한 관리의 '기능·메뉴 권한 설정'과 '배정' 권한을 함께 가진 관리자만 저장할 수 있습니다.";

/** 순수 판정. 원장·묶음과 안내 표가 어긋나면 실패한다. */
export function validateUnassignedGuidance({ guidance, permissions, bundles }) {
  const fail = message => { throw new Error(`project-composer unassigned permissions: ${message}`); };
  if (!guidance || typeof guidance !== 'object') fail('guidance from the feature files is required');
  const unassigned = permissions.permissions.filter(permission => Array.isArray(permission.defaultGroups) && permission.defaultGroups.length === 0);
  const expected = unassigned.map(permission => permission.code).sort();
  const declared = Object.keys(guidance).sort();
  for (const code of expected) if (!declared.includes(code)) fail(`unassigned permission lacks guidance: ${code}`);
  for (const code of declared) if (!expected.includes(code)) fail(`guidance names a permission with default groups or no catalog row: ${code}`);
  const excluded = new Set((bundles.excluded ?? []).map(row => row.code));
  return unassigned.map(permission => {
    const row = guidance[permission.code];
    if (typeof row.effect !== 'string' || !row.effect.endsWith('.')) fail(`guidance needs an effect sentence: ${permission.code}`);
    let bundle = null;
    if (row.bundle === null) {
      if (!excluded.has(permission.code)) fail(`guidance without a bundle must be an excluded permission: ${permission.code}`);
    } else {
      const found = bundles.bundles.find(candidate => candidate.id === row.bundle);
      if (!found || !found.permissions.includes(permission.code)) fail(`guidance bundle does not contain the permission: ${permission.code} -> ${row.bundle}`);
      bundle = { id: found.id, name: found.name };
    }
    const howToAssign = `${bundle ? bundleHow(bundle.name) : DIRECT_HOW}${row.protected ? PROTECTED_HOW : ''}`;
    return { code: permission.code, name: permission.name, protected: row.protected, effect: row.effect, howToAssign, bundle };
  }).sort((a, b) => a.code.localeCompare(b.code));
}

export function loadUnassignedPermissionGuidance(root) {
  const read = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
  const guidance = Object.fromEntries(Object.entries(loadComposerModules(root).extras.unassigned)
    .map(([code, row]) => [code, { bundle: row.bundle, protected: row.protected, effect: row.effect }]));
  return validateUnassignedGuidance({ guidance, permissions: read('config/governance/permission-catalog.json'),
    bundles: read('config/governance/permission-bundles.json') });
}
