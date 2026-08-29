import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SatisfactionSection from '../SatisfactionSection';
import { satisfactionService } from '@/services/business/board/SatisfactionService';
import { satisfactionCreateSchema } from '../satisfaction-form-validation';

vi.mock('@/services/business/board/SatisfactionService', () => ({
  satisfactionService: {
    list: vi.fn(),
    average: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
  },
}));

const mocked = vi.mocked(satisfactionService);

function renderWidget() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SatisfactionSection bbsId="BBS_01" pstSn={1} />
    </QueryClientProvider>
  );
}

describe('SatisfactionSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.list.mockResolvedValue([]);
    // list 가 비어 있으면 서버는 average 를 싣지 않는다. 종전 fixture 의 { average: 0 } 은
    // 서버가 만들지 않는 조합이었고, 그래서 화면이 0.0 을 그리는 것이 정상처럼 보였다.
    mocked.average.mockResolvedValue({});
    mocked.remove.mockResolvedValue(undefined);
  });

  it('게시글 경로(bbsId/pstSn)를 서비스에 그대로 전달한다', async () => {
    renderWidget();

    await waitFor(() => {
      expect(mocked.list).toHaveBeenCalledWith('BBS_01', 1);
      expect(mocked.average).toHaveBeenCalledWith('BBS_01', 1);
    });
  });

  it('generated SatisfactionDto와 entity/화면의 점수·내용·Y/N 경계를 보존한다', () => {
    const valid = {
      dgstfnScr: 5,
      dgstfnCn: '가'.repeat(4000),
      useYn: 'Y',
    };

    expect(satisfactionCreateSchema.safeParse(valid).success).toBe(true);
    expect(satisfactionCreateSchema.safeParse({ ...valid, dgstfnScr: 0 }).success).toBe(false);
    expect(satisfactionCreateSchema.safeParse({ ...valid, dgstfnScr: 6 }).success).toBe(false);
    expect(satisfactionCreateSchema.safeParse({ ...valid, dgstfnScr: 1.5 }).success).toBe(false);
    expect(satisfactionCreateSchema.safeParse({ ...valid, dgstfnCn: '가'.repeat(4001) }).success).toBe(false);
    expect(satisfactionCreateSchema.safeParse({ ...valid, useYn: 'X' }).success).toBe(false);
  });

  it('평균과 응답 수를 표시한다', async () => {
    mocked.average.mockResolvedValue({ average: 4.25 });
    mocked.list.mockResolvedValue([
      { dgstfnSn: 1, dgstfnScr: 5, dgstfnCn: '좋아요', userNm: '홍길동', useYn: 'Y' },
      { dgstfnSn: 2, dgstfnScr: 3, useYn: 'Y' },
    ]);

    renderWidget();

    expect(await screen.findByText('4.3')).toBeInTheDocument();
    expect(screen.getByText('(2명)')).toBeInTheDocument();
    expect(screen.getByText('좋아요')).toBeInTheDocument();
  });

  it('작성자명이 없으면 익명으로 표시한다', async () => {
    mocked.list.mockResolvedValue([{ dgstfnSn: 1, dgstfnScr: 4, useYn: 'Y' }]);

    renderWidget();

    expect(await screen.findByText('익명')).toBeInTheDocument();
  });

  /** 별점 없이 제출하면 서버까지 가지 않는다 — 서버는 어차피 거부하지만 왕복이 낭비다. */
  it('별점을 고르지 않고 제출하면 서비스를 호출하지 않는다', async () => {
    const user = userEvent.setup();
    renderWidget();

    await user.click(await screen.findByRole('button', { name: '만족도 등록' }));

    expect(await screen.findByText('별점을 선택해 주세요.')).toBeInTheDocument();
    expect(mocked.create).not.toHaveBeenCalled();
    const scoreGroup = screen.getByRole('radiogroup', { name: '별점' });
    expect(scoreGroup).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(scoreGroup).toHaveFocus());
  });

  it('의견 길이 오류는 write 없이 인라인으로 연결하고 의견 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    renderWidget();
    await user.click(await screen.findByRole('radio', { name: '4점' }));
    const content = screen.getByRole('textbox', { name: '만족도 의견' });
    fireEvent.change(content, { target: { value: '가'.repeat(4001) } });

    await user.click(screen.getByRole('button', { name: '만족도 등록' }));

    expect(mocked.create).not.toHaveBeenCalled();
    expect(content).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByRole('alert', { name: /입력 오류/ })).toHaveTextContent('최대 4000자');
    await waitFor(() => expect(content).toHaveFocus());
  });

  it('서버 필드 오류를 인라인으로 연결하고 별점·의견을 보존한다', async () => {
    mocked.create.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'dgstfnCn', message: '의견에 사용할 수 없는 표현이 있습니다.' }] } },
    });
    const user = userEvent.setup();
    renderWidget();
    await user.click(await screen.findByRole('radio', { name: '4점' }));
    const content = screen.getByRole('textbox', { name: '만족도 의견' });
    await user.type(content, '보존할 의견');

    await user.click(screen.getByRole('button', { name: '만족도 등록' }));

    expect(await screen.findByText('의견에 사용할 수 없는 표현이 있습니다.')).toBeVisible();
    expect(content).toHaveValue('보존할 의견');
    expect(screen.getByRole('radio', { name: '4점' })).toHaveAttribute('aria-checked', 'true');
    expect(content).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(content).toHaveFocus());
  });

  it('pending 시작 전 동기 잠금으로 같은 submit을 한 번만 보낸다', async () => {
    let resolveCreate!: (value: number) => void;
    mocked.create.mockReturnValueOnce(new Promise<number>((resolve) => {
      resolveCreate = resolve;
    }));
    const user = userEvent.setup();
    renderWidget();
    await user.click(await screen.findByRole('radio', { name: '4점' }));
    const submit = screen.getByRole('button', { name: '만족도 등록' });
    const form = submit.closest('form');

    fireEvent.submit(form!);
    fireEvent.submit(form!);

    await waitFor(() => expect(mocked.create).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    await act(async () => {
      resolveCreate(1);
    });
  });

  it('별점을 고르고 제출하면 선택한 점수가 그대로 전달된다', async () => {
    const user = userEvent.setup();
    mocked.create.mockResolvedValue(1);
    renderWidget();

    await user.click(await screen.findByRole('radio', { name: '4점' }));
    await user.click(screen.getByRole('button', { name: '만족도 등록' }));

    await waitFor(() => {
      expect(mocked.create).toHaveBeenCalledWith('BBS_01', 1,
        expect.objectContaining({ dgstfnScr: 4, useYn: 'Y' }));
    });
  });

  /**
   * 🔒 화면이 권한을 흉내내지 않는다는 것을 고정한다.
   *
   * 삭제 권한 판정은 백엔드(소유자/관리자 또는 익명 비밀번호)에 있다. 화면이 자체적으로
   * 버튼을 숨기면 서버 규칙과 갈라지고 그 불일치는 조용히 누적된다. 그래서 버튼은 항상
   * 노출하고 서버가 거부하면 그 사실을 사용자에게 그대로 보여준다.
   */
  it('🔒 삭제 실패(권한 없음) 시 서버 판정을 그대로 노출한다', async () => {
    const user = userEvent.setup();
    mocked.list.mockResolvedValue([{ dgstfnSn: 7, dgstfnScr: 5, userNm: '남의글', useYn: 'Y' }]);
    mocked.remove.mockRejectedValue(new Error('본인 확인에 실패했습니다.'));

    renderWidget();

    await user.click(await screen.findByRole('button', { name: '남의글의 만족도 삭제' }));

    expect(await screen.findByText('본인 확인에 실패했습니다.')).toBeInTheDocument();
    expect(mocked.remove).toHaveBeenCalledWith('BBS_01', 1, 7);
  });

  it('삭제는 같은 tick 중복 실행을 막고 pending 상태를 안내한다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    mocked.list.mockResolvedValue([{ dgstfnSn: 7, dgstfnScr: 5, userNm: '삭제대상', useYn: 'Y' }]);
    mocked.remove.mockReturnValueOnce(new Promise((_, reject) => { rejectDelete = reject; }));
    renderWidget();
    const deleteButton = await screen.findByRole('button', { name: '삭제대상의 만족도 삭제' });

    act(() => {
      deleteButton.click();
      deleteButton.click();
    });

    await waitFor(() => expect(mocked.remove).toHaveBeenCalledTimes(1));
    const pendingButton = screen.getByRole('button', { name: '삭제대상의 만족도 삭제 중…' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');
    await act(async () => rejectDelete(new Error('삭제 처리 실패')));
    expect(await screen.findByText('삭제 처리 실패')).toBeVisible();
  });

  it('만족도가 없으면 안내 문구를 보여준다', async () => {
    renderWidget();

    expect(await screen.findByText('아직 등록된 만족도가 없습니다.')).toBeInTheDocument();
  });

  /**
   * [2026-08-29] 평가가 하나도 없을 때 별점 0개·0.0 을 그리면, 화면이 **측정하지 않은 것을
   * 측정값으로** 말하는 것이 된다. 백엔드는 이제 average 를 싣지 않는다(Map.of 제약 제거).
   */
  it('평가가 하나도 없으면 별점 대신 그 사실을 말한다', async () => {
    mocked.average.mockResolvedValue({});
    mocked.list.mockResolvedValue([]);

    renderWidget();

    expect(await screen.findByText('아직 평가가 없습니다')).toBeInTheDocument();
    // 0.0 을 그리면 "모두 최하점" 과 구분되지 않는다.
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
  });

  /**
   * [2026-08-29] CI e2e 가 잡은 실제 회귀의 회귀 방지.
   *
   * <p>생성 타입은 `average?: number` 로 <b>optional</b> 이라고 선언하지만, springdoc 이
   * `@Schema(nullable=true)` 를 스펙에 반영하지 않았고 Spring 기본 직렬화는 null 을 그대로
   * 실었다. 그래서 실제 응답은 `{ average: null }` 이었고 `=== undefined` 검사가 이를 놓쳐
   * `null.toFixed(1)` 로 터졌다(`Cannot read properties of null`).
   *
   * <p>타입이 "올 수 없다" 고 말하는 값을 일부러 넣는다 — <b>선언과 전송이 어긋날 수 있는
   * 경계</b>이기 때문이다. 서버는 이제 키를 싣지 않지만(NON_NULL), 화면은 둘 다 견뎌야 한다.
   */
  it('average 가 null 로 와도 터지지 않고 빈 상태로 말한다', async () => {
    mocked.average.mockResolvedValue({ average: null } as never);
    // ⚠ 목록을 비워 두면 **로딩 상태와 빈 상태의 출력이 같아** 쿼리가 해결되기 전에 통과한다
    //   (실측: `=== undefined` 로 되돌려도 green 이었다 — vacuous). 목록 항목을 로드 완료의
    //   신호로 삼아, 단언이 실제 응답을 본 뒤에 일어나게 한다.
    mocked.list.mockResolvedValue([{ dgstfnSn: 1, dgstfnScr: 4, dgstfnCn: '좋아요', useYn: 'Y' }]);

    renderWidget();
    expect(await screen.findByText('좋아요')).toBeInTheDocument();

    expect(screen.getByText('아직 평가가 없습니다')).toBeInTheDocument();
    // 이 두 문자열은 has-average 분기에서만 렌더된다 — 남아 있으면 null 을 값으로 취급한 것이다.
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
    expect(screen.queryByText('(1명)')).not.toBeInTheDocument();
  });

  it('실제로 0점대 평균이면 수치를 그린다 — 빈 상태와 다르다', async () => {
    mocked.average.mockResolvedValue({ average: 0 });
    mocked.list.mockResolvedValue([{ dgstfnSn: 1, dgstfnScr: 1, useYn: 'Y' }]);

    renderWidget();

    expect(await screen.findByText('0.0')).toBeInTheDocument();
    expect(screen.queryByText('아직 평가가 없습니다')).not.toBeInTheDocument();
  });
});
