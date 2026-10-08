import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * 기본 그룹이 없어 생성 직후 아무에게도 배정되지 않는 권한(설계서 B8). 권한 원장의 defaultGroups:[] 행과 정확히
 * 대응해야 한다 — 원장에 그런 권한이 늘거나 줄면 이 표를 같은 변경에서 고친다. 문장은 계획 화면에 그대로 나가므로
 * 모든 구성에서 참이어야 한다(예: 알림이 없는 구성에도 맞게 후속 작업을 '첨부 삭제 같은' 으로 말한다).
 * 이 표는 카탈로그 해시에 들어가지 않는다. 문구를 고쳐도 구성 해시와 로컬 DB 번들이 바뀌지 않는다.
 */
export const UNASSIGNED_PERMISSION_GUIDANCE = {
  ADT_LOG_READ: { bundle: 'log-audit-viewer', protected: false,
    effect: '민감 작업 감사 원장에서 누가 언제 민감한 조회·변경을 했는지 봅니다.' },
  DWORK_READ: { bundle: 'log-audit-viewer', protected: false,
    effect: '첨부 삭제 같은 후속 작업의 처리 상태를 봅니다.' },
  DWORK_RETRY: { bundle: null, protected: false,
    effect: '실패한 후속 작업을 다시 실행합니다. 실패한 작업을 보려면 후속 작업 상태 조회 권한도 함께 있어야 하고, 감사 원장 열람 권한과는 다른 그룹에 두기를 권합니다.' },
  // 기본 설정은 공지와 FAQ 가 같은 게시판이라 두 편집 권한이 모두 있어야 쓰고 고치고 지울 수 있다(BoardService).
  FAQ_EDIT: { bundle: 'board-community-operations', protected: false,
    effect: 'FAQ 게시판에 글을 쓰고 고치고 지웁니다. 기본 설정처럼 공지와 FAQ 가 같은 게시판이면 공지 편집 권한도 함께 있어야 하며, 배정하기 전에는 관리자도 쓸 수 없습니다.' },
  MFA_RECOVER: { bundle: 'account-recovery', protected: true,
    effect: '추가 인증 수단을 잃은 사용자의 계정 복구를 승인합니다.' },
  NOTICE_EDIT: { bundle: 'board-community-operations', protected: false,
    effect: '공지 게시판에 글을 쓰고 고치고 지웁니다. 기본 설정처럼 공지와 FAQ 가 같은 게시판이면 FAQ 편집 권한도 함께 있어야 하며, 배정하기 전에는 관리자도 쓸 수 없습니다.' },
};

const bundleHow = name => `권한 작업대에서 '${name}' 묶음을 그룹에 더하면 함께 배정됩니다.`;
const DIRECT_HOW = '권한 작업대의 기능별 권한 표에서 필요한 그룹에 직접 줍니다.';
const PROTECTED_HOW = " 보호 권한이라 권한 관리의 '기능·메뉴 권한 설정'과 '배정' 권한을 함께 가진 관리자만 저장할 수 있습니다.";

/** 순수 판정. 원장·묶음과 안내 표가 어긋나면 실패한다. */
export function validateUnassignedGuidance({ guidance = UNASSIGNED_PERMISSION_GUIDANCE, permissions, bundles }) {
  const fail = message => { throw new Error(`project-composer unassigned permissions: ${message}`); };
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
  return validateUnassignedGuidance({ permissions: read('config/governance/permission-catalog.json'),
    bundles: read('config/governance/permission-bundles.json') });
}
