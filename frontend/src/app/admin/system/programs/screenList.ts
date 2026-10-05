import { registeredPagePermissions } from '@/lib/auth/page-access';
import { permissionActionLabel, permissionDomainLabel } from '@/lib/auth/permission-labels';
import { resolveMenuScreen, screensWithoutMenu } from '@/lib/navigation/menu-screen-resolution';
import { isHandOffScreenRoute } from '@/lib/navigation/target-handoff';
import {
  SCREEN_ALIASES,
  SCREEN_REGISTRY,
  type ScreenAlias,
  type ScreenRegistryEntry,
} from '@/types/generated-screen-registry';
import type { MenuStructureSource } from './menuStructureSource';

/**
 * 화면 관리의 '화면 목록'(순수 계산, 2026-10-02 D3). 화면 표현과 분리한다.
 *
 * 모집단은 생성된 화면 목록(`SCREEN_REGISTRY`) 중 라우트 게이트가 아는 화면(`registeredPagePermissions(route) !== null`)
 * 이다 — 재사용 투영본에서 빠진 화면은 진입 권한 표에도 없으므로 여기서 빠진다. 별칭(`SCREEN_ALIASES`)은 화면이 아니라
 * 다른 화면으로 넘어가는 경로라 따로 보이고 링크하지 않는다.
 *
 * 이 목록은 인가가 아니다 — 진입 권한은 라우트 게이트가, 동작 권한은 서버가 집행한다.
 */

/** 화면 이름이 생성 목록에 없을 때의 표시. 이름을 지어내지 않는다. */
export const UNKNOWN_SCREEN_LABEL = '이름 미확인';

/** 화면 목록 모집단. 생성 목록 순서(경로 코드 포인트 순)를 그대로 쓴다. */
export function listedScreens(registry: readonly ScreenRegistryEntry[] = SCREEN_REGISTRY): ScreenRegistryEntry[] {
  return registry.filter((screen) => registeredPagePermissions(screen.route) !== null);
}

/** 별칭 목록(경로 순). */
export function listedAliases(aliases: readonly ScreenAlias[] = SCREEN_ALIASES): ScreenAlias[] {
  return [...aliases].sort((left, right) => (left.route < right.route ? -1 : left.route > right.route ? 1 : 0));
}

/** 별칭이 어떻게 넘기는지. */
export function aliasKindLabel(alias: ScreenAlias): string {
  return alias.kind === 'page-redirect' ? '화면 파일이 넘김' : '앱 설정이 넘김';
}

/**
 * 별칭 목적지의 표시. 생성 목록은 넘겨받는 동적 값을 템플릿 자리표시자(`${id}`)로 적는다 — 화면 경로와 같은 표기
 * (`[id]`)로 보인다. 목적지를 모르면 지어내지 않고 그렇게 말한다.
 */
export function aliasTargetLabel(target: string | null): string {
  if (target === null) return '목적지 미확인';
  return target.replace(/\$\{([^}]+)\}/g, '[$1]');
}

export function screenDisplayName(screen: ScreenRegistryEntry): string {
  return screen.label ?? UNKNOWN_SCREEN_LABEL;
}

/**
 * 권한 코드의 표시 이름. 화면 목록에 적힌 그 권한의 행위(action)로 업무 영역과 행위를 갈라 카탈로그 이름과 같은
 * 모양('업무 · 행위')으로 짓는다. 행위를 모르면 코드를 그대로 보인다.
 */
export function screenPermissionName(screen: ScreenRegistryEntry, code: string): string {
  const action = screen.permissions.find((permission) => permission.code === code)?.action;
  if (!action || !code.endsWith(`_${action}`) || code.length <= action.length + 1) return code;
  const domain = code.slice(0, code.length - action.length - 1);
  return `${permissionDomainLabel(domain)} · ${permissionActionLabel(action)}`;
}

export interface ScreenEntrySummary {
  /** 진입 권한(코드와 표시 이름), 화면 목록 순서. */
  permissions: { code: string; name: string }[];
  /** 열리는 조건. 권한이 하나면 null(이름이 곧 조건이다). */
  rule: string | null;
}

/**
 * 진입 권한이 둘 이상일 때 칩 앞에 두는 짧은 표지(2026-10-05 한 줄 행). '모두' 는 ALL(모두 있어야 열림), '하나' 는
 * ANY(하나라도 있으면 열림)다 — 뜻은 표지의 보조 문장(rule)과 화면의 '집계 기준' 도움말이 말한다. 권한이 하나 이하면 null.
 */
export function screenEntryMarker(screen: ScreenRegistryEntry): { label: '모두' | '하나'; rule: string } | null {
  const summary = screenEntrySummary(screen);
  if (summary.permissions.length < 2 || !summary.rule) return null;
  return { label: screen.entry.mode === 'ALL' ? '모두' : '하나', rule: summary.rule };
}

/**
 * 진입 권한의 요약. 라우트 게이트(canEnterRegisteredPage)와 같은 뜻으로 말한다 — 빈 권한은 로그인만 하면(공개 화면은
 * 로그인하지 않아도) 열리고, ANY 는 하나라도, ALL 은 모두 있어야 열린다.
 */
export function screenEntrySummary(screen: ScreenRegistryEntry): ScreenEntrySummary {
  const permissions = screen.entry.permissions.map((code) => ({ code, name: screenPermissionName(screen, code) }));
  if (permissions.length === 0) {
    return { permissions, rule: screen.shellAccess === 'public' ? '로그인하지 않아도 열림' : '로그인만 하면 열림' };
  }
  if (permissions.length === 1) return { permissions, rule: null };
  return { permissions, rule: screen.entry.mode === 'ALL' ? '모두 있어야 열림' : '하나라도 있으면 열림' };
}

/** 진입 권한 없이 로그인만으로 열리는 화면(공개 화면은 따로 센다). */
export function opensWithLoginOnly(screen: ScreenRegistryEntry): boolean {
  return screen.entry.permissions.length === 0 && screen.shellAccess !== 'public';
}

/** '메뉴에 추가' 를 둘 수 있는 화면 — 동적 경로가 아니고, 화면 인계로 넘길 수 있는 경로다. */
export function canAddScreenToMenu(screen: ScreenRegistryEntry): boolean {
  return !screen.dynamic && isHandOffScreenRoute(screen.route);
}

// ─── 연결 메뉴 ──────────────────────────────────────────────────────────────────────────────────────────

/** 화면을 여는 메뉴 한 건. */
export interface ScreenLinkedMenu {
  menuNo: number;
  menuNm: string;
  inUse: boolean;
  viaAlias: string | null;
}

/**
 * 화면 한 행의 연결 메뉴 칸. 메뉴 구조를 불러왔으면(linked·none) 그 화면이 '메뉴에 없는 화면' 인지(withoutMenu)를 함께
 * 싣는다 — 판정은 권한 작업대와 같은 공용 판정(screensWithoutMenu)이다.
 */
export type ScreenMenuLinkCell =
  | { kind: 'linked'; menus: ScreenLinkedMenu[]; withoutMenu: boolean }
  | { kind: 'none'; withoutMenu: boolean }
  | { kind: 'checking' }
  | { kind: 'forbidden' }
  | { kind: 'failed' };

/**
 * 연결 메뉴의 순서 — 사용 중인 메뉴가 먼저, 그 안에서 이름 순. [2026-10-05 한 줄 행] 칸에는 첫 메뉴 이름만 보이므로 사용
 * 안 함 메뉴가 이름 순으로 앞서 사이드바에 없는 메뉴가 그 화면의 대표처럼 보이지 않게 한다.
 */
function compareScreenLinkedMenu(left: ScreenLinkedMenu, right: ScreenLinkedMenu): number {
  return Number(right.inUse) - Number(left.inUse)
    || left.menuNm.localeCompare(right.menuNm, 'ko')
    || left.menuNo - right.menuNo;
}

/**
 * 화면 경로로 연결 메뉴 칸을 찾는 함수. 메뉴 구조를 한 번 색인한다. 메뉴 경로 → 화면은 권한 작업대와 같은 공용 판정
 * (resolveMenuScreen — 별칭은 한 번 따라가고, 동적 세그먼트로만 맞은 별칭은 따라가지 않는다)이다. 사용 안 함 메뉴도
 * 연결로 세고 그렇다고 표시하지만, '메뉴에 없는 화면' 은 사용 중인 메뉴로 열리지 않는 화면이다(screensWithoutMenu).
 * 메뉴를 불러오는 중이거나 조회가 거부·실패하면 0건('연결 없음')으로 말하지 않는다.
 */
export function createScreenMenuLinkLookup(source: MenuStructureSource): (route: string) => ScreenMenuLinkCell {
  if (source.status === 'checking') return () => ({ kind: 'checking' });
  if (source.status === 'forbidden') return () => ({ kind: 'forbidden' });
  if (source.status === 'failed') return () => ({ kind: 'failed' });

  const byScreen = new Map<string, ScreenLinkedMenu[]>();
  for (const menu of source.menus) {
    const resolved = resolveMenuScreen(menu.modernRoute);
    if (!resolved) continue;
    const linked: ScreenLinkedMenu = {
      menuNo: menu.menuNo,
      menuNm: menu.menuNm,
      inUse: menu.useYn === 'Y',
      viaAlias: resolved.viaAlias,
    };
    const menus = byScreen.get(resolved.screen.route);
    if (menus) menus.push(linked);
    else byScreen.set(resolved.screen.route, [linked]);
  }
  for (const menus of byScreen.values()) menus.sort(compareScreenLinkedMenu);
  const withoutMenu = new Set(screensWithoutMenu(source.menus.map((menu) => ({ route: menu.modernRoute, useYn: menu.useYn })))
    .map((screen) => screen.route));

  return (route) => {
    const menus = byScreen.get(route);
    return menus && menus.length > 0
      ? { kind: 'linked', menus, withoutMenu: withoutMenu.has(route) }
      : { kind: 'none', withoutMenu: withoutMenu.has(route) };
  };
}

/**
 * 연결 메뉴 칸의 한 줄 요약. 분류('메뉴 없음' 배지)는 구분 칸이 말한다.
 * [2026-10-05 한 줄 행] 연결이 있으면 첫 메뉴 이름(사용 중인 메뉴가 먼저)과 나머지 수('외 N개')를 말한다. 연결한 메뉴가
 * 모두 사용 안 함이면 그렇다고 말한다 — 그 화면은 '메뉴 없음' 이기도 하다(사용 중인 메뉴로 열리지 않는다). 나머지 메뉴와
 * 메뉴 ID·사용 안 함·별칭 경유는 칸을 펼쳐 본다(screenMenuLinkNeedsDetails).
 */
export function screenMenuLinkSummary(cell: ScreenMenuLinkCell): string {
  switch (cell.kind) {
    case 'linked': {
      const [first] = cell.menus;
      const rest = cell.menus.length - 1;
      const head = rest > 0 ? `${first.menuNm} 외 ${rest}개` : first.menuNm;
      if (cell.menus.some((menu) => menu.inUse)) return head;
      return rest > 0 ? `${head} (모두 사용 안 함)` : `${head} (사용 안 함)`;
    }
    case 'none':
      return '연결 없음';
    case 'checking':
      return '연결 메뉴를 불러오는 중…';
    case 'forbidden':
      return '메뉴 조회 권한 없음';
    case 'failed':
      return '메뉴를 불러오지 못함';
  }
}

/**
 * 연결 메뉴 칸을 펼칠 거리가 있는가 — 요약 한 줄이 말하지 않는 사실(나머지 메뉴, 사용 안 함, 별칭 경유)이 있으면 펼침
 * (키보드·터치로 열리는 details)으로 보인다. 사용 중인 메뉴 하나가 직접 여는 화면은 이름이 곧 전부라 펼치지 않는다.
 * 생략한 사실을 마우스를 올려야만 보이는 title 에만 두지 않는다(헌법 제16조 2항).
 */
export function screenMenuLinkNeedsDetails(cell: ScreenMenuLinkCell): boolean {
  if (cell.kind !== 'linked') return false;
  return cell.menus.length > 1 || cell.menus.some((menu) => !menu.inUse || menu.viaAlias !== null);
}

// ─── 구분과 거르기 ───────────────────────────────────────────────────────────────────────────────────────

export type ScreenKindFilter = 'all' | 'linked' | 'no-menu' | 'login-only' | 'dynamic';

/**
 * 화면 목록의 보기(2026-10-05 시안 복원). 구분 다섯 가지와 '넘어가는 경로'(별칭 — 화면이 아니라 표 자리에 따로 보인다)다.
 * 결과 도구 줄의 단추 묶음(건수 포함, aria-pressed)이 하나를 고른다.
 */
export type ScreenListView = ScreenKindFilter | 'aliases';

export const SCREEN_VIEW_OPTIONS: ReadonlyArray<{ value: ScreenListView; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'linked', label: '메뉴에 연결된 화면' },
  { value: 'no-menu', label: '메뉴에 없는 화면' },
  { value: 'login-only', label: '로그인만 하면 열리는 화면' },
  { value: 'dynamic', label: '동적 경로' },
  { value: 'aliases', label: '넘어가는 경로' },
];

/** 메뉴 구조를 알아야 셀 수 있는 보기 — 메뉴에 연결된 화면·메뉴에 없는 화면. 보기를 아직 정하지 못했으면(null) 아니다. */
export function viewNeedsMenuStructure(view: ScreenListView | null): boolean {
  return view === 'linked' || view === 'no-menu';
}

/**
 * '메뉴에 추가' 단추가 놓일 수 있는 보기 — 메뉴에 없는 화면이 행으로 나올 수 있는 보기다(전체·메뉴에 없는 화면·로그인만 하면
 * 열리는 화면). 메뉴에 연결된 화면 보기는 모든 행이 사용 중인 메뉴를 갖고, 동적 경로 보기는 메뉴에 둘 수 없는 화면만, 넘어가는
 * 경로 보기는 화면이 아닌 경로만 보인다. 화면은 이 판정 하나로 '관리' 열을 둘지와 실패 안내가 '메뉴에 추가' 를 말할지 정한다.
 */
export function viewOffersMenuAdd(view: ScreenListView | null): boolean {
  return view === 'all' || view === 'no-menu' || view === 'login-only';
}

/**
 * 메뉴에 연결된 화면 — 사용 중인 메뉴가 여는 화면이다. 메뉴 구조를 모르면(불러오는 중·권한 없음·실패) 어떤 화면도 연결됐다고
 * 말하지 않는다. 동적 경로 화면은 거르기(filterScreens)가 뺀다 — 동적 경로가 아닌 화면은 '메뉴에 연결된 화면' 과 '메뉴에
 * 없는 화면' 둘 중 정확히 하나다(사용 안 함 메뉴만 가리키는 화면은 메뉴에 없는 화면이다).
 */
export function isScreenWithMenu(cell: ScreenMenuLinkCell): boolean {
  return cell.kind === 'linked' && cell.menus.some((menu) => menu.inUse);
}

/**
 * 메뉴에 없는 화면 — 메뉴 구조를 불러왔고, 동적 경로가 아니며, 사용 중인 메뉴로 열리지 않는 화면이다. 판정은 연결 칸을
 * 만들 때 공용 판정(screensWithoutMenu — 권한 작업대의 '메뉴에 없는 화면' 묶음과 같다)으로 정해 싣는다. 동적 경로 화면은
 * 목록에서 항목을 골라 들어가는 화면이라 메뉴에 둘 수 없다('메뉴에 추가' 도 두지 않는다). 메뉴 구조를 모르면(불러오는 중·
 * 권한 없음·실패) 어떤 화면도 메뉴에 없다고 말하지 않는다. 구분 배지와 구분 거르기가 이 판정 하나를 쓴다.
 */
export function isScreenWithoutMenu(cell: ScreenMenuLinkCell): boolean {
  return (cell.kind === 'linked' || cell.kind === 'none') && cell.withoutMenu;
}

/** 행의 구분 배지. '메뉴 없음' 은 메뉴 구조를 불러왔을 때만 말한다(모르면 붙이지 않는다). */
export function screenBadges(screen: ScreenRegistryEntry, cell: ScreenMenuLinkCell): string[] {
  const badges: string[] = [];
  if (isScreenWithoutMenu(cell)) badges.push('메뉴 없음');
  if (screen.shellAccess === 'public') badges.push('공개 화면');
  else if (opensWithLoginOnly(screen)) badges.push('제한 없음');
  if (screen.dynamic) badges.push('동적 경로');
  return badges;
}

/** 보기 이름(단추 문구와 같다). */
export function screenViewLabel(view: ScreenListView): string {
  return SCREEN_VIEW_OPTIONS.find((option) => option.value === view)?.label ?? view;
}

/**
 * 메뉴 구조를 알아야 하는 보기(메뉴에 연결된 화면·메뉴에 없는 화면)로 거를 수 없는 이유. 메뉴 구조를 불러오지 못했으면
 * 어떤 화면이 메뉴에 있는지·없는지 모른다 — 전체를 '메뉴 없음' 으로도, 0건으로도 말하지 않는다. 거를 수 있으면 null.
 */
export function screenKindFilterUnavailableReason(kind: ScreenListView, source: MenuStructureSource): string | null {
  if (!viewNeedsMenuStructure(kind) || source.status === 'loaded') return null;
  const target = screenViewLabel(kind);
  if (source.status === 'checking') return `메뉴 구조를 불러오는 중이라 ${target}을 아직 거를 수 없습니다.`;
  if (source.status === 'forbidden') return `메뉴 조회 권한이 없어 ${target}을 거를 수 없습니다.`;
  return `메뉴 구조를 불러오지 못해 ${target}을 거를 수 없습니다. 연결 메뉴를 다시 불러와 주세요.`;
}

/**
 * 메뉴 구조가 필요한 단추(메뉴에 연결된 화면·메뉴에 없는 화면)의 건수를 '—' 로 둔 이유. 메뉴 구조를 불러왔으면 null.
 * 단추가 aria-describedby 로 이 문장을 가리킨다 — 건수를 모르는 단추를 이유 없이 두지 않는다(G10). 빈 상태 문구
 * (screenKindFilterUnavailableReason)와 같은 화면에 함께 보일 수 있어 문장을 다르게 둔다.
 */
export function menuViewHint(source: MenuStructureSource): string | null {
  switch (source.status) {
    case 'loaded':
      return null;
    case 'checking':
      return '메뉴 구조를 불러오는 중이라 메뉴에 연결된 화면과 메뉴에 없는 화면을 아직 셀 수 없습니다.';
    case 'forbidden':
      return '메뉴 조회 권한이 없어 메뉴에 연결된 화면과 메뉴에 없는 화면을 셀 수 없습니다.';
    case 'failed':
      return '메뉴 구조를 불러오지 못해 메뉴에 연결된 화면과 메뉴에 없는 화면을 셀 수 없습니다.';
  }
}

/**
 * 처음 보일 보기(2026-10-05 시안 복원). 메뉴 구조를 불러왔으면 할 일 목록인 '메뉴에 없는 화면', 메뉴 조회 권한이 없거나
 * 불러오지 못했으면 '전체' 다. 아직 불러오는 중이면 null — 화면은 그동안 빈 표 대신 불러오는 중으로 보인다(빈 표는 '메뉴에
 * 없는 화면이 없다' 로 읽힌다). 한 번 정한 처음 보기는 화면이 기억해 백그라운드 재조회 실패로 보기가 바뀌지 않게 한다.
 */
export function defaultScreenView(source: MenuStructureSource): ScreenListView | null {
  switch (source.status) {
    case 'checking':
      return null;
    case 'loaded':
      return 'no-menu';
    case 'forbidden':
    case 'failed':
      return 'all';
  }
}

function keywordMatches(screen: ScreenRegistryEntry, keyword: string): boolean {
  if (!keyword) return true;
  const needle = keyword.toLowerCase();
  return screenDisplayName(screen).toLowerCase().includes(needle) || screen.route.toLowerCase().includes(needle);
}

/**
 * 화면 목록 거르기. 검색어는 화면 이름·경로(대소문자 무시), 구분은 하나만 고른다. '메뉴에 없는 화면' 은
 * isScreenWithoutMenu, '메뉴에 연결된 화면' 은 동적 경로가 아니면서 isScreenWithMenu 다 — 메뉴 구조를 모르면 연결 칸은 확인
 * 중·거부·실패라(createScreenMenuLinkLookup) 어떤 화면도 걸리지 않는다(빈 목록). 화면은 그 이유
 * (screenKindFilterUnavailableReason)를 빈 상태 문구로 보인다.
 */
export function filterScreens(
  screens: readonly ScreenRegistryEntry[],
  condition: { keyword: string; kind: ScreenKindFilter },
  linkOf: (route: string) => ScreenMenuLinkCell,
): ScreenRegistryEntry[] {
  const keyword = condition.keyword.trim();
  return screens.filter((screen) => {
    if (!keywordMatches(screen, keyword)) return false;
    switch (condition.kind) {
      case 'all':
        return true;
      case 'linked':
        return !screen.dynamic && isScreenWithMenu(linkOf(screen.route));
      case 'no-menu':
        return isScreenWithoutMenu(linkOf(screen.route));
      case 'login-only':
        return opensWithLoginOnly(screen);
      case 'dynamic':
        return screen.dynamic;
    }
  });
}

/**
 * 검색어 칸의 라벨·자리표시 — 지금 보기에서 검색어가 실제로 거르는 칸을 말한다(KeywordFilter 라벨 규칙). 화면 보기는 화면
 * 이름·경로(filterScreens), 넘어가는 경로 보기는 이름이 없고 경로·넘어가는 곳(filterAliases)이다. 검색어는 보기를 바꿔도 그대로다.
 */
export function screenSearchField(view: ScreenListView | null): { label: string; placeholder: string } {
  return view === 'aliases'
    ? { label: '경로 · 넘어가는 곳', placeholder: '경로 또는 넘어가는 곳으로 검색' }
    : { label: '화면 이름 · 경로', placeholder: '화면 이름 또는 경로로 검색' };
}

/** 별칭 거르기 — 검색어(경로·목적지)로만 거른다. 별칭은 화면이 아니라 구분 조건을 받지 않는다. */
export function filterAliases(aliases: readonly ScreenAlias[], keyword: string): ScreenAlias[] {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return [...aliases];
  return aliases.filter((alias) => alias.route.toLowerCase().includes(needle)
    || (alias.target ?? '').toLowerCase().includes(needle));
}

/**
 * 보기 단추의 건수(2026-10-05 시안 복원). 지금 검색어를 적용한 뒤의 건수라 고른 보기의 '총 N건' 과 같다. 메뉴 구조가 필요한
 * 보기는 메뉴 구조를 불러왔을 때만 센다 — 모르면 null(화면은 '—' 와 그 이유를 보인다). 0건으로 말하지 않는다.
 */
export function screenViewCounts(
  screens: readonly ScreenRegistryEntry[],
  aliases: readonly ScreenAlias[],
  keyword: string,
  linkOf: (route: string) => ScreenMenuLinkCell,
  source: MenuStructureSource,
): Record<ScreenListView, number | null> {
  const count = (kind: ScreenKindFilter): number | null => (
    viewNeedsMenuStructure(kind) && source.status !== 'loaded'
      ? null
      : filterScreens(screens, { keyword, kind }, linkOf).length
  );
  return {
    all: count('all'),
    linked: count('linked'),
    'no-menu': count('no-menu'),
    'login-only': count('login-only'),
    dynamic: count('dynamic'),
    aliases: filterAliases(aliases, keyword).length,
  };
}

/** 빈 결과 문구(G15) — 검색어가 없을 때의 기본 문구. 구분을 골랐으면 그 구분에 맞는 화면이 없다고 말한다. */
export function screenListFallbackMessage(view: ScreenListView): string {
  if (view === 'aliases') return '다른 화면으로 넘어가는 경로가 없습니다.';
  return view === 'all' ? '표시할 화면이 없습니다.' : '선택한 구분에 해당하는 화면이 없습니다.';
}
