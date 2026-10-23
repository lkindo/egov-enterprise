import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardRegistClient } from '../BoardRegistClient';

/**
 * [2026-10-23 ADR-0040 결정 7] 작성 화면은 게시판의 비밀글 정책(prvtPstPlcyCd)을 그대로 말한다.
 *  · 선택(OPTIONAL): '비밀글로 쓰기' 를 두고 그 값을 보낸다.
 *  · 필수(REQUIRED): 선택을 두지 않는다 — 서버가 늘 비밀글로 저장하므로 그 사실을 말하고, 공개된 글을 고치면 비밀글로 바뀐다고 알린다.
 *  · 없음(NONE): 아무것도 두지 않고 저장값을 그대로 보낸다 — 도움말 1:1 문의의 비밀글이 공개로 바뀌지 않는다(H3).
 * 서버 판정은 BoardPolicySupport.resolveSecretYn 이고, honest-affordance-contract 가 필수 안내와 서버 강제를 짝으로 묶는다.
 */
const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  clearDraft: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  restoreDraft: vi.fn(),
  saveBoardArticle: vi.fn(),
  toast: vi.fn(),
  permissions: ['BOARD_CREATE', 'BOARD_UPDATE'],
  meta: { requiredEditPermissions: [] } as Record<string, unknown>,
}));

vi.mock('@/queries/board-master-query-options', () => ({ boardMasterQueryOptions: {
  meta: () => ({ queryKey: ['board-meta-secret-test'], initialData: mocks.meta, queryFn: async () => mocks.meta }),
} }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push, replace: mocks.replace }),
}));

vi.mock('next/dynamic', () => ({
  default: () => function MockRichTextEditor({
    value,
    onChange,
    className,
    enableTables: _enableTables,
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
      <BoardRegistClient bbsId="BBSMSTR_SECRET_TEST" {...props} />
    </QueryClientProvider>,
  );
}

/** 수정 화면 — 작성자 본인의 글이다. */
const editing = (scrtYn: 'Y' | 'N') => ({
  pstSn: 41,
  initialData: { pstSn: 41, pstTtl: '기존 문의', pstCn: '<p>본문</p>', userId: 'writer-owner', scrtYn, version: 2, postingStatus: 'POSTING' as const },
});

async function submittedSecretYn(buttonName: '게시글 등록' | '게시글 수정'): Promise<FormDataEntryValue | null> {
  fireEvent.submit(screen.getByRole('button', { name: buttonName }).closest('form')!);
  await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1));
  return (mocks.saveBoardArticle.mock.calls[0][1] as FormData).get('scrtYn');
}

function fillNewPost() {
  fireEvent.change(screen.getByRole('textbox', { name: '게시글 제목' }), { target: { value: '새 문의' } });
  fireEvent.change(screen.getByRole('textbox', { name: /게시글 본문 내용/ }), { target: { value: '<p>본문</p>' } });
}

describe('BoardRegistClient 비밀글 정책', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['BOARD_CREATE', 'BOARD_UPDATE'];
    mocks.meta = { requiredEditPermissions: [] };
    mocks.saveBoardArticle.mockResolvedValue({ success: true, redirect: '/boards' });
  });

  it('선택(OPTIONAL)이면 비밀글로 쓰기를 두고, 고른 값을 보낸다', async () => {
    mocks.meta = { requiredEditPermissions: [], prvtPstPlcyCd: 'OPTIONAL' };
    renderSubject();
    const secret = screen.getByRole('checkbox', { name: '비밀글로 쓰기' });
    expect(secret).not.toBeChecked();
    expect(secret).toHaveAccessibleDescription('작성자와 게시판 관리자만 봅니다.');
    expect(screen.queryByText(/비밀글로 저장됩니다/)).toBeNull();

    fillNewPost();
    fireEvent.click(secret);
    expect(secret).toBeChecked();

    expect(await submittedSecretYn('게시글 등록')).toBe('Y');
  });

  it('선택(OPTIONAL)이면 비밀글을 고칠 때 체크된 채로 열리고, 풀면 공개로 보낸다', async () => {
    mocks.meta = { requiredEditPermissions: [], prvtPstPlcyCd: 'OPTIONAL' };
    renderSubject(editing('Y'));
    const secret = screen.getByRole('checkbox', { name: '비밀글로 쓰기' });
    expect(secret).toBeChecked();

    fireEvent.click(secret);

    expect(await submittedSecretYn('게시글 수정')).toBe('N');
  });

  it('필수(REQUIRED)이면 선택 없이 비밀글로 저장된다고 말한다 — 새 글에는 바뀐다는 안내가 없다', () => {
    mocks.meta = { requiredEditPermissions: [], prvtPstPlcyCd: 'REQUIRED' };
    renderSubject();
    expect(screen.queryByRole('checkbox', { name: /비밀글/ })).toBeNull();
    expect(screen.getByRole('note')).toHaveTextContent('이 게시판의 글은 비밀글로 저장됩니다.');
    expect(screen.queryByText(/저장하면 비밀글로 바뀝니다/)).toBeNull();
  });

  it.each([
    ['공개된 글을 고치면 저장하면 비밀글로 바뀐다고 알린다', 'N', true],
    ['이미 비밀글이면 바뀐다고 말하지 않는다', 'Y', false],
  ] as const)('필수(REQUIRED) — %s', (_label, scrtYn, warns) => {
    mocks.meta = { requiredEditPermissions: [], prvtPstPlcyCd: 'REQUIRED' };
    renderSubject(editing(scrtYn));
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('이 게시판의 글은 비밀글로 저장됩니다.');
    if (warns) expect(note).toHaveTextContent('저장하면 비밀글로 바뀝니다.');
    else expect(note).not.toHaveTextContent('저장하면 비밀글로 바뀝니다.');
  });

  it('없음(NONE)이면 선택도 안내도 없고, 비밀글(1:1 문의)을 고쳐도 비밀글 그대로 보낸다', async () => {
    mocks.meta = { requiredEditPermissions: [], prvtPstPlcyCd: 'NONE' };
    renderSubject(editing('Y'));
    expect(screen.queryByRole('checkbox', { name: /비밀글/ })).toBeNull();
    expect(screen.queryByText(/비밀글로 저장됩니다/)).toBeNull();

    expect(await submittedSecretYn('게시글 수정')).toBe('Y');
  });

  it('메타를 모르면 없음과 같다 — 선택을 지어내지 않는다', () => {
    mocks.meta = { requiredEditPermissions: [] };
    renderSubject();
    expect(screen.queryByRole('checkbox', { name: /비밀글/ })).toBeNull();
    expect(screen.queryByText(/비밀글로 저장됩니다/)).toBeNull();
  });
});
