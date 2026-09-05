import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 🗂 워크허브 '업무함 관리' 진입 계약 (DEC-OPS-037, 감사 D10-01).
 *
 * 업무함 CRUD 는 서버가 @AdminOrSystem 이라 버튼은 관리자에게만 그린다(표시 판정 = 라우트 게이트와 같은
 * 역할 집합, DEC-OPS-023 ②). 비관리자에게 죽은 버튼을 보이지 않고, 업무 탭에서만 노출하며, 누르면 다이얼로그가
 * 열릴 때만 마운트된다.
 */
const mocks = vi.hoisted(() => ({
  role: 'ROLE_ADMIN' as string,
  tab: 'job' as string,
  dialogRenders: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => mocks.tab }),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock('lucide-react', () => ({
  Plus: () => <span aria-hidden="true" />,
  FolderCog: () => <span aria-hidden="true" />,
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey[0] === 'work-schedules' ? [] : { list: [], totalPage: 1, total: 0 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, children }: { actions: React.ReactNode; children: React.ReactNode }) => (
    <main>{actions}{children}</main>
  ),
}));
vi.mock('@/app/components/patterns/keyword-filter', () => ({
  KeywordFilter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/app/components/patterns/empty-result-message', () => ({
  emptyResultMessage: (_keyword: string, fallback: string) => fallback,
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: () => <div data-testid="data-table" />,
}));
vi.mock('@/components/ui/calendar', () => ({ Calendar: () => <div data-testid="calendar" /> }));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => (isOpen ? <div>{children}</div> : null),
}));
vi.mock('@/components/business/deptJob/DeptJobForm', () => ({ PRIORITY_LABEL: {} }));
vi.mock('@/services/business/user/deptJob/DeptJobUserService', () => ({ deptJobUserService: {} }));
vi.mock('@/services/business/user/ReportService', () => ({ reportService: {} }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/services/business/schedule/deptScheduleService', () => ({
  getDeptScheduleMonthList: vi.fn(),
  createDeptSchedule: vi.fn(),
  updateDeptSchedule: vi.fn(),
  deleteDeptSchedule: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: mocks.role } }) }));
vi.mock('@/components/business/deptJob/DeptJobBoxManageDialog', () => ({
  DeptJobBoxManageDialog: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    mocks.dialogRenders(isOpen);
    return isOpen ? (
      <div role="dialog" aria-label="업무함 관리">
        <button type="button" onClick={onClose}>닫기</button>
      </div>
    ) : null;
  },
}));

import WorkHubClient from '../WorkHubClient';

describe('WorkHubClient 업무함 관리 진입', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.role = 'ROLE_ADMIN';
    mocks.tab = 'job';
  });

  it('관리자에게만 업무 탭에서 버튼을 그리고, 누르면 다이얼로그를 마운트한다', async () => {
    const user = userEvent.setup();
    render(<WorkHubClient defaultTab="job" initialYmd="20260906" />);
    // 열기 전에는 다이얼로그 자체를 마운트하지 않는다(조회 훅이 허브 렌더에 끼지 않는다).
    expect(mocks.dialogRenders).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '업무함 관리' }));
    expect(screen.getByRole('dialog', { name: '업무함 관리' })).toBeInTheDocument();
    expect(mocks.dialogRenders).toHaveBeenCalledWith(true);
    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('dialog', { name: '업무함 관리' })).not.toBeInTheDocument();
  });

  it('SYSTEM 권한도 관리자 판정에 포함된다 — 리터럴 비교가 아니라 SSOT 집합이다', () => {
    mocks.role = 'ROLE_SYSTEM';
    render(<WorkHubClient defaultTab="job" initialYmd="20260906" />);
    expect(screen.getByRole('button', { name: '업무함 관리' })).toBeInTheDocument();
  });

  it('비관리자에게는 버튼을 그리지 않는다(죽은 버튼 금지)', () => {
    mocks.role = 'ROLE_USER';
    render(<WorkHubClient defaultTab="job" initialYmd="20260906" />);
    expect(screen.queryByRole('button', { name: '업무함 관리' })).not.toBeInTheDocument();
    expect(mocks.dialogRenders).not.toHaveBeenCalled();
  });

  it('보고·일정 탭에서는 노출하지 않는다', () => {
    mocks.tab = 'report';
    render(<WorkHubClient defaultTab="report" initialYmd="20260906" />);
    expect(screen.queryByRole('button', { name: '업무함 관리' })).not.toBeInTheDocument();
  });
});
