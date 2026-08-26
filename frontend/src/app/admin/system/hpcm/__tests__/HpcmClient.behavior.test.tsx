import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HpcmClient from '../HpcmClient';

const mocks = vi.hoisted(() => ({ create: vi.fn(), refresh: vi.fn(), toast: vi.fn() }));

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
vi.mock('@/services/foundation/system/HpcmAdminService', () => ({
  hpcmAdminService: { createHpcm: (...args: unknown[]) => mocks.create(...args) },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) => (
    <main><h1>{title}</h1>{actions}{children}</main>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({ StandardDataTable: () => <div /> }));

function fillValidForm() {
  fireEvent.change(screen.getByRole('textbox', { name: /^분류 구분/ }), { target: { value: 'BBS' } });
  fireEvent.change(screen.getByRole('textbox', { name: /^도움말 명칭/ }), { target: { value: '입력한 도움말' } });
  fireEvent.change(screen.getByRole('textbox', { name: /^도움말 상세 설명/ }), { target: { value: '입력한 상세 설명' } });
}

describe('HpcmClient validation behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockResolvedValue(1);
  });

  it('invalid 등록을 write하지 않고 summary와 첫 필드로 연결한다', async () => {
    render(<HpcmClient initialData={{ list: [] }} />);
    fireEvent.click(screen.getByRole('button', { name: /콘텐츠 등록/ }));
    const first = screen.getByRole('textbox', { name: /^분류 구분/ });

    fireEvent.click(screen.getByRole('button', { name: /최종 등록/ }));

    expect(await screen.findByText('분류 구분을 입력해 주세요.')).toBeVisible();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(first).toHaveAttribute('aria-required', 'true');
    expect(first).toHaveAttribute('aria-invalid', 'true');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(/입력 오류/);
    await waitFor(() => expect(first).toHaveFocus());
  });

  it('structured server field 오류를 inline으로 표시하고 입력값과 모달을 보존한다', async () => {
    const message = '이미 등록된 도움말 명칭입니다.';
    mocks.create.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'hlpDfn', message }] } },
    });
    render(<HpcmClient initialData={{ list: [] }} />);
    fireEvent.click(screen.getByRole('button', { name: /콘텐츠 등록/ }));
    fillValidForm();
    const target = screen.getByRole('textbox', { name: /^도움말 명칭/ });

    fireEvent.click(screen.getByRole('button', { name: /최종 등록/ }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(target).toHaveValue('입력한 도움말');
    expect(target).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(target).toHaveFocus());
    expect(screen.getByRole('region', { name: '도움말 콘텐츠 등록' })).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.any(String), 'error');
  });
});
