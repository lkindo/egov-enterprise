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
  createMemoReport: vi.fn(),
  updateDrctMatter: vi.fn(),
  toast: vi.fn(),
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
    createMemoReport: mocks.createMemoReport,
    updateDrctMatter: mocks.updateDrctMatter,
  },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/user-picker', () => ({
  UserPicker: ({ isOpen, onSelect }: { isOpen: boolean; onSelect: (u: { esntlId?: string; userNm?: string }) => void }) =>
    isOpen ? (
      <div>
        <button type="button" onClick={() => onSelect({ esntlId: 'USR_B', userNm: '박수신' })}>박수신 선택</button>
        {/* esntlId 가 없는 결과 — 조용히 담으면 아무도 열 수 없는 수신자가 된다. */}
        <button type="button" onClick={() => onSelect({ userNm: '식별자 없음' })}>식별자 없는 사용자 선택</button>
      </div>
    ) : null,
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

  /**
   * [2026-08-28] 이 계약은 **한계를 고지하는 것**에서 **기능이 있는 것**으로 바뀐다.
   *
   * 종전에는 지시사항을 남기는 경로가 화면에 없어서 "아직 제공되지 않습니다" 라고 고지만
   * 했다(그 고지 자체는 옳았다 — 빈칸으로 두면 '아직 안 왔다'와 '남길 방법이 없다'를 구분할
   * 수 없다). 이제 PATCH /{sn}/instr-cn 을 배선했으므로 그 고지가 거짓이 된다.
   */
  it('지시사항이 없으면 남길 수 있는 입력을 제공한다', async () => {
    mocks.getMemoReport.mockResolvedValue({ ...ROW, drctnMttr: undefined });
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '3분기 운영 보고 보고 열기' }));

    expect(await screen.findByText('등록된 지시사항이 없습니다.')).toBeVisible();
    expect(screen.getByLabelText('지시사항 남기기', { exact: false })).toBeInTheDocument();
    // 이제 기능이 있으므로 없다고 말하면 안 된다.
    expect(screen.queryByText(/아직 화면에 제공되지 않습니다/)).not.toBeInTheDocument();
  });

  it('지시사항을 입력해 등록하면 서버로 나가고 상세를 다시 읽는다', async () => {
    mocks.getMemoReport.mockResolvedValue({ ...ROW, drctnMttr: undefined });
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '3분기 운영 보고 보고 열기' }));
    fireEvent.change(await screen.findByLabelText('지시사항 남기기', { exact: false }), {
      target: { value: '9월까지 검토 바랍니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '지시사항 등록' }));

    await waitFor(() => expect(mocks.updateDrctMatter)
      .toHaveBeenCalledWith(5, '9월까지 검토 바랍니다.'));
  });

  it('빈 지시사항은 보내지 않고 그 사실을 말한다', async () => {
    mocks.getMemoReport.mockResolvedValue({ ...ROW, drctnMttr: undefined });
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '3분기 운영 보고 보고 열기' }));
    fireEvent.click(await screen.findByRole('button', { name: '지시사항 등록' }));

    expect(await screen.findByText('지시사항을 입력해 주세요.')).toBeVisible();
    expect(mocks.updateDrctMatter).not.toHaveBeenCalled();
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

/**
 * 보고 작성 — 없던 발신 경로.
 *
 * 백엔드는 `POST /memo-reports` 를 갖췄고 프런트 서비스에도 `createMemoReport` 가 있었는데
 * **호출부가 0건**이었다. 그래서 '내 보고' 탭은 이 앱만 쓰는 사용자에게 영원히 비어 있었다.
 *
 * ⚠ 식별자 축: `rptrId` 는 **esntlId** 다(`MemoReportService.assertParticipantOrAdmin` 이
 * esntlId 로 참여자를 판정한다). 사람이 타이핑할 수 있는 값이 아니므로 UserPicker 로 고르며,
 * 검색 결과에 esntlId 가 없으면 **조용히 보내지 않는다** — 그렇게 보내면 보고가 아무도 열 수
 * 없는 수신자에게 저장된다.
 */
describe('메모보고 작성', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { role: 'ROLE_USER' };
    const page = { list: [ROW], total: 1 };
    mocks.getReceivedReports.mockResolvedValue(page);
    mocks.getMyReports.mockResolvedValue(page);
    mocks.getMemoReports.mockResolvedValue(page);
    mocks.createMemoReport.mockResolvedValue(9);
  });

  const openCompose = async () => {
    fireEvent.click(await screen.findByRole('button', { name: '보고 작성' }));
    return within(await screen.findByRole('dialog', { name: '보고 작성' }));
  };

  it('작성 경로가 화면에 있다 — 종전에는 목록만 있었다', async () => {
    renderClient();

    expect(await screen.findByRole('button', { name: '보고 작성' })).toBeEnabled();
  });

  it('제목·내용·받는 사람을 채우면 esntlId 로 등록된다', async () => {
    renderClient();
    const form = await openCompose();

    fireEvent.change(form.getByLabelText('제목', { exact: false }), { target: { value: '4분기 계획' } });
    fireEvent.change(form.getByLabelText('내용', { exact: false }), { target: { value: '증설 예산이 필요합니다.' } });
    fireEvent.click(form.getByRole('button', { name: '받는 사람 선택' }));
    fireEvent.click(await screen.findByRole('button', { name: '박수신 선택' }));
    fireEvent.click(form.getByRole('button', { name: '보고 등록' }));

    await waitFor(() => expect(mocks.createMemoReport).toHaveBeenCalledTimes(1));
    expect(mocks.createMemoReport.mock.calls[0][0]).toMatchObject({
      rptTtl: '4분기 계획',
      rptCn: '증설 예산이 필요합니다.',
      rptrId: 'USR_B',
    });
  });

  it('식별자를 확인할 수 없는 사용자는 수신자로 담지 않는다', async () => {
    renderClient();
    const form = await openCompose();

    fireEvent.click(form.getByRole('button', { name: '받는 사람 선택' }));
    fireEvent.click(await screen.findByRole('button', { name: '식별자 없는 사용자 선택' }));

    // 오류 요약과 인라인 메시지 두 곳에 뜬다 — 둘 다 있어야 요약에서 필드로 이동할 수 있다.
    const shown = await form.findAllByText(/식별자를 확인할 수 없습니다/);
    expect(shown.length).toBeGreaterThanOrEqual(1);
    // 담기지 않았으므로 여전히 선택된 사람이 없다.
    expect(form.getByText('선택된 사람이 없습니다.')).toBeVisible();
  });

  it('받는 사람 없이 등록하지 않는다', async () => {
    renderClient();
    const form = await openCompose();

    fireEvent.change(form.getByLabelText('제목', { exact: false }), { target: { value: '제목' } });
    fireEvent.change(form.getByLabelText('내용', { exact: false }), { target: { value: '내용' } });
    fireEvent.click(form.getByRole('button', { name: '보고 등록' }));

    expect(await form.findByText('받는 사람을 선택해 주세요.')).toBeVisible();
    expect(mocks.createMemoReport).not.toHaveBeenCalled();
  });

  it('등록에 실패하면 입력을 지우지 않고 사유를 남긴다', async () => {
    mocks.createMemoReport.mockRejectedValueOnce(new Error('보고 등록 권한이 없습니다.'));
    renderClient();
    const form = await openCompose();

    fireEvent.change(form.getByLabelText('제목', { exact: false }), { target: { value: '제목' } });
    fireEvent.change(form.getByLabelText('내용', { exact: false }), { target: { value: '내용' } });
    fireEvent.click(form.getByRole('button', { name: '받는 사람 선택' }));
    fireEvent.click(await screen.findByRole('button', { name: '박수신 선택' }));
    fireEvent.click(form.getByRole('button', { name: '보고 등록' }));

    // 구조적 필드 오류가 아니면 토스트가 사유를 알린다. 입력은 지우지 않는다.
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      '보고를 등록하지 못했습니다. 입력 내용은 유지됩니다.', 'error'));
    expect(form.getByLabelText('제목', { exact: false })).toHaveValue('제목');
    expect(form.getByLabelText('내용', { exact: false })).toHaveValue('내용');
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
