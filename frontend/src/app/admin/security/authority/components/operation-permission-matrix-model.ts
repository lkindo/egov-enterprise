import {
  OTHER_PERMISSION_CATEGORY,
  PERMISSION_DOMAIN_CATEGORIES,
  PERMISSION_MATRIX_COLUMNS,
  permissionDomainCategory,
  permissionDomainLabel,
} from '@/lib/auth/permission-labels';
import type { MenuMissingEntryPermission } from '@/lib/auth/navigation-permission-tree';
import { PROTECTED_PERMISSIONS } from '@/types/generated-screen-registry';

/**
 * '기능별 권한' 표(업무 영역 × 행위)의 순수 모델(2026-10-02, 관리 콘솔 UX 1단계).
 *
 * 화면 표현과 떼어 둔다 — 2단계의 '화면별 권한' 작업대가 같은 행 구성·일괄 선택 규칙·칸 이동을 그대로 쓴다.
 * 이 모듈은 선택 상태를 바꾸지 않는다. 무엇을 바꿀지 계산할 뿐이고, 초안 반영과 저장은 편집기가 소유한다.
 */

export interface MatrixOperation {
  code: string;
  domain: string;
  action: string;
  name: string;
}

/**
 * 보호 권한 — 서버 SENSITIVE_ADMINISTRATION_PERMISSIONS 와 같은 집합이다. 이 권한을 더하거나 빼는 저장은 권한 설정
 * (AUTHRT_GRANT)과 사용자 배정(AUTHRT_ASSIGN)을 모두 가진 관리자만 할 수 있다. 줄·열·분류 일괄 선택에서 빼고 칸마다 따로
 * 고르게 한다 — 인가 의미가 다른 칸을 한 동작으로 뭉뚱그리지 않는다(H3).
 *
 * [2026-10-02 3단계 A] 정본은 화면 목록 생성물의 PROTECTED_PERMISSIONS 다(생성기 계약이 서버 집합과 대조한다). 화면은
 * 사본 리터럴을 두지 않는다 — 사본은 서버·생성기 어느 쪽에도 묶이지 않아 조용히 어긋난다.
 */
export const PROTECTED_PERMISSION_CODES: ReadonlySet<string> = new Set<string>(PROTECTED_PERMISSIONS);

export const isProtectedPermission = (code: string): boolean => PROTECTED_PERMISSION_CODES.has(code);
export const operationKey = (code: string): string => `OPERATION:${code}`;

/**
 * 타인 자료 권한(…_ALL — 타인 자료 조회·수정·삭제, 관리자 등록 등). 본인 자료 권한과 인가 의미가 달라 한 번에 여러 메뉴를
 * 고치는 일괄 동작에 섞지 않는다(H3). 권한 코드는 `영역_행위` 이고 타인 자료 행위는 모두 `_ALL` 로 끝난다.
 */
export const isOthersDataPermission = (code: string): boolean => /_ALL$/.test(code);

export interface MatrixRow {
  domain: string;
  label: string;
  categoryKey: string;
  /** {@link PERMISSION_MATRIX_COLUMNS} 순서. 그 행위가 없는 영역은 null 이다(빈 칸). */
  columns: ReadonlyArray<MatrixOperation | null>;
  /** 고정 열에 없는 행위. 카탈로그 순서를 따른다. */
  others: readonly MatrixOperation[];
  /** 이 영역의 모든 권한(카탈로그 순서). */
  operations: readonly MatrixOperation[];
}

export interface MatrixCategory {
  key: string;
  label: string;
  rows: MatrixRow[];
}

/**
 * 카탈로그를 분류별 행으로 묶는다. 분류는 표 순서, 분류 안의 영역은 분류 표 순서, '기타'는 카탈로그에 처음 나온 순서다.
 * 같은 영역·행위가 두 번 나오면 뒤의 것을 '그 밖의 기능'에 둔다 — 어떤 권한도 화면에서 사라지지 않게 한다.
 */
export function buildOperationMatrix(operations: readonly MatrixOperation[]): MatrixCategory[] {
  const byDomain = new Map<string, MatrixOperation[]>();
  for (const operation of operations) {
    const list = byDomain.get(operation.domain);
    if (list) list.push(operation);
    else byDomain.set(operation.domain, [operation]);
  }
  const rowOf = (domain: string, list: MatrixOperation[]): MatrixRow => {
    const columns: Array<MatrixOperation | null> = PERMISSION_MATRIX_COLUMNS.map(() => null);
    const others: MatrixOperation[] = [];
    for (const operation of list) {
      const index = PERMISSION_MATRIX_COLUMNS.findIndex((column) => column.action === operation.action);
      if (index >= 0 && columns[index] === null) columns[index] = operation;
      else others.push(operation);
    }
    return { domain, label: permissionDomainLabel(domain), categoryKey: permissionDomainCategory(domain).key, columns, others, operations: list };
  };
  const categories: MatrixCategory[] = PERMISSION_DOMAIN_CATEGORIES.map((category) => ({
    key: category.key,
    label: category.label,
    rows: category.domains.filter((domain) => byDomain.has(domain)).map((domain) => rowOf(domain, byDomain.get(domain)!)),
  }));
  const otherRows = [...byDomain.entries()]
    .filter(([domain]) => permissionDomainCategory(domain).key === OTHER_PERMISSION_CATEGORY.key)
    .map(([domain, list]) => rowOf(domain, list));
  categories.push({ key: OTHER_PERMISSION_CATEGORY.key, label: OTHER_PERMISSION_CATEGORY.label, rows: otherRows });
  return categories.filter((category) => category.rows.length > 0);
}

/** '기능 검색': 영역 라벨·영역 코드·권한 코드·권한 이름 중 하나라도 포함하면 그 행을 보인다. 행 단위로만 거른다. */
export function matrixRowMatches(row: MatrixRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [row.label, row.domain, ...row.operations.flatMap((operation) => [operation.code, operation.name])]
    .some((text) => text.toLowerCase().includes(needle));
}

export interface BulkTogglePlan {
  /** 'select' 는 꺼진 칸을 켜고, 'clear' 는 켜진 칸을 끈다. null 이면 할 일이 없다. */
  mode: 'select' | 'clear' | null;
  /** 실제로 바뀌는 칸의 키. */
  keys: string[];
}

/**
 * 줄·열·분류 일괄 선택. 범위 안 비보호 칸이 모두 켜져 있으면 해제, 아니면 선택한다. 보호 권한은 범위에서 뺀다.
 * 추가가 막힌 그룹(공개 메뉴 그룹)은 해제만 할 수 있다 — 켤 수 없는 칸을 '선택'으로 약속하지 않는다.
 */
export function planBulkToggle(
  operations: readonly MatrixOperation[],
  selection: ReadonlySet<string>,
  allowAdd: boolean,
): BulkTogglePlan {
  const keys = operations.filter((operation) => !isProtectedPermission(operation.code)).map((operation) => operationKey(operation.code));
  const on = keys.filter((key) => selection.has(key));
  if (keys.length === 0) return { mode: null, keys: [] };
  if (on.length === keys.length) return { mode: 'clear', keys: on };
  if (allowAdd) return { mode: 'select', keys: keys.filter((key) => !selection.has(key)) };
  return on.length > 0 ? { mode: 'clear', keys: on } : { mode: null, keys: [] };
}

/** 기준선과 다른 칸의 키(카탈로그 순서). 표의 변경 표시와 저장 전 요약이 같은 계산을 쓴다. */
export function changedOperationKeys(
  operations: readonly MatrixOperation[],
  selection: ReadonlySet<string>,
  baseline: ReadonlySet<string>,
): string[] {
  return operations.map((operation) => operationKey(operation.code)).filter((key) => selection.has(key) !== baseline.has(key));
}

export interface CellPosition {
  row: number;
  col: number;
}

/**
 * 방향키 이동 목적지. 좌우는 같은 줄에서 다음으로 있는 칸(빈 칸은 건너뛴다), 위아래는 이웃 줄에서 같은 열이거나
 * 가장 가까운 열의 칸이다. 갈 곳이 없으면 null 이다(포커스를 그대로 둔다).
 */
export function nextCellPosition(cells: readonly CellPosition[], current: CellPosition, key: string): CellPosition | null {
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const sameRow = cells.filter((cell) => cell.row === current.row).sort((a, b) => a.col - b.col);
    const candidates = key === 'ArrowRight'
      ? sameRow.filter((cell) => cell.col > current.col)
      : sameRow.filter((cell) => cell.col < current.col).reverse();
    return candidates[0] ?? null;
  }
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    const rows = [...new Set(cells.map((cell) => cell.row))].sort((a, b) => a - b);
    const targetRow = key === 'ArrowDown' ? rows.find((row) => row > current.row) : [...rows].reverse().find((row) => row < current.row);
    if (targetRow === undefined) return null;
    return cells
      .filter((cell) => cell.row === targetRow)
      .reduce<CellPosition | null>((best, cell) => {
        if (!best) return cell;
        const distance = Math.abs(cell.col - current.col);
        const bestDistance = Math.abs(best.col - current.col);
        return distance < bestDistance || (distance === bestDistance && cell.col < best.col) ? cell : best;
      }, null);
  }
  return null;
}

/** 진입 권한이 없는 메뉴 하나를 고치는 방법. 'auto' 는 더할 권한이 정해져 있고, 'choose' 는 후보 중 하나를 골라야 한다. */
export type EntryFix =
  | { kind: 'auto'; menu: MenuMissingEntryPermission; codes: string[] }
  | { kind: 'choose'; menu: MenuMissingEntryPermission; candidates: string[]; preferred: string }
  | { kind: 'unfixable'; menu: MenuMissingEntryPermission; reason: string };

/**
 * 메뉴 판정을 고치는 방법으로 바꾼다. 후보는 현재 기능 목록에 있는 권한만 쓴다 — 목록에 없는 코드는 저장 본문
 * (selectedGrants)에서 빠지므로 고친 것처럼 보이게 하지 않는다. ALL 은 필요한 것 전부, 후보가 여럿인 ANY 는
 * 사람이 고르게 하되 조회(*_READ)를 먼저 권한다.
 */
export function planEntryFixes(missing: readonly MenuMissingEntryPermission[], catalogCodes: ReadonlySet<string>): EntryFix[] {
  return missing.map((menu): EntryFix => {
    if (!menu.fixable) return { kind: 'unfixable', menu, reason: '등록되지 않은 화면이라 기능권한으로 열 수 없습니다. 메뉴의 화면 경로를 확인하세요.' };
    const candidates = menu.required.filter((code) => catalogCodes.has(code));
    if (menu.mode === 'ALL') {
      return candidates.length === menu.required.length
        ? { kind: 'auto', menu, codes: candidates }
        : { kind: 'unfixable', menu, reason: '이 화면이 요구하는 권한 일부가 현재 기능 목록에 없습니다. 다시 조회해 주세요.' };
    }
    if (candidates.length === 0) return { kind: 'unfixable', menu, reason: '이 화면이 요구하는 권한이 현재 기능 목록에 없습니다. 다시 조회해 주세요.' };
    if (candidates.length === 1) return { kind: 'auto', menu, codes: candidates };
    return { kind: 'choose', menu, candidates, preferred: candidates.find((code) => code.endsWith('_READ')) ?? candidates[0] };
  });
}

/**
 * 여러 메뉴를 한 번에 고치는 일괄 동작(섹션 줄의 '진입 권한 추가'·표 위의 '진입 권한 모두 추가')이 다룰 수 있는 고치기인가
 * (2026-10-05 반박 리뷰 반영). 더할 권한이 정해져 있고(auto) 보호 권한·타인 자료 권한이 하나도 없어야 한다 — 영역·섹션 줄의 묶음
 * 칸과 같은 제외 규칙이다(H3). 그렇지 않은 메뉴는 화면 줄의 '권한 추가'에서 사람이 하나씩 고른다.
 * 예: '모두 있어야 열림' 투표 관리(POLL_READ + POLL_READ_ALL), 타인 댓글 관리(COMMENT_READ_ALL)는 일괄에서 빠진다.
 */
export function isBulkEntryFix(fix: EntryFix): fix is Extract<EntryFix, { kind: 'auto' }> {
  return fix.kind === 'auto' && fix.codes.every((code) => !isProtectedPermission(code) && !isOthersDataPermission(code));
}

/** Ctrl/Cmd+S. Alt·Shift 조합은 다른 단축키에 남긴다. */
export function isSaveShortcut(event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 's';
}
