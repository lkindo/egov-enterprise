/**
 * 여론조사 상세 — 폐기·삭제 액션 계약.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 두 경로 모두 **위아래로 다 열려 있는데 화면만 없었다.**
 *
 *   - 삭제: `DELETE /api/v1/polls/{pollSn}` → `OnlinePollService.deletePoll` →
 *     `pollUserService.deletePoll` 까지 있는데 UI 소비자가 0건이었다. 잘못 만든 설문을
 *     지울 방법이 제품에 없었다.
 *   - 폐기: `pollDsuseYn` 이 폼 state 에만 있고 입력 컨트롤이 없어 **항상 'N'(사용)으로
 *     굳어 있었다.** 서버는 이 값을 실제로 집행한다 — `OnlinePollService.vote` 가 'Y' 면
 *     '종료되었거나 폐기된 설문입니다.' 로 투표를 거부한다. 즉 진행 중인 설문을 멈출
 *     방법이 없었다.
 *
 * 두 액션은 **되돌릴 수 있는지가 다르다.** 삭제는 FK(NO ACTION) 때문에 서비스가
 * `tb_onln_poll_rslt` 를 먼저 지우므로 이미 모인 투표 결과가 함께 사라진다. 폐기는 결과를
 * 보존하고 되돌릴 수 있다. 확인 문구가 그 차이를 말하지 않으면 사용자는 더 센 쪽을 고른다.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SurveyManageDetailClient from '../[id]/SurveyManageDetailClient';

const mocks = vi.hoisted(() => ({
  getPollDetail: vi.fn(),
  updatePoll: vi.fn(),
  deletePoll: vi.fn(),
  confirm: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '7' }),
  useRouter: () => ({ push: mocks.push, back: mocks.back }),
}));
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ success: mocks.success, error: mocks.error }),
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/business/user/poll/PollUserService', () => ({
  pollUserService: {
    getPollDetail: mocks.getPollDetail,
    updatePoll: mocks.updatePoll,
    deletePoll: mocks.deletePoll,
  },
}));

const POLL = {
  pollSn: 7,
  pollNm: '사내 식당 만족도',
  pollBgngYmd: '20260801',
  pollEndYmd: '20260831',
  pollKndCd: '001',
  pollDsuseYn: 'N',
  pollArticles: [
    { pollSn: 7, pollArtclSn: 71, pollArtclNm: '매우 만족', pollIemCo: 3 },
    { pollSn: 7, pollArtclSn: 72, pollArtclNm: '불만족', pollIemCo: 1 },
  ],
};

function renderClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SurveyManageDetailClient />
    </QueryClientProvider>,
  );
}

describe('여론조사 상세 — 폐기와 삭제', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPollDetail.mockResolvedValue(POLL);
    mocks.updatePoll.mockResolvedValue(undefined);
    mocks.deletePoll.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('응답 선택지와 득표수를 보여 준다 — 종전에는 화면이 존재를 몰랐다', async () => {
    renderClient();

    expect(await screen.findByText('매우 만족')).toBeInTheDocument();
    expect(screen.getByText('3표')).toBeInTheDocument();
    expect(screen.getByText('이 화면에서는 바꿀 수 없습니다', { exact: false })).toBeInTheDocument();
  });

  it('진행 상태를 바꿀 수 있다 — 종전에는 컨트롤이 없어 항상 사용 중으로 굳었다', async () => {
    renderClient();

    // 서버가 실제로 집행하는 값이라(vote 가 'Y' 면 거부) 컨트롤이 없으면 멈출 방법이 없다.
    expect(await screen.findByLabelText('진행 상태')).toBeInTheDocument();
    expect(screen.getByText('폐기하면 새 투표를 받지 않습니다.', { exact: false })).toBeInTheDocument();
  });

  it('삭제 확인은 결과가 함께 사라진다는 것과 폐기라는 대안을 말한다', async () => {
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '설문 삭제' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    const message = String(mocks.confirm.mock.calls[0][0].message);
    expect(message).toContain('사내 식당 만족도');
    expect(message).toContain('투표 결과도 함께 삭제');
    expect(message).toContain('폐기');
  });

  it('확인을 취소하면 삭제하지 않는다', async () => {
    mocks.confirm.mockResolvedValue(false);
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '설문 삭제' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.deletePoll).not.toHaveBeenCalled();
  });

  /**
   * 삭제 액션의 네 성질을 **한 테스트에서** 함께 증명한다.
   * 나눠 놓으면 각각은 통과하는데 조합이 깨질 수 있다 — 예를 들어 진행 중 재클릭이 두 번째
   * 삭제를 보내면서도 실패 안내는 정상으로 보이는 상태가 가능하다.
   */
  it('삭제 중에는 한 번만 보내고 상태를 드러내며, 실패 사유를 그대로 보여 준다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    mocks.deletePoll.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectDelete = reject; }));

    renderClient();
    const trigger = await screen.findByRole('button', { name: '설문 삭제' });
    fireEvent.click(trigger);

    const pending = await screen.findByRole('button', { name: '삭제 중…' });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute('aria-busy', 'true');

    fireEvent.click(pending);
    expect(mocks.deletePoll).toHaveBeenCalledTimes(1);

    rejectDelete(new Error('삭제 권한이 없습니다.'));

    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('삭제 권한이 없습니다.'));
    // 토스트는 사라진다 — 파괴적 액션의 실패 사유는 화면에도 남아야 한다.
    expect(await screen.findByText('삭제 권한이 없습니다.')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('삭제 권한이 없습니다.');
    // 실패했으므로 다시 시도할 수 있어야 한다.
    await waitFor(() => expect(screen.getByRole('button', { name: '설문 삭제' })).toBeEnabled());
  });

  it('삭제에 성공하면 목록으로 돌아간다 — 사라진 설문의 상세에 머무르지 않는다', async () => {
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '설문 삭제' }));

    await waitFor(() => expect(mocks.deletePoll).toHaveBeenCalledWith(7));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/admin/survey/manage'));
  });
});
