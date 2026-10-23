import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardRegistClient } from '../BoardRegistClient';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  clearDraft: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  restoreDraft: vi.fn(),
  saveBoardArticle: vi.fn(),
  toast: vi.fn(),
  permissions: ['BOARD_CREATE', 'NOTICE_EDIT', 'FAQ_EDIT'],
  meta: { requiredEditPermissions: ['NOTICE_EDIT', 'FAQ_EDIT'] } as Record<string, unknown>,
}));

vi.mock('@/queries/board-master-query-options', () => ({ boardMasterQueryOptions: {
  meta: () => ({ queryKey: ['board-meta-test'], initialData: mocks.meta, queryFn: async () => mocks.meta }),
} }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push, replace: mocks.replace }),
}));

vi.mock('next/dynamic', () => ({
  default: () => function MockRichTextEditor({
    value,
    onChange,
    className,
    enableTables,
    media: _media,
    ...props
  }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & {
    value: string;
    onChange: (value: string) => void;
    enableTables?: boolean;
    media?: unknown;
  }) {
    return (
      <textarea
        {...props}
        data-tables-enabled={enableTables}
        className={`ProseMirror ${className ?? ''}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  },
}));

vi.mock('@/app/actions/boardActions', () => ({
  saveBoardArticle: (...args: unknown[]) => mocks.saveBoardArticle(...args),
}));

vi.mock('@/hooks/use-auto-save-draft', () => ({
  useAutoSaveDraft: () => ({
    clearDraft: mocks.clearDraft,
    hasDraft: false,
    restoreDraft: mocks.restoreDraft,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'writer', esntlId: 'writer-owner', authorizationVersion: 'test-v1', permissions: mocks.permissions } }),
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

// 첨부 삭제 확인 모달·파일 서비스·업로더는 attachment 계약(BoardRegistClient.attachment.test.tsx)의 관심사다.
vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => vi.fn().mockResolvedValue(true),
}));
vi.mock('@/services/foundation/file/FileService', () => ({
  fileService: { getFileList: vi.fn().mockResolvedValue([]), deleteFile: vi.fn() },
}));
vi.mock('@/app/components/ui/standard-file-uploader', () => ({
  StandardFileUploader: () => <input type="file" aria-label="파일 첨부 선택" />,
}));

function renderSubject(props: Partial<React.ComponentProps<typeof BoardRegistClient>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BoardRegistClient bbsId="BBSMSTR_AAAAAAAAAAAA" {...props} />
    </QueryClientProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe('BoardRegistClient validation contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['BOARD_CREATE', 'NOTICE_EDIT', 'FAQ_EDIT'];
    mocks.meta = { requiredEditPermissions: ['NOTICE_EDIT', 'FAQ_EDIT'] };
    mocks.saveBoardArticle.mockResolvedValue({ success: true, redirect: '/boards' });
  });

  it('공지·FAQ 편집 권한 중 하나라도 없으면 직접 작성 URL에서도 저장하지 않는다', async () => {
    mocks.permissions = ['BOARD_CREATE', 'NOTICE_EDIT'];
    renderSubject();
    expect(await screen.findByText('이 게시판을 편집할 권한이 없습니다. 필요한 권한은 관리자에게 문의해 주세요.')).toBeVisible();
    expect(screen.getByRole('textbox', { name: '게시글 제목' })).toBeDisabled();
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => expect(mocks.saveBoardArticle).not.toHaveBeenCalled());
  });

  it('FormLabel을 올바른 provider 안에서 렌더하고 필수·길이 계약을 노출한다', async () => {
    expect(() => renderSubject()).not.toThrow();

    const title = screen.getByRole('textbox', { name: '게시글 제목' });
    const editor = screen.getByRole('textbox', { name: /게시글 본문 내용/ });
    expect(title).toHaveAttribute('aria-required', 'true');
    expect(title).toHaveAttribute('maxlength', '256');
    await waitFor(() => expect(editor).toHaveAttribute('data-error-focus', 'pstCn'));
    expect(editor).toHaveAttribute('aria-required', 'true');
  });

  it('길이 오류는 write 없이 첫 field로 이동하고 입력값과 연결된 오류를 보존한다', async () => {
    const user = userEvent.setup();
    renderSubject();
    const title = screen.getByRole('textbox', { name: '게시글 제목' });
    const editor = screen.getByRole('textbox', { name: /게시글 본문 내용/ });
    const tooLongTitle = 'B'.repeat(257);
    fireEvent.change(title, { target: { value: tooLongTitle } });
    fireEvent.change(editor, { target: { value: '<p>본문</p>' } });
    editor.focus();

    await user.click(screen.getByRole('button', { name: '게시글 등록' }));

    await waitFor(() => expect(title).toHaveFocus());
    expect(mocks.saveBoardArticle).not.toHaveBeenCalled();
    expect(title).toHaveValue(tooLongTitle);
    expect(title).toHaveAttribute('aria-invalid', 'true');
    const messageId = title.getAttribute('aria-errormessage');
    expect(messageId).toBeTruthy();
    expect(document.getElementById(messageId!)).not.toBeEmptyDOMElement();
    expect(document.querySelector('[data-form-error-summary="true"]'))
      .toHaveTextContent('입력 오류 1개');
    expect(screen.getByRole('button', { name: /제목/ })).toBeVisible();
    await waitFor(() => expect(document.querySelector('[data-form-error-announcer="true"]'))
      .toBeEmptyDOMElement());
  });

  it.each([
    ['빈 문단', '<p><br></p>'],
    ['빈 표', '<table><tbody><tr><th><p></p></th><td><p><br></p></td></tr></tbody></table>'],
    ['공백만 있는 표', '<table><tbody><tr><td><p>&nbsp; \t</p></td></tr></tbody></table>'],
  ])('%s는 저장하지 않고 본문 입력과 오류 포커스를 보존한다', async (_label, content) => {
    const user = userEvent.setup();
    renderSubject();
    const title = screen.getByRole('textbox', { name: '게시글 제목' });
    const editor = screen.getByRole('textbox', { name: /게시글 본문 내용/ });
    fireEvent.change(title, { target: { value: '표가 있는 글' } });
    fireEvent.change(editor, { target: { value: content } });

    await user.click(screen.getByRole('button', { name: '게시글 등록' }));

    await waitFor(() => expect(editor).toHaveAttribute('aria-invalid', 'true'));
    await waitFor(() => expect(editor).toHaveFocus());
    expect(editor).toHaveValue(content);
    expect(title).toHaveValue('표가 있는 글');
    expect(mocks.saveBoardArticle).not.toHaveBeenCalled();
    expect(document.getElementById(editor.getAttribute('aria-errormessage')!))
      .toHaveTextContent('내용을 입력해 주세요.');
  });

  it('내용이 있는 표는 셀과 병합 속성을 포함한 HTML 그대로 저장한다', async () => {
    const content = '<table><tbody><tr><th colspan="2"><p>분기 실적</p></th></tr><tr><td><p>상반기</p></td><td><p>100</p></td></tr></tbody></table>';
    renderSubject();
    fireEvent.change(screen.getByRole('textbox', { name: '게시글 제목' }), {
      target: { value: '표가 있는 글' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /게시글 본문 내용/ }), {
      target: { value: content },
    });

    fireEvent.submit(screen.getByRole('button', { name: '게시글 등록' }).closest('form')!);

    await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1));
    const formData = mocks.saveBoardArticle.mock.calls[0][1] as FormData;
    expect(formData.get('pstCn')).toBe(content);
  });

  it('server field 오류를 먼저 귀속시키고 일반 toast 없이 입력을 유지한다', async () => {
    const user = userEvent.setup();
    mocks.saveBoardArticle.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'pstTtl', message: '이미 등록된 제목입니다.' }] } },
    });
    renderSubject();
    const title = screen.getByRole('textbox', { name: '게시글 제목' });
    const editor = screen.getByRole('textbox', { name: /게시글 본문 내용/ });
    await user.type(title, '유지할 제목');
    fireEvent.change(editor, { target: { value: '<p>유지할 본문</p>' } });

    await user.click(screen.getByRole('button', { name: '게시글 등록' }));

    expect(await screen.findByText('이미 등록된 제목입니다.')).toBeVisible();
    await waitFor(() => expect(title).toHaveFocus());
    expect(title).toHaveValue('유지할 제목');
    expect(mocks.toast).not.toHaveBeenCalledWith(
      '게시글을 저장하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.',
      'error',
    );
  });

  it('server action의 direct field 오류도 inline 오류로 연결한다', async () => {
    const user = userEvent.setup();
    mocks.saveBoardArticle.mockResolvedValueOnce({
      success: false,
      field: 'pstTtl',
      message: '제목을 다시 확인해 주세요.',
    });
    renderSubject();
    const title = screen.getByRole('textbox', { name: '게시글 제목' });
    const editor = screen.getByRole('textbox', { name: /게시글 본문 내용/ });
    await user.type(title, '유지할 제목');
    fireEvent.change(editor, { target: { value: '<p>유지할 본문</p>' } });

    await user.click(screen.getByRole('button', { name: '게시글 등록' }));

    expect(await screen.findByText('제목을 다시 확인해 주세요.')).toBeVisible();
    expect(title).toHaveValue('유지할 제목');
    expect(mocks.toast).not.toHaveBeenCalledWith(
      '게시글을 저장하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.',
      'error',
    );
  });

  it('저장 중에는 submit을 잠가 중복 write를 막는다', async () => {
    const user = userEvent.setup();
    const pending = deferred<{ success: boolean; redirect: string }>();
    mocks.saveBoardArticle.mockReturnValueOnce(pending.promise);
    renderSubject();
    await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), '제목');
    fireEvent.change(screen.getByRole('textbox', { name: /게시글 본문 내용/ }), {
      target: { value: '<p>본문</p>' },
    });
    const submit = screen.getByRole('button', { name: '게시글 등록' });
    const form = submit.closest('form');
    expect(form).not.toBeNull();

    act(() => {
      fireEvent.submit(form!);
      fireEvent.submit(form!);
    });
    await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();

    await act(async () => pending.resolve({ success: true, redirect: '/boards' }));
  });

  it('저장 뒤에는 작성 화면을 방문 기록에서 바꿔 끼워, 뒤로 가기가 목록으로 돌아간다 (DIP C8)', async () => {
    const user = userEvent.setup();
    mocks.saveBoardArticle.mockResolvedValueOnce({ success: true, redirect: '/admin/community/boards/detail?bbsId=B&pstSn=1' });
    renderSubject();
    await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), '제목');
    fireEvent.change(screen.getByRole('textbox', { name: /게시글 본문 내용/ }), { target: { value: '<p>본문</p>' } });

    fireEvent.submit(screen.getByRole('button', { name: '게시글 등록' }).closest('form')!);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/admin/community/boards/detail?bbsId=B&pstSn=1'));
    expect(mocks.push).not.toHaveBeenCalled();
  });
  // [2026-10-23 ADR-0040 D12] 게시 기간은 저장 포맷(yyyyMMdd)으로 보낸다 — 생성 Zod(@Pattern Ymd)와 서버가 같은 형식을 받는다.
  it('게시 기간을 8자리 저장 포맷으로 보낸다', async () => {
    renderSubject();
    fireEvent.change(screen.getByRole('textbox', { name: '게시글 제목' }), { target: { value: '예약 공지' } });
    fireEvent.change(screen.getByRole('textbox', { name: /게시글 본문 내용/ }), { target: { value: '<p>본문</p>' } });
    fireEvent.change(screen.getByLabelText('게시 시작일'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('게시 종료일'), { target: { value: '2026-11-30' } });
    expect(screen.getByLabelText('게시 시작일')).toHaveValue('2026-11-01');

    fireEvent.submit(screen.getByRole('button', { name: '게시글 등록' }).closest('form')!);

    await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1));
    const formData = mocks.saveBoardArticle.mock.calls[0][1] as FormData;
    expect(formData.get('pstBgngYmd')).toBe('20261101');
    expect(formData.get('pstEndYmd')).toBe('20261130');
    expect(formData.get('version')).toBeNull();
  });

  it('종료일이 시작일보다 앞이면 보내지 않고 종료일 칸에 알린다', async () => {
    renderSubject();
    fireEvent.change(screen.getByRole('textbox', { name: '게시글 제목' }), { target: { value: '예약 공지' } });
    fireEvent.change(screen.getByRole('textbox', { name: /게시글 본문 내용/ }), { target: { value: '<p>본문</p>' } });
    fireEvent.change(screen.getByLabelText('게시 시작일'), { target: { value: '2026-11-30' } });
    fireEvent.change(screen.getByLabelText('게시 종료일'), { target: { value: '2026-11-01' } });

    fireEvent.submit(screen.getByRole('button', { name: '게시글 등록' }).closest('form')!);

    expect((await screen.findAllByText('종료일은 시작일과 같거나 뒤여야 합니다.')).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('게시 종료일')).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.saveBoardArticle).not.toHaveBeenCalled();
  });

  // [2026-10-23 ADR-0040 결정 3] 시작일은 이제 집행한다 — 화면은 오늘을 계산하지 않고 집행 규칙과 이 게시판의 예약 설정을 말한다.
  it('시작일 집행과 예약을 받지 않는 게시판을 사실대로 말한다', async () => {
    mocks.meta = { requiredEditPermissions: ['NOTICE_EDIT', 'FAQ_EDIT'], rsvtPstgPsbltyYn: 'N' };
    const { unmount } = renderSubject();
    expect(screen.getByText(/시작일이 오늘보다 뒤면 그날까지 작성자와 게시판 관리자에게만 보입니다/)).toBeInTheDocument();
    expect(screen.queryByText(/시작일은 기록만 하며/)).toBeNull();
    expect(screen.getByRole('note')).toHaveTextContent('이 게시판은 예약 게시를 받지 않아 시작일을 오늘보다 뒤로 정할 수 없습니다.');
    unmount();

    mocks.meta = { requiredEditPermissions: ['NOTICE_EDIT', 'FAQ_EDIT'], rsvtPstgPsbltyYn: 'Y' };
    renderSubject();
    expect(screen.queryByText(/예약 게시를 받지 않아/)).toBeNull();
  });

  it.each([
    ['게시 중인 글을 전체 수정 권한 없이 고치면 시작일을 잠근다', 'POSTING', ['BOARD_UPDATE', 'NOTICE_EDIT', 'FAQ_EDIT'], true],
    ['예약 글은 작성자도 시작일을 바꾼다', 'SCHEDULED', ['BOARD_UPDATE', 'NOTICE_EDIT', 'FAQ_EDIT'], false],
    ['전체 수정 권한이 있으면 게시 중인 글의 시작일도 바꾼다', 'POSTING', ['BOARD_UPDATE', 'BOARD_UPDATE_ALL', 'NOTICE_EDIT', 'FAQ_EDIT'], false],
  ])('%s — 수정은 읽은 버전을 함께 보낸다', async (_label, postingStatus, permissions, locked) => {
    mocks.permissions = permissions;
    renderSubject({
      pstSn: 31,
      initialData: {
        pstSn: 31, pstTtl: '기존 글', pstCn: '<p>본문</p>', userId: 'writer-owner',
        pstBgngYmd: '2026-10-01', pstEndYmd: '20261231', version: 5, postingStatus: postingStatus as never,
      },
    });
    const start = screen.getByLabelText('게시 시작일');
    // 옛 하이픈 저장값도 날짜 입력에는 같은 날로 보인다.
    expect(start).toHaveValue('2026-10-01');
    if (locked) {
      expect(start).toHaveAttribute('readonly');
      expect(screen.getByText('게시가 시작된 글의 시작일은 게시글 전체 수정 권한이 있어야 바꿀 수 있습니다.')).toBeInTheDocument();
    } else {
      expect(start).not.toHaveAttribute('readonly');
    }

    fireEvent.submit(screen.getByRole('button', { name: '게시글 수정' }).closest('form')!);
    await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1));
    const formData = mocks.saveBoardArticle.mock.calls[0][1] as FormData;
    expect(formData.get('version')).toBe('5');
    expect(formData.get('pstBgngYmd')).toBe('20261001');
  });
});
