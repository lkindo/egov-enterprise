import { SCREEN_ALIASES, SCREEN_REGISTRY, findScreen, type ScreenRegistryEntry } from '@/types/generated-screen-registry';
import { PERMISSION_CODES } from '@/types/generated-permissions';
import { permissionActionLabel, permissionDomainLabel } from '@/lib/auth/permission-labels';
import { menusMissingEntryPermission } from '@/lib/auth/navigation-permission-tree';
import { planEntryFixes, type EntryFix } from '@/app/admin/security/authority/components/operation-permission-matrix-model';

/**
 * [2026-10-02 D1] 메뉴 편집기의 '연결 화면' — 앱 화면 목록(generated-screen-registry)에서 화면을 고르고, 고른 경로가 어떤
 * 화면을 여는지·진입 권한이 무엇인지 말한다. 화면 목록은 생성물이다(재사용 투영에서 빠진 화면은 이미 걸러져 있다).
 */

/** 메뉴에 연결할 수 있는 화면 — 동적 경로('[id]')가 아닌 화면, 이름·경로 순. */
export const LINKABLE_SCREENS: readonly ScreenRegistryEntry[] = SCREEN_REGISTRY
  .filter((screen) => !screen.dynamic)
  .slice()
  .sort((left, right) => (left.label ?? '￿').localeCompare(right.label ?? '￿', 'ko') || left.route.localeCompare(right.route, 'en'));

export const screenName = (screen: Pick<ScreenRegistryEntry, 'label'>): string => screen.label ?? '이름 미확인';

/** 화면 이름·경로로 찾는다(대소문자 무시). 검색어가 비면 전부다. */
export function filterScreens(keyword: string): readonly ScreenRegistryEntry[] {
  const needle = keyword.trim().toLocaleLowerCase('ko-KR');
  if (!needle) return LINKABLE_SCREENS;
  return LINKABLE_SCREENS.filter((screen) => `${screenName(screen)} ${screen.route}`.toLocaleLowerCase('ko-KR').includes(needle));
}

export type RouteDescription =
  | { kind: 'none' }
  | { kind: 'screen'; screen: ScreenRegistryEntry }
  | { kind: 'alias'; target: string | null }
  | { kind: 'legacy' }
  | { kind: 'unknown' };

/** 메뉴 경로가 여는 화면. 쿼리(tab·bbsId)·해시는 떼고 본다. */
export function describeRoute(route: string | null | undefined): RouteDescription {
  const value = (route ?? '').trim();
  if (!value) return { kind: 'none' };
  const path = value.split(/[?#]/, 1)[0];
  if (/\.do$/i.test(path)) return { kind: 'legacy' };
  const normalized = path.replace(/\/+$/, '') || '/';
  const alias = SCREEN_ALIASES.find((candidate) => candidate.route === normalized);
  if (alias) return { kind: 'alias', target: alias.target };
  const screen = findScreen(value);
  return screen ? { kind: 'screen', screen } : { kind: 'unknown' };
}

/** 진입 권한 판정 방식 문구. */
export function entryModeText(entry: ScreenRegistryEntry['entry']): string {
  if (entry.permissions.length === 0) return '로그인만 하면 열림';
  return entry.mode === 'ALL' ? '모두 있어야 열림' : '하나라도 있으면 열림';
}

/** 권한 코드의 화면 이름 — '메뉴 관리 조회 (MENU_READ)'. 화면 목록의 행위 값으로 업무 영역을 가른다. */
export function permissionText(code: string, screen?: ScreenRegistryEntry | null): string {
  const action = screen?.permissions.find((permission) => permission.code === code)?.action;
  if (!action || !code.endsWith(`_${action}`)) return code;
  const domain = code.slice(0, -(action.length + 1));
  return `${permissionDomainLabel(domain)} ${permissionActionLabel(action)} (${code})`;
}

/**
 * 이 기능권한으로 메뉴 경로의 화면에 들어갈 수 없으면 고치는 방법(권한 편집기 1단계와 같은 판정·같은 ANY/ALL 처리).
 * 들어갈 수 있거나 경로가 없으면 null 이다. 판정은 라우트 게이트와 같은 함수다 — 노출 판정일 뿐 인가가 아니다(H3).
 */
export function entryFixFor(menu: { code: string; name: string; route: string | null }, operations: Iterable<string>): EntryFix | null {
  const route = (menu.route ?? '').trim() || null;
  if (route === null) return null;
  const selection = new Set<string>([`NAVIGATION:${menu.code}`]);
  for (const code of operations) selection.add(`OPERATION:${code}`);
  const missing = menusMissingEntryPermission(
    [{ code: menu.code, name: menu.name, parentCode: null, route, useYn: 'Y' }],
    selection,
  );
  return missing.length === 0 ? null : planEntryFixes(missing, new Set<string>(PERMISSION_CODES))[0];
}
