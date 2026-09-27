import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardRegistClient } from '../BoardRegistClient';

/**
 * 📝 편집 모드의 임시 저장 복구 제안(2026-09-27 DIP B5 F9).
 *
 * 종전에는 새 글에서만 복구를 물어, 글을 고치다 다른 화면에 다녀오면 고친 내용을 되살릴 길이 없었다. 수정 화면은 저장된
 * 글로 채워져 있으므로 초안이 그 글과 다를 때만 묻는다. (준비물은 첨부 배선 계약과 같다.)
 *
 * 🔗 정본 작성 화면의 첨부 배선 — **붙인 파일이 실제로 실리고, 기존 첨부를 실제로 지우는가.**
 *
 * [2026-09-05 DEC-OPS-034] 작성 화면 3종을 이 화면 하나로 수렴하면서, 삭제된 `[id]` 화면이 갖고 있던
 * "첨부가 조용히 증발한다" 회귀 계약(2026-08-11)을 여기로 옮겼다. 종전 이 화면은 서버 액션이 `files`
 * 키를 읽는데도 파일 입력이 없어 한 번도 첨부가 실린 적이 없었고, 첨부 삭제는 백엔드 엔드포인트조차
 * 없었다(D06-02).
 *
 * 판정은 서비스 호출 인자·FormData 내용으로 결정적으로 한다. 업로더는 계약대로 스텁한다(파일이
 * 선택되면 onFilesChange(File[]) 를 부른다) — 업로더 자체의 동작은 standard-file-uploader 의 몫이다.
 */
const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  clearDraft: vi.fn(),
  confirm: vi.fn(),
  deleteFile: vi.fn(),
  getFileList: vi.fn(),
  push: vi.fn(),
  restoreDraft: vi.fn(),
  saveBoardArticle: vi.fn(),
  toast: vi.fn(),
  draft: { hasDraft: false, data: null as null | { title: string; content: string } },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push, replace: mocks.push }),
}));

vi.mock('next/dynamic', () => ({
  default: () => function MockRichTextEditor({
    value,
    onChange,
    className,
    ...props
  }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> & {
    value: string;
    onChange: (value: string) => void;
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
    hasDraft: mocks.draft.hasDraft,
    restoreDraft: mocks.restoreDraft,
    peekDraft: () => mocks.draft.data,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'writer', esntlId: 'writer-owner' } }),
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => mocks.confirm,
}));

vi.mock('@/services/foundation/file/FileService', () => ({
  fileService: {
    getFileList: (...args: unknown[]) => mocks.getFileList(...args),
    deleteFile: (...args: unknown[]) => mocks.deleteFile(...args),
  },
}));

vi.mock('@/app/components/ui/standard-file-uploader', () => ({
  StandardFileUploader: ({ onFilesChange }: { onFilesChange?: (files: File[]) => void }) => (
    <input
      type="file"
      aria-label="파일 첨부 선택"
      multiple
      onChange={(event) => onFilesChange?.(Array.from(event.target.files ?? []))}
    />
  ),
}));

const BBS_ID = 'BBSMSTR_AAAAAAAAAAAA';

function renderSubject(props: { pstSn?: number; initialData?: { pstSn?: number; pstTtl?: string; pstCn?: string; atchFileSn?: number } | null } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BoardRegistClient bbsId={BBS_ID} pstSn={props.pstSn} initialData={props.initialData ?? null} />
    </QueryClientProvider>,
  );
}



describe('BoardRegistClient draft restore (DIP B5 F9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.getFileList.mockResolvedValue([]);
    mocks.draft = { hasDraft: false, data: null };
  });

  const saved = { pstSn: 7, pstTtl: '저장된 제목', pstCn: '<p>저장된 본문</p>' };

  it('수정 화면에서 초안이 저장된 글과 다르면 초안으로 바꿀지 묻고, 바꾸면 복원한다', async () => {
    mocks.draft = { hasDraft: true, data: { title: '고치던 제목', content: '<p>저장된 본문</p>' } };
    renderSubject({ pstSn: 7, initialData: saved });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.confirm.mock.calls[0][0]).toMatchObject({ title: '수정하던 초안 복구', confirmText: '초안으로 바꾸기' });
    await waitFor(() => expect(mocks.restoreDraft).toHaveBeenCalledTimes(1));
  });

  it('수정 화면에서 초안이 저장된 글과 같으면 묻지 않는다', async () => {
    mocks.draft = { hasDraft: true, data: { title: '저장된 제목', content: '<p>저장된 본문</p>' } };
    renderSubject({ pstSn: 7, initialData: saved });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('거절하면 저장된 글을 그대로 둔다', async () => {
    mocks.confirm.mockResolvedValue(false);
    mocks.draft = { hasDraft: true, data: { title: '고치던 제목', content: '<p>고치던 본문</p>' } };
    renderSubject({ pstSn: 7, initialData: saved });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.restoreDraft).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: '게시글 제목' })).toHaveValue('저장된 제목');
  });

  it('새 글은 종전처럼 빈 폼에서 복구를 묻는다', async () => {
    mocks.draft = { hasDraft: true, data: { title: '쓰던 제목', content: '<p>쓰던 본문</p>' } };
    renderSubject();

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.confirm.mock.calls[0][0]).toMatchObject({ title: '임시저장 데이터 복구' });
  });
});
