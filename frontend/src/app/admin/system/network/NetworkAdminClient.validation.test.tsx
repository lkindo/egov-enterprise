import React, { type ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  saveNetwork: vi.fn(),
  toast: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock('next/dynamic', () => ({
  default: () => function TestModal({ isOpen, title, children }: {
    isOpen: boolean;
    title: string;
    children: ReactNode;
  }) {
    return isOpen ? <section aria-label={title}>{children}</section> : null;
  },
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled: _disabled, type = 'button', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={type} {...props}>{children}</button>
  ),
}));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, children, filter }: { actions?: ReactNode; children: ReactNode; filter?: ReactNode }) => (
    <main>{actions}{filter}{children}</main>
  ),
}));
vi.mock('@/app/components/patterns/keyword-filter', () => ({
  KeywordFilter: ({ label }: { label: string }) => <input aria-label={label} />,
}));
vi.mock('@/app/components/patterns/empty-result-message', () => ({
  emptyResultMessage: (_keyword: string, fallback: string) => fallback,
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({ StandardDataTable: () => <div /> }));
vi.mock('@/components/ui/hub/HubStatusBadge', () => ({ HubStatusBadge: () => <span /> }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/app/actions/networkActions', () => ({
  saveNetworkAction: (...args: unknown[]) => mocks.saveNetwork(...args),
  deleteNetworkAction: vi.fn(),
}));

import NetworkAdminClient from './NetworkAdminClient';

function fill(name: RegExp, value: string) {
  fireEvent.change(screen.getByRole('textbox', { name }), { target: { value } });
}

describe('NetworkAdminClient server validation ownership', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Server Action fieldErrors를 실제 NetworkForm에 되돌리고 값과 모달을 보존한다', async () => {
    const message = '이미 등록된 IP 주소입니다.';
    mocks.saveNetwork.mockResolvedValueOnce({
      success: false,
      message: '입력값을 확인해 주세요.',
      fieldErrors: { ntwrkIp: message },
    });
    render(<NetworkAdminClient initialNetworks={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 노드 등록/ }));
    fill(/관리항목/, '내부망');
    fill(/사용자명/, '관리자');
    fill(/IP 주소/, '192.168.0.1');
    fill(/서브넷 마스크/, '255.255.255.0');
    fill(/게이트웨이/, '192.168.0.254');

    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    expect(await screen.findByText(message)).toBeVisible();
    const target = screen.getByRole('textbox', { name: /IP 주소/ });
    await waitFor(() => expect(target).toHaveFocus());
    expect(target).toHaveValue('192.168.0.1');
    expect(screen.getByRole('region', { name: '신규 네트워크 노드 프로비저닝' })).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalledWith('입력값을 확인해 주세요.', 'error');
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
