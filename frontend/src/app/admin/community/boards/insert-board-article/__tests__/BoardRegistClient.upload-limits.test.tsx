import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardRegistClient } from '../BoardRegistClient';

/**
 * 📎 작성 화면의 업로더가 게시판 첨부 설정을 그대로 보이는가(2026-09-27 DIP B5 F9).
 *
 * 서버(BoardService.assertNewFilesAllowed)는 게시판의 허용 여부·파일 수·파일당 크기로 저장 전에 거부한다. 화면이 더 많이
 * 받아 두면 사용자는 저장할 때에야 실패를 안다. 업로더 스텁은 받은 제한을 data 속성으로 드러낸다.
 *
 * (아래 설명은 첨부 배선 계약에서 가져온 공용 준비물이다.)
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
  getBoardMeta: vi.fn(),
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
    hasDraft: false,
    restoreDraft: mocks.restoreDraft,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'writer', esntlId: 'writer-owner', authorizationVersion: 'test-v1', permissions: ['BOARD_CREATE', 'BOARD_UPDATE'] } }),
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
  StandardFileUploader: ({ onFilesChange, maxFiles, maxSizeMB, accept }: {
    onFilesChange?: (files: File[]) => void; maxFiles?: number; maxSizeMB?: number; accept?: string;
  }) => (
    <input
      type="file"
      aria-label="파일 첨부 선택"
      multiple
      data-max-files={maxFiles}
      data-max-size-mb={maxSizeMB}
      data-accept={accept}
      onChange={(event) => onFilesChange?.(Array.from(event.target.files ?? []))}
    />
  ),
}));

vi.mock('@/services/business/user/board/BoardUserService', () => ({
  boardUserService: { getBoardMeta: async (...args: unknown[]) => ({ ...await mocks.getBoardMeta(...args), requiredEditPermissions: [] }) },
}));

const BBS_ID = 'BBSMSTR_AAAAAAAAAAAA';

function renderSubject(props: { pstSn?: number; initialData?: { pstSn?: number; pstTtl?: string; pstCn?: string; atchFileSn?: number } | null } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BoardRegistClient bbsId={BBS_ID} pstSn={props.pstSn} initialData={props.initialData ? { ...props.initialData, userId: 'writer-owner' } : null} />
    </QueryClientProvider>,
  );
}

function fillRequiredFields() {
  fireEvent.change(screen.getByRole('textbox', { name: '게시글 제목' }), { target: { value: '첨부 검증용 게시글' } });
  fireEvent.change(screen.getByRole('textbox', { name: /게시글 본문 내용/ }), { target: { value: '<p>첨부 검증용 본문</p>' } });
}

function submittedFormData(): FormData {
  expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1);
  const formData = mocks.saveBoardArticle.mock.calls[0][1];
  expect(formData).toBeInstanceOf(FormData);
  return formData as FormData;
}

describe('BoardRegistClient upload limits (DIP B5 F9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveBoardArticle.mockResolvedValue({ success: true, redirect: '/boards' });
    mocks.confirm.mockResolvedValue(true);
    mocks.getFileList.mockResolvedValue([]);
  });

  it('게시판 파일 수에서 이미 붙은 파일을 빼고, 파일당 크기와 서버 형식을 업로더에 넘긴다', async () => {
    mocks.getBoardMeta.mockResolvedValue({ bbsId: BBS_ID, fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, atchPsbltyFileSz: 5 * 1024 * 1024 });
    mocks.getFileList.mockResolvedValue([{ atchFileSn: 9, fileSn: 1, orignlFileNm: 'old.pdf' }]);
    renderSubject({ pstSn: 1, initialData: { pstSn: 1, pstTtl: '제목', pstCn: '<p>본문</p>', atchFileSn: 9 } });

    await waitFor(() => expect(screen.getByLabelText('파일 첨부 선택').getAttribute('data-max-files')).toBe('2'));
    const uploader = screen.getByLabelText('파일 첨부 선택');
    expect(uploader.getAttribute('data-max-size-mb')).toBe('5');
    expect(uploader.getAttribute('data-accept')).toContain('.hwp');
    expect(screen.getByText(/파일을 3개까지\(기존 첨부 포함\)/)).toBeInTheDocument();
  });

  it('첨부를 받지 않는 게시판은 업로더 대신 사유를 보이고, 앞서 고른 파일도 보내지 않는다', async () => {
    mocks.getBoardMeta.mockResolvedValue({ bbsId: BBS_ID, fileAtchPsbltyYn: 'N', atchPsbltyFileQty: 3 });
    renderSubject();

    expect(await screen.findByText('이 게시판은 파일 첨부를 받지 않습니다.')).toBeInTheDocument();
    expect(screen.queryByLabelText('파일 첨부 선택')).not.toBeInTheDocument();
    fillRequiredFields();
    await userEvent.setup().click(screen.getByRole('button', { name: '게시글 등록' }));
    await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1));
    expect(submittedFormData().getAll('files')).toHaveLength(0);
  });

  it('게시판 파일 수를 모두 채웠으면 업로더 대신 기존 첨부를 먼저 지우라고 말한다', async () => {
    mocks.getBoardMeta.mockResolvedValue({ bbsId: BBS_ID, fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 1 });
    mocks.getFileList.mockResolvedValue([{ atchFileSn: 9, fileSn: 1, orignlFileNm: 'old.pdf' }]);
    renderSubject({ pstSn: 1, initialData: { pstSn: 1, pstTtl: '제목', pstCn: '<p>본문</p>', atchFileSn: 9 } });

    expect(await screen.findByText(/첨부 파일 수\(1개\)를 모두 채웠습니다/)).toBeInTheDocument();
    expect(screen.queryByLabelText('파일 첨부 선택')).not.toBeInTheDocument();
  });
});
