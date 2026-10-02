import { describe, expect, it } from 'vitest';
import { menuStructureFailure, menuStructureSource } from '../menuStructureSource';

/*
 * 화면 관리의 메뉴 구조 출처(2026-10-02 D3). 화면 목록과 이전 프로그램이 같은 조회 한 번을 나눠 쓴다.
 * MENU_READ 가 없으면 조회를 보내지 않으므로(서버에 403 거부 기록을 남기지 않는다) 조회 결과를 보지 않고 '권한 없음' 이다.
 * 로그인 정보를 확인하는 중에는 아직 모른다. (1단계 programMenuLinkSource·programMenuLinkFailure 의 판정을 옮겼다.)
 */
const MENUS = [
  { menuNo: 4, menuNm: '프로그램 목록', upMenuSn: null, menuOrdr: 1, modernRoute: '/admin/system/programs', menuExpln: null, useYn: 'Y' as const, prgrmFileNm: 'ProgramList' },
];

describe('menuStructureFailure', () => {
  it('403 만 권한 없음이고 나머지 실패는 불러오지 못함이다', () => {
    expect(menuStructureFailure({ response: { status: 403 } })).toStrictEqual({ status: 'forbidden' });
    expect(menuStructureFailure({ response: { status: 401 } })).toStrictEqual({ status: 'failed' });
    expect(menuStructureFailure({ response: { status: 500 } })).toStrictEqual({ status: 'failed' });
    expect(menuStructureFailure(new Error('Network Error'))).toStrictEqual({ status: 'failed' });
  });
});

describe('menuStructureSource', () => {
  it('MENU_READ 가 없으면 조회 결과와 무관하게 권한 없음이다', () => {
    expect(menuStructureSource({ canReadMenus: false, authorizationPending: false, status: 'success', data: { menus: MENUS } }))
      .toStrictEqual({ status: 'forbidden' });
    expect(menuStructureSource({ canReadMenus: false, authorizationPending: false, status: 'pending' }))
      .toStrictEqual({ status: 'forbidden' });
  });

  it('로그인 정보를 확인하는 중이면 권한 없음으로 단정하지 않는다', () => {
    expect(menuStructureSource({ canReadMenus: false, authorizationPending: true, status: 'pending' }))
      .toStrictEqual({ status: 'checking' });
  });

  it('조회 중이면 불러오는 중이고, 성공하면 메뉴 구조 전체다', () => {
    expect(menuStructureSource({ canReadMenus: true, authorizationPending: false, status: 'pending' }))
      .toStrictEqual({ status: 'checking' });
    expect(menuStructureSource({ canReadMenus: true, authorizationPending: false, status: 'success', data: { menus: MENUS } }))
      .toStrictEqual({ status: 'loaded', menus: MENUS });
  });

  it('응답에 메뉴 배열이 없으면 빈 구조로 위장하지 않고 실패로 둔다', () => {
    expect(menuStructureSource({ canReadMenus: true, authorizationPending: false, status: 'success', data: null }))
      .toStrictEqual({ status: 'failed' });
    expect(menuStructureSource({ canReadMenus: true, authorizationPending: false, status: 'success', data: { menus: null } }))
      .toStrictEqual({ status: 'failed' });
  });

  it('조회가 실패하면 403 은 권한 없음, 나머지는 불러오지 못함이다', () => {
    expect(menuStructureSource({ canReadMenus: true, authorizationPending: false, status: 'error', error: { response: { status: 403 } } }))
      .toStrictEqual({ status: 'forbidden' });
    expect(menuStructureSource({ canReadMenus: true, authorizationPending: false, status: 'error', error: { response: { status: 500 } } }))
      .toStrictEqual({ status: 'failed' });
  });
});
