import { canOpenPage } from '@/lib/auth/page-access';
import { registeredPageEntry } from '@/lib/auth/page-authorization';
import { toggleNavigationPermission, type NavigationPermissionNode, type NavigationPermissionTree } from '@/lib/auth/navigation-permission-tree';
import { normalizeInternalRoute } from '@/lib/navigation/internal-route';
import { resolveMenuScreen, screensWithoutMenu } from '@/lib/navigation/menu-screen-resolution';
import { MENU_HIDDEN_REASON_LABELS, menuPreviewKey, type MenuVisibilityPreview } from '@/lib/navigation/menu-visibility-preview';
import { PAGE_PERMISSION_MODES } from '@/types/generated-permissions';
import { SCREEN_REGISTRY, type ScreenRegistryEntry } from '@/types/generated-screen-registry';
import { isBulkEntryFix, isOthersDataPermission, isProtectedPermission, operationKey, planBulkToggle, type BulkTogglePlan, type EntryFix } from './operation-permission-matrix-model';

/**
 * '화면별 권한' 표(메뉴 트리 × 메뉴 표시·화면 진입·등록·수정·삭제·그 밖의 기능)의 순수 모델(2026-10-02, 관리 콘솔 UX 2단계 D4).
 *
 * 화면 표현과 떼어 둔다. 이 모듈은 선택 상태를 바꾸지 않는다 — 무엇을 바꿀지 계산할 뿐이고, 초안 반영과 저장은
 * 편집기가 소유한다(기능별 권한 표와 같은 초안 selection 을 쓴다).
 *
 * 인가 의미는 그대로다(H3). 메뉴 표시(NAVIGATION)와 기능권한(OPERATION)은 다른 권한이고, 이 표는 둘을 한 줄에
 * 나란히 보일 뿐 하나를 켜서 다른 하나를 켜지 않는다. 같은 기능권한이 여러 화면에 쓰이면 어느 줄에서 켜든 같은 권한이다.
 *
 * 화면 진입 칸은 라우트 게이트와 같은 등록 원장(registeredPageEntry·PAGE_PERMISSION_MODES)을 읽는다 — 별칭 경로도
 * 게이트가 보는 그대로다. 등록·수정·삭제·그 밖의 기능 칸은 화면 목록(generated-screen-registry)의 화면별 권한에서
 * 나눈다: 쓰기(write)·표시 판정(display) 권한 중 행위가 CREATE*·UPDATE*·DELETE* 인 것이 앞의 세 칸, 나머지가
 * '그 밖의 기능'이다. 현재 기능 목록에 없는 코드는 칸에 싣지 않는다 — 저장 본문(selectedGrants)에서 빠지므로
 * 켤 수 있는 것처럼 보이게 하지 않는다.
 *
 * 메뉴 줄이 어느 화면인지와 '메뉴에 없는 화면' 묶음은 화면 관리(/admin/system/programs)와 같은 공용 판정
 * (menu-screen-resolution)으로 정한다 — 메뉴 경로가 별칭이면 그 별칭이 넘기는 화면이고, 사용 안 함 메뉴만 가리키는 화면은
 * 메뉴에 없는 화면이다. 두 화면이 같은 화면에 다른 사실을 말하지 않게 한다.
 *
 * 영역·섹션 줄의 일괄 칸은 인가 의미가 다른 권한을 한 동작으로 묶지 않는다(H3): 보호 권한, 타인 자료 권한(행위가
 * …_ALL), 다른 화면에 들어가는 진입 권한은 일괄 선택에서 빠지고 화면 줄의 칸에서 따로 고른다. '수정' 한 번이 타인
 * 자료 수정을, '그 밖의 기능' 한 번이 다른 관리 화면 진입을 알리지 않고 주지 않게 한다. '화면 진입' 묶음 칸도 같다
 * (2026-10-05) — 보호·타인 자료 진입 권한이 필요한 화면은 묶음 칸에서 빠지고 화면 줄에서 직접 고른다(aggregateCell).
 */

export type ScreenColumnKey = 'navigation' | 'entry' | 'create' | 'update' | 'delete' | 'other';
export type ScreenCodeColumnKey = Exclude<ScreenColumnKey, 'navigation' | 'entry'>;

export const SCREEN_PERMISSION_COLUMNS: ReadonlyArray<{ readonly key: ScreenColumnKey; readonly label: string }> = [
  { key: 'navigation', label: '메뉴 표시' },
  { key: 'entry', label: '화면 진입' },
  { key: 'create', label: '등록' },
  { key: 'update', label: '수정' },
  { key: 'delete', label: '삭제' },
  { key: 'other', label: '그 밖의 기능' },
];
export const SCREEN_CODE_COLUMNS: readonly ScreenCodeColumnKey[] = ['create', 'update', 'delete', 'other'];

/** '메뉴에 없는 화면' 묶음 줄의 키. */
export const UNMATCHED_GROUP_KEY = 'group:unmatched';
export const UNMATCHED_GROUP_LABEL = '메뉴에 없는 화면';

/**
 * 화면 진입 판정.
 *  · gated: 등록된 화면이고 진입 권한이 있다(ANY 는 하나, ALL 은 모두).
 *  · open: 등록된 화면이고 진입 권한이 없다 — 로그인만 하면 열린다.
 *  · unregistered: 등록되지 않은 관리 화면 경로 — 어떤 기능권한으로도 열리지 않는다(라우트 게이트가 거부한다).
 *  · unlisted: 관리 화면 밖의 등록되지 않은 경로(레거시 .do 등) — 라우트 게이트가 보지 않는다.
 *  · unknown: 등록 원장은 권한을 요구하는데 그 코드가 현재 기능 목록에 없다 — 다시 조회해야 한다.
 */
export interface ScreenEntry {
  state: 'gated' | 'open' | 'unregistered' | 'unlisted' | 'unknown';
  /** 진입 권한 코드(현재 기능 목록에 있는 것만). */
  codes: string[];
  mode: 'ANY' | 'ALL';
}

export interface ScreenRow {
  key: string;
  kind: 'menu' | 'unmatched-group' | 'unmatched-screen';
  name: string;
  /** 메뉴 줄이면 메뉴 번호(권한 코드 문자열). */
  menuCode: string | null;
  /** 이 줄이 여는 경로(쿼리·해시 제외). 경로가 없으면 null. */
  route: string | null;
  depth: number;
  parentKey: string | null;
  childKeys: string[];
  /** 사용 안 함 메뉴. */
  unused: boolean;
  screen: ScreenRegistryEntry | null;
  /** 이 줄 자신의 화면 진입. 경로가 없는 줄은 null 이다. */
  entry: ScreenEntry | null;
  /** 이 줄 자신의 화면 권한(등록·수정·삭제·그 밖의 기능). */
  codes: Readonly<Record<ScreenCodeColumnKey, readonly string[]>>;
  /**
   * codes 가운데 영역·섹션 줄의 일괄 선택이 다루는 코드. 보호 권한, 타인 자료 권한(…_ALL), 어떤 화면의 진입 권한인
   * 코드는 빠진다 — 화면 줄의 칸에서만 고른다(H3).
   */
  bulkCodes: Readonly<Record<ScreenCodeColumnKey, readonly string[]>>;
}

export interface ScreenPermissionModel {
  rows: readonly ScreenRow[];
  byKey: ReadonlyMap<string, ScreenRow>;
}

const EMPTY_CODES: Readonly<Record<ScreenCodeColumnKey, readonly string[]>> = { create: [], update: [], delete: [], other: [] };

export const menuRowKey = (code: string): string => `menu:${code}`;
const screenRowKey = (route: string): string => `screen:${route}`;

function pathOf(route: string): string {
  return route.split(/[?#]/, 1)[0];
}

/** 타인 자료 권한(…_ALL — 타인 자료 조회·수정·삭제, 관리자 등록 등). 본인 자료 권한과 인가 의미가 다르다(H3). */
const OTHERS_DATA_ACTION = /_ALL$/;

/**
 * 영역·섹션 줄의 일괄 선택에서 빼는 코드인가 — 보호 권한, 타인 자료 권한, 어떤 화면의 진입 권한(다른 관리 화면 열기).
 * 진입 권한은 '화면 진입' 칸의 일괄 선택이 그 화면 단위로 다룬다.
 */
function excludedFromBulk(code: string, action: string, entryCodes: ReadonlySet<string>): boolean {
  return isProtectedPermission(code) || OTHERS_DATA_ACTION.test(action) || entryCodes.has(code);
}

/** 칸 코드 가운데 일괄 선택이 다루는 코드. */
function bulkCodesOf(
  screen: ScreenRegistryEntry | null,
  codes: Readonly<Record<ScreenCodeColumnKey, readonly string[]>>,
  entryCodes: ReadonlySet<string>,
): Record<ScreenCodeColumnKey, string[]> {
  const actions = new Map((screen?.permissions ?? []).map((permission) => [permission.code as string, permission.action]));
  const keep = (code: string) => !excludedFromBulk(code, actions.get(code) ?? '', entryCodes);
  return { create: codes.create.filter(keep), update: codes.update.filter(keep), delete: codes.delete.filter(keep), other: codes.other.filter(keep) };
}

function isGatedPath(path: string): boolean {
  const lower = path.toLowerCase();
  return lower === '/admin' || lower.startsWith('/admin/');
}

/** 경로의 화면 진입 판정(라우트 게이트와 같은 원장). */
export function screenEntryOf(path: string, catalogCodes: ReadonlySet<string>): ScreenEntry {
  const entry = registeredPageEntry(path);
  if (!entry) return { state: isGatedPath(path) ? 'unregistered' : 'unlisted', codes: [], mode: 'ANY' };
  const mode = PAGE_PERMISSION_MODES[entry[0]] === 'ALL' ? 'ALL' : 'ANY';
  if (entry[1].length === 0) return { state: 'open', codes: [], mode };
  const codes = entry[1].filter((code) => catalogCodes.has(code));
  // ALL 은 하나라도 목록에 없으면 열 수 없다 — 일부만 보이게 하지 않는다.
  if (codes.length === 0 || (mode === 'ALL' && codes.length !== entry[1].length)) return { state: 'unknown', codes: [], mode };
  return { state: 'gated', codes, mode };
}

/** 화면 목록의 화면 권한을 등록·수정·삭제·그 밖의 기능으로 나눈다. 진입 권한 코드는 빼고, 목록에 없는 코드도 뺀다. */
export function screenCodesOf(
  screen: ScreenRegistryEntry | null,
  entryCodes: readonly string[],
  catalogCodes: ReadonlySet<string>,
): Record<ScreenCodeColumnKey, string[]> {
  const result: Record<ScreenCodeColumnKey, string[]> = { create: [], update: [], delete: [], other: [] };
  if (!screen) return result;
  const entry = new Set(entryCodes);
  for (const permission of screen.permissions) {
    if (entry.has(permission.code) || !catalogCodes.has(permission.code)) continue;
    if (permission.source === 'entry') continue;
    const action = permission.action;
    const column: ScreenCodeColumnKey = action.startsWith('CREATE') ? 'create'
      : action.startsWith('UPDATE') ? 'update'
        : action.startsWith('DELETE') ? 'delete' : 'other';
    if (!result[column].includes(permission.code)) result[column].push(permission.code);
  }
  return result;
}

/**
 * 메뉴 트리(카탈로그 순서) 다음에 '메뉴에 없는 화면' 묶음을 붙인 줄 목록. 줄은 앞선 순회(부모 → 자식) 순서다.
 * 메뉴 줄의 화면과 메뉴에 없는 화면(라우트 순)은 공용 판정(resolveMenuScreen·screensWithoutMenu)이 정한다 — 화면 관리와
 * 같은 규칙이다. 사용 안 함 메뉴도 줄로 남고 그 화면의 칸을 보이지만, 그 메뉴로는 화면이 열리지 않으므로 그 화면은
 * 메뉴에 없는 화면에도 있다(같은 권한이라 어느 줄에서 켜든 같다).
 * 메뉴 계층이 손상돼 있으면 줄을 만들지 않는다 — 편집기가 저장을 막고 이유를 알린다.
 */
export function buildScreenPermissionModel(
  tree: NavigationPermissionTree,
  operationCodes: Iterable<string>,
): ScreenPermissionModel {
  const catalogCodes = new Set(operationCodes);
  const rows: ScreenRow[] = [];
  if (tree.error) return { rows, byKey: new Map() };
  // 어떤 화면의 진입 권한인 코드 — 영역·섹션 줄의 일괄 선택에서 뺀다(그 화면의 '화면 진입' 칸이 다룬다).
  const entryCodes = new Set<string>(SCREEN_REGISTRY.flatMap((screen) => screen.entry.permissions));
  const codesOf = (screen: ScreenRegistryEntry | null, entry: ScreenEntry | null) => {
    if (!screen) return { codes: EMPTY_CODES, bulkCodes: EMPTY_CODES };
    const codes = screenCodesOf(screen, entry?.codes ?? [], catalogCodes);
    return { codes, bulkCodes: bulkCodesOf(screen, codes, entryCodes) };
  };

  const visit = (node: NavigationPermissionNode, depth: number, parentKey: string | null): ScreenRow => {
    const normalized = normalizeInternalRoute(node.route);
    const route = normalized === null ? null : pathOf(normalized);
    // 메뉴가 런타임에 여는 화면(별칭이면 넘기는 화면). 화면 진입은 라우트 게이트처럼 메뉴 경로 자체로 본다.
    const screen = resolveMenuScreen(node.route)?.screen ?? null;
    const entry = route === null ? null : screenEntryOf(route, catalogCodes);
    const row: ScreenRow = {
      key: menuRowKey(node.code),
      kind: 'menu',
      name: node.name,
      menuCode: node.code,
      route,
      depth,
      parentKey,
      childKeys: [],
      unused: node.useYn !== 'Y',
      screen,
      entry,
      ...codesOf(screen, entry),
    };
    rows.push(row);
    row.childKeys = node.children.map((child) => visit(child, depth + 1, row.key).key);
    return row;
  };
  for (const root of tree.roots) visit(root, 0, null);

  const unmatched = screensWithoutMenu([...tree.nodes.values()].map((node) => ({ route: node.route, useYn: node.useYn })))
    .sort((left, right) => (left.route < right.route ? -1 : left.route > right.route ? 1 : 0));
  if (unmatched.length > 0) {
    const group: ScreenRow = {
      key: UNMATCHED_GROUP_KEY, kind: 'unmatched-group', name: UNMATCHED_GROUP_LABEL, menuCode: null, route: null,
      depth: 0, parentKey: null, childKeys: [], unused: false, screen: null, entry: null, codes: EMPTY_CODES, bulkCodes: EMPTY_CODES,
    };
    rows.push(group);
    for (const screen of unmatched) {
      const entry = screenEntryOf(screen.route, catalogCodes);
      const row: ScreenRow = {
        key: screenRowKey(screen.route), kind: 'unmatched-screen', name: screen.label ?? '이름 미확인', menuCode: null,
        route: screen.route, depth: 1, parentKey: group.key, childKeys: [], unused: false, screen, entry,
        ...codesOf(screen, entry),
      };
      rows.push(row);
      group.childKeys.push(row.key);
    }
  }
  return { rows, byKey: new Map(rows.map((row) => [row.key, row])) };
}

/** 줄과 그 아래 모든 줄(앞선 순회 순서). */
export function rowsUnder(model: ScreenPermissionModel, row: ScreenRow): ScreenRow[] {
  const result: ScreenRow[] = [];
  const pending = [row];
  while (pending.length > 0) {
    const current = pending.shift()!;
    result.push(current);
    pending.unshift(...current.childKeys.map((key) => model.byKey.get(key)).filter((child): child is ScreenRow => !!child));
  }
  return result;
}

/** 상위 줄들(가까운 것부터). */
export function ancestorKeys(model: ScreenPermissionModel, key: string): string[] {
  const result: string[] = [];
  let current = model.byKey.get(key)?.parentKey ?? null;
  while (current) {
    result.push(current);
    current = model.byKey.get(current)?.parentKey ?? null;
  }
  return result;
}

/** 하위 줄이 있는 묶음 줄(영역·섹션, '메뉴에 없는 화면')인가. 묶음 줄의 칸은 아래 화면 전체를 한 번에 다룬다. */
export const isGroupRow = (row: ScreenRow): boolean => row.childKeys.length > 0;

/** 화면 진입이 이 선택으로 충족되는가(라우트 게이트와 같은 ANY/ALL). */
export function entrySatisfied(entry: ScreenEntry, selection: ReadonlySet<string>): boolean {
  if (entry.state !== 'gated') return entry.state === 'open';
  const has = (code: string) => selection.has(operationKey(code));
  return entry.mode === 'ALL' ? entry.codes.every(has) : entry.codes.some(has);
}

/** 진입 권한 후보 가운데 사람이 고르지 않을 때 먼저 권하는 코드 — 조회(*_READ)를 먼저 권한다(1단계 진입 권한 추가와 같다). */
export function preferredEntryCode(codes: readonly string[]): string | null {
  const candidates = codes.filter((code) => !isProtectedPermission(code));
  return candidates.find((code) => code.endsWith('_READ')) ?? candidates[0] ?? null;
}

/**
 * 영역·섹션 줄의 '화면 진입' 묶음 칸이 다룰 수 있는 진입 권한인가 — 보호 권한과 타인 자료 권한(…_ALL)이 아니어야 한다.
 * 등록·수정·삭제·그 밖의 기능 묶음 칸(bulkCodes)과 섹션 '진입 권한 추가'(isBulkEntryFix)와 같은 제외 규칙이다(H3).
 */
const isBulkEntryCode = (code: string): boolean => !isProtectedPermission(code) && !isOthersDataPermission(code);

/**
 * 묶음 칸의 '화면 진입'으로 다룰 수 있는 화면인가(2026-10-05, H3 정합). ANY 는 일괄 대상 진입 권한이 하나라도 있어야 하고
 * (그중 조회를 먼저 권한다), ALL 은 모든 진입 권한이 일괄 대상이어야 한다 — 하나라도 보호·타인 자료 권한이면 묶음 칸으로는
 * 열 수도 닫을 수도 없으므로 화면 줄에서 사람이 고른다('직접 고르기'). 예: '모두 있어야 열림' 투표 관리(POLL_READ +
 * POLL_READ_ALL), 타인 댓글 관리(COMMENT_READ_ALL 하나).
 */
export function isBulkEntryScreen(entry: ScreenEntry): boolean {
  if (entry.state !== 'gated') return false;
  return entry.mode === 'ALL' ? entry.codes.every(isBulkEntryCode) : entry.codes.some(isBulkEntryCode);
}

export interface AggregateCell {
  /** n — 화면 진입은 묶음 칸이 다루는 화면(isBulkEntryScreen) 수, 나머지는 일괄 코드(bulkCodes)의 고유 수. */
  total: number;
  /** k — 화면 진입은 그 가운데 들어갈 수 있는 화면 수, 나머지는 켜진 코드 수. */
  selected: number;
  plan: BulkTogglePlan;
  /**
   * 화면 진입만: 진입 권한이 있지만 보호·타인 자료 권한이 필요해 묶음 칸에서 빠진 줄 — 화면 줄의 칸에서 직접 고른다. 나머지 칸은
   * 빠지는 단위가 화면이 아니라 코드라 늘 빈 목록이다(칸 설명이 제외 규칙을 말한다).
   */
  manual: readonly ScreenRow[];
}

/**
 * 묶음 줄(영역·섹션)의 칸 — 아래 화면 전체를 한 번에 켜고 끈다. 보호 권한은 빼고 칸마다 따로 고르게 한다(H3).
 * rows 는 다룰 줄이다 — 화면 검색 중이면 표가 검색 결과에 보이는 줄로 좁혀 넘긴다(보이지 않는 화면을 바꾸지 않는다).
 *  · 등록·수정·삭제·그 밖의 기능: 아래 화면들의 그 칸 일괄 코드(bulkCodes, 고유) — 보호 권한·타인 자료 권한·다른 화면의
 *    진입 권한은 빠진다. 모두 켜져 있으면 끄고, 아니면 켠다.
 *  · 화면 진입: 아래 화면 가운데 묶음 칸이 다룰 수 있는 화면(isBulkEntryScreen). 모두 들어갈 수 있으면 그 화면들의 일괄 대상
 *    진입 권한을 끄고, 아니면 들어갈 수 없는 화면마다 필요한 만큼만 더한다 — ANY 는 일괄 대상 후보 가운데 권하는 코드 하나
 *    (조회 우선), ALL 은 모두. 후보를 전부 더해 넘치게 주지 않는다. 보호·타인 자료 권한은 더하지도 끄지도 않는다 — 그런 권한이
 *    필요한 화면은 manual 로 세어 화면 줄에서 고르게 한다(2026-10-05 H3 정합: 종전에는 '모두 있어야 열림' 투표 관리의
 *    POLL_READ_ALL, 타인 댓글 관리의 COMMENT_READ_ALL 을 이 칸 한 번으로 더하고, 끌 때도 함께 껐다). 이미 들어갈 수 있는 화면에는
 *    더하지 않는다 — 타인 자료 권한으로 들어가는 화면에 본인 권한을 덧붙여 넓히지 않는다.
 *  · 추가가 막힌 그룹(공개 메뉴 그룹)은 끌 수만 있다.
 */
export function aggregateCell(
  rows: readonly ScreenRow[],
  column: Exclude<ScreenColumnKey, 'navigation'>,
  selection: ReadonlySet<string>,
  allowAdd: boolean,
): AggregateCell | null {
  if (column === 'entry') {
    const gated = rows.filter((row) => row.entry?.state === 'gated');
    if (gated.length === 0) return null;
    const bulk = gated.filter((row) => isBulkEntryScreen(row.entry!));
    const manual = gated.filter((row) => !isBulkEntryScreen(row.entry!));
    const idle: BulkTogglePlan = { mode: null, keys: [] };
    if (bulk.length === 0) return { total: 0, selected: 0, plan: idle, manual };
    const satisfied = bulk.filter((row) => entrySatisfied(row.entry!, selection));
    const selectedCodes = [...new Set(bulk.flatMap((row) => row.entry!.codes))]
      .filter((code) => isBulkEntryCode(code) && selection.has(operationKey(code)));
    const clear: BulkTogglePlan = selectedCodes.length > 0 ? { mode: 'clear', keys: selectedCodes.map(operationKey) } : idle;
    if (satisfied.length === bulk.length || !allowAdd) return { total: bulk.length, selected: satisfied.length, plan: clear, manual };
    const add = new Set<string>();
    for (const row of bulk) {
      if (entrySatisfied(row.entry!, selection)) continue;
      const codes = row.entry!.mode === 'ALL'
        ? row.entry!.codes
        : [preferredEntryCode(row.entry!.codes.filter(isBulkEntryCode))].filter((code): code is string => code !== null);
      for (const code of codes) if (!selection.has(operationKey(code))) add.add(operationKey(code));
    }
    return { total: bulk.length, selected: satisfied.length, plan: add.size > 0 ? { mode: 'select', keys: [...add] } : idle, manual };
  }
  const codes = [...new Set(rows.flatMap((row) => row.bulkCodes[column]))];
  if (codes.length === 0) return null;
  const plan = planBulkToggle(codes.map((code) => ({ code, domain: '', action: '', name: '' })), selection, allowAdd);
  return { total: codes.length, selected: codes.filter((code) => selection.has(operationKey(code))).length, plan, manual: [] };
}

/** 칸이 다루는 코드(자기 화면 칸). */
export function cellCodes(row: ScreenRow, column: Exclude<ScreenColumnKey, 'navigation'>): readonly string[] {
  if (column === 'entry') return row.entry?.state === 'gated' ? row.entry.codes : [];
  return row.codes[column];
}

export interface ScreenRowStatus {
  label: string;
  /** 'ok' 는 보임, 'problem' 은 메뉴를 표시했는데 숨는 경우, 'info' 는 그 밖의 사실. */
  tone: 'ok' | 'problem' | 'info';
}

/**
 * 줄의 상태. 메뉴 줄은 사이드바와 같은 판정(menu-visibility-preview)을 이 그룹의 초안으로 돌린 결과다 — 사용자의 실제
 * 권한은 배정된 그룹의 합집합이므로 '이 그룹만으로' 의 상태다. 메뉴에 없는 화면은 메뉴가 없으므로 주소로 열리는지만 말한다.
 */
export function screenRowStatus(
  row: ScreenRow,
  preview: MenuVisibilityPreview,
  selection: ReadonlySet<string>,
): ScreenRowStatus | null {
  if (row.kind === 'unmatched-group') return null;
  if (row.kind === 'unmatched-screen') {
    if (!row.route) return null;
    const permissions = [...selection].filter((key) => key.startsWith('OPERATION:')).map((key) => key.slice('OPERATION:'.length));
    return canOpenPage({ permissions, authorizationVersion: 'draft' }, row.route)
      ? { label: '메뉴 없이 주소로만 열림', tone: 'info' }
      : { label: '진입 권한 없음', tone: 'info' };
  }
  const visibility = preview.byMenu.get(menuPreviewKey(row.menuCode!));
  if (!visibility) return null;
  if (visibility.visible) return { label: '보임', tone: 'ok' };
  if (visibility.reason === 'no-navigation') {
    return visibility.canEnter === true ? { label: '메뉴 없이 주소로만 열림', tone: 'info' } : { label: MENU_HIDDEN_REASON_LABELS['no-navigation'], tone: 'info' };
  }
  // 메뉴 표시를 줬는데 숨는 경우는 고칠 일이다. 사용 안 함은 모든 그룹에서 숨으므로 사실로만 말한다.
  return { label: MENU_HIDDEN_REASON_LABELS[visibility.reason], tone: visibility.reason === 'unused' ? 'info' : 'problem' };
}

/** 처음 펼칠 줄 — 영역(최상위 묶음)은 모두, 문제(진입 권한 없음)가 있는 메뉴는 그 상위까지. '메뉴에 없는 화면'은 접는다. */
export function initialExpandedKeys(model: ScreenPermissionModel, problemMenuCodes: Iterable<string>): Set<string> {
  const expanded = new Set<string>();
  for (const row of model.rows) {
    if (row.kind === 'menu' && row.depth === 0 && isGroupRow(row)) expanded.add(row.key);
  }
  for (const code of problemMenuCodes) {
    for (const key of ancestorKeys(model, menuRowKey(code))) expanded.add(key);
  }
  return expanded;
}

/** 줄이 '화면 검색'에 맞는가 — 이름·경로·메뉴 번호·권한 코드. */
export function screenRowMatches(row: ScreenRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const texts = [row.name, row.route ?? '', row.menuCode ?? '', ...(row.entry?.codes ?? []), ...SCREEN_CODE_COLUMNS.flatMap((column) => row.codes[column])];
  return texts.some((text) => text.toLowerCase().includes(needle));
}

/**
 * 보일 줄. 검색어도 거르기(include)도 없으면 모든 상위가 펼쳐진 줄이다. 검색어나 거르기가 있으면 둘 다 맞는 줄과 그 상위를
 * 보인다(접힘과 무관하게) — 검색·거르기 밖의 선택은 그대로 둔다(보이지 않을 뿐 초안에 남는다).
 * include 는 '문제 줄만'·'바뀐 줄만'이 누른 때 고정한 줄 키 집합이다(null 이면 거르지 않는다).
 */
export function visibleScreenRows(
  model: ScreenPermissionModel,
  expanded: ReadonlySet<string>,
  query: string,
  include: ReadonlySet<string> | null = null,
): ScreenRow[] {
  if (query.trim() || include) {
    const keep = new Set<string>();
    for (const row of model.rows) {
      if (!screenRowMatches(row, query) || (include && !include.has(row.key))) continue;
      keep.add(row.key);
      for (const key of ancestorKeys(model, row.key)) keep.add(key);
    }
    return model.rows.filter((row) => keep.has(row.key));
  }
  return model.rows.filter((row) => ancestorKeys(model, row.key).every((key) => expanded.has(key)));
}

/* ── 2026-10-05 '한 화면' 압축: 영역·섹션 줄의 메뉴 표시 일괄, 섹션 상태, 줄 거르기 ─────────────────────────────── */

/**
 * 줄과 그 아래 메뉴 줄의 메뉴 번호(앞선 순회 순서). '메뉴에 없는 화면' 줄은 메뉴가 아니라 빠진다.
 * visibleKeys 가 있으면(검색·거르기 중) 줄 자신과 보이는 줄만 — 보이지 않는 메뉴를 켜지 않는다.
 */
export function navigationCodesUnder(model: ScreenPermissionModel, row: ScreenRow, visibleKeys?: ReadonlySet<string>): string[] {
  return rowsUnder(model, row)
    .filter((entry) => entry.kind === 'menu' && entry.menuCode !== null && (!visibleKeys || entry === row || visibleKeys.has(entry.key)))
    .map((entry) => entry.menuCode!);
}

/**
 * 영역·섹션 줄의 '메뉴 표시' 칸 — 그 아래 메뉴 전체를 켜고 끈다(시안 의미, 2026-10-05 사용자 승인). 메뉴 표시의 상하위 규칙은
 * 그대로 지킨다(편집기의 toggleNavigationPermission 과 같은 규칙):
 *  · 켤 때: codes(줄 자신과 보이는 하위 메뉴) 각각을 그 상위와 함께 켠다 — 상위가 빠진 하위(저장을 막는 상위 누락)가 생기지 않는다.
 *  · 끌 때: 줄 자신과 그 아래 **전체**를 끈다 — 검색·거르기로 보이지 않는 하위도 함께다. 상위가 꺼진 하위는 어차피 보이지 않고
 *    남겨 두면 상위 누락으로 저장이 막히므로, 화면 줄의 메뉴 표시를 끌 때와 같은 결과다.
 * 기능권한(OPERATION)은 건드리지 않는다 — 메뉴 표시와 기능권한은 다른 권한이다(H3).
 */
export function toggleNavigationSubtree(
  tree: NavigationPermissionTree,
  selection: ReadonlySet<string>,
  rootCode: string,
  codes: readonly string[],
  checked: boolean,
): Set<string> {
  if (!checked) return toggleNavigationPermission(tree, selection, rootCode, false);
  let next = new Set(selection);
  for (const code of codes) next = toggleNavigationPermission(tree, next, code, true);
  return next;
}

/** 줄 자신의 칸이 기준선과 다른가 — 메뉴 표시와 자기 화면의 진입·등록·수정·삭제·그 밖의 기능 권한. */
export function rowChanged(row: ScreenRow, selection: ReadonlySet<string>, baseline: ReadonlySet<string>): boolean {
  const keys = [
    ...(row.menuCode ? [`NAVIGATION:${row.menuCode}`] : []),
    ...(row.entry?.state === 'gated' ? row.entry.codes : []).map(operationKey),
    ...SCREEN_CODE_COLUMNS.flatMap((column) => row.codes[column]).map(operationKey),
  ];
  return keys.some((key) => selection.has(key) !== baseline.has(key));
}

/**
 * 고칠 일이 있는 메뉴 줄인가 — 메뉴 표시를 줬는데 숨거나(상태 'problem'), 진입 권한이 없어 고치기가 붙은 메뉴.
 * '메뉴에 없는 화면'은 메뉴가 아니라 문제로 세지 않는다.
 */
export function rowHasProblem(
  row: ScreenRow,
  preview: MenuVisibilityPreview,
  selection: ReadonlySet<string>,
  fixMenuCodes: ReadonlySet<string>,
): boolean {
  if (row.kind !== 'menu' || !row.menuCode) return false;
  return fixMenuCodes.has(row.menuCode) || screenRowStatus(row, preview, selection)?.tone === 'problem';
}

export interface SectionStatus {
  /** 경로가 있는 메뉴(줄 자신 포함) 수. */
  total: number;
  /** 그 가운데 이 그룹의 초안으로 사이드바에 보이는 수. */
  visible: number;
  /** 그 가운데 고칠 일이 있는 수(메뉴 표시를 줬는데 숨거나 진입 권한이 없음). */
  warnings: number;
  /** 섹션 단위 '진입 권한 추가'로 바로 고칠 수 있는 메뉴(정해진 권한이고 보호·타인 자료 권한이 없는 'auto'). */
  autoMenus: string[];
  /** 그 메뉴들에 더할 기능권한 코드(중복 없음). 후보를 사람이 골라야 하거나 보호·타인 자료 권한이 필요한 메뉴는 빠진다. */
  autoCodes: string[];
  /** 진입 권한을 화면 줄에서 직접 골라야 하는 메뉴 — 후보가 여럿(choose)이거나, 정해진 권한에 보호·타인 자료 권한이 있다. */
  manualMenus: string[];
}

/**
 * 영역·섹션 줄의 상태 칸 — '보임 n/m · 경고 n' 과 그 섹션의 자동 가능한 진입 권한(시안 의미). rows 는 그 줄과 아래 줄이다
 * (검색·거르기 중이면 보이는 줄만 — 묶음 칸과 같은 범위). 섹션 단위 추가는 영역·섹션 줄의 묶음 칸과 같은 제외 규칙을 따른다
 * (2026-10-05 반박 리뷰 반영, H3): 후보가 여럿인 메뉴(choose)와, 정해진 권한에 보호 권한·타인 자료 권한(…_ALL)이 있는 메뉴는
 * 빠지고 manualMenus 로 센다 — 화면 줄의 '권한 추가'에서 사람이 고른다. 한 번의 클릭이 타인 자료 권한을 알리지 않고 주지 않게 한다.
 */
export function sectionStatus(
  rows: readonly ScreenRow[],
  preview: MenuVisibilityPreview,
  selection: ReadonlySet<string>,
  fixByMenu: ReadonlyMap<string, EntryFix>,
): SectionStatus {
  const screens = rows.filter((row) => row.kind === 'menu' && row.menuCode !== null && row.route !== null);
  const fixMenuCodes = new Set(fixByMenu.keys());
  const autoMenus: string[] = [];
  const manualMenus: string[] = [];
  const autoCodes = new Set<string>();
  for (const row of screens) {
    const fix = fixByMenu.get(row.menuCode!);
    if (!fix || fix.kind === 'unfixable') continue;
    if (!isBulkEntryFix(fix)) {
      manualMenus.push(row.menuCode!);
      continue;
    }
    autoMenus.push(row.menuCode!);
    for (const code of fix.codes) autoCodes.add(code);
  }
  return {
    total: screens.length,
    visible: screens.filter((row) => screenRowStatus(row, preview, selection)?.tone === 'ok').length,
    warnings: screens.filter((row) => rowHasProblem(row, preview, selection, fixMenuCodes)).length,
    autoMenus,
    autoCodes: [...autoCodes],
    manualMenus,
  };
}
