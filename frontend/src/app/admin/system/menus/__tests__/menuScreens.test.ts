import { describe, expect, it } from 'vitest';
import { SCREEN_REGISTRY } from '@/types/generated-screen-registry';
import { describeRoute, entryFixFor, entryModeText, filterScreens, LINKABLE_SCREENS, permissionText } from '../menuScreens';
import { pageInProjection } from '@/test-utils/projection';

// 기능 예시(모두 충족 판정·별칭·타인 자료 권한)는 그 화면이 투영으로 빠진 생성물에서 뺀다 — page 파일이 원장에 있고 실제로 없을 때다(원본에서는 그대로다).

/**
 * [2026-10-02 D1] 연결 화면 — 앱 화면 목록(생성물)에서 고르고, 경로가 여는 화면·진입 권한·별칭을 말한다. 진입 권한 고치기는
 * 권한 편집기(1단계)와 같은 판정·같은 ANY/ALL 처리다.
 */
describe('연결 화면 목록', () => {
  it('동적 경로가 아닌 화면만 고를 수 있고, 이름·경로로 찾는다', () => {
    expect(LINKABLE_SCREENS.length).toBeGreaterThan(0);
    expect(LINKABLE_SCREENS.every((screen) => !screen.dynamic)).toBe(true);
    expect(LINKABLE_SCREENS.length).toBe(SCREEN_REGISTRY.filter((screen) => !screen.dynamic).length);
    expect(filterScreens('').length).toBe(LINKABLE_SCREENS.length);
    expect(filterScreens('/admin/system/MENUS').map((screen) => screen.route)).toContain('/admin/system/menus');
  });

  it('경로가 여는 화면 — 없음·이전 방식·별칭·화면·목록에 없음을 가른다(쿼리는 떼고 본다)', () => {
    expect(describeRoute(null)).toEqual({ kind: 'none' });
    expect(describeRoute('  ')).toEqual({ kind: 'none' });
    expect(describeRoute('cop/bbs/selectBoardList.do')).toEqual({ kind: 'legacy' });
    if (pageInProjection('/admin/collaboration/address-book/select-address-book-list')) {
      expect(describeRoute('/admin/collaboration/address-book')).toEqual({
        kind: 'alias', target: '/admin/collaboration/address-book/select-address-book-list',
      });
    }
    const screen = describeRoute('/admin/system/menus?tab=STRUCTURE');
    expect(screen.kind === 'screen' && screen.screen.route).toBe('/admin/system/menus');
    expect(describeRoute('/admin/no-such-screen')).toEqual({ kind: 'unknown' });
  });

  it('진입 권한 문구 — 권한이 없으면 로그인만, ANY 는 하나라도, ALL 은 모두', () => {
    expect(entryModeText({ permissions: [], mode: 'ANY' })).toBe('로그인만 하면 열림');
    expect(entryModeText({ permissions: ['MENU_READ'], mode: 'ANY' })).toBe('하나라도 있으면 열림');
    expect(entryModeText({ permissions: ['POLL_READ', 'POLL_READ_ALL'], mode: 'ALL' })).toBe('모두 있어야 열림');
    const menus = SCREEN_REGISTRY.find((candidate) => candidate.route === '/admin/system/menus')!;
    expect(permissionText('MENU_READ', menus)).toMatch(/\(MENU_READ\)$/);
    expect(permissionText('MENU_READ', menus)).not.toBe('MENU_READ');
    expect(permissionText('UNKNOWN_CODE', menus)).toBe('UNKNOWN_CODE');
  });
});

describe('진입 권한 고치기(권한 편집기 1단계와 같은 판정)', () => {
  const menu = (route: string | null) => ({ code: '12', name: '메뉴 관리', route });

  it('필요한 권한이 하나면 그것을, ALL 이면 전부를 더하고, 이미 들어갈 수 있으면 없다', () => {
    expect(entryFixFor(menu('/admin/system/menus'), [])).toMatchObject({ kind: 'auto', codes: ['MENU_READ'] });
    expect(entryFixFor(menu('/admin/system/menus'), ['MENU_READ'])).toBeNull();
    if (pageInProjection('/admin/survey/polls')) {
      expect(entryFixFor(menu('/admin/survey/polls'), ['POLL_READ'])).toMatchObject({ kind: 'auto', codes: ['POLL_READ', 'POLL_READ_ALL'] });
    }
  });

  it('ANY 후보가 여럿이면 사람이 고르게 하되 조회(*_READ)를 먼저 권한다', () => {
    expect(entryFixFor(menu('/admin/security/authority'), [])).toMatchObject({
      kind: 'choose', candidates: ['AUTHRT_READ', 'AUTHRT_AUDIT'], preferred: 'AUTHRT_READ',
    });
  });

  it('등록되지 않은 관리 화면은 고칠 수 없고, 관리 화면 밖·경로 없음은 판정하지 않는다', () => {
    expect(entryFixFor(menu('/admin/no-such-screen'), [])).toMatchObject({ kind: 'unfixable' });
    expect(entryFixFor(menu('/'), [])).toBeNull();
    expect(entryFixFor(menu(null), [])).toBeNull();
  });
});
