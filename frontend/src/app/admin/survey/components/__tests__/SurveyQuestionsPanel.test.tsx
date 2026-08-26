import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SurveyQuestionsPanel from '../SurveyQuestionsPanel';
import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';
import {
  surveyItemCreateSchema,
  surveyQuestionCreateSchema,
} from '../survey-panel-form-validation';

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
  list: [{ srvySn: 201, srvyTtl: '만족도 조사' }],
  total: 1,
  page: 1,
  size: 100,
  totalPage: 1,
};

const QUESTION_WITHOUT_ITEMS = {
  srvyQstnSn: 301,
  srvySn: 201,
  qstnSn: 1,
  qstnTypeCd: '1',
  qstnCn: '만족하십니까',
  maxChcCnt: 1,
  srvyTmpltSn: 101,
  frstRgtrId: 'admin',
  crtDt: '2026-08-06T00:00:00',
  items: [],
};

/** 목록 조회가 끝나 옵션이 렌더된 뒤에 선택한다 — select 자체는 즉시 있지만 옵션은 비동기다. */
async function selectSurvey(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('option', { name: '만족도 조사' });
  await user.selectOptions(screen.getByLabelText('설문 선택'), '201');
}

describe('SurveyQuestionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.getSurveyList.mockResolvedValue(SURVEYS as any);
    mocked.getQuestions.mockResolvedValue([]);
  });

  it('설문을 고르기 전에는 문항을 조회하지 않는다', async () => {
    renderPanel();

    await screen.findByText('— 설문을 선택하세요 —');
    expect(mocked.getQuestions).not.toHaveBeenCalled();
  });

  it('generated 문항·항목 길이와 서버 파생 숫자 ID 타입을 보존한다', () => {
    const question = {
      srvySn: 201,
      qstnSn: 1,
      qstnTypeCd: '1',
      qstnCn: '가'.repeat(4000),
    };
    const item = {
      srvyQstnSn: 301,
      srvySn: 201,
      artclCn: '가'.repeat(4000),
    };

    expect(surveyQuestionCreateSchema.safeParse(question).success).toBe(true);
    expect(surveyQuestionCreateSchema.safeParse({ ...question, qstnCn: '' }).success).toBe(false);
    expect(surveyQuestionCreateSchema.safeParse({ ...question, qstnCn: '가'.repeat(4001) }).success).toBe(false);
    expect(surveyQuestionCreateSchema.safeParse({ ...question, srvySn: 1.5 }).success).toBe(false);
    expect(surveyQuestionCreateSchema.safeParse({ ...question, qstnSn: 0 }).success).toBe(false);
    expect(surveyItemCreateSchema.safeParse(item).success).toBe(true);
    expect(surveyItemCreateSchema.safeParse({ ...item, artclCn: '' }).success).toBe(false);
    expect(surveyItemCreateSchema.safeParse({ ...item, artclCn: '가'.repeat(4001) }).success).toBe(false);
  });

  it('설문을 고르면 그 설문의 문항을 조회한다', async () => {
    const user = userEvent.setup();
    renderPanel();

    await selectSurvey(user);

    await waitFor(() => expect(mocked.getQuestions).toHaveBeenCalledWith(201));
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
        srvyQstnSn: 301,
        srvySn: 201,
        qstnSn: 1,
        qstnTypeCd: '1',
        qstnCn: '만족하십니까',
        maxChcCnt: 1,
        srvyTmpltSn: 101,
        frstRgtrId: 'admin',
        crtDt: '2026-08-06T00:00:00',
        items: [
          {
            srvyArtclSn: 401,
            srvyQstnSn: 301,
            srvySn: 201,
            artclSn: 1,
            artclCn: '예',
            etcAnsYn: 'N',
            srvyTmpltSn: 101,
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

  it('문항 길이 오류는 write 없이 인라인으로 연결하고 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    renderPanel();
    await selectSurvey(user);
    const input = await screen.findByLabelText('새 문항 내용');
    fireEvent.change(input, { target: { value: '가'.repeat(4001) } });

    await user.click(screen.getByRole('button', { name: /문항 추가/ }));

    expect(mocked.createQuestion).not.toHaveBeenCalled();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByRole('alert', { name: /입력 오류/ })).toHaveTextContent('최대 4000자');
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('문항 서버 필드 오류를 인라인으로 연결하고 입력값을 보존한다', async () => {
    const user = userEvent.setup();
    mocked.createQuestion.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'qstnCn', message: '중복된 문항입니다.' }] } },
    });
    renderPanel();
    await selectSurvey(user);
    const input = await screen.findByLabelText('새 문항 내용');
    await user.type(input, '보존할 문항');

    await user.click(screen.getByRole('button', { name: /문항 추가/ }));

    expect(await screen.findByText('중복된 문항입니다.')).toBeVisible();
    expect(input).toHaveValue('보존할 문항');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('문항 pending 시작 전 동기 잠금으로 같은 submit을 한 번만 보낸다', async () => {
    let resolveCreate!: () => void;
    mocked.createQuestion.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveCreate = resolve;
    }));
    const user = userEvent.setup();
    renderPanel();
    await selectSurvey(user);
    const input = await screen.findByLabelText('새 문항 내용');
    await user.type(input, '중복 방지 문항');
    const submit = screen.getByRole('button', { name: /문항 추가/ });
    const form = submit.closest('form');

    fireEvent.submit(form!);
    fireEvent.submit(form!);

    await waitFor(() => expect(mocked.createQuestion).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    await act(async () => {
      resolveCreate();
    });
  });

  it('내부 항목 form의 길이 오류도 write 없이 인라인 연결·첫 focus한다', async () => {
    mocked.getQuestions.mockResolvedValue([QUESTION_WITHOUT_ITEMS]);
    const user = userEvent.setup();
    renderPanel();
    await selectSurvey(user);
    await user.click(await screen.findByRole('button', { name: /항목 추가/ }));
    const input = screen.getByLabelText('새 항목 내용');
    fireEvent.change(input, { target: { value: '가'.repeat(4001) } });

    await user.click(screen.getByRole('button', { name: '추가' }));

    expect(mocked.createItem).not.toHaveBeenCalled();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByRole('alert', { name: /입력 오류/ })).toHaveTextContent('최대 4000자');
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('내부 항목 form의 서버 필드 오류를 귀속하고 값을 보존한다', async () => {
    mocked.getQuestions.mockResolvedValue([QUESTION_WITHOUT_ITEMS]);
    mocked.createItem.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'artclCn', message: '이미 존재하는 항목입니다.' }] } },
    });
    const user = userEvent.setup();
    renderPanel();
    await selectSurvey(user);
    await user.click(await screen.findByRole('button', { name: /항목 추가/ }));
    const input = screen.getByLabelText('새 항목 내용');
    await user.type(input, '보존할 항목');

    await user.click(screen.getByRole('button', { name: '추가' }));

    expect(await screen.findByText('이미 존재하는 항목입니다.')).toBeVisible();
    expect(input).toHaveValue('보존할 항목');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('내부 항목 form도 pending 시작 전 같은 submit을 한 번만 보낸다', async () => {
    mocked.getQuestions.mockResolvedValue([QUESTION_WITHOUT_ITEMS]);
    let rejectCreate!: (reason: unknown) => void;
    mocked.createItem.mockReturnValueOnce(new Promise<void>((_resolve, reject) => {
      rejectCreate = reject;
    }));
    const user = userEvent.setup();
    renderPanel();
    await selectSurvey(user);
    await user.click(await screen.findByRole('button', { name: /항목 추가/ }));
    await user.type(screen.getByLabelText('새 항목 내용'), '중복 방지 항목');
    const submit = screen.getByRole('button', { name: '추가' });
    const removeQuestion = screen.getByRole('button', { name: '만족하십니까 문항 삭제' });
    const form = submit.closest('form');

    act(() => {
      fireEvent.submit(form!);
      fireEvent.click(removeQuestion);
      fireEvent.submit(form!);
    });

    await waitFor(() => expect(mocked.createItem).toHaveBeenCalledTimes(1));
    expect(mocked.deleteQuestion).not.toHaveBeenCalled();
    expect(submit).toBeDisabled();
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
    expect(removeQuestion).toBeDisabled();
    await act(async () => {
      rejectCreate({
        response: { data: { errors: [{ field: 'artclCn', message: '항목 내용을 다시 확인해 주세요.' }] } },
      });
    });
    expect(await screen.findByText('항목 내용을 다시 확인해 주세요.')).toBeVisible();
    expect(screen.getByLabelText('새 항목 내용')).toHaveValue('중복 방지 항목');
    expect(screen.getByRole('button', { name: '취소' })).toBeEnabled();
  });

  it('문항 삭제도 같은 tick 중복 요청을 막고 pending 상태를 안내한다', async () => {
    mocked.getQuestions.mockResolvedValue([QUESTION_WITHOUT_ITEMS]);
    let rejectDelete!: (reason: unknown) => void;
    mocked.deleteQuestion.mockReturnValueOnce(new Promise<void>((_resolve, reject) => {
      rejectDelete = reject;
    }));
    const user = userEvent.setup();
    renderPanel();
    await selectSurvey(user);
    const remove = await screen.findByRole('button', { name: '만족하십니까 문항 삭제' });

    act(() => {
      remove.click();
      remove.click();
    });

    await waitFor(() => expect(mocked.deleteQuestion).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: '만족하십니까 문항 삭제 중' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '만족하십니까 문항 삭제 중' })).toHaveAttribute('aria-busy', 'true');
    await act(async () => rejectDelete(new Error('문항 삭제 권한이 없습니다.')));
    expect(await screen.findByText('문항 삭제 권한이 없습니다.')).toBeVisible();
  });

  it('항목 삭제도 같은 tick 중복 요청을 막고 실패 후 다시 조작할 수 있다', async () => {
    mocked.getQuestions.mockResolvedValue([{
      ...QUESTION_WITHOUT_ITEMS,
      items: [{
        srvyArtclSn: 401,
        srvyQstnSn: 301,
        srvySn: 201,
        artclSn: 1,
        artclCn: '예',
        etcAnsYn: 'N',
        srvyTmpltSn: 101,
        frstRgtrId: 'admin',
        crtDt: '2026-08-06T00:00:00',
      }],
    }]);
    let rejectDelete!: (reason: unknown) => void;
    mocked.deleteItem.mockReturnValueOnce(new Promise<void>((_resolve, reject) => {
      rejectDelete = reject;
    }));
    const user = userEvent.setup();
    renderPanel();
    await selectSurvey(user);
    const remove = await screen.findByRole('button', { name: '예 항목 삭제' });

    act(() => {
      remove.click();
      remove.click();
    });

    await waitFor(() => expect(mocked.deleteItem).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: '예 항목 삭제 중' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '예 항목 삭제 중' })).toHaveAttribute('aria-busy', 'true');
    await act(async () => rejectDelete(new Error('항목 삭제에 실패했습니다.')));
    expect(await screen.findByText('항목 삭제에 실패했습니다.')).toBeVisible();
    expect(screen.getByRole('button', { name: '예 항목 삭제' })).toBeEnabled();
  });

  it('문항 추가 시 선택한 설문 ID 가 전달된다', async () => {
    const user = userEvent.setup();
    mocked.createQuestion.mockResolvedValue(undefined);
    renderPanel();

    await selectSurvey(user);
    await user.type(await screen.findByLabelText('새 문항 내용'), '재이용 의향');
    await user.click(screen.getByRole('button', { name: /문항 추가/ }));

    await waitFor(() =>
      expect(mocked.createQuestion).toHaveBeenCalledWith(201, expect.objectContaining({
        srvySn: 201,
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
