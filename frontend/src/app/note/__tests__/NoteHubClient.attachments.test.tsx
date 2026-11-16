import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  permissions: ['FILE_UPLOAD', 'FILE_READ', 'FILE_DOWNLOAD'] as string[],
  uploadFiles: vi.fn(),
  getFileList: vi.fn(),
  downloadFile: vi.fn(),
  getReceivedNotes: vi.fn(),
  getSentNotes: vi.fn(),
  getUnreadReceivedCount: vi.fn(),
  getNote: vi.fn(),
  sendNote: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockModal({
      isOpen,
      onClose,
      title,
      children,
      footer,
    }: {
      isOpen: boolean;
      onClose: () => void;
      title: string;
      children: React.ReactNode;
      footer?: React.ReactNode;
    }) {
      if (!isOpen) return null;
      return (
        <div role="dialog" aria-label={title}>
          <button type="button" onClick={onClose}>모달 닫기</button>
          {children}
          {footer}
        </div>
      );
    },
}));

vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: { role: 'ROLE_USER', permissions: mocks.permissions, authorizationVersion: 'v1' } });
  return { useAuth: auth, useOptionalAuth: auth };
});

vi.mock('@/services/foundation/file/FileService', () => ({
  fileService: {
    uploadFiles: mocks.uploadFiles,
    getFileList: mocks.getFileList,
    downloadFile: mocks.downloadFile,
  },
}));

vi.mock('@/services/business/user/NoteService', () => ({
  noteService: {
    getReceivedNotes: mocks.getReceivedNotes,
    getSentNotes: mocks.getSentNotes,
    getUnreadReceivedCount: mocks.getUnreadReceivedCount,
    getNote: mocks.getNote,
    sendNote: mocks.sendNote,
    deleteNote: vi.fn(),
  },
}));

vi.mock('@/app/components/ui/recipient-picker', () => ({
  RecipientPicker: ({
    isOpen,
    onConfirm,
  }: {
    isOpen: boolean;
    onConfirm: (selected: Array<{ kind: 'user'; esntlId: string; name: string }>) => void;
  }) =>
    isOpen ? (
      <button
        type="button"
        onClick={() => onConfirm([{ kind: 'user', esntlId: 'USR_RCV', name: '김수신' }])}
      >
        수신자 적용
      </button>
    ) : null,
}));

vi.mock('@/app/components/ui/recipient-department-source', () => ({
  useRecipientDepartmentSource: () => undefined,
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast, error: mocks.toast, success: mocks.toast }),
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, children }: { actions: React.ReactNode; children: React.ReactNode }) => (
    <main>{actions}{children}</main>
  ),
}));
vi.mock('@/app/components/patterns/keyword-filter', () => ({
  KeywordFilter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

const { default: NoteHubClient } = await import('../NoteHubClient');

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('NoteHubClient attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['FILE_UPLOAD', 'FILE_READ', 'FILE_DOWNLOAD'];
    mocks.uploadFiles.mockResolvedValue(105);
    mocks.getFileList.mockResolvedValue([
      { atchFileSn: 105, fileSn: 1, fileExtsn: 'txt', fileMg: 512, orignlFileNm: '인수인계.txt' },
    ]);
    mocks.downloadFile.mockResolvedValue(undefined);
    mocks.getUnreadReceivedCount.mockResolvedValue(0);
    mocks.getReceivedNotes.mockResolvedValue({
      list: [
        {
          noteSn: 31,
          noteTrnsmitSn: 310,
          noteRcptnSn: 410,
          noteSj: '첨부 쪽지',
          noteCn: '확인 바랍니다.',
          trnsmiterNm: '홍발신',
          crtDt: '2026-11-16',
          openYn: 'N',
          atchFileSn: 105,
        },
      ],
      total: 1,
    });
    mocks.getSentNotes.mockResolvedValue({ list: [], total: 0 });
    mocks.getNote.mockResolvedValue({
      noteSn: 31,
      noteSj: '첨부 쪽지',
      noteCn: '확인 바랍니다.',
      trnsmiterNm: '홍발신',
      crtDt: '2026-11-16',
      openYn: 'Y',
      atchFileSn: 105,
    });
    mocks.sendNote.mockResolvedValue(undefined);
  });

  it('FILE_UPLOAD 권한이 있으면 첨부파일을 올려 atchFileSn 과 함께 쪽지를 전송한다', async () => {
    renderWithQuery(<NoteHubClient />);
    fireEvent.click(await screen.findByRole('button', { name: /새 쪽지 쓰기/ }));

    const dialog = screen.getByRole('dialog', { name: '쪽지 쓰기' });
    fireEvent.click(within(dialog).getByRole('button', { name: '받는 사람 고르기' }));
    fireEvent.click(await screen.findByRole('button', { name: '수신자 적용' }));

    fireEvent.change(within(dialog).getByLabelText(/제목/), { target: { value: '자료 송부' } });
    fireEvent.change(within(dialog).getByLabelText(/내용/), { target: { value: '첨부 확인 요청' } });
    const attachment = new File(['notes'], 'handover.txt', { type: 'text/plain' });
    fireEvent.change(within(dialog).getByLabelText('파일 첨부 선택'), { target: { files: [attachment] } });

    fireEvent.click(within(dialog).getByRole('button', { name: '보내기' }));

    await waitFor(() => expect(mocks.uploadFiles).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.sendNote).toHaveBeenCalledWith({
      rcverId: 'USR_RCV',
      noteSj: '자료 송부',
      noteCn: '첨부 확인 요청',
      atchFileSn: 105,
    }));
  });

  it('쪽지 상세 모달에서 첨부파일 목록과 내려받기를 제공한다', async () => {
    renderWithQuery(<NoteHubClient />);

    const rowButton = await screen.findByRole('button', { name: /첨부 쪽지 쪽지 열기/ });
    fireEvent.click(rowButton);

    const dialog = await screen.findByRole('dialog', { name: '쪽지 데이터 상세 정보' });
    expect(await within(dialog).findByText('인수인계.txt')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /내려받기/ }));
    await waitFor(() => expect(mocks.downloadFile).toHaveBeenCalledWith(105, 1, '인수인계.txt'));
  });
});
