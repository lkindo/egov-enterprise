import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PolicyAdminClient from '../PolicyAdminClient';

const mocks = vi.hoisted(() => ({ getPolicies: vi.fn(), create: vi.fn(), update: vi.fn(), toast: vi.fn(), permissions: ['POLICY_READ', 'POLICY_UPDATE'] }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { authorizationVersion: 'test-v1', permissions: mocks.permissions } }) }));

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
    createPolicy: (...args: unknown[]) => mocks.create(...args),
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
    mocks.permissions = ['POLICY_READ', 'POLICY_UPDATE'];
    mocks.create.mockResolvedValue(undefined);
    mocks.update.mockResolvedValue(undefined);
  });

  it('빈 목록에서 유형 코드·제목·내용으로 첫 정책을 등록하고 다시 조회한다', async () => {
    mocks.getPolicies.mockResolvedValueOnce([]).mockResolvedValueOnce([policy]);
    render(<PolicyAdminClient />);
    await waitFor(() => expect(mocks.getPolicies).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '새 정책 등록' }));
    fireEvent.change(screen.getByRole('textbox', { name: /^정책 유형 코드/ }), { target: { value: 'PRIVACY' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^정책 제목/ }), { target: { value: policy.plcyTtl } });
    fireEvent.change(screen.getByRole('textbox', { name: /^정책 내용/ }), { target: { value: policy.plcyCn } });
    fireEvent.click(screen.getByRole('button', { name: '정책 등록하기' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith('PRIVACY', {
      plcyTtl: policy.plcyTtl, plcyCn: policy.plcyCn,
    }));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: '개인정보 처리방침 정책 수정' })).toBeVisible();
  });

  it('새 유형의 형식 오류를 막고 중복 응답 뒤 입력을 보존한다', async () => {
    mocks.getPolicies.mockResolvedValue([]);
    mocks.create.mockRejectedValueOnce(new Error('duplicate'));
    render(<PolicyAdminClient />);
    fireEvent.click(await screen.findByRole('button', { name: '새 정책 등록' }));
    const code = screen.getByRole('textbox', { name: /^정책 유형 코드/ });
    fireEvent.change(code, { target: { value: 'privacy' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^정책 제목/ }), { target: { value: '새 정책' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^정책 내용/ }), { target: { value: '본문' } });
    fireEvent.click(screen.getByRole('button', { name: '정책 등록하기' }));
    expect(await screen.findByText('정책 유형 코드는 영대문자·숫자·밑줄만 사용할 수 있습니다.')).toBeVisible();
    expect(mocks.create).not.toHaveBeenCalled();
    fireEvent.change(code, { target: { value: 'PRIVACY' } });
    fireEvent.click(screen.getByRole('button', { name: '정책 등록하기' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(code).toHaveValue('PRIVACY');
    expect(screen.getByRole('textbox', { name: /^정책 제목/ })).toHaveValue('새 정책');
    expect(screen.getByRole('button', { name: '정책 등록하기' })).toBeEnabled();
  });

  it('정책 읽기 권한만 있으면 생성·수정 동작을 표시하지 않는다', async () => {
    mocks.permissions = ['POLICY_READ'];
    render(<PolicyAdminClient />);
    expect(await screen.findByText('PRIVACY')).toBeVisible();
    expect(screen.queryByRole('button', { name: '새 정책 등록' })).toBeNull();
    expect(screen.queryByRole('button', { name: '개인정보 처리방침 정책 수정' })).toBeNull();
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
