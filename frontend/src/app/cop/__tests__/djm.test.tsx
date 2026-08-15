vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import DeptJobDetailClient from '../../smart-toolkit/dept-job/[id]/DeptJobDetailClient';

/**
 * 부서 업무 상세·수정 화면 테스트.
 *
 * [이설 경위] 이 파일은 원래 `selectDeptJobList/page` 를 렌더했다. 그 화면은 존재하지 않는
 * `/api/v1/deptjob` 를 호출하는 파손 목록이었고, 지금은 정본(/smart-toolkit/dept-job)으로
 * 보내는 redirect 로 대체됐다. 테스트를 폐기하는 대신, 그 자리를 메우는 **진짜 상세·수정 화면**을
 * 검증하도록 옮긴다.
 *
 * 종전 `[id]` 화면은 params 를 받지 않는 목록 복제본이라 "어떤 업무를 보는지" 자체를 몰랐다.
 * 그래서 이 테스트의 핵심 명제는 **전달받은 id 로 그 업무를 조회해 보여주는가** 이다.
 */

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn() }),
  usePathname: () => '/smart-toolkit/dept-job/TASK_0001',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

const confirmMock = vi.fn().mockResolvedValue(true);
vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => confirmMock,
}));

const getDeptJobMock = vi.fn();
const updateDeptJobMock = vi.fn();
const deleteDeptJobMock = vi.fn();
vi.mock('@/services/business/user/deptJob/DeptJobUserService', () => ({
  deptJobUserService: {
    getDeptJob: (...a: unknown[]) => getDeptJobMock(...a),
    updateDeptJob: (...a: unknown[]) => updateDeptJobMock(...a),
    deleteDeptJob: (...a: unknown[]) => deleteDeptJobMock(...a),
  },
}));

function renderDetail(sn = 1) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DeptJobDetailClient deptTaskSn={sn} />
    </QueryClientProvider>
  );
}

const JOB = {
  deptTaskSn: 1,
  deptTaskNm: '주간 보고 작성',
  deptTaskCn: '팀 주간 실적을 정리한다.',
  prrtyRnk: '1',
  picNm: '홍길동',
  deptTaskBoxNm: '기획팀 업무함',
  frstRgtrId: 'webmaster',
};

describe('DeptJobDetailClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDeptJobMock.mockResolvedValue(JOB);
  });

  it('[회귀] 전달받은 id 로 해당 업무를 조회해 상세를 보여준다', async () => {
    renderDetail(1);

    expect(await screen.findByText('주간 보고 작성')).toBeInTheDocument();
    // 종전 구현은 id 를 아예 쓰지 않았다. 조회 인자를 직접 확인한다.
    expect(getDeptJobMock).toHaveBeenCalledWith(1);
    expect(screen.getByText('팀 주간 실적을 정리한다.')).toBeInTheDocument();
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('높음')).toBeInTheDocument();
  });

  it('업무함·담당자가 없어도 상세가 렌더된다', async () => {
    // 등록 폼에 업무함/담당자 선택 UI 가 없어 새 업무는 항상 이 상태다.
    getDeptJobMock.mockResolvedValue({ deptTaskSn: 2, deptTaskNm: '업무함 없는 업무' });
    renderDetail(2);

    expect(await screen.findByText('업무함 없는 업무')).toBeInTheDocument();
    expect(screen.getByText('업무함 미지정')).toBeInTheDocument();
    expect(screen.getByText('담당자 미지정')).toBeInTheDocument();
  });

  it('수정 버튼을 누르면 폼이 열리고 기존 값이 채워진다', async () => {
    renderDetail();
    await screen.findByText('주간 보고 작성');

    await userEvent.click(screen.getByRole('button', { name: /수정/ }));

    expect(await screen.findByDisplayValue('주간 보고 작성')).toBeInTheDocument();
    expect(screen.getByDisplayValue('팀 주간 실적을 정리한다.')).toBeInTheDocument();
  });

  it('삭제는 확인을 거쳐 해당 id 로 요청한다', async () => {
    deleteDeptJobMock.mockResolvedValue(undefined);
    renderDetail(1);
    await screen.findByText('주간 보고 작성');

    await userEvent.click(screen.getByRole('button', { name: /삭제/ }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    await waitFor(() => expect(deleteDeptJobMock).toHaveBeenCalledWith(1));
  });

  it('조회 실패 시 목록으로 돌아갈 수단을 제공한다', async () => {
    getDeptJobMock.mockRejectedValue(new Error('404'));
    renderDetail(999);

    expect(await screen.findByText(/업무를 찾을 수 없습니다/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '목록으로' }));
    expect(pushMock).toHaveBeenCalledWith('/smart-toolkit/dept-job');
  });
});
