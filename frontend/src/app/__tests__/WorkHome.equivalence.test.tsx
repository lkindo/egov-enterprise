import { act, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Component, cloneElement, isValidElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppQueryClient } from '@/lib/query/list-query-defaults';
import { inProjection, missingOutsideLedger } from '@/test-utils/projection';
import { NOTICE_BOARD_ID, TASK_BOARD_ID } from '@/config/board-ids';

/**
 * 업무 홈('/') 동등성 그물(Phase 2 9단계 H0). 업무 홈을 슬롯으로 나누기 전의 화면을 고정한다 — 이후 변경은 이 기대값을 사유와 함께
 * 바꿀 때만 화면을 바꿀 수 있다.
 *
 * 그물은 page 가 돌려준 트리를 서버처럼 풀어(async 컴포넌트를 기다려) 그린다. 가짜 서버 하나가 같은 논리 데이터(업무게시판 37건·
 * 공지 12건·최근 글·결재 대기 3건·안 읽은 쪽지 2건·배너·팝업)를 대시보드 API 와 결재 대기 API 양쪽 모양으로 답하고, 주체가 가진
 * 기능권한을 서버처럼 집행한다(없으면 403). 그래서 같은 기대값이 '서버 응답으로 판정하던' 옛 홈과 '권한으로 판정하는' 새 홈에 함께 선다.
 *
 * 고정하는 것: h1·인사·부제, 머리 단추(이름·목적지), 요약 카드(순서·값), 최근 글 목록(제목·링크·날짜·전체 보기), '실시간 상태',
 * 팝업·배너, 구역 순서. 권한 집합: 기본 그룹(모두), DASHBOARD_READ 없음, NOTE_READ 없음, 둘 다 없음. 실패: 대시보드
 * 500 은 오류 경계로, 게시판 전체 글 수·결재 대기 수를 셀 수 없으면 '조회 실패' 다(0건으로 위장하지 않는다).
 * 생성물에서는 투영으로 빠진 기능의 구역을 기대값에서 뺀다.
 *
 * [2026-10-20] 사유와 함께 바꾼 기대값: 늘 '연결되지 않았다' 고만 말하던 활동 구역을 걷었고(활동 원천이 없다), 요약 카드 줄에
 * 메모 보고·일정·설문의 기여 카드와 core 의 부서 업무 카드를 더했다(처리 대기 모음). 기본 그룹은 네 조회 권한을 모두 가진다.
 */

const ALL_PERMISSIONS = ['DASHBOARD_READ', 'NOTE_READ', 'APPROVAL_READ', 'BANNER_READ', 'POPUP_READ', 'BOARD_READ', 'NOTI_READ',
  'MEMO_RPT_READ', 'SCHEDULE_READ', 'SURVEY_READ', 'DEPT_JOB_READ'] as const;

const server = vi.hoisted(() => ({
  permissions: [] as string[],
  /** 'ok' | 500(대시보드 전송 실패) */
  dashboard: 'ok' as 'ok' | 500,
  taskListTotal: 37 as number | null,
  /** 결재 대기 수를 셀 수 없다(옛 응답의 null · 새 결재 대기 API 의 실패). */
  approvalUncountable: false,
  calls: [] as string[],
}));

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });
const ok = (data: unknown) => ({ success: true, code: 'S000', message: 'success', data });
const can = (code: string) => server.permissions.includes(code);

vi.mock('@/lib/api/client', () => {
  const getRaw = async (url: string) => {
    server.calls.push(url);
    if (url === 'dashboard') {
      if (!can('DASHBOARD_READ')) throw httpError(403);
      if (server.dashboard === 500) throw httpError(500);
      return ok({
        taskList: [{ bbsId: 'BBSMSTR_CCCCCCCCCCCC', pstSn: 42, pstTtl: '주간 업무 정리', crtDt: '2026-09-24T09:00:00' }],
        notiList: [{ bbsId: 'BBSMSTR_AAAAAAAAAAAA', pstSn: 41, pstTtl: '점검 공지', crtDt: '2026-09-25T10:30:00' }],
        taskListTotal: server.taskListTotal,
        notiListTotal: 12,
        // [2026-10-26 ADR-0043 1차 SET-07] 지정 게시판을 운영하지 않음 — 이 그물은 운영 중인 상태만 본다.
        taskListUnavailable: false,
        notiListUnavailable: false,
      });
    }
    if (url === 'approvals/pending') {
      if (!can('APPROVAL_READ')) throw httpError(403);
      if (server.approvalUncountable) throw httpError(503);
      return ok({ list: [], total: 3, page: 0, size: 1, totalPage: 3 });
    }
    throw new Error(`가짜 서버에 없는 조회: ${url}`);
  };
  return { default: { getRaw, requestRaw: async (config: { url: string }) => getRaw(config.url) } };
});
vi.mock('@/services/foundation/auth/authService', () => ({
  authService: { getCurrentUser: async () => subject() },
}));
vi.mock('@/services/business/user/NoteService', () => ({
  noteService: {
    getUnreadReceivedCount: async () => {
      if (!can('NOTE_READ')) throw httpError(403);
      return 2;
    },
  },
}));
// 처리 대기 카드(2026-10-20) — 오늘 일정 없음·읽지 않은 받은 보고 1건·참여할 설문 없음·내 담당 업무 없음.
vi.mock('@/services/business/schedule/deptScheduleService', () => ({
  getDeptScheduleMonthList: async () => {
    if (!can('SCHEDULE_READ')) throw httpError(403);
    return [];
  },
}));
vi.mock('@/services/business/memoreport/memoReportService', () => ({
  memoReportService: {
    getReceivedReports: async () => {
      if (!can('MEMO_RPT_READ')) throw httpError(403);
      return { list: [{ memoRptSn: 5, rptTtl: '주간 보고', rptrInqDt: null }], total: 1 };
    },
  },
}));
vi.mock('@/services/foundation/survey/SurveyParticipationService', () => ({
  surveyParticipationService: {
    getSurveys: async () => {
      if (!can('SURVEY_READ')) throw httpError(403);
      return { list: [], total: 0 };
    },
  },
}));
vi.mock('@/services/business/user/deptJob/DeptJobUserService', () => ({
  deptJobUserService: {
    getDeptJobList: async () => {
      if (!can('DEPT_JOB_READ')) throw httpError(403);
      return { list: [], total: 0 };
    },
  },
}));
vi.mock('@/services/business/user/BannerService', () => ({
  bannerService: { getReflectedBanners: async () => [{ bnrSn: 1, bnrNm: '배너 1', linkUrl: '', bnrImgNm: '', bnrExpln: '설명 1' }] },
}));
vi.mock('@/services/business/user/PopupService', () => ({
  popupService: {
    getActivePopups: async () => [{
      popupSn: 7, popupTtlNm: '점검 안내', fileUrl: '', popupWdthPstn: '0', popupVrtcPstn: '0', popupVrtcSz: '300',
      popupWdthSz: '300', ntceBgnde: '2026-09-01', ntceEndde: '2099-12-31', stopvewSetupYn: 'Y', ntceYn: 'Y',
    }],
  },
}));
// 실시간 본문은 웹소켓 구독이라 이 그물의 대상이 아니다. 구역(제목)과 자리만 본다.
vi.mock('@/components/features/dashboard/RealTimeDashboard', () => ({ RealTimeDashboard: () => <p>실시간 본문</p> }));
vi.mock('@/app/components/ui/attachment-image', () => ({ AttachmentImage: () => null, extractAtchFileSn: () => null }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'accessToken' ? { value: 'token' } : undefined) }),
}));
vi.mock('next/navigation', () => ({
  redirect: () => { throw new Error('NEXT_REDIRECT'); },
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: subject(), loading: false, mfaPending: false });
  return { useAuth: auth, useOptionalAuth: auth };
});
// next/dynamic 은 lazy 로 연다(서버 렌더 여부와 무관하게 모듈을 실제로 불러 그린다).
vi.mock('next/dynamic', async () => {
  const { lazy, Suspense } = await import('react');
  return {
    default: (loader: () => Promise<unknown>) => {
      const Lazy = lazy(async () => {
        const loaded = await loader() as { default?: unknown } | ((props: object) => ReactNode);
        return { default: (typeof loaded === 'function' ? loaded : loaded.default) as (props: object) => ReactNode };
      });
      return function DynamicComponent(props: object) {
        return <Suspense fallback={null}><Lazy {...props} /></Suspense>;
      };
    },
  };
});

function subject() {
  return { id: 'user', name: '사용자', role: 'ROLE_USER', permissions: server.permissions, authorizationVersion: 'v1' };
}

const { default: HomePage } = await import('../page');

/** 서버 컴포넌트를 서버처럼 푼다 — async 함수 컴포넌트는 기다려 결과로 바꾸고, 나머지는 자식만 따라간다. */
async function resolveServerTree(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveServerTree));
  if (!isValidElement(node)) return node;
  const { type, props } = node as { type: unknown; props: { children?: ReactNode } };
  if (typeof type === 'function' && type.constructor.name === 'AsyncFunction') {
    return resolveServerTree(await (type as (value: unknown) => Promise<ReactNode>)(props));
  }
  if (props.children === undefined) return node;
  return cloneElement(node, undefined, await resolveServerTree(props.children));
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>오류 경계</p> : this.props.children; }
}

/** 서버에서 실패하면(트리를 푸는 중 던짐) 'server', 그리면서 실패하면 오류 경계가 받는다. */
async function renderHome(params: Record<string, string> = {}) {
  const tree = await resolveServerTree(await HomePage({ searchParams: Promise.resolve(params) }));
  await act(async () => {
    render(<QueryClientProvider client={createAppQueryClient()}><Boundary>{tree}</Boundary></QueryClientProvider>);
  });
}

/** 생성물에서 투영으로 빠진 기능은 기대값에서 뺀다. 원본에서는 모두 참이다. */
const FEATURE_SOURCES = {
  board: 'frontend/src/services/business/user/board/BoardUserService.ts',
  approval: 'frontend/src/app/approvals/page.tsx',
};
const boardInProjection = inProjection(FEATURE_SOURCES.board);
const approvalInProjection = inProjection(FEATURE_SOURCES.approval);
const present = {
  approval: approvalInProjection,
  note: inProjection('frontend/src/app/components/dashboard/UnreadNotesCard.tsx'),
  memo: inProjection('frontend/src/app/components/dashboard/MemoReportHome.tsx'),
  schedule: inProjection('frontend/src/app/components/dashboard/ScheduleHome.tsx'),
  survey: inProjection('frontend/src/app/components/dashboard/SurveyHome.tsx'),
  realtime: inProjection('frontend/src/components/features/dashboard/RealTimeDashboard.tsx'),
  popup: inProjection('frontend/src/app/components/dashboard/PopupManager.tsx'),
  banner: inProjection('frontend/src/app/components/dashboard/BannerSlider.tsx'),
};

/** 첫 화면은 lazy 모듈을 처음 불러 늦을 수 있다(시험 실행기의 변환 비용). */
const LOAD = { timeout: 10_000 };

/** 아이콘(시험 대역은 이름을 글자로 그린다)을 뺀 글자. */
const textWithoutIcons = (element: Element) => {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('[data-testid^="icon-"]').forEach(icon => icon.remove());
  return copy.textContent?.trim();
};
const header = () => screen.getByRole('heading', { level: 1, name: '업무 홈' }).closest('header') as HTMLElement;
/** 처리 대기 카드(2026-10-20) — 메모 보고 22·일정 24·설문 26·core 부서 업무 28 순서다. */
const pendingWorkCards = () => [
  ...(present.memo ? ['읽지 않은 받은 보고1건주간 보고'] : []),
  ...(present.schedule ? ['오늘 일정0건'] : []),
  ...(present.survey ? ['참여할 설문0건'] : []),
  '내 담당 업무0건',
];
const summaryCards = () => [...(screen.getByText('업무게시판 글').closest('ul') as HTMLElement).children].map(item => item.textContent);
const expectAccessDenied = async () => {
  const status = await screen.findByRole('status', undefined, LOAD);
  expect(screen.getByRole('heading', { level: 1, name: '업무 홈' })).toBeInTheDocument();
  expect(status).toHaveTextContent('업무 홈 대시보드에 접근할 권한이 없습니다.');
  expect(status).toHaveTextContent('메뉴에서 이용 가능한 업무를 선택해 주세요.');
  for (const text of ['업무게시판 글', '결재 대기', '안 읽은 쪽지', '읽지 않은 받은 보고', '오늘 일정', '참여할 설문', '내 담당 업무', '실시간 상태']) {
    expect(screen.queryByText(text)).toBeNull();
  }
  for (const name of ['새 게시글 작성', '결재함 열기']) expect(screen.queryByRole('link', { name })).toBeNull();
  expect(screen.queryByRole('region', { name: '홍보 배너' })).toBeNull();
  expect(screen.queryByText('점검 안내')).toBeNull();
  expect(screen.queryByText('0건')).toBeNull();
};

if (boardInProjection) describe('업무 홈 동등성 그물 (Phase 2 H0)', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    server.permissions = [...ALL_PERMISSIONS];
    server.dashboard = 'ok';
    server.taskListTotal = 37;
    server.approvalUncountable = false;
    server.calls = [];
    localStorage.clear();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => errorSpy.mockRestore());

  it('기본 그룹: 머리·요약 카드·최근 글·실시간·홍보를 같은 순서와 값으로 그린다', async () => {
    await renderHome();

    expect(await screen.findByText('업무게시판 최근 글', undefined, LOAD)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '업무 홈' }).nextElementSibling)
      .toHaveTextContent(/^안녕하세요, 사용자님\. 확인할 일과 업무 현황입니다\.$/);
    expect(within(header()).getAllByRole('link').map(link => [textWithoutIcons(link), link.getAttribute('href')])).toEqual([
      ['새 게시글 작성', `/admin/community/boards/insert-board-article?bbsId=${TASK_BOARD_ID}`],
      ...(present.approval ? [['결재함 열기', '/approvals']] : []),
    ]);
    await waitFor(() => expect(summaryCards()).toEqual([
      ...(present.approval ? ['결재 대기3건'] : []),
      ...(present.note ? ['안 읽은 쪽지2건'] : []),
      ...pendingWorkCards(),
      '업무게시판 글37건',
      '공지사항12건',
    ]));
    expect(screen.getByText('내 담당 업무').closest('a')).toHaveAttribute('href', '/smart-toolkit/dept-job');
    if (present.memo) expect(screen.getByText('읽지 않은 받은 보고').closest('a')).toHaveAttribute('href', '/admin/operation/memo-reports');
    if (present.schedule) expect(screen.getByText('오늘 일정').closest('a')).toHaveAttribute('href', '/smart-toolkit/schedule');
    if (present.survey) expect(screen.getByText('참여할 설문').closest('a')).toHaveAttribute('href', '/survey');

    const taskList = screen.getByRole('heading', { level: 2, name: '업무게시판 최근 글' }).closest('section') as HTMLElement;
    expect(within(taskList).getByRole('link', { name: '주간 업무 정리' }))
      .toHaveAttribute('href', `/admin/community/boards/detail?bbsId=${TASK_BOARD_ID}&pstSn=42`);
    expect(within(taskList).getByText('2026-09-24')).toBeInTheDocument();
    expect(within(taskList).getByRole('link', { name: '업무게시판 전체 보기' }))
      .toHaveAttribute('href', `/admin/community/boards/select-board-list?bbsId=${TASK_BOARD_ID}`);
    const noticeList = screen.getByRole('heading', { level: 2, name: '최근 공지사항' }).closest('section') as HTMLElement;
    expect(within(noticeList).getByRole('link', { name: '점검 공지' }))
      .toHaveAttribute('href', `/admin/community/boards/detail?bbsId=${NOTICE_BOARD_ID}&pstSn=41`);
    expect(within(noticeList).getByRole('link', { name: '공지 전체 보기' }))
      .toHaveAttribute('href', `/admin/community/boards/select-board-list?bbsId=${NOTICE_BOARD_ID}`);

    // 늘 비어 있던 활동 구역은 없다(2026-10-20).
    expect(screen.queryByRole('heading', { level: 2, name: '최근 활동' })).toBeNull();

    // 구역 순서: 머리 → 요약 카드 → 최근 글 → 실시간 → 배너. 팝업은 구역 밖에 떠 있다.
    const order = [header(), screen.getByText('업무게시판 글'), taskList];
    if (present.realtime) {
      const realtime = screen.getByRole('heading', { level: 2, name: '실시간 상태' }).closest('section') as HTMLElement;
      expect(await within(realtime).findByText('실시간 본문')).toBeInTheDocument();
      order.push(realtime);
    }
    if (present.banner) {
      const banner = await screen.findByRole('region', { name: '홍보 배너' });
      expect(within(banner).getByRole('heading', { name: '배너 1' })).toBeInTheDocument();
      order.push(banner);
    }
    for (const [index, node] of order.slice(1).entries()) {
      expect(order[index].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    if (present.popup) expect(await screen.findByText('점검 안내')).toBeInTheDocument();
  });

  it('DASHBOARD_READ 가 없으면 이유와 다음 행동만 알리고 업무 데이터·홍보를 그리지 않는다', async () => {
    server.permissions = ALL_PERMISSIONS.filter(code => code !== 'DASHBOARD_READ');
    await renderHome();
    await expectAccessDenied();
  });

  it('NOTE_READ 가 없으면 안 읽은 쪽지 카드만 빠진다', async () => {
    server.permissions = ALL_PERMISSIONS.filter(code => code !== 'NOTE_READ');
    await renderHome();

    expect(await screen.findByText('업무게시판 최근 글', undefined, LOAD)).toBeInTheDocument();
    await waitFor(() => expect(summaryCards()).toEqual([
      ...(present.approval ? ['결재 대기3건'] : []),
      ...pendingWorkCards(),
      '업무게시판 글37건',
      '공지사항12건',
    ]));
    expect(screen.queryByText('안 읽은 쪽지')).toBeNull();
  });

  it('DASHBOARD_READ·NOTE_READ 가 모두 없어도 빈 홈이 아니라 접근 불가를 알린다', async () => {
    server.permissions = ALL_PERMISSIONS.filter(code => code !== 'DASHBOARD_READ' && code !== 'NOTE_READ');
    await renderHome();
    await expectAccessDenied();
  });

  it('대시보드 전송 실패는 0건 홈이 아니라 오류 경계로 간다', async () => {
    server.dashboard = 500;
    let thrown: unknown;
    try {
      await renderHome();
    } catch (error) {
      thrown = error;
    }
    if (thrown === undefined) expect(await screen.findByText('오류 경계', undefined, LOAD)).toBeInTheDocument();
    else expect(thrown).toMatchObject({ response: { status: 500 } });
    expect(screen.queryByText('0건')).toBeNull();
    expect(screen.queryByText('업무게시판 글')).toBeNull();
  });

  it('게시판 전체 글 수를 셀 수 없으면 0건·글 없음이 아니라 조회 실패라고 말한다', async () => {
    server.taskListTotal = null;
    await renderHome();

    const card = (await screen.findByText('업무게시판 글', undefined, LOAD)).closest('li') as HTMLElement;
    expect(card).toHaveTextContent('조회 실패');
    expect(screen.getByText('공지사항').closest('li')).toHaveTextContent('12건');
    // 목록 항목이 있으면 그대로 보인다 — 건수 실패를 목록 실패로 넓히지 않는다.
    expect(screen.getByRole('link', { name: '주간 업무 정리' })).toBeInTheDocument();
  });

  if (approvalInProjection) it('결재 대기 수를 셀 수 없으면 0건이 아니라 조회 실패라고 말한다', async () => {
    server.approvalUncountable = true;
    await renderHome();

    expect(await screen.findByText('업무게시판 최근 글', undefined, LOAD)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('결재 대기').closest('li')).toHaveTextContent('조회 실패'), { timeout: 5000 });
    expect(screen.queryByText('오류 경계')).toBeNull();
  });
});

describe('업무 홈 동등성 그물의 대상', () => {
  it('그물이 기대값을 가르는 기능 파일은 남아 있거나 투영으로 빠졌다', () => {
    expect(missingOutsideLedger(Object.values(FEATURE_SOURCES))).toEqual([]);
  });
});
