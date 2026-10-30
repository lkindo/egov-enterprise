import { http, HttpResponse } from 'msw';

export const handlers = [
  // [2026-10-26] 공용 레이아웃(브레드크럼·사이드바)이 배경으로 부르는 메뉴 조회. 시험의 검증 대상이 아니므로 빈 목록이다 — 종전에는
  //   핸들러가 없어 실제 네트워크로 나갔고, CI 에서는 실패해 빈 목록과 같은 표시가 됐다. 응답 모양은 생성 계약이 대조한다.
  http.get('*/api/v1/menus/head', () => {
    return HttpResponse.json({ success: true, code: 'S000', message: '성공', data: { list: [] } });
  }),
  http.get('*/api/v1/menus/bookmarks', () => {
    return HttpResponse.json({ success: true, code: 'S000', message: '성공', data: [] });
  }),
  http.get('*/api/v1/menus/bookmarks/status', () => {
    return HttpResponse.json({ success: true, code: 'S000', message: '성공', data: { bookmarks: [], unavailableCount: 0 } });
  }),

  // 사용자 정보 조회 Mock API (실제 서비스는 users/me 호출)
  http.get('*/api/v1/users/me', () => {
    return HttpResponse.json({
      success: true,
      code: 'S000',
      message: '성공',
      data: {
        userId: 'admin',
        userNm: '관리자',
        esntlId: 'USRCNFRM_00000000001',
        role: 'ROLE_ADMIN',
        groups: ['ROLE_ADMIN'], permissions: [], authorizationVersion: 'fixture-authorization-v1',
        emlAddr: 'admin@egov.go.kr'
      }
    });
  }),

  // 게시판 선택지(ADR-0040 결정 11) — 아래 와일드카드보다 먼저 둔다. bare 배열이고 PageResponse 가 아니다.
  http.get('*/api/v1/boards/options', () => {
    return HttpResponse.json({
      success: true,
      code: 'S000',
      message: '성공',
      data: [{ bbsId: 'BBSMSTR_000000000001', bbsTtl: '공지사항' }],
    });
  }),

  // 게시판 목록 조회 Mock API (실제 서비스는 boards/:bbsId 호출 - PageResponse 구조 준수)
  http.get('*/api/v1/boards/*', () => {
    return HttpResponse.json({
      success: true,
      code: 'S000',
      message: '성공',
      data: {
        list: [
          {
            pstSn: 1,
            bbsId: 'BBSMSTR_000000000001',
            pstTtl: '공지사항 테스트',
            pstCn: '공지 내용입니다.',
            inqCnt: 0,
            userNm: '작성자',
            userId: 'admin',
            crtDt: '2026-06-01T00:00:00',
            // [2026-10-23 ADR-0040 결정 3·5·10] 서버가 목록 행마다 싣는 판정 값 — 게시 상태·버전·고정 여부와 게시 기간.
            pstBgngYmd: null,
            pstEndYmd: null,
            postingStatus: 'POSTING',
            version: 0,
            pinned: false
          }
        ],
        total: 1,
        totalPage: 1,
        page: 1,
        size: 10
      }
    });
  }),

  // 로그인 Mock API
  http.post('*/api/v1/auth/login', () => {
    return HttpResponse.json({
      success: true,
      code: 'S000',
      message: '성공',
      data: {
        accessToken: 'fixture-access-token',
        role: 'ROLE_ADMIN',
        groups: ['ROLE_ADMIN'], permissions: [], authorizationVersion: 'fixture-authorization-v1',
      },
    });
  })
];
