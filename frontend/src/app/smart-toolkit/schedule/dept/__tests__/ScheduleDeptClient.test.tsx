import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  getDeptScheduleList: vi.fn(),
}));

vi.mock('@/services/business/schedule/deptScheduleService', () => ({
  getDeptScheduleList: harness.getDeptScheduleList,
  createDeptSchedule: vi.fn(),
  updateDeptSchedule: vi.fn(),
  deleteDeptSchedule: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import ScheduleDeptClient from '../ScheduleDeptClient';

describe('ScheduleDeptClient 조회 실패 정직성', () => {
  beforeEach(() => {
    harness.getDeptScheduleList.mockReset();
  });

  it('조회 실패를 "등록된 일정 없음"으로 위장하지 않고 사유와 재시도 수단을 노출한다', async () => {
    harness.getDeptScheduleList.mockRejectedValueOnce(new Error('서버 연결에 실패했습니다.'));

    render(<ScheduleDeptClient />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('부서 일정 목록을 불러오지 못했습니다.');
    expect(alert).toHaveTextContent('서버 연결에 실패했습니다.');
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
    // 실패가 빈 목록 문구로 표시되면 이 계약의 존재 이유가 사라진다.
    expect(screen.queryByText('등록된 부서 일정이 존재하지 않습니다.')).not.toBeInTheDocument();
  });

  it('재시도 버튼이 실제로 재조회해 성공 데이터를 렌더한다', async () => {
    harness.getDeptScheduleList
      .mockRejectedValueOnce(new Error('일시 오류'))
      .mockResolvedValueOnce({
        list: [
          {
            schdlSn: 1,
            schdlNm: '주간 부서 회의',
            schdlBgngYmd: '20260825',
            schdlEndYmd: '20260825',
            schdlPlcNm: '회의실 A',
          },
        ],
      });

    render(<ScheduleDeptClient />);
    await screen.findByRole('alert');

    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByText('주간 부서 회의')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(harness.getDeptScheduleList).toHaveBeenCalledTimes(2);
  });

  it('성공했지만 0건이면 기존 빈 목록 문구를 유지한다', async () => {
    harness.getDeptScheduleList.mockResolvedValueOnce({ list: [] });

    render(<ScheduleDeptClient />);

    expect(await screen.findByText('등록된 부서 일정이 존재하지 않습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('조회 중에는 로딩 상태를 알리고 빈 목록 문구를 미리 보이지 않는다', async () => {
    let resolveList: (value: { list: never[] }) => void = () => {};
    harness.getDeptScheduleList.mockImplementationOnce(
      () => new Promise((resolve) => { resolveList = resolve; }),
    );

    render(<ScheduleDeptClient />);

    expect(screen.getByText('부서 일정을 불러오는 중')).toBeInTheDocument();
    expect(screen.queryByText('등록된 부서 일정이 존재하지 않습니다.')).not.toBeInTheDocument();

    resolveList({ list: [] });
    await waitFor(() =>
      expect(screen.queryByText('부서 일정을 불러오는 중')).not.toBeInTheDocument(),
    );
  });
});
