import { canOpenPage } from '@/lib/auth/page-access';
import { registeredPageEntry } from '@/lib/auth/page-authorization';
import type { NavigationPermissionNode, NavigationPermissionTree } from '@/lib/auth/navigation-permission-tree';
import { normalizeInternalRoute } from '@/lib/navigation/internal-route';
import { resolveMenuScreen, screensWithoutMenu } from '@/lib/navigation/menu-screen-resolution';
import { MENU_HIDDEN_REASON_LABELS, menuPreviewKey, type MenuVisibilityPreview } from '@/lib/navigation/menu-visibility-preview';
import { PAGE_PERMISSION_MODES } from '@/types/generated-permissions';
import { SCREEN_REGISTRY, type ScreenRegistryEntry } from '@/types/generated-screen-registry';
import { isProtectedPermission, operationKey, planBulkToggle, type BulkTogglePlan } from './operation-permission-matrix-model';

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
 * 자료 수정을, '그 밖의 기능' 한 번이 다른 관리 화면 진입을 알리지 않고 주지 않게 한다.
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

export interface AggregateCell {
  /** n — 화면 진입은 진입 권한이 있는 화면 수, 나머지는 보호 권한을 뺀 고유 코드 수. */
  total: number;
  /** k — 화면 진입은 들어갈 수 있는 화면 수, 나머지는 켜진 코드 수. */
  selected: number;
  plan: BulkTogglePlan;
}

/**
 * 묶음 줄(영역·섹션)의 칸 — 아래 화면 전체를 한 번에 켜고 끈다. 보호 권한은 빼고 칸마다 따로 고르게 한다(H3).
 * rows 는 다룰 줄이다 — 화면 검색 중이면 표가 검색 결과에 보이는 줄로 좁혀 넘긴다(보이지 않는 화면을 바꾸지 않는다).
 *  · 등록·수정·삭제·그 밖의 기능: 아래 화면들의 그 칸 일괄 코드(bulkCodes, 고유) — 보호 권한·타인 자료 권한·다른 화면의
 *    진입 권한은 빠진다. 모두 켜져 있으면 끄고, 아니면 켠다.
 *  · 화면 진입: 아래 화면 가운데 진입 권한이 있는 화면. 모두 들어갈 수 있으면 그 진입 권한을 끄고, 아니면 들어갈 수 없는
 *    화면마다 필요한 만큼만 더한다 — ANY 는 권하는 코드 하나(조회 우선), ALL 은 모두. 후보를 전부 더해 넘치게 주지 않는다.
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
    const satisfied = gated.filter((row) => entrySatisfied(row.entry!, selection));
    const selectedCodes = [...new Set(gated.flatMap((row) => row.entry!.codes))]
      .filter((code) => !isProtectedPermission(code) && selection.has(operationKey(code)));
    if (satisfied.length === gated.length) {
      return { total: gated.length, selected: satisfied.length, plan: selectedCodes.length > 0 ? { mode: 'clear', keys: selectedCodes.map(operationKey) } : { mode: null, keys: [] } };
    }
    if (!allowAdd) {
      return { total: gated.length, selected: satisfied.length, plan: selectedCodes.length > 0 ? { mode: 'clear', keys: selectedCodes.map(operationKey) } : { mode: null, keys: [] } };
    }
    const add = new Set<string>();
    for (const row of gated) {
      if (entrySatisfied(row.entry!, selection)) continue;
      const codes = row.entry!.mode === 'ALL'
        ? row.entry!.codes.filter((code) => !isProtectedPermission(code))
        : [preferredEntryCode(row.entry!.codes)].filter((code): code is string => code !== null);
      for (const code of codes) if (!selection.has(operationKey(code))) add.add(operationKey(code));
    }
    return { total: gated.length, selected: satisfied.length, plan: add.size > 0 ? { mode: 'select', keys: [...add] } : { mode: null, keys: [] } };
  }
  const codes = [...new Set(rows.flatMap((row) => row.bulkCodes[column]))];
  if (codes.length === 0) return null;
  const plan = planBulkToggle(codes.map((code) => ({ code, domain: '', action: '', name: '' })), selection, allowAdd);
  return { total: codes.length, selected: codes.filter((code) => selection.has(operationKey(code))).length, plan };
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
 * 보일 줄. 검색어가 없으면 모든 상위가 펼쳐진 줄이다. 검색어가 있으면 맞는 줄과 그 상위를 보인다(접힘과 무관하게) —
 * 검색 결과 밖의 선택은 그대로 둔다(보이지 않을 뿐 초안에 남는다).
 */
export function visibleScreenRows(model: ScreenPermissionModel, expanded: ReadonlySet<string>, query: string): ScreenRow[] {
  if (query.trim()) {
    const keep = new Set<string>();
    for (const row of model.rows) {
      if (!screenRowMatches(row, query)) continue;
      keep.add(row.key);
      for (const key of ancestorKeys(model, row.key)) keep.add(key);
    }
    return model.rows.filter((row) => keep.has(row.key));
  }
  return model.rows.filter((row) => ancestorKeys(model, row.key).every((key) => expanded.has(key)));
}
