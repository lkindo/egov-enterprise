/**
 * 설문 수정 모달 — **전체 치환 왕복** 계약(§A3-1 이행, DEC-OPS-079 후속).
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * `PUT /api/v1/polls/{pollSn}` 은 부분 수정이 아니라 **전체 치환**이다
 * (`OnlinePollManage#update` 가 여섯 필드를 조건 없이 대입한다). 그래서 화면이 묻지 않은
 * 필드를 함께 실어 보내지 않으면 **저장하는 순간 조용히 지워지거나 뒤집힌다.**
 *
 * 가장 위험한 것이 `pollDsuseYn` 이다 — 진행 중인 투표를 멈추는 유일한 되돌릴 수 있는
 * 수단이고(서버 `OnlinePollService#vote` 가 'Y' 면 거부한다), 이 값을 왕복시키지 않으면
 * **폐기해 둔 설문이 제목 오타 하나 고치는 김에 다시 열린다.** 오류가 아니므로 아무 신호도 없다.
 *
 * 같은 함정을 이 저장소는 이미 네 번 만났다(DEC-OPS-045 외부인사 · 058 설문 · 060 내 프로필 ·
 * 071 메모보고). 그때마다 "바꾸지 않은 필드가 기존 값 그대로 실려 가는가" 를 계약으로 고정해
 * 왔고, 이 파일이 여론조사 축의 그 계약이다.
 *
 * ⚠ 존재 단언으로는 못 잡는다 — 컨트롤이 화면에 있어도 값이 payload 에 안 실리면 결과는 같다.
 *   그래서 전부 **전송된 payload** 를 본다.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SurveyFormDialog, type SurveyFormInitialValues } from '../SurveyFormDialog';

const mocks = vi.hoisted(() => ({
  createPoll: vi.fn(),
  updatePoll: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@/services/business/user/poll/PollUserService', () => ({
  createPoll: mocks.createPoll,
  pollUserService: { updatePoll: mocks.updatePoll },
}));
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ success: mocks.success, error: mocks.error }),
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
/* Radix Select 는 jsdom 에서 포인터 이벤트를 요구한다 — 렌더 형태만 남기고 상호작용은 보지 않는다. */
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectTrigger: ({ children, ...props }: React.ComponentProps<'button'>) => (
    <button type="button" {...props}>{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ui/calendar', () => ({ Calendar: () => <div /> }));

/** 폐기(Y)돼 있고 기간·유형이 모두 채워진 설문 — 왕복이 깨지면 전부 사라지거나 뒤집힌다. */
const RETIRED: SurveyFormInitialValues = {
  pollNm: '사내 식당 만족도',
  pollKndCd: '002',
  pollDsuseYn: 'Y',
  beginDate: new Date(2026, 7, 1),
  endDate: new Date(2026, 7, 31),
};

function renderEdit(initialValues: SurveyFormInitialValues = RETIRED) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SurveyFormDialog
        isOpen
        mode="edit"
        pollSn={7}
        initialValues={initialValues}
        onClose={() => {}}
        onSaved={() => {}}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updatePoll.mockResolvedValue(undefined);
  mocks.createPoll.mockResolvedValue(undefined);
  mocks.confirm.mockResolvedValue(true);
});

describe('설문 수정 모달 — 전체 치환 왕복', () => {
  it('설문명만 고쳐도 폐기 상태가 그대로 실려 간다 — 조용히 다시 열리면 안 된다', async () => {
    renderEdit();

    fireEvent.change(screen.getByTestId('poll-name-input'), { target: { value: '사내 식당 만족도(2차)' } });
    fireEvent.click(screen.getByTestId('poll-submit-button'));

    await waitFor(() => expect(mocks.updatePoll).toHaveBeenCalledTimes(1));
    const payload = mocks.updatePoll.mock.calls[0][0];
    expect(payload.pollNm).toBe('사내 식당 만족도(2차)');
    // 이 한 줄이 이 파일의 존재 이유다.
    expect(payload.pollDsuseYn).toBe('Y');
  });

  it('묻지 않은 나머지 필드도 기존 값 그대로 실려 간다', async () => {
    renderEdit();

    fireEvent.click(screen.getByTestId('poll-submit-button'));

    await waitFor(() => expect(mocks.updatePoll).toHaveBeenCalledTimes(1));
    const payload = mocks.updatePoll.mock.calls[0][0];
    expect(payload).toMatchObject({
      pollSn: 7,
      pollNm: '사내 식당 만족도',
      pollKndCd: '002',
      pollDsuseYn: 'Y',
      // 저장 포맷은 'yyyyMMdd' 8자다 — varchar(8)/@Size(max = 8) 이라 10자는 400 이다.
      pollBgngYmd: '20260801',
      pollEndYmd: '20260831',
    });
  });

  it('설문 유형을 payload 에 싣는다 — 종전 등록 화면의 컨트롤이 이행에서 빠져 001 로 굳었었다', async () => {
    renderEdit({ ...RETIRED, pollKndCd: '002' });

    expect(screen.getByLabelText('설문 유형')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('poll-submit-button'));

    await waitFor(() => expect(mocks.updatePoll).toHaveBeenCalledTimes(1));
    expect(mocks.updatePoll.mock.calls[0][0].pollKndCd).toBe('002');
  });

  it('등록 모드에는 진행 상태를 묻지 않는다 — 새 설문을 폐기로 만드는 것은 의미가 없다', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <SurveyFormDialog isOpen mode="create" onClose={() => {}} onSaved={() => {}} />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText('설문 유형')).toBeInTheDocument();
    expect(screen.queryByLabelText('진행 상태')).toBeNull();
  });
});
