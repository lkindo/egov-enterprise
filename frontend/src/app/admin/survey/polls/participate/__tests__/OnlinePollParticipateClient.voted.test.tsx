import { fireEvent, render, screen } from '@testing-library/react';
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
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

import OnlinePollParticipateClient from '../OnlinePollParticipateClient';

const activePoll = { pollBgngYmd: '20260901', pollEndYmd: '20261031', pollDsuseYn: 'N', pollKndCd: '001' };

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
});
