import { describe, expect, it } from 'vitest';
import { menuStructureFailure, menuStructureSource } from '../menuStructureSource';

/*
 * 화면 관리의 메뉴 구조 출처(2026-10-02 D3). 화면 목록의 연결 메뉴가 읽는다(2026-10-04 이전 프로그램 탭은 퇴역했다).
 * MENU_READ 가 없으면 조회를 보내지 않으므로(서버에 403 거부 기록을 남기지 않는다) 조회 결과를 보지 않고 '권한 없음' 이다.
 * 로그인 정보를 확인하는 중에는 아직 모른다. (1단계 programMenuLinkSource·programMenuLinkFailure 의 판정을 옮겼다.)
 */
const MENUS = [
  { menuNo: 4, menuNm: '화면 관리', upMenuSn: null, menuOrdr: 1, modernRoute: '/admin/system/programs', menuExpln: null, useYn: 'Y' as const },
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

  // [2026-10-05] 화면을 연 뒤 첫 조회가 끝나기 전에는 지난 방문의 결과(성공·실패)를 쓰지 않는다.
  it('화면을 연 뒤 첫 조회가 끝나기 전이면 캐시에 지난 결과가 있어도 불러오는 중이다', () => {
    expect(menuStructureSource({ canReadMenus: true, authorizationPending: false, status: 'success', data: { menus: MENUS }, awaitingFreshResult: true }))
      .toStrictEqual({ status: 'checking' });
    expect(menuStructureSource({ canReadMenus: true, authorizationPending: false, status: 'error', error: { response: { status: 500 } }, awaitingFreshResult: true }))
      .toStrictEqual({ status: 'checking' });
    // 권한이 없으면 조회하지 않으므로 기다릴 결과가 없다.
    expect(menuStructureSource({ canReadMenus: false, authorizationPending: false, status: 'pending', awaitingFreshResult: true }))
      .toStrictEqual({ status: 'forbidden' });
  });

  /*
   * [2026-10-05 반박 리뷰] 받은 데이터 없이 실패한 뒤 '다시 불러오기' 를 누르면 조회 상태가 'pending' 으로 돌아간다. 그동안
   * 실패를 그대로 두어야 실패 안내와 다시 불러오기 단추가 눌린 순간 사라지지 않는다. 다시 불러오는 중이 아니면(첫 조회·화면을
   * 다시 연 뒤의 조회) 종전처럼 불러오는 중이다. 성공하면 다시 불러오는 중 표시와 무관하게 메뉴 구조다.
   */
  it('실패 뒤 다시 불러오는 동안은 불러오는 중이 아니라 실패를 그대로 둔다', () => {
    expect(menuStructureSource({ canReadMenus: true, authorizationPending: false, status: 'pending', retryingAfterFailure: true }))
      .toStrictEqual({ status: 'failed' });
    expect(menuStructureSource({ canReadMenus: true, authorizationPending: false, status: 'pending', retryingAfterFailure: false }))
      .toStrictEqual({ status: 'checking' });
    expect(menuStructureSource({ canReadMenus: true, authorizationPending: false, status: 'success', data: { menus: MENUS }, retryingAfterFailure: true }))
      .toStrictEqual({ status: 'loaded', menus: MENUS });
    // 권한이 없으면 다시 불러올 조회 자체가 없다.
    expect(menuStructureSource({ canReadMenus: false, authorizationPending: false, status: 'pending', retryingAfterFailure: true }))
      .toStrictEqual({ status: 'forbidden' });
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
