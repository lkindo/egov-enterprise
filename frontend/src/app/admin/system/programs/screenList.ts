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

function compareScreenLinkedMenu(left: ScreenLinkedMenu, right: ScreenLinkedMenu): number {
  return left.menuNm.localeCompare(right.menuNm, 'ko') || left.menuNo - right.menuNo;
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

/** 연결 메뉴 칸의 한 줄 요약. 분류('메뉴 없음' 배지)는 구분 칸이 말한다. */
export function screenMenuLinkSummary(cell: ScreenMenuLinkCell): string {
  switch (cell.kind) {
    case 'linked':
      // 연결한 메뉴가 모두 사용 안 함이면 그렇다고 말한다 — 그 화면은 '메뉴 없음' 이기도 하다(사용 중인 메뉴로 열리지 않는다).
      return cell.menus.every((menu) => !menu.inUse)
        ? `연결 메뉴 ${cell.menus.length}개(모두 사용 안 함)`
        : `연결 메뉴 ${cell.menus.length}개`;
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

// ─── 구분과 거르기 ───────────────────────────────────────────────────────────────────────────────────────

export type ScreenKindFilter = 'all' | 'no-menu' | 'login-only' | 'dynamic';

export const SCREEN_KIND_FILTER_OPTIONS: ReadonlyArray<{ value: ScreenKindFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'no-menu', label: '메뉴에 없는 화면' },
  { value: 'login-only', label: '로그인만 하면 열리는 화면' },
  { value: 'dynamic', label: '동적 경로' },
];

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

/**
 * '메뉴에 없는 화면' 으로 거를 수 없는 이유. 메뉴 구조를 불러오지 못했으면 어떤 화면이 메뉴에 없는지 모른다 —
 * 전체를 '메뉴 없음' 으로도, 0건으로도 말하지 않는다. 거를 수 있으면 null.
 */
export function screenKindFilterUnavailableReason(kind: ScreenKindFilter, source: MenuStructureSource): string | null {
  if (kind !== 'no-menu' || source.status === 'loaded') return null;
  if (source.status === 'checking') return '메뉴 구조를 불러오는 중이라 메뉴에 없는 화면을 아직 거를 수 없습니다.';
  if (source.status === 'forbidden') return '메뉴 조회 권한이 없어 메뉴에 없는 화면을 거를 수 없습니다.';
  return '메뉴 구조를 불러오지 못해 메뉴에 없는 화면을 거를 수 없습니다. 연결 메뉴를 다시 불러와 주세요.';
}

/**
 * '구분' 선택지의 안내 — '메뉴에 없는 화면' 을 고를 수 없는(비활성) 이유. 메뉴 구조를 불러왔으면 null.
 * 비활성 선택지에 이유 없이 두지 않는다(G10). 빈 상태 문구(screenKindFilterUnavailableReason)와 같은 화면에 함께 보일 수
 * 있어 문장을 다르게 둔다.
 */
export function noMenuOptionHint(source: MenuStructureSource): string | null {
  switch (source.status) {
    case 'loaded':
      return null;
    case 'checking':
      return '메뉴 구조를 불러오는 중이라 아직 메뉴에 없는 화면으로 거를 수 없습니다.';
    case 'forbidden':
      return '메뉴 조회 권한이 없어 메뉴에 없는 화면으로 거를 수 없습니다.';
    case 'failed':
      return '메뉴 구조를 불러오지 못해 메뉴에 없는 화면으로 거를 수 없습니다.';
  }
}

function keywordMatches(screen: ScreenRegistryEntry, keyword: string): boolean {
  if (!keyword) return true;
  const needle = keyword.toLowerCase();
  return screenDisplayName(screen).toLowerCase().includes(needle) || screen.route.toLowerCase().includes(needle);
}

/**
 * 화면 목록 거르기. 검색어는 화면 이름·경로(대소문자 무시), 구분은 하나만 고른다. '메뉴에 없는 화면' 은
 * isScreenWithoutMenu 다 — 메뉴 구조를 모르면 연결 칸은 확인 중·거부·실패라(createScreenMenuLinkLookup) 어떤 화면도
 * 걸리지 않는다(빈 목록). 화면은 그 이유(screenKindFilterUnavailableReason)를 빈 상태 문구로 보인다.
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
      case 'no-menu':
        return isScreenWithoutMenu(linkOf(screen.route));
      case 'login-only':
        return opensWithLoginOnly(screen);
      case 'dynamic':
        return screen.dynamic;
    }
  });
}

/** 별칭 거르기 — 검색어(경로·목적지)로만 거른다. 별칭은 화면이 아니라 구분 조건을 받지 않는다. */
export function filterAliases(aliases: readonly ScreenAlias[], keyword: string): ScreenAlias[] {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return [...aliases];
  return aliases.filter((alias) => alias.route.toLowerCase().includes(needle)
    || (alias.target ?? '').toLowerCase().includes(needle));
}

/** 빈 결과 문구(G15) — 검색어가 없을 때의 기본 문구. 구분을 골랐으면 그 구분에 맞는 화면이 없다고 말한다. */
export function screenListFallbackMessage(kind: ScreenKindFilter): string {
  return kind === 'all' ? '표시할 화면이 없습니다.' : '선택한 구분에 해당하는 화면이 없습니다.';
}
