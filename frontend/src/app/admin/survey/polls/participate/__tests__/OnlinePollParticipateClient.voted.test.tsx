import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [2026-09-26 DIP V7] 투표 참여 화면이 참여 여부(hasVoted)를 쓰는지.
 *
 * 서버는 목록에 hasVoted 를 싣는데 화면이 읽지 않아, 이미 참여한 투표를 다시 열면 투표 화면이 나오고
 * 제출해야 비로소 "이미 참여" 로 거부됐다. 참여한 투표는 결과로 연다.
 */
const mocks = vi.hoisted(() => ({
  getPollList: vi.fn(),
  getPollItemList: vi.fn(),
  participatePoll: vi.fn(),
}));

vi.mock('@/services/business/user/poll/PollUserService', () => ({
  pollUserService: {
    getPollList: mocks.getPollList,
    getPollItemList: mocks.getPollItemList,
    participatePoll: mocks.participatePoll,
  },
}));
vi.mock('@/lib/hooks/use-today-ymd', () => ({ useTodayStorageYmd: () => '20260926' }));
// 실제 useToast 처럼 렌더 사이에 같은 객체를 돌려준다 — 새 객체면 목록 조회 effect 가 렌더마다 다시 돈다.
vi.mock('@/app/components/ui/toast', () => {
  const stable = { toast: vi.fn(), success: vi.fn(), error: vi.fn() };
  return { useToast: () => stable };
});
vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

import OnlinePollParticipateClient from '../OnlinePollParticipateClient';

const activePoll = { pollBgngYmd: '20260901', pollEndYmd: '20261031', pollDsuseYn: 'N', pollKndCd: '001' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

describe('투표 참여 화면의 참여 여부 (DIP V7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPollItemList.mockResolvedValue([
      { pollSn: 1, pollArtclSn: 11, pollArtclNm: '찬성', pollIemCo: 3 },
      { pollSn: 1, pollArtclSn: 12, pollArtclNm: '반대', pollIemCo: 1 },
    ]);
  });

  it('🚨 이미 참여한 진행 중 투표는 결과로 열고 참여 완료를 표시한다', async () => {
    mocks.getPollList.mockResolvedValue({ list: [{ ...activePoll, pollSn: 1, pollNm: '점심 메뉴', hasVoted: true }] });
    render(<OnlinePollParticipateClient />);

    expect(await screen.findByText('참여 완료 · 결과 보기')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /점심 메뉴/ }));

    expect(await screen.findByText('집계 결과')).toBeInTheDocument();
    expect(screen.getByText('참여 완료')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /투표 제출하기/ })).toBeNull();
  });

  it('대조군: 참여하지 않은 진행 중 투표는 투표 화면으로 연다', async () => {
    mocks.getPollList.mockResolvedValue({ list: [{ ...activePoll, pollSn: 1, pollNm: '점심 메뉴', hasVoted: false }] });
    render(<OnlinePollParticipateClient />);

    fireEvent.click(await screen.findByRole('button', { name: /점심 메뉴/ }));

    expect(await screen.findByText('항목을 선택하세요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /투표 제출하기/ })).toBeInTheDocument();
    expect(screen.queryByText('참여 완료 · 결과 보기')).toBeNull();
  });

  it('조회 실패와 빈 목록을 투표라는 이름으로 말한다', async () => {
    mocks.getPollList.mockRejectedValueOnce(new Error('down'));
    render(<OnlinePollParticipateClient />);

    expect(await screen.findByText('투표 목록을 불러오지 못했습니다.')).toBeInTheDocument();
  });

  it('투표 후 늦은 항목 재조회가 새로 연 다른 투표의 항목과 모드를 덮어쓰지 않는다', async () => {
    const firstItems = [{ pollSn: 1, pollArtclSn: 11, pollArtclNm: '점심 첫 항목', pollIemCo: 3 }];
    const nextItems = [{ pollSn: 2, pollArtclSn: 21, pollArtclNm: '회의 두 번째 항목', pollIemCo: 0 }];
    const voteRefresh = deferred<typeof firstItems>();
    mocks.getPollList.mockResolvedValue({ list: [
      { ...activePoll, pollSn: 1, pollNm: '점심 메뉴', hasVoted: false },
      { ...activePoll, pollSn: 2, pollNm: '회의 시간', hasVoted: false },
    ] });
    mocks.getPollItemList.mockResolvedValueOnce(firstItems)
      .mockReturnValueOnce(voteRefresh.promise)
      .mockResolvedValueOnce(nextItems);
    mocks.participatePoll.mockResolvedValue(undefined);
    render(<OnlinePollParticipateClient />);

    fireEvent.click(await screen.findByRole('button', { name: /점심 메뉴/ }));
    fireEvent.click(await screen.findByRole('button', { name: '점심 첫 항목' }));
    fireEvent.click(screen.getByRole('button', { name: /투표 제출하기/ }));
    await waitFor(() => expect(mocks.getPollItemList).toHaveBeenCalledTimes(2));
    expect(mocks.participatePoll).toHaveBeenCalledTimes(1);
    expect(mocks.participatePoll).toHaveBeenCalledWith({ pollSn: 1, pollArtclSn: 11 });

    fireEvent.click(screen.getByRole('button', { name: '목록으로' }));
    fireEvent.click(await screen.findByRole('button', { name: /회의 시간/ }));
    expect(await screen.findByRole('button', { name: '회의 두 번째 항목' })).toBeVisible();

    await act(async () => { voteRefresh.resolve(firstItems); });

    expect(screen.getByRole('heading', { level: 2, name: '회의 시간' })).toBeVisible();
    expect(screen.getByRole('button', { name: '회의 두 번째 항목' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '점심 첫 항목' })).toBeNull();
    expect(screen.getByRole('button', { name: /투표 제출하기/ })).toBeInTheDocument();
    expect(mocks.participatePoll).toHaveBeenCalledTimes(1);
  });

  it('투표 후 목록으로 돌아가면 늦은 항목 재조회가 상세 화면을 다시 열지 않는다', async () => {
    const items = [{ pollSn: 1, pollArtclSn: 11, pollArtclNm: '점심 첫 항목', pollIemCo: 3 }];
    const voteRefresh = deferred<typeof items>();
    mocks.getPollList.mockResolvedValue({ list: [{ ...activePoll, pollSn: 1, pollNm: '점심 메뉴', hasVoted: false }] });
    mocks.getPollItemList.mockResolvedValueOnce(items).mockReturnValueOnce(voteRefresh.promise);
    mocks.participatePoll.mockResolvedValue(undefined);
    render(<OnlinePollParticipateClient />);
    fireEvent.click(await screen.findByRole('button', { name: /점심 메뉴/ }));
    fireEvent.click(await screen.findByRole('button', { name: '점심 첫 항목' }));
    fireEvent.click(screen.getByRole('button', { name: /투표 제출하기/ }));
    await waitFor(() => expect(mocks.getPollItemList).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: '목록으로' }));
    expect(await screen.findByText('참여 완료 · 결과 보기')).toBeInTheDocument();
    await act(async () => { voteRefresh.resolve(items); });

    expect(screen.getByRole('button', { name: /점심 메뉴/ })).toBeVisible();
    expect(screen.getByText('참여 완료 · 결과 보기')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: '점심 메뉴' })).toBeNull();
    expect(mocks.participatePoll).toHaveBeenCalledTimes(1);
  });

  it('같은 투표를 다시 여는 동안 제출이 완료되면 참여 사실과 결과 모드를 유지한다', async () => {
    const items = [{ pollSn: 1, pollArtclSn: 11, pollArtclNm: '점심 첫 항목', pollIemCo: 3 }];
    const submission = deferred<void>();
    const reselectedItems = deferred<typeof items>();
    const voteRefresh = deferred<typeof items>();
    mocks.getPollList.mockResolvedValue({ list: [{ ...activePoll, pollSn: 1, pollNm: '점심 메뉴', hasVoted: false }] });
    mocks.getPollItemList.mockResolvedValueOnce(items)
      .mockReturnValueOnce(reselectedItems.promise)
      .mockReturnValueOnce(voteRefresh.promise);
    mocks.participatePoll.mockReturnValueOnce(submission.promise);
    render(<OnlinePollParticipateClient />);
    fireEvent.click(await screen.findByRole('button', { name: /점심 메뉴/ }));
    fireEvent.click(await screen.findByRole('button', { name: '점심 첫 항목' }));
    fireEvent.click(screen.getByRole('button', { name: /투표 제출하기/ }));
    await waitFor(() => expect(mocks.participatePoll).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: '목록으로' }));
    fireEvent.click(await screen.findByRole('button', { name: /점심 메뉴/ }));
    await waitFor(() => expect(mocks.getPollItemList).toHaveBeenCalledTimes(2));
    await act(async () => { submission.resolve(undefined); });
    await waitFor(() => expect(mocks.getPollItemList).toHaveBeenCalledTimes(3));
    await act(async () => { reselectedItems.resolve(items); });
    await act(async () => { voteRefresh.resolve(items); });

    expect(screen.getByRole('heading', { level: 2, name: '점심 메뉴' })).toBeVisible();
    expect(screen.getByText('참여 완료')).toBeInTheDocument();
    expect(screen.getByText('집계 결과')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /투표 제출하기/ })).toBeNull();
    expect(mocks.participatePoll).toHaveBeenCalledTimes(1);
  });

  it('같은 투표 재선택 조회가 먼저 끝나도 늦은 제출 완료 후 결과 화면으로 전환한다', async () => {
    const items = [{ pollSn: 1, pollArtclSn: 11, pollArtclNm: '점심 첫 항목', pollIemCo: 3 }];
    const submission = deferred<void>();
    const reselectedItems = deferred<typeof items>();
    const voteRefresh = deferred<typeof items>();
    mocks.getPollList.mockResolvedValue({ list: [{ ...activePoll, pollSn: 1, pollNm: '점심 메뉴', hasVoted: false }] });
    mocks.getPollItemList.mockResolvedValueOnce(items)
      .mockReturnValueOnce(reselectedItems.promise)
      .mockReturnValueOnce(voteRefresh.promise);
    mocks.participatePoll.mockReturnValueOnce(submission.promise);
    render(<OnlinePollParticipateClient />);
    fireEvent.click(await screen.findByRole('button', { name: /점심 메뉴/ }));
    fireEvent.click(await screen.findByRole('button', { name: '점심 첫 항목' }));
    fireEvent.click(screen.getByRole('button', { name: /투표 제출하기/ }));
    await waitFor(() => expect(mocks.participatePoll).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: '목록으로' }));
    fireEvent.click(await screen.findByRole('button', { name: /점심 메뉴/ }));
    await waitFor(() => expect(mocks.getPollItemList).toHaveBeenCalledTimes(2));
    await act(async () => { reselectedItems.resolve(items); });
    expect(screen.getByText('항목을 선택하세요')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '점심 첫 항목' }));
    expect(screen.getByRole('button', { name: /투표 제출하기/ })).toBeDisabled();

    await act(async () => { submission.resolve(undefined); });
    await waitFor(() => expect(mocks.getPollItemList).toHaveBeenCalledTimes(3));
    await act(async () => { voteRefresh.resolve(items); });

    expect(screen.getByRole('heading', { level: 2, name: '점심 메뉴' })).toBeVisible();
    expect(screen.getByText('참여 완료')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /투표 제출하기/ })).toBeNull();
    expect(screen.getByText('집계 결과')).toBeInTheDocument();
    expect(mocks.participatePoll).toHaveBeenCalledTimes(1);
  });
});
