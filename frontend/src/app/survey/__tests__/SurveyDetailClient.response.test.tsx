/**
 * 설문 응답 제출 경로 계약.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 목록(`SurveyClient`)은 '참여할 수 있는 설문'을 약속하고 행 액션도 '설문 응답 열기' 인데,
 * 그 목적지는 **결과 통계만** 렌더해 입력 요소가 하나도 없었다. 즉 설문에 응답할 화면이
 * 제품 어디에도 없었고, 사용자는 '참여'를 누른 뒤 남의 응답 통계를 보게 됐다.
 *
 * 필요한 것은 전부 이미 있었다 — 문항 조회와 제출이 둘 다 `@Authenticated` 로 열려 있고
 * (DEC-OPS-010), 서버가 문항·항목 소속 검증과 중복 제출 차단까지 한다. **프런트 서비스의
 * 제출 경로만 존재하지 않는 `/respond` 를 가리키고 있었고, 호출부가 0건이라 아무도 404 를
 * 보지 못했다.** 그래서 이 계약은 화면 동작과 **경로**를 함께 고정한다 — 화면만 만들고 경로가
 * 틀리면 사용자는 제출할 때마다 실패한다.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitOperation } from '@/types/generated-operations';
import SurveyDetailClient from '../[id]/SurveyDetailClient';

const mocks = vi.hoisted(() => ({
  getQuestions: vi.fn(),
  submitAnswers: vi.fn(),
  toast: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/services/foundation/survey/SurveyAdminService', () => ({
  surveyAdminService: {
    getQuestions: mocks.getQuestions,
    submitAnswers: mocks.submitAnswers,
  },
}));
vi.mock('../components/SurveyStatsPanel', () => ({
  SurveyStatsPanel: () => <div data-testid="survey-stats-panel" />,
}));

const QUESTIONS = [
  {
    srvyQstnSn: 11,
    srvySn: 1,
    qstnSn: 1,
    qstnTypeCd: 'SINGLE',
    qstnCn: '서비스에 만족하십니까?',
    maxChcCnt: 1,
    srvyTmpltSn: 1,
    frstRgtrId: 'admin',
    crtDt: '2026-08-28',
    items: [
      { srvyArtclSn: 101, srvyQstnSn: 11, srvySn: 1, artclSn: 1, artclCn: '만족', etcAnsYn: 'N', srvyTmpltSn: 1, frstRgtrId: 'admin', crtDt: '2026-08-28' },
      { srvyArtclSn: 102, srvyQstnSn: 11, srvySn: 1, artclSn: 2, artclCn: '기타', etcAnsYn: 'Y', srvyTmpltSn: 1, frstRgtrId: 'admin', crtDt: '2026-08-28' },
    ],
  },
];

function renderClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SurveyDetailClient srvySn={1} />
    </QueryClientProvider>,
  );
}

describe('설문 응답 제출', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getQuestions.mockResolvedValue(QUESTIONS);
    mocks.submitAnswers.mockResolvedValue(1);
  });

  it('문항과 선택 항목을 실제 입력 컨트롤로 렌더한다 — 종전에는 통계만 있었다', async () => {
    renderClient();

    expect(await screen.findByRole('radio', { name: '만족' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '기타' })).toBeInTheDocument();
    expect(screen.getByText('서비스에 만족하십니까?', { exact: false })).toBeInTheDocument();
  });

  it('아무것도 고르지 않으면 제출할 수 없다', async () => {
    renderClient();

    await screen.findByRole('radio', { name: '만족' });
    expect(screen.getByRole('button', { name: '응답 제출' })).toBeDisabled();
  });

  it('고른 항목을 문항·항목 일련번호로 보낸다 — 서버가 소속을 검증하는 축이다', async () => {
    renderClient();

    fireEvent.click(await screen.findByRole('radio', { name: '만족' }));
    fireEvent.click(screen.getByRole('button', { name: '응답 제출' }));

    await waitFor(() => expect(mocks.submitAnswers).toHaveBeenCalledTimes(1));
    expect(mocks.submitAnswers.mock.calls[0][0]).toBe(1);
    expect(mocks.submitAnswers.mock.calls[0][1]).toEqual({
      answers: [{ srvyQstnSn: 11, srvyArtclSn: 101 }],
    });
  });

  it("'기타' 항목을 고르면 자유 입력이 나타나고 그 값이 함께 나간다", async () => {
    renderClient();

    fireEvent.click(await screen.findByRole('radio', { name: '기타' }));
    fireEvent.change(screen.getByLabelText('기타 답변'), { target: { value: '보통입니다' } });
    fireEvent.click(screen.getByRole('button', { name: '응답 제출' }));

    await waitFor(() => expect(mocks.submitAnswers).toHaveBeenCalledTimes(1));
    expect(mocks.submitAnswers.mock.calls[0][1].answers[0]).toMatchObject({
      srvyArtclSn: 102,
      etcAnsCn: '보통입니다',
    });
  });

  it('제출에 성공하면 다시 제출할 수 없다 — 서버도 재제출을 거부한다', async () => {
    renderClient();

    fireEvent.click(await screen.findByRole('radio', { name: '만족' }));
    fireEvent.click(screen.getByRole('button', { name: '응답 제출' }));

    await waitFor(() => expect(screen.getByRole('button', { name: '제출 완료' })).toBeDisabled());
    expect(screen.getByText('이 설문에는 한 번만 응답할 수 있습니다.')).toBeInTheDocument();
  });

  /**
   * 제출 액션의 네 가지 성질을 **한 테스트에서** 함께 증명한다.
   *
   * 나눠 놓으면 각각은 통과하는데 조합이 깨질 수 있다 — 예를 들어 pending 중 재클릭이
   * 두 번째 요청을 보내면서도 실패 안내는 정상으로 보이는 상태가 가능하다. 폼 validation
   * census 도 같은 이유로 이 넷을 한 블록에서 요구한다.
   *   ① 진행 중 재클릭이 두 번째 제출을 만들지 않는다(동기 잠금)
   *   ② 진행 중 컨트롤이 disabled + aria-busy 로 상태를 드러낸다
   *   ③ 서버 거절을 실제로 주입한다
   *   ④ 거절 사유가 화면에 보이고 다시 시도할 수 있다
   */
  it('제출 중에는 한 번만 보내고 상태를 드러내며, 거절 사유를 그대로 보여 준다', async () => {
    let rejectSubmit!: (reason?: unknown) => void;
    mocks.submitAnswers.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectSubmit = reject; }));

    renderClient();
    fireEvent.click(await screen.findByRole('radio', { name: '만족' }));

    const submit = screen.getByRole('button', { name: '응답 제출' });
    fireEvent.click(submit);

    // ② 진행 중 상태가 컨트롤에 드러난다.
    const pending = await screen.findByRole('button', { name: '제출 중…' });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute('aria-busy', 'true');

    // ① 진행 중 재클릭은 두 번째 요청을 만들지 않는다.
    fireEvent.click(pending);
    expect(mocks.submitAnswers).toHaveBeenCalledTimes(1);

    // ③ 서버 거절 주입 → ④ 사유가 그대로 보이고 다시 시도할 수 있다.
    await act(async () => {
      rejectSubmit({ response: { data: { message: '이미 응답한 설문입니다.' } } });
    });

    expect(await screen.findByText('이미 응답한 설문입니다.')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('이미 응답한 설문입니다.');
    await waitFor(() => expect(screen.getByRole('button', { name: '응답 제출' })).toBeEnabled());
  });

  it('문항이 없으면 제출 버튼을 내놓지 않는다 — 눌러도 아무 일이 없는 버튼을 만들지 않는다', async () => {
    mocks.getQuestions.mockResolvedValue([]);
    renderClient();

    expect(await screen.findByText('이 설문에는 아직 등록된 문항이 없습니다.', { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '응답 제출' })).not.toBeInTheDocument();
  });

  it('문항 조회가 실패하면 빈 설문으로 위장하지 않고 재시도를 제공한다', async () => {
    mocks.getQuestions.mockRejectedValue(new Error('boom'));
    renderClient();

    expect(await screen.findByText('문항을 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('결과 통계는 응답 아래에 그대로 남는다 — 같은 경로로 결과를 보러 오는 사용자가 있다', async () => {
    renderClient();
    expect(await screen.findByTestId('survey-stats-panel')).toBeInTheDocument();
  });
});

describe('설문 제출 경로', () => {
  it('서버에 실재하는 /responses descriptor로 나간다 — 종전 /respond 는 존재하지 않았다', () => {
    expect(submitOperation.id).toBe('submit');
    expect(submitOperation.method).toBe('post');
    expect(submitOperation.path).toBe('/api/v1/surveys/{srvySn}/responses');
  });
});
