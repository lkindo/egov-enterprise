/**
 * 설문 응답 제출 경로 계약.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 목록(`SurveyClient`)은 '참여할 수 있는 설문'을 약속하고 행 액션도 '설문 응답 열기' 인데,
 * 그 목적지는 **결과 통계만** 렌더해 입력 요소가 하나도 없었다. 즉 설문에 응답할 화면이
 * 제품 어디에도 없었고, 사용자는 '참여'를 누른 뒤 남의 응답 통계를 보게 됐다.
 *
 * 필요한 것은 전부 이미 있었다 — 문항 조회와 제출이 둘 다 일반 사용자에게 열려 있고
 * (DEC-OPS-010 — 지금은 기능 권한 SURVEY_READ·SURVEY_SUBMIT, 기본 배정상 ROLE_USER 포함),
 * 서버가 문항·항목 소속 검증과 중복 제출 차단까지 한다. **프런트 서비스의
 * 제출 경로만 존재하지 않는 `/respond` 를 가리키고 있었고, 호출부가 0건이라 아무도 404 를
 * 보지 못했다.** 그래서 이 계약은 화면 동작과 **경로**를 함께 고정한다 — 화면만 만들고 경로가
 * 틀리면 사용자는 제출할 때마다 실패한다.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitOperation } from '@/types/generated-operations';
import type { Survey, SurveyQuestion } from '@/types/business/survey';
import SurveyDetailClient from '../[id]/SurveyDetailClient';
import SurveyDetailPage from '../[id]/page';

const mocks = vi.hoisted(() => ({
  getQuestions: vi.fn(),
  getSurvey: vi.fn(),
  submitAnswers: vi.fn(),
  toast: vi.fn(),
  push: vi.fn(),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), notFound: mocks.notFound }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/services/foundation/survey/SurveyAdminService', () => ({
  surveyAdminService: {
    getQuestions: mocks.getQuestions,
    getSurvey: mocks.getSurvey,
    submitAnswers: mocks.submitAnswers,
  },
}));

/** 기간이 넓게 열린 설문 — 오늘이 언제든 안에 든다. */
const OPEN_SURVEY: Survey = {
  srvySn: 1,
  srvyTtl: '서비스 만족도 조사',
  srvyBgngYmd: '20000101',
  srvyEndYmd: '29991231',
  srvyTmpltSn: 1,
  srvyPrps: '',
  srvyWrtGdCn: '',
  srvyTrgt: '',
  crtDt: '2026-08-28',
};
vi.mock('../components/SurveyStatsPanel', () => ({
  SurveyStatsPanel: () => <div data-testid="survey-stats-panel" />,
}));

const QUESTIONS: SurveyQuestion[] = [
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

function renderClient(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
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
    mocks.getSurvey.mockResolvedValue(OPEN_SURVEY);
    mocks.submitAnswers.mockResolvedValue(1);
  });

  it('문항과 선택 항목을 실제 입력 컨트롤로 렌더한다 — 종전에는 통계만 있었다', async () => {
    renderClient();

    expect(await screen.findByRole('radio', { name: '만족' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '기타' })).toBeInTheDocument();
    expect(screen.getByText('서비스에 만족하십니까?', { exact: false })).toBeInTheDocument();
    // 종전에는 제목 자리에 일련번호만 있었다.
    expect(await screen.findByText('서비스 만족도 조사')).toBeInTheDocument();
    expect(screen.getByText('진행중')).toBeInTheDocument();
  });

  it('서버에서 읽은 제목과 문항은 클라이언트 조회가 끝나기 전 첫 렌더부터 나타난다', () => {
    mocks.getQuestions.mockReturnValue(new Promise(() => {}));
    mocks.getSurvey.mockReturnValue(new Promise(() => {}));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <SurveyDetailClient srvySn={1} initialSurvey={OPEN_SURVEY} initialQuestions={QUESTIONS} initialTodayYmd="20261001" />
      </QueryClientProvider>,
    );

    expect(screen.getByText('서비스 만족도 조사')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '만족' })).toBeEnabled();
    expect(screen.getByRole('radio', { name: '기타' })).toBeEnabled();
    expect(screen.queryByText('문항을 불러오는 중입니다…')).not.toBeInTheDocument();
    expect(screen.queryByText('설문 정보를 불러오는 중입니다.')).not.toBeInTheDocument();
    expect(mocks.getQuestions).toHaveBeenCalledWith(1);
    expect(mocks.getSurvey).toHaveBeenCalledWith(1);
  });

  it('서버의 KST 기준일로 첫 렌더와 수화 후 기간을 판정하고 이미 응답한 seed도 잠근다', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-30T00:00:00Z'));
    try {
      mocks.getQuestions.mockReturnValue(new Promise(() => {}));
      mocks.getSurvey.mockReturnValue(new Promise(() => {}));
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const survey = { ...OPEN_SURVEY, srvyBgngYmd: '20261001', srvyEndYmd: '20261001', responded: true };
      const container = document.createElement('div');
      container.innerHTML = renderToString(
        <QueryClientProvider client={client}>
          <SurveyDetailClient srvySn={1} initialSurvey={survey} initialQuestions={QUESTIONS} initialTodayYmd="20261001" />
        </QueryClientProvider>,
      );
      document.body.append(container);
      // 서버와 브라우저 시각이 달라도 서버가 고정한 기준일은 수화 중에 바뀌지 않는다.
      vi.setSystemTime(new Date('2026-10-02T00:00:00Z'));
      const recoverableError = vi.fn();
      render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <SurveyDetailClient srvySn={1} initialSurvey={survey} initialQuestions={QUESTIONS} initialTodayYmd="20261001" />
        </QueryClientProvider>,
        { container, hydrate: true, onRecoverableError: recoverableError },
      );

      expect(screen.getByText('진행중')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '만족' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '응답 완료' })).toBeDisabled();
      expect(screen.getByText(/이미 응답한 설문입니다/)).toBeInTheDocument();
      expect(screen.queryByText(/아직 시작되지 않은 설문입니다/)).not.toBeInTheDocument();
      expect(mocks.submitAnswers).not.toHaveBeenCalled();
      expect(recoverableError).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('seed 이후 문항 재조회 실패도 재시도를 제공하고 선택·기타 입력을 복원한다', async () => {
    let rejectQuestions!: (error: Error) => void;
    mocks.getQuestions.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectQuestions = reject; }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <SurveyDetailClient srvySn={1} initialSurvey={OPEN_SURVEY} initialQuestions={QUESTIONS} initialTodayYmd="20261001" />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('radio', { name: '기타' }));
    fireEvent.change(screen.getByLabelText('기타 답변'), { target: { value: '보존할 답변' } });

    await act(async () => { rejectQuestions(new Error('question refresh failed')); });
    expect(await screen.findByText('문항을 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.queryByText('이 설문에는 아직 등록된 문항이 없습니다.', { exact: false })).not.toBeInTheDocument();
    mocks.getQuestions.mockResolvedValue(QUESTIONS);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByRole('radio', { name: '기타' })).toBeChecked();
    expect(screen.getByLabelText('기타 답변')).toHaveValue('보존할 답변');
    expect(screen.getByRole('button', { name: '응답 제출' })).toBeEnabled();
    expect(mocks.submitAnswers).not.toHaveBeenCalled();
  });

  /**
   * [2026-09-05] 기간 가드. 종전에는 "하나 이상 골랐는가" 만 보고 제출을 열어 종료된 설문에도
   * 응답이 저장됐다(서버도 기간을 보지 않았다). 서버와 같은 규칙으로 화면이 먼저 막는다.
   */
  it('종료된 설문은 사유를 보여 주고 입력과 제출을 잠근다 — 통계는 그대로 볼 수 있다', async () => {
    mocks.getSurvey.mockResolvedValue({ ...OPEN_SURVEY, srvyBgngYmd: '20000101', srvyEndYmd: '20000131' });
    renderClient();

    const notice = await screen.findByRole('status');
    expect(notice).toHaveTextContent('이미 종료된 설문입니다. (2000-01-31 종료)');
    expect(screen.getByText('종료')).toBeInTheDocument();
    expect(await screen.findByRole('radio', { name: '만족' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '응답 제출' })).not.toBeInTheDocument();
    expect(screen.getByTestId('survey-stats-panel')).toBeInTheDocument();
    expect(mocks.submitAnswers).not.toHaveBeenCalled();
  });

  it('시작 전 설문은 시작일을 알려 주고 제출을 열지 않는다', async () => {
    mocks.getSurvey.mockResolvedValue({ ...OPEN_SURVEY, srvyBgngYmd: '29990101', srvyEndYmd: '29991231' });
    renderClient();

    expect(await screen.findByRole('status')).toHaveTextContent('2999-01-01부터 응답할 수 있습니다.');
    expect(screen.getByText('예정')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '응답 제출' })).not.toBeInTheDocument();
  });

  it('기간 경계가 비어 있으면 열린 설문으로 보고 제출을 허용한다', async () => {
    mocks.getSurvey.mockResolvedValue({ ...OPEN_SURVEY, srvyBgngYmd: null, srvyEndYmd: null });
    renderClient();

    fireEvent.click(await screen.findByRole('radio', { name: '만족' }));
    expect(screen.getByRole('button', { name: '응답 제출' })).toBeEnabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('아무것도 고르지 않으면 제출할 수 없다', async () => {
    renderClient();

    await screen.findByRole('radio', { name: '만족' });
    expect(screen.getByRole('button', { name: '응답 제출' })).toBeDisabled();
  });

  it('[DIP B4 P6, D4] 선택지가 있는 모든 문항에 답해야 제출할 수 있다 — 남은 문항 수를 말한다', async () => {
    mocks.getQuestions.mockResolvedValue([
      ...QUESTIONS,
      {
        ...QUESTIONS[0],
        srvyQstnSn: 12,
        qstnSn: 2,
        qstnCn: '다시 이용하시겠습니까?',
        items: [
          { ...QUESTIONS[0].items[0], srvyArtclSn: 201, srvyQstnSn: 12, artclCn: '예' },
          { ...QUESTIONS[0].items[0], srvyArtclSn: 202, srvyQstnSn: 12, artclSn: 2, artclCn: '아니오' },
        ],
      },
    ]);
    renderClient();

    fireEvent.click(await screen.findByRole('radio', { name: '만족' }));
    expect(screen.getByRole('button', { name: '응답 제출' })).toBeDisabled();
    expect(screen.getByText('2개 문항 중 1개 답함 — 모든 문항에 답해야 제출할 수 있습니다.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: '예' }));
    expect(screen.getByRole('button', { name: '응답 제출' })).toBeEnabled();
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
  it('🚨 제출하면 통계 캐시를 무효화해 방금 낸 응답이 아래 통계에 반영된다 (DIP V8)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    renderClient(client);

    fireEvent.click(await screen.findByRole('radio', { name: '만족' }));
    fireEvent.click(screen.getByRole('button', { name: '응답 제출' }));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['survey-stats', 1] }));
  });

  it('🚨 이미 응답한 설문은 열 때 알리고 입력과 제출을 잠근다 (DIP V8)', async () => {
    mocks.getSurvey.mockResolvedValue({ ...OPEN_SURVEY, responded: true });
    renderClient();

    expect(await screen.findByText(/이미 응답한 설문입니다/)).toBeInTheDocument();
    expect(await screen.findByRole('radio', { name: '만족' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '응답 완료' })).toBeDisabled();
    expect(mocks.submitAnswers).not.toHaveBeenCalled();
  });

  it('대조군: 응답 여부를 모르면(null) 잠그지 않는다', async () => {
    mocks.getSurvey.mockResolvedValue({ ...OPEN_SURVEY, responded: null });
    renderClient();

    expect(await screen.findByRole('radio', { name: '만족' })).toBeEnabled();
    expect(screen.queryByText(/이미 응답한 설문입니다/)).toBeNull();
  });

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

describe('설문 상세 서버 초기 조회', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSurvey.mockResolvedValue(OPEN_SURVEY);
    mocks.getQuestions.mockResolvedValue(QUESTIONS);
  });

  it('같은 경로 ID의 설문·문항을 병렬로 읽고 KST 기준일과 성공 데이터만 넘긴다', async () => {
    let resolveSurvey!: (survey: Survey) => void;
    let resolveQuestions!: (questions: SurveyQuestion[]) => void;
    mocks.getSurvey.mockReturnValueOnce(new Promise<Survey>((resolve) => { resolveSurvey = resolve; }));
    mocks.getQuestions.mockReturnValueOnce(new Promise<SurveyQuestion[]>((resolve) => { resolveQuestions = resolve; }));
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-30T15:30:00Z'));
    try {
      const pending = SurveyDetailPage({ params: Promise.resolve({ id: '1' }) });
      await Promise.resolve();
      expect(mocks.getSurvey).toHaveBeenCalledWith(1);
      expect(mocks.getQuestions).toHaveBeenCalledWith(1);
      resolveQuestions(QUESTIONS);
      resolveSurvey(OPEN_SURVEY);
      const page = await pending;

      expect(page.type).toBe(SurveyDetailClient);
      expect(page.props).toEqual({ srvySn: 1, initialSurvey: OPEN_SURVEY, initialQuestions: QUESTIONS, initialTodayYmd: '20261001' });
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(['survey', 'questions'] as const)('서버 %s 조회 실패는 성공한 다른 seed와 분리하고 클라이언트 재시도에 맡긴다', async (failed) => {
    if (failed === 'survey') mocks.getSurvey.mockRejectedValueOnce(new Error('server metadata unavailable'));
    else mocks.getQuestions.mockRejectedValueOnce(new Error('server questions unavailable'));

    const page = await SurveyDetailPage({ params: Promise.resolve({ id: '1' }) });
    expect(page.props.initialSurvey).toEqual(failed === 'survey' ? undefined : OPEN_SURVEY);
    expect(page.props.initialQuestions).toEqual(failed === 'questions' ? undefined : QUESTIONS);
    expect(page.props.srvySn).toBe(1);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    if (failed === 'questions') {
      mocks.getQuestions.mockRejectedValueOnce(new Error('client questions unavailable'));
      render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
      expect(await screen.findByText('문항을 불러오지 못했습니다.')).toBeInTheDocument();
      expect(screen.queryByText('이 설문에는 아직 등록된 문항이 없습니다.', { exact: false })).not.toBeInTheDocument();
      mocks.getQuestions.mockResolvedValue(QUESTIONS);
      fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
      expect(await screen.findByRole('radio', { name: '만족' })).toBeEnabled();
    } else {
      mocks.getSurvey.mockRejectedValueOnce(new Error('client metadata unavailable'));
      render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
      expect(await screen.findByText('설문 정보를 불러오지 못했습니다.')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '만족' })).toBeDisabled();
      expect(mocks.submitAnswers).not.toHaveBeenCalled();
      mocks.getSurvey.mockResolvedValue(OPEN_SURVEY);
      await act(async () => { await client.refetchQueries({ queryKey: ['survey', 1] }); });
      expect(await screen.findByText('서비스 만족도 조사')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '만족' })).toBeEnabled();
    }
  });

  it.each(['0', '-1', 'NaN', '9007199254740992'])('잘못된 경로 %s는 초기 조회 전 기존 notFound로 거부한다', async (id) => {
    await expect(SurveyDetailPage({ params: Promise.resolve({ id }) })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.notFound).toHaveBeenCalledTimes(1);
    expect(mocks.getSurvey).not.toHaveBeenCalled();
    expect(mocks.getQuestions).not.toHaveBeenCalled();
  });
});

describe('설문 제출 경로', () => {
  it('서버에 실재하는 /responses descriptor로 나간다 — 종전 /respond 는 존재하지 않았다', () => {
    expect(submitOperation.id).toBe('submit');
    expect(submitOperation.method).toBe('post');
    expect(submitOperation.path).toBe('/api/v1/surveys/{srvySn}/responses');
  });
});
