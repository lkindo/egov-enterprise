import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SurveyQuestionsPanel from '../SurveyQuestionsPanel';
import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';

vi.mock('@/services/foundation/system/SurveyAdminService', () => ({
  surveyAdminService: {
    getSurveyList: vi.fn(),
    getQuestions: vi.fn(),
    createQuestion: vi.fn(),
    deleteQuestion: vi.fn(),
    createItem: vi.fn(),
    deleteItem: vi.fn(),
  },
}));

const mocked = vi.mocked(surveyAdminService);

function renderPanel() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SurveyQuestionsPanel />
    </QueryClientProvider>
  );
}

const SURVEYS = {
  list: [{ srvyId: 'S1', srvyTtl: '만족도 조사' }],
  total: 1,
  page: 1,
  size: 100,
  totalPage: 1,
};

/** 목록 조회가 끝나 옵션이 렌더된 뒤에 선택한다 — select 자체는 즉시 있지만 옵션은 비동기다. */
async function selectSurvey(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('option', { name: '만족도 조사' });
  await user.selectOptions(screen.getByLabelText('설문 선택'), 'S1');
}

describe('SurveyQuestionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mocked.getSurveyList.mockResolvedValue(SURVEYS as any);
    mocked.getQuestions.mockResolvedValue([]);
  });

  it('설문을 고르기 전에는 문항을 조회하지 않는다', async () => {
    renderPanel();

    await screen.findByText('— 설문을 선택하세요 —');
    expect(mocked.getQuestions).not.toHaveBeenCalled();
  });

  it('설문을 고르면 그 설문의 문항을 조회한다', async () => {
    const user = userEvent.setup();
    renderPanel();

    await selectSurvey(user);

    await waitFor(() => expect(mocked.getQuestions).toHaveBeenCalledWith('S1'));
  });

  /**
   * 🔒 문항 목록이 항목을 중첩해서 가져오므로 문항별 항목 조회를 따로 하면 안 된다.
   * 그렇게 하면 백엔드가 단일 IN 조회로 없앤 N+1 을 프론트에서 되살리는 셈이다.
   * (서비스에 항목 단건 조회 메서드를 두지 않은 것도 같은 이유다.)
   */
  it('🔒 문항에 중첩된 항목을 그대로 렌더한다 — 항목을 따로 조회하지 않는다', async () => {
    const user = userEvent.setup();
    mocked.getQuestions.mockResolvedValue([
      {
        srvyQstnId: 'Q1',
        srvyId: 'S1',
        qstnSn: 1,
        qstnTypeCd: '1',
        qstnCn: '만족하십니까',
        maxChcCnt: 1,
        srvyTmpltId: 'T1',
        frstRgtrId: 'admin',
        crtDt: '2026-08-06T00:00:00',
        items: [
          {
            srvyArtclId: 'A1',
            srvyQstnId: 'Q1',
            srvyId: 'S1',
            artclSn: 1,
            artclCn: '예',
            etcAnsYn: 'N',
            srvyTmpltId: 'T1',
            frstRgtrId: 'admin',
            crtDt: '2026-08-06T00:00:00',
          },
        ],
      },
    ]);

    renderPanel();
    await selectSurvey(user);

    expect(await screen.findByText('만족하십니까')).toBeInTheDocument();
    expect(screen.getByText('예')).toBeInTheDocument();
    expect(screen.getByText('객관식')).toBeInTheDocument();
    // 항목 전용 조회 메서드는 서비스에 존재하지 않는다 — 중첩 응답만 쓴다.
    expect(mocked.getQuestions).toHaveBeenCalledTimes(1);
  });

  it('빈 문항 내용으로 추가하면 서비스를 호출하지 않는다', async () => {
    const user = userEvent.setup();
    renderPanel();

    await selectSurvey(user);
    await user.click(await screen.findByRole('button', { name: /문항 추가/ }));

    expect(await screen.findByText('문항 내용을 입력해 주세요.')).toBeInTheDocument();
    expect(mocked.createQuestion).not.toHaveBeenCalled();
  });

  it('문항 추가 시 선택한 설문 ID 가 전달된다', async () => {
    const user = userEvent.setup();
    mocked.createQuestion.mockResolvedValue(undefined);
    renderPanel();

    await selectSurvey(user);
    await user.type(await screen.findByLabelText('새 문항 내용'), '재이용 의향');
    await user.click(screen.getByRole('button', { name: /문항 추가/ }));

    await waitFor(() =>
      expect(mocked.createQuestion).toHaveBeenCalledWith('S1', expect.objectContaining({
        srvyId: 'S1',
        qstnCn: '재이용 의향',
      }))
    );
  });

  it('실패 시 서버 메시지를 그대로 노출한다', async () => {
    const user = userEvent.setup();
    mocked.createQuestion.mockRejectedValue(new Error('권한이 없습니다.'));
    renderPanel();

    await selectSurvey(user);
    await user.type(await screen.findByLabelText('새 문항 내용'), '문항');
    await user.click(screen.getByRole('button', { name: /문항 추가/ }));

    expect(await screen.findByText('권한이 없습니다.')).toBeInTheDocument();
  });
});
