import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PolicyAdminClient from '../PolicyAdminClient';

const mocks = vi.hoisted(() => ({ getPolicies: vi.fn(), update: vi.fn(), toast: vi.fn() }));

vi.mock('next/dynamic', () => ({
  default: () => function TestEditor({ value, onChange, ...props }: {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
    'aria-required'?: boolean;
  }) {
    return <textarea {...props} value={value} onChange={(event) => onChange(event.target.value)} />;
  },
}));
vi.mock('@/services/foundation/system/PolicyAdminService', () => ({
  policyAdminService: {
    getPolicies: (...args: unknown[]) => mocks.getPolicies(...args),
    updatePolicy: (...args: unknown[]) => mocks.update(...args),
  },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) => (
    <main><h1>{title}</h1>{actions}{children}</main>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: {
    columns: Array<{ accessor: (item: Record<string, unknown>) => ReactNode }>;
    data: Array<Record<string, unknown>>;
  }) => <div>{data.map((item, row) => columns.map((column, index) => (
    <div key={`${row}-${index}`}>{column.accessor(item)}</div>
  )))}</div>,
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <>{children}</> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  DialogHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: ReactNode }) => <footer>{children}</footer>,
}));

const policy = {
  plcyTypeCd: 'PRIVACY',
  plcyTtl: '개인정보 처리방침',
  plcyCn: '<p>기존 정책 내용</p>',
};

describe('PolicyAdminClient validation behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPolicies.mockResolvedValue([policy]);
    mocks.update.mockResolvedValue(undefined);
  });

  it('invalid 수정 요청을 write하지 않고 summary와 첫 필드로 연결한다', async () => {
    render(<PolicyAdminClient />);
    fireEvent.click(await screen.findByRole('button', { name: '개인정보 처리방침 정책 수정' }));
    const title = screen.getByRole('textbox', { name: /^정책 제목/ });
    fireEvent.change(title, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: '변경 사항 반영하기' }));

    expect(await screen.findByText('정책 제목을 입력해 주세요.')).toBeVisible();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(title).toHaveAttribute('aria-required', 'true');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(/입력 오류/);
    await waitFor(() => expect(title).toHaveFocus());
  });

  it('structured server field 오류를 inline으로 표시하고 수정값과 모달을 보존한다', async () => {
    const message = '정책 제목이 현재 버전과 충돌합니다.';
    mocks.update.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'plcyTtl', message }] } },
    });
    render(<PolicyAdminClient />);
    fireEvent.click(await screen.findByRole('button', { name: '개인정보 처리방침 정책 수정' }));
    const title = screen.getByRole('textbox', { name: /^정책 제목/ });
    fireEvent.change(title, { target: { value: '사용자가 수정한 정책 제목' } });

    fireEvent.click(screen.getByRole('button', { name: '변경 사항 반영하기' }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(title).toHaveValue('사용자가 수정한 정책 제목');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.getByRole('button', { name: '변경 사항 반영하기' })).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.any(String), 'error');
  });
});
