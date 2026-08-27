import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommunityBoardsWriteClient from '../CommunityBoardsWriteClient';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  createBoardArticle: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push }),
}));

vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: {
    createBoardArticle: (...args: unknown[]) => mocks.createBoardArticle(...args),
  },
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title, actions }: { title: string; actions?: ReactNode }) => (
    <header><h1>{title}</h1>{actions}</header>
  ),
}));

function renderSubject() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CommunityBoardsWriteClient />
    </QueryClientProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe('CommunityBoardsWriteClient validation contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createBoardArticle.mockResolvedValue(undefined);
  });

  it('필수 field와 generated length 한계를 label/control에 노출한다', () => {
    renderSubject();

    expect(screen.getByRole('textbox', { name: /게시판 식별자/ }))
      .toHaveAttribute('maxlength', '20');
    expect(screen.getByRole('textbox', { name: /게시판 식별자/ }))
      .toHaveAttribute('aria-required', 'true');
    expect(screen.getByRole('textbox', { name: /게시물 제목/ }))
      .toHaveAttribute('maxlength', '100');
    expect(screen.getByRole('textbox', { name: /게시물 본문/ }))
      .toHaveAttribute('maxlength', '4000');
    expect(screen.getByRole('textbox', { name: /게시물 본문/ }))
      .toHaveAttribute('aria-required', 'true');
  });

  it('필수 오류는 write 없이 DOM 첫 field로 이동하고 입력값을 유지한다', async () => {
    const user = userEvent.setup();
    renderSubject();
    const boardId = screen.getByRole('textbox', { name: /게시판 식별자/ });
    const title = screen.getByRole('textbox', { name: /게시물 제목/ });
    await user.type(title, '유지할 제목');
    title.focus();

    await user.click(screen.getByRole('button', { name: /게시물 등록/ }));

    await waitFor(() => expect(boardId).toHaveFocus());
    expect(mocks.createBoardArticle).not.toHaveBeenCalled();
    expect(title).toHaveValue('유지할 제목');
    expect(boardId).toHaveAttribute('aria-invalid', 'true');
    expect(document.querySelector('[data-form-error-summary="true"]'))
      .toHaveTextContent(/입력 오류/);
    expect(screen.getByRole('button', { name: /게시판 식별자.*입력/ })).toBeVisible();
  });

  it('server field 오류는 generic toast보다 먼저 field에 연결하고 값을 유지한다', async () => {
    const user = userEvent.setup();
    mocks.createBoardArticle.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'pstTtl', message: '이미 등록된 제목입니다.' }] } },
    });
    renderSubject();
    const boardId = screen.getByRole('textbox', { name: /게시판 식별자/ });
    const title = screen.getByRole('textbox', { name: /게시물 제목/ });
    const content = screen.getByRole('textbox', { name: /게시물 본문/ });
    await user.type(boardId, 'BBS_000000000000001');
    await user.type(title, '유지할 제목');
    fireEvent.change(content, { target: { value: '유지할 본문' } });
    content.focus();

    await user.click(screen.getByRole('button', { name: /게시물 등록/ }));

    expect(await screen.findByText('이미 등록된 제목입니다.')).toBeVisible();
    await waitFor(() => expect(title).toHaveFocus());
    expect(title).toHaveValue('유지할 제목');
    expect(mocks.toast).not.toHaveBeenCalledWith(
      '게시물을 등록하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.',
      'error',
    );
  });

  it('등록 중에는 submit을 잠가 중복 write를 막는다', async () => {
    const user = userEvent.setup();
    const pending = deferred<void>();
    mocks.createBoardArticle.mockReturnValueOnce(pending.promise);
    renderSubject();
    await user.type(screen.getByRole('textbox', { name: /게시판 식별자/ }), 'BBS_000000000000001');
    await user.type(screen.getByRole('textbox', { name: /게시물 제목/ }), '제목');
    fireEvent.change(screen.getByRole('textbox', { name: /게시물 본문/ }), {
      target: { value: '본문' },
    });
    const submit = screen.getByRole('button', { name: /게시물 등록/ });
    const form = submit.closest('form');
    expect(form).not.toBeNull();

    act(() => {
      fireEvent.submit(form!);
      fireEvent.submit(form!);
    });
    await waitFor(() => expect(mocks.createBoardArticle).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();

    await act(async () => pending.resolve());
  });

  it('전송 payload 가 서버 계약(BoardSaveRequest) 밖의 필드를 싣지 않는다', async () => {
    // 종전에는 defaultValues 가 noticeAt:'N'·secretAt:'N' 을 매 요청에 실었고 날짜 필드 이름도
    // ntceBgnde/ntceEndde 였다. BoardSaveRequest 에 없는 이름이라 서버가 400 으로 거부했고,
    // 스위치를 만지지 않아도 등록이 **항상** 실패했다(fail-on-unknown-properties: true).
    // 이 계약은 "화면이 계약 밖 이름을 만들어 보내지 않는다" 를 고정한다.
    const user = userEvent.setup();
    renderSubject();
    await user.type(screen.getByRole('textbox', { name: /게시판 식별자/ }), 'BBS_000000000000001');
    await user.type(screen.getByRole('textbox', { name: /게시물 제목/ }), '제목');
    fireEvent.change(screen.getByRole('textbox', { name: /게시물 본문/ }), {
      target: { value: '본문' },
    });

    await user.click(screen.getByRole('button', { name: /게시물 등록/ }));

    await waitFor(() => expect(mocks.createBoardArticle).toHaveBeenCalledTimes(1));
    const sent = mocks.createBoardArticle.mock.calls[0][0] as Record<string, unknown>;

    for (const outside of ['noticeAt', 'secretAt', 'ntceBgnde', 'ntceEndde']) {
      expect(sent, `${outside} 은 BoardSaveRequest 에 없는 이름이다`).not.toHaveProperty(outside);
    }
    // 계약에 있는 이름으로는 실려야 한다 — 축소가 아니라 이름 정합이 목적이다.
    expect(sent).toMatchObject({ scrtYn: 'N' });
  });
});
