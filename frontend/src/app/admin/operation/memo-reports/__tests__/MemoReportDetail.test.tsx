/**
 * 메모보고 — 열람 경로와 상태 문구 계약.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 목록은 제목·작성자·수신자·상태를 보여 주지만 **행을 여는 어포던스가 물리적으로 없었다** —
 * `onRowClick` 을 넘기지 않으면 `StandardDataTable` 이 행 액션 셀 자체를 렌더하지 않는다.
 * 그래서 보고 본문(`rptCn`)을 읽을 방법이 없었고, 화면 설명이 약속한 '지시사항'(`drctnMttr`)도
 * 어디에도 표시되지 않았다. `getMemoReport` 는 프런트 서비스에 이미 있었고 호출부가 0건이었다.
 *
 * '미열람' 상태도 해소할 수 없었다 — 열람 기록은 `GET /{memoRptSn}` 이 남기는데
 * (`MemoReportApiController` 가 `readMemoReport` 를 부른다) 그 호출부가 없었기 때문이다.
 *
 * 그리고 그 상태 라벨은 **틀렸다.** 서버는 열람 주체를 구분하지 않는다 —
 * `MemoReportService.readMemoReport` 는 작성자·수신자·관리자 중 누가 열어도 `rptrInqDt` 를
 * 갱신한다. 즉 작성자가 자기 보고를 다시 열기만 해도 '수신확인'으로 보였다.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MemoReportManagementClient from '../MemoReportManagementClient';

const mocks = vi.hoisted(() => ({
  getReceivedReports: vi.fn(),
  getMyReports: vi.fn(),
  getMemoReports: vi.fn(),
  getMemoReport: vi.fn(),
  replace: vi.fn(),
  user: { role: 'ROLE_ADMIN' } as { role: string } | null,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/admin/operation/memo-reports',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('@/services/business/memoreport/memoReportService', () => ({
  memoReportService: {
    getReceivedReports: mocks.getReceivedReports,
    getMyReports: mocks.getMyReports,
    getMemoReports: mocks.getMemoReports,
    getMemoReport: mocks.getMemoReport,
  },
}));

const ROW = {
  memoRptSn: 5,
  rptTtl: '3분기 운영 보고',
  rptCn: '서버 증설이 필요합니다.',
  userId: 'USR_A',
  wrterNm: '김작성',
  rptrId: 'USR_B',
  rptrNm: '박수신',
  memoRptYmd: '20260828',
  crtDt: '2026-08-28T09:00:00',
};

function renderClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoReportManagementClient />
    </QueryClientProvider>,
  );
}

describe('메모보고 열람', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { role: 'ROLE_ADMIN' };
    const page = { list: [ROW], total: 1 };
    mocks.getReceivedReports.mockResolvedValue(page);
    mocks.getMyReports.mockResolvedValue(page);
    mocks.getMemoReports.mockResolvedValue(page);
    mocks.getMemoReport.mockResolvedValue({ ...ROW, drctnMttr: '9월까지 검토 바랍니다.' });
  });

  it('행을 열면 본문과 지시사항을 보여 준다 — 종전에는 여는 방법이 없었다', async () => {
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '3분기 운영 보고 보고 열기' }));

    await waitFor(() => expect(mocks.getMemoReport).toHaveBeenCalledWith(5));
    expect(await screen.findByText('서버 증설이 필요합니다.')).toBeVisible();
    expect(screen.getByText('9월까지 검토 바랍니다.')).toBeVisible();
    // 목록 행에도 수신자가 있으므로 모달 안으로 범위를 좁힌다.
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('박수신')).toBeVisible();
  });

  it('지시사항이 없으면 남길 방법이 없다는 사실까지 말한다', async () => {
    // 빈칸으로 두면 '아직 안 왔다'와 '남길 방법이 없다'를 구분할 수 없다.
    mocks.getMemoReport.mockResolvedValue({ ...ROW, drctnMttr: undefined });
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '3분기 운영 보고 보고 열기' }));

    expect(await screen.findByText('지시사항을 남기는 기능은 아직 화면에 제공되지 않습니다.', { exact: false })).toBeVisible();
  });

  it('상세 조회가 실패하면 빈 보고로 위장하지 않고 재시도를 제공한다', async () => {
    mocks.getMemoReport.mockRejectedValue(new Error('boom'));
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '3분기 운영 보고 보고 열기' }));

    expect(await screen.findByText('보고를 불러오지 못했습니다.')).toBeVisible();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it("상태 열은 '수신확인'이 아니라 '열람됨'이라고 말한다", async () => {
    /*
     * 서버는 열람 주체를 구분하지 않는다 — 작성자·관리자가 열어도 같은 타임스탬프가 찍힌다.
     * '수신확인' 은 수신자가 봤다는 뜻이 되어 사실이 아니다.
     */
    mocks.getReceivedReports.mockResolvedValue({
      list: [{ ...ROW, rptrInqDt: '2026-08-28T10:00:00' }],
      total: 1,
    });
    renderClient();

    expect(await screen.findByText('열람됨')).toBeVisible();
    expect(screen.queryByText('수신확인')).not.toBeInTheDocument();
  });
});

describe('메모보고 전체 탭 노출', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const page = { list: [ROW], total: 1 };
    mocks.getReceivedReports.mockResolvedValue(page);
    mocks.getMyReports.mockResolvedValue(page);
    mocks.getMemoReports.mockResolvedValue(page);
    mocks.getMemoReport.mockResolvedValue(ROW);
  });

  it('SYSTEM 관리자에게도 전체 탭이 보인다 — 리터럴 비교는 이 역할을 빠뜨렸다', async () => {
    /*
     * /auth/me 의 role 은 authority id 원문이다. 종전 `role === 'ROLE_ADMIN' || 'ADMIN'` 은
     * SYSTEM·ROLE_SYSTEM 을 빠뜨려, 라우트는 통과하는데 화면 기능만 사라지는 비대칭을 만들었다.
     */
    mocks.user = { role: 'ROLE_SYSTEM' };
    renderClient();

    expect(await screen.findByRole('tab', { name: '전체' })).toBeInTheDocument();
  });

  it('일반 사용자에게는 전체 탭을 노출하지 않는다 — 백엔드가 403 으로 무언 실패한다', async () => {
    mocks.user = { role: 'ROLE_USER' };
    renderClient();

    await screen.findByRole('tab', { name: '수신함' });
    expect(screen.queryByRole('tab', { name: '전체' })).not.toBeInTheDocument();
  });
});
