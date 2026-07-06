import { http, HttpResponse } from 'msw';

export const handlers = [
  // 사용자 정보 조회 Mock API (실제 서비스는 users/me 호출)
  http.get('*/api/v1/users/me', () => {
    return HttpResponse.json({
      userId: 'admin',
      userNm: '관리자',
      esntlId: 'USRCNFRM_00000000001',
      role: 'ROLE_ADMIN',
      emailAdres: 'admin@egov.go.kr'
    });
  }),

  // 게시판 목록 조회 Mock API (실제 서비스는 boards/:bbsId 호출 - PageResponse 구조 준수)
  http.get('*/api/v1/boards/*', () => {
    return HttpResponse.json({
      list: [
        {
          bbsId: 'BBSMSTR_000000000001',
          bbsNm: '공지사항',
          bbsTyCode: 'BBST01',
          useAt: 'Y',
          frstRegisterPnttm: '2026-06-01T00:00:00',
          nttId: 1,
          nttSj: '공지사항 테스트',
          nttCn: '공지 내용입니다.',
          inqireCo: 0,
          ntcrNm: '작성자',
          frstRegisterId: 'admin'
        }
      ],
      total: 1,
      totalPage: 1,
      page: 1,
      size: 10
    });
  }),

  // 로그인 Mock API
  http.post('*/api/v1/auth/login', () => {
    return HttpResponse.json({
      accessToken: 'mock-access-token-12345',
      userRole: 'ROLE_ADMIN',
      userId: 'admin',
      userNm: '관리자'
    });
  })
];
