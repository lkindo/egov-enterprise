import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SatisfactionSection from '../SatisfactionSection';
import { satisfactionService } from '@/services/business/board/SatisfactionService';

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
      <SatisfactionSection bbsId="BBS_01" pstId="P1" />
    </QueryClientProvider>
  );
}

describe('SatisfactionSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.list.mockResolvedValue([]);
    mocked.average.mockResolvedValue({ average: 0 });
  });

  it('게시글 경로(bbsId/pstId)를 서비스에 그대로 전달한다', async () => {
    renderWidget();

    await waitFor(() => {
      expect(mocked.list).toHaveBeenCalledWith('BBS_01', 'P1');
      expect(mocked.average).toHaveBeenCalledWith('BBS_01', 'P1');
    });
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

    await user.click(await screen.findByRole('button', { name: '등록' }));

    expect(await screen.findByText('별점을 선택해 주세요.')).toBeInTheDocument();
    expect(mocked.create).not.toHaveBeenCalled();
  });

  it('별점을 고르고 제출하면 선택한 점수가 그대로 전달된다', async () => {
    const user = userEvent.setup();
    mocked.create.mockResolvedValue(1);
    renderWidget();

    await user.click(await screen.findByRole('button', { name: '4점' }));
    await user.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => {
      expect(mocked.create).toHaveBeenCalledWith('BBS_01', 'P1',
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
    expect(mocked.remove).toHaveBeenCalledWith('BBS_01', 'P1', 7);
  });

  it('만족도가 없으면 안내 문구를 보여준다', async () => {
    renderWidget();

    expect(await screen.findByText('아직 등록된 만족도가 없습니다.')).toBeInTheDocument();
  });
});
