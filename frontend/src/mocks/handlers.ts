import { http, HttpResponse } from 'msw';

export const handlers = [
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
        emlAddr: 'admin@egov.go.kr'
      }
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
            crtDt: '2026-06-01T00:00:00'
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
      },
    });
  })
];
