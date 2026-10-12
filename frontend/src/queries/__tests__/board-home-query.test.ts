import { beforeEach, describe, expect, it, vi } from 'vitest';
import client from '@/lib/api/client';
import { boardHomeQuery, loadBoardHome } from '../board-home-query';

/**
 * 업무 홈 게시판 조회의 응답 처리(Phase 2 9단계 — 종전 app/page.test.tsx 의 대시보드 로더 시험을 옮겼다). 토큰이 없을 때의 /login
 * 이동과 미리 채우기 조건은 서버 자식 시험(app/__tests__/home-data-boundary.test.tsx)이 본다.
 */
vi.mock('@/lib/api/client', () => ({
  default: {
    getRaw: vi.fn(),
    requestRaw: vi.fn(),
  },
}));

const success = (data: unknown) => ({
  success: true as const,
  code: 'S000',
  message: 'success',
  data,
});

describe('업무 홈 게시판 조회', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('대시보드 API 를 부르고 최근 글·전체 글 수를 업무 홈 모양으로 바꾼다', async () => {
    vi.mocked(client.getRaw).mockResolvedValue(success({
      notiList: [{ pstSn: 1, pstTtl: '공지사항 테스트', useYn: 'Y', userId: 'admin' }],
      taskList: [{ pstSn: 2, pstTtl: '할일 테스트', useYn: 'Y', userId: 'admin' }],
      taskListTotal: 1,
      notiListTotal: 1,
      pendingApprovalCount: 10,
    }));

    const result = (await loadBoardHome())!;
    expect(result.initialTaskList.map(task => task.title)).toEqual(['할일 테스트']);
    expect(result.initialNotiList.map(task => task.title)).toEqual(['공지사항 테스트']);
    // 결재 대기 수는 결재 기능이 자기 API 로 센다 — 게시판 조회는 그 값을 싣지 않는다.
    expect(result).not.toHaveProperty('pendingApprovalCount');
    // 토큰은 API 클라이언트가 붙인다(서버에서는 쿠키에서).
    expect(client.getRaw).toHaveBeenCalledWith('dashboard', undefined);
    expect(boardHomeQuery.queryKey).toEqual(['home', 'board']);
    expect(boardHomeQuery.queryFn).toBe(loadBoardHome);
  });

  it('대시보드 API 실패를 0건 데이터로 위장하지 않고 던진다', async () => {
    vi.mocked(client.getRaw).mockRejectedValue(new Error('dashboard unavailable'));

    await expect(loadBoardHome()).rejects.toThrow('dashboard unavailable');
  });

  it('실제 API의 403은 데이터 없이 이 홈에서 게시판을 보지 않는 상태(null)로 전달한다', async () => {
    vi.mocked(client.getRaw).mockRejectedValue(Object.assign(new Error('Forbidden'), { response: { status: 403 } }));

    await expect(loadBoardHome()).resolves.toBeNull();
    expect(client.getRaw).toHaveBeenCalledOnce();
  });

  it.each([401, 404, 429, 500, '403', undefined])('HTTP %s 실패를 권한 부족이나 빈 데이터로 바꾸지 않는다', async (status) => {
    const failure = Object.assign(new Error('dashboard transport failed'), { response: { status } });
    vi.mocked(client.getRaw).mockRejectedValue(failure);

    await expect(loadBoardHome()).rejects.toBe(failure);
  });

  it('홈 게시물 상세 이동에 필요한 서버 식별자를 보존한다', async () => {
    vi.mocked(client.getRaw).mockResolvedValue(success({
      notiList: [{ bbsId: 'BBSMSTR_AAAAAAAAAAAA', pstSn: 41, pstTtl: '바로 열 공지' }],
      taskList: [{ pstSn: 42, pstTtl: '게시판 정보가 없는 자료' }], taskListTotal: 1, notiListTotal: 1,
      pendingApprovalCount: 0,
    }));
    const result = (await loadBoardHome())!;
    expect(result.initialNotiList[0]).toMatchObject({ bbsId: 'BBSMSTR_AAAAAAAAAAAA', pstSn: 41 });
    expect(result.initialTaskList[0]).not.toHaveProperty('bbsId');
    expect(result.initialTaskList[0]).not.toHaveProperty('pstSn');
  });

  it('응답 계약(필수 pendingApprovalCount)을 어긴 응답을 받지 않는다', async () => {
    vi.mocked(client.getRaw).mockResolvedValue(success({ taskList: [], notiList: [] }));

    await expect(loadBoardHome()).rejects.toThrow('생성 API 응답이 OpenAPI 계약과 일치하지 않습니다.');
  });

  it('대시보드 게시글에 writeOnly pswd가 노출되면 응답을 거부합니다.', async () => {
    vi.mocked(client.getRaw).mockResolvedValue(success({
      taskList: [{ pstSn: 1, useYn: 'Y', userId: 'admin', pswd: 'secret' }],
      notiList: [],
      taskListTotal: 1,
      notiListTotal: 0,
      pendingApprovalCount: 0,
    }));

    await expect(loadBoardHome()).rejects.toThrow('생성 API 응답에 허용되지 않은 필드가 있습니다.');
  });

  // [2026-09-26 DIP V1] 목록 날짜는 서버가 실제로 싣는 crtDt 에서 온다. 종전에는 서버가 한 번도 싣지 않는
  //   레거시 필드를 읽어 늘 '-' 였다. 게시판 전체 글 수는 null(조회 실패)을 0 으로 바꾸지 않는다.
  it('🚨 목록 날짜는 crtDt 의 날짜 부분이고, 전체 글 수 null 을 0 으로 바꾸지 않는다', async () => {
    vi.mocked(client.getRaw).mockResolvedValue(success({
      notiList: [{ pstSn: 7, pstTtl: '공지', crtDt: '2026-09-25T10:30:00' }],
      taskList: [],
      taskListTotal: null,
      notiListTotal: 12,
      pendingApprovalCount: 0,
    }));

    const result = (await loadBoardHome())!;
    expect(result.initialNotiList[0].date).toBe('2026-09-25');
    expect(result.taskListTotal).toBeNull();
    expect(result.notiListTotal).toBe(12);
  });
});
