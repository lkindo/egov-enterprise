import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IsmClient from '../IsmClient';

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), refresh: vi.fn(), toast: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock('next/dynamic', () => ({
  default: () => function TestModal({ isOpen, title, children, footer }: {
    isOpen: boolean;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
  }) {
    return isOpen ? <section aria-label={title}>{children}{footer}</section> : null;
  },
}));
vi.mock('@/services/foundation/system/IsmAdminService', () => ({
  SANCTION_STATUS: { REQUESTED: 'A', APPROVED: 'C', REJECTED: 'R' },
  isSanctionPending: (value?: string) => !value || value === 'A',
  ismAdminService: { confirmInfrmlSanctn: (...args: unknown[]) => mocks.confirm(...args) },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ title, actions, toolbarActions, children }: {
    title: string;
    actions?: ReactNode;
    toolbarActions?: ReactNode;
    children: ReactNode;
  }) => <main><h1>{title}</h1>{actions}{toolbarActions}{children}</main>,
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: {
    columns: Array<{ accessor: (item: Record<string, unknown>) => ReactNode }>;
    data: Array<Record<string, unknown>>;
  }) => <div>{data.map((item, row) => columns.map((column, index) => (
    <div key={`${row}-${index}`}>{column.accessor(item)}</div>
  )))}</div>,
}));
vi.mock('@/components/ui/hub/HubStatusBadge', () => ({ HubStatusBadge: () => <span /> }));

const pendingSanction = {
  ifmlAtrzSn: 7,
  taskSeCd: 'REPORT',
  taskSeNm: '보고 결재',
  aplcntId: 'requester',
  aplcntNm: '신청자',
  aprvrId: 'approver',
  aprvYn: 'A',
};

describe('IsmClient validation behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(undefined);
  });

  it('invalid 승인 요청을 write하지 않고 summary와 사유 필드로 연결한다', async () => {
    render(<IsmClient initialData={{ list: [pendingSanction] }} />);
    fireEvent.click(screen.getByRole('button', { name: /승인 실행/ }));
    const reason = screen.getByRole('textbox', { name: /의사결정 로그/ });

    fireEvent.click(screen.getByRole('button', { name: /최종 승인/ }));

    expect(await screen.findByText('결재 또는 반려 사유를 입력해 주세요.')).toBeVisible();
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(reason).toHaveAttribute('aria-required', 'true');
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(/입력 오류/);
    await waitFor(() => expect(reason).toHaveFocus());
  });

  it('structured server field 오류를 inline으로 표시하고 입력한 사유와 모달을 보존한다', async () => {
    const message = '결재 사유에 사용할 수 없는 표현이 있습니다.';
    mocks.confirm.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'rjctRsnCn', message }] } },
    });
    render(<IsmClient initialData={{ list: [pendingSanction] }} />);
    fireEvent.click(screen.getByRole('button', { name: /승인 실행/ }));
    const reason = screen.getByRole('textbox', { name: /의사결정 로그/ });
    fireEvent.change(reason, { target: { value: '사용자가 입력한 결재 근거' } });

    fireEvent.click(screen.getByRole('button', { name: /최종 승인/ }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(reason).toHaveValue('사용자가 입력한 결재 근거');
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(reason).toHaveFocus());
    expect(screen.getByRole('region', { name: '결재 시퀀스 실행' })).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.any(String), 'error');
  });
});
