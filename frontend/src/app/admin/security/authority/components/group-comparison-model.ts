import type { AuthorizationCatalog } from '@/lib/auth/authorization-management-contract';
import { buildNavigationPermissionTree } from '@/lib/auth/navigation-permission-tree';
import { buildOperationMatrix, operationKey, type MatrixOperation, type MatrixRow } from './operation-permission-matrix-model';
import {
  ancestorKeys,
  buildScreenPermissionModel,
  cellCodes,
  entrySatisfied,
  type ScreenColumnKey,
  type ScreenPermissionModel,
  type ScreenRow,
} from './screen-permission-model';

/**
 * '그룹 비교'의 순수 모델(2026-10-02, 관리 콘솔 UX 3단계 G3). 두 그룹의 저장된 권한(전체 그룹 권한 getGrantMatrix)을 읽기 전용으로
 * 나란히 본다. 새 판정기를 두지 않는다 — '화면별'은 2단계 화면별 권한 표의 모델(buildScreenPermissionModel·cellCodes·
 * entrySatisfied)과 열 정의를, '기능별'은 1단계 기능별 권한 표의 모델(buildOperationMatrix)과 열을 그대로 쓴다.
 *
 * '화면별'의 칸은 그 줄 자신의 칸이다(영역·섹션 줄의 일괄 집계가 아니다) — 같은 권한이 여러 줄에 나올 수 있지만 모든 줄의
 * 자기 권한을 한 번씩 비교하므로 차이가 숨지 않는다. 메뉴 표시는 그 메뉴 자신의 표시다.
 */

type Navigation = AuthorizationCatalog['navigation'][number];

export interface SideState {
  /** 칸이 다루는 권한 가운데 이 그룹에 있는 수. */
  selected: number;
  total: number;
  /** 화면에 보이는 글자 — '있음'·'없음'(권한이 하나), 여럿이면 '있음 2/2'·'일부 1/2'·'없음 0/2'(화면 진입은 들어갈 수 있으면 '있음'). */
  text: string;
}

/**
 * 칸 하나의 비교. `onlyA`·`onlyB` 는 칸이 다루는 권한 가운데 한쪽에만 있는 권한의 이름(카탈로그 순서가 아니라 칸의 권한 순서)이다
 * — 권한이 여럿인 칸은 두 그룹이 서로 다른 권한을 같은 수만큼 가지면 A·B 글자('있음 1/2')가 같은데도 다르다. 그 칸은 화면이
 * 이 이름으로 무엇이 다른지 글자로 말한다(색만으로 구분하지 않는다, WCAG 1.4.1).
 */
export type ScreenCompareCell =
  | { kind: 'grant'; a: SideState; b: SideState; differs: boolean; onlyA: string[]; onlyB: string[] }
  | { kind: 'note'; text: string };

export interface ComparedScreenRow {
  row: ScreenRow;
  cells: Readonly<Record<ScreenColumnKey, ScreenCompareCell | null>>;
  differs: boolean;
}

/** 기능별 칸 값. 둘 다 없으면 null(빈칸). */
export type OperationPresence = 'A만' | 'B만' | '둘 다' | null;

export interface ComparedOperationCell {
  operation: MatrixOperation;
  presence: OperationPresence;
}

export interface ComparedOperationRow {
  row: MatrixRow;
  /** 1단계 표와 같은 고정 열 순서. 그 행위가 없는 영역은 null 이다. */
  columns: ReadonlyArray<ComparedOperationCell | null>;
  /** 고정 열에 없는 행위(그 밖의 기능). */
  others: readonly ComparedOperationCell[];
  differs: boolean;
}

export interface ComparedOperationCategory {
  key: string;
  label: string;
  rows: ComparedOperationRow[];
}

export interface GroupComparison {
  model: ScreenPermissionModel;
  screenRows: ComparedScreenRow[];
  operationCategories: ComparedOperationCategory[];
  /** A 에만 있는 권한(기능권한·메뉴 표시) 수 — 현재 기능·메뉴 목록에 있는 것만 센다. */
  onlyA: number;
  onlyB: number;
  /** 현재 기능·메뉴 목록에 없어 비교에서 뺀 권한 수(두 그룹 합, 중복 제외). */
  unknown: number;
  /** 메뉴 계층을 확인하지 못했으면 그 이유 — 이때 화면별 줄은 없다. */
  navigationError: string | null;
}

const navigationKey = (code: string): string => `NAVIGATION:${code}`;

function sideOf(keys: readonly string[], selection: ReadonlySet<string>, entry: boolean, satisfied: boolean): SideState {
  const selected = keys.filter((key) => selection.has(key)).length;
  const total = keys.length;
  if (total === 1) return { selected, total, text: selected === 1 ? '있음' : '없음' };
  const word = entry ? (satisfied ? '있음' : '없음') : selected === 0 ? '없음' : selected === total ? '있음' : '일부';
  return { selected, total, text: `${word} ${selected}/${total}` };
}

/** 권한 키(`OPERATION:<code>`·`NAVIGATION:<menu>`)의 보이는 이름 — 기능권한은 카탈로그 이름, 메뉴 표시는 메뉴 이름, 모르면 코드. */
type NameOf = (key: string) => string;

function grantCell(keys: readonly string[], a: ReadonlySet<string>, b: ReadonlySet<string>, nameOf: NameOf, satisfiedA = false, satisfiedB = false, entry = false): ScreenCompareCell {
  const onlyA = keys.filter((key) => a.has(key) && !b.has(key));
  const onlyB = keys.filter((key) => b.has(key) && !a.has(key));
  return {
    kind: 'grant',
    a: sideOf(keys, a, entry, satisfiedA),
    b: sideOf(keys, b, entry, satisfiedB),
    differs: onlyA.length + onlyB.length > 0,
    onlyA: onlyA.map(nameOf),
    onlyB: onlyB.map(nameOf),
  };
}

const ENTRY_NOTES: Readonly<Record<'open' | 'unregistered' | 'unlisted' | 'unknown', string>> = {
  open: '로그인만 하면 열림',
  unregistered: '등록되지 않은 화면',
  unlisted: '화면 목록에 없는 경로',
  unknown: '기능 목록에 없는 권한',
};

function compareScreenRow(row: ScreenRow, a: ReadonlySet<string>, b: ReadonlySet<string>, nameOf: NameOf): ComparedScreenRow {
  const navigation = row.kind === 'menu' && row.menuCode ? grantCell([navigationKey(row.menuCode)], a, b, nameOf) : null;
  let entry: ScreenCompareCell | null = null;
  if (row.entry) {
    entry = row.entry.state === 'gated'
      ? grantCell(row.entry.codes.map(operationKey), a, b, nameOf, entrySatisfied(row.entry, a), entrySatisfied(row.entry, b), true)
      : { kind: 'note', text: ENTRY_NOTES[row.entry.state] };
  }
  const codeCell = (column: 'create' | 'update' | 'delete' | 'other'): ScreenCompareCell | null => {
    const codes = cellCodes(row, column);
    return codes.length === 0 ? null : grantCell(codes.map(operationKey), a, b, nameOf);
  };
  const cells = { navigation, entry, create: codeCell('create'), update: codeCell('update'), delete: codeCell('delete'), other: codeCell('other') };
  return { row, cells, differs: Object.values(cells).some((cell) => cell?.kind === 'grant' && cell.differs) };
}

function presenceOf(operation: MatrixOperation, a: ReadonlySet<string>, b: ReadonlySet<string>): ComparedOperationCell {
  const key = operationKey(operation.code);
  const inA = a.has(key);
  const inB = b.has(key);
  return { operation, presence: inA && inB ? '둘 다' : inA ? 'A만' : inB ? 'B만' : null };
}

const differsPresence = (cell: ComparedOperationCell | null): boolean => cell?.presence === 'A만' || cell?.presence === 'B만';

/**
 * 두 그룹의 권한 선택(`OPERATION:<code>`·`NAVIGATION:<menu>` 키)을 비교한다.
 * @param navigation 카탈로그의 메뉴 목록(편집기와 같은 계층 검증을 거친다).
 * @param operations 카탈로그의 기능 목록 — 기능별 줄과 '화면별'의 칸 코드가 이 목록에 있는 것만 쓴다.
 */
export function compareGroups(
  aSelection: ReadonlySet<string>,
  bSelection: ReadonlySet<string>,
  navigation: readonly Navigation[],
  operations: readonly MatrixOperation[],
): GroupComparison {
  const tree = buildNavigationPermissionTree(navigation);
  const model = buildScreenPermissionModel(tree, operations.map((operation) => operation.code));
  const names = new Map<string, string>([
    ...operations.map((operation): [string, string] => [operationKey(operation.code), operation.name || operation.code]),
    ...navigation.map((item): [string, string] => [navigationKey(item.code), item.name || item.code]),
  ]);
  const nameOf: NameOf = (key) => names.get(key) ?? key.slice(key.indexOf(':') + 1);
  const screenRows = model.rows.map((row) => compareScreenRow(row, aSelection, bSelection, nameOf));
  const operationCategories = buildOperationMatrix(operations).map((category) => ({
    key: category.key,
    label: category.label,
    rows: category.rows.map((row): ComparedOperationRow => {
      const columns = row.columns.map((operation) => (operation ? presenceOf(operation, aSelection, bSelection) : null));
      const others = row.others.map((operation) => presenceOf(operation, aSelection, bSelection));
      return { row, columns, others, differs: [...columns, ...others].some(differsPresence) };
    }),
  }));
  const known = new Set([...operations.map((operation) => operationKey(operation.code)), ...navigation.map((item) => navigationKey(item.code))]);
  const onlyIn = (from: ReadonlySet<string>, other: ReadonlySet<string>) => [...from].filter((key) => known.has(key) && !other.has(key)).length;
  return {
    model,
    screenRows,
    operationCategories,
    onlyA: onlyIn(aSelection, bSelection),
    onlyB: onlyIn(bSelection, aSelection),
    unknown: new Set([...aSelection, ...bSelection].filter((key) => !known.has(key))).size,
    navigationError: tree.error,
  };
}

/** '차이만 보기' — 다른 칸이 있는 줄과 그 상위 줄(어디에 있는 화면인지 보이게). 끄면 모든 줄이다. */
export function shownScreenRows(comparison: GroupComparison, onlyDifferences: boolean): ComparedScreenRow[] {
  if (!onlyDifferences) return comparison.screenRows;
  const keep = new Set<string>();
  for (const entry of comparison.screenRows) {
    if (!entry.differs) continue;
    keep.add(entry.row.key);
    for (const key of ancestorKeys(comparison.model, entry.row.key)) keep.add(key);
  }
  return comparison.screenRows.filter((entry) => keep.has(entry.row.key));
}

/** '차이만 보기' — 다른 칸이 있는 업무 영역만, 빈 분류는 뺀다. */
export function shownOperationCategories(comparison: GroupComparison, onlyDifferences: boolean): ComparedOperationCategory[] {
  if (!onlyDifferences) return comparison.operationCategories;
  return comparison.operationCategories
    .map((category) => ({ ...category, rows: category.rows.filter((row) => row.differs) }))
    .filter((category) => category.rows.length > 0);
}
