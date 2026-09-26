/**
 * 최근 방문 메뉴(2026-09-26 DIP B5 F2) — 이 브라우저에만 남는 편의 기록이다.
 *
 * 메뉴 번호만 저장하고 이름·주소는 저장하지 않는다. 보여 줄 때 지금 볼 수 있는 메뉴 목록과 맞춰 보므로, 배정이
 * 회수된 메뉴는 기록에 남아 있어도 보이지 않는다. 사용자마다 키를 나눠 같은 브라우저의 다른 계정에 보이지 않게
 * 한다. 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 기록하지 않을 뿐 화면은 그대로 동작한다.
 */
export const RECENT_MENU_LIMIT = 8;
const KEY_PREFIX = 'egov.recent-menus.v1:';

function storageKey(userKey: string): string {
  return `${KEY_PREFIX}${userKey}`;
}

export function readRecentMenuNos(userKey: string | null | undefined): number[] {
  if (!userKey) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userKey));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is number => Number.isSafeInteger(value) && value > 0).slice(0, RECENT_MENU_LIMIT);
  } catch {
    return [];
  }
}

export function recordRecentMenu(userKey: string | null | undefined, menuNo: number | null | undefined): void {
  if (!userKey || !menuNo || !Number.isSafeInteger(menuNo) || menuNo <= 0) return;
  const next = [menuNo, ...readRecentMenuNos(userKey).filter((value) => value !== menuNo)].slice(0, RECENT_MENU_LIMIT);
  try {
    window.localStorage.setItem(storageKey(userKey), JSON.stringify(next));
  } catch {
    // 저장하지 못해도 이동은 막지 않는다.
  }
}
