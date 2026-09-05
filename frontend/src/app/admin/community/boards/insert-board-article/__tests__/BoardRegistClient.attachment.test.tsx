import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardRegistClient } from '../BoardRegistClient';

/**
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
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push }),
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

describe('BoardRegistClient attachment contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveBoardArticle.mockResolvedValue({ success: true, redirect: '/boards' });
    mocks.confirm.mockResolvedValue(true);
    mocks.deleteFile.mockResolvedValue(undefined);
    mocks.getFileList.mockResolvedValue([]);
  });

  it('붙인 파일을 서버 액션 FormData 의 files 로 실어 보낸다 — 종전에는 파일 입력이 없어 한 번도 실린 적이 없었다', async () => {
    const user = userEvent.setup();
    renderSubject();
    fillRequiredFields();

    const file = new File(['hello'], 'evidence.txt', { type: 'text/plain' });
    await user.upload(screen.getByLabelText('파일 첨부 선택'), file);
    await user.click(screen.getByRole('button', { name: '게시글 등록' }));

    await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1));
    const files = submittedFormData().getAll('files');
    expect(files).toHaveLength(1);
    expect((files[0] as File).name).toBe('evidence.txt');
  });

  it('첨부가 없으면 files 항목을 싣지 않는다 (빈 업로드 회귀 방어)', async () => {
    const user = userEvent.setup();
    renderSubject();
    fillRequiredFields();

    await user.click(screen.getByRole('button', { name: '게시글 등록' }));

    await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1));
    expect(submittedFormData().getAll('files')).toHaveLength(0);
  });

  it('신규 작성에서는 기존 첨부 목록을 조회하지 않는다', () => {
    renderSubject();
    expect(mocks.getFileList).not.toHaveBeenCalled();
    expect(screen.queryByRole('list', { name: '기존 첨부파일' })).not.toBeInTheDocument();
  });

  it('수정 모드는 기존 첨부를 나열하고, 확인 후 서버 삭제를 호출해 목록을 다시 읽는다', async () => {
    const user = userEvent.setup();
    mocks.getFileList
      .mockResolvedValueOnce([
        { atchFileSn: 101, fileSn: 1, orignlFileNm: 'report.pdf', fileExtsn: 'pdf', fileMg: 10, fileStreCours: '', streFileNm: '' },
        { atchFileSn: 101, fileSn: 2, orignlFileNm: 'photo.png', fileExtsn: 'png', fileMg: 20, fileStreCours: '', streFileNm: '' },
      ])
      .mockResolvedValueOnce([
        { atchFileSn: 101, fileSn: 2, orignlFileNm: 'photo.png', fileExtsn: 'png', fileMg: 20, fileStreCours: '', streFileNm: '' },
      ]);
    renderSubject({ pstSn: 7, initialData: { pstSn: 7, pstTtl: '기존 글', pstCn: '<p>본문</p>', atchFileSn: 101 } });

    expect(await screen.findByText('report.pdf')).toBeInTheDocument();
    expect(mocks.getFileList).toHaveBeenCalledWith(101);

    await user.click(screen.getByRole('button', { name: 'report.pdf 삭제' }));

    await waitFor(() => expect(mocks.deleteFile).toHaveBeenCalledWith(101, 1));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', title: '첨부파일 삭제' }));
    expect(mocks.toast).toHaveBeenCalledWith('첨부파일을 삭제했습니다.', 'success');
    // 삭제 후 목록을 서버에서 다시 읽는다 — 화면에서만 지우면 실패한 삭제가 성공처럼 보인다.
    await waitFor(() => expect(mocks.getFileList).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText('report.pdf')).not.toBeInTheDocument());
    expect(screen.getByText('photo.png')).toBeInTheDocument();
  });

  it('확인을 취소하면 서버 삭제를 호출하지 않는다', async () => {
    const user = userEvent.setup();
    mocks.confirm.mockResolvedValueOnce(false);
    mocks.getFileList.mockResolvedValue([
      { atchFileSn: 101, fileSn: 1, orignlFileNm: 'report.pdf', fileExtsn: 'pdf', fileMg: 10, fileStreCours: '', streFileNm: '' },
    ]);
    renderSubject({ pstSn: 7, initialData: { pstSn: 7, pstTtl: '기존 글', pstCn: '<p>본문</p>', atchFileSn: 101 } });

    await user.click(await screen.findByRole('button', { name: 'report.pdf 삭제' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.deleteFile).not.toHaveBeenCalled();
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
  });

  it('첨부 삭제는 같은 tick 의 재요청을 막고, pending 동안 disabled·aria-busy 를 켜며, 실패를 보이는 피드백으로 드러낸다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    const pendingDelete = new Promise<void>((_, reject) => {
      rejectDelete = reject;
    });
    mocks.deleteFile.mockReturnValue(pendingDelete);
    mocks.getFileList.mockResolvedValue([
      { atchFileSn: 101, fileSn: 1, orignlFileNm: 'report.pdf', fileExtsn: 'pdf', fileMg: 10, fileStreCours: '', streFileNm: '' },
    ]);
    renderSubject({ pstSn: 7, initialData: { pstSn: 7, pstTtl: '기존 글', pstCn: '<p>본문</p>', atchFileSn: 101 } });
    const remove = await screen.findByRole('button', { name: 'report.pdf 삭제' });

    // 같은 tick 의 두 번째 클릭은 state 갱신보다 먼저 들어온다 — 동기 ref 잠금이 없으면 확인창이 두 번 뜬다.
    fireEvent.click(remove);
    fireEvent.click(remove);

    await waitFor(() => expect(mocks.deleteFile).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');

    rejectDelete(new Error('삭제 권한이 없습니다.'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('삭제 권한이 없습니다.', 'error'));
    await waitFor(() => expect(remove).not.toBeDisabled());
    expect(remove).not.toHaveAttribute('aria-busy', 'true');
    // 실패한 삭제를 화면에서만 지우면 성공처럼 보인다 — 목록은 그대로다.
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
  });

  it('서버가 삭제를 거부하면(403) 목록을 유지하고 사유를 토스트로 드러낸다', async () => {
    const user = userEvent.setup();
    mocks.getFileList.mockResolvedValue([
      { atchFileSn: 101, fileSn: 1, orignlFileNm: 'report.pdf', fileExtsn: 'pdf', fileMg: 10, fileStreCours: '', streFileNm: '' },
    ]);
    mocks.deleteFile.mockRejectedValueOnce(new Error('삭제 권한이 없습니다.'));
    renderSubject({ pstSn: 7, initialData: { pstSn: 7, pstTtl: '기존 글', pstCn: '<p>본문</p>', atchFileSn: 101 } });

    await user.click(await screen.findByRole('button', { name: 'report.pdf 삭제' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('삭제 권한이 없습니다.', 'error'));
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(mocks.getFileList).toHaveBeenCalledTimes(1);
  });

  it('기존 첨부 목록 조회 실패를 "첨부 없음" 으로 위장하지 않고 재시도할 수 있다', async () => {
    const user = userEvent.setup();
    mocks.getFileList.mockRejectedValueOnce(new Error('목록 서버 오류')).mockResolvedValueOnce([
      { atchFileSn: 101, fileSn: 1, orignlFileNm: 'report.pdf', fileExtsn: 'pdf', fileMg: 10, fileStreCours: '', streFileNm: '' },
    ]);
    renderSubject({ pstSn: 7, initialData: { pstSn: 7, pstTtl: '기존 글', pstCn: '<p>본문</p>', atchFileSn: 101 } });

    // FormErrorSummary 의 announcer 도 role=alert 라 역할로 찾으면 빈 요소가 먼저 잡힌다 — 문구로 찾는다.
    const alert = await screen.findByText('기존 첨부파일 목록을 불러오지 못했습니다.');
    expect(alert.closest('[role="alert"]')).not.toBeNull();
    expect(screen.queryByText('등록된 첨부파일이 없습니다.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByText('report.pdf')).toBeInTheDocument();
  });
});
