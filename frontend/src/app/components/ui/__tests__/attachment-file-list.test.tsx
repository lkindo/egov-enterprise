import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentFileList } from '../attachment-file-list';

const mocks = vi.hoisted(() => ({
  permissions: ['FILE_READ', 'FILE_DOWNLOAD'] as string[],
  getFileList: vi.fn(),
  downloadFile: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useOptionalAuth: () => ({
    user: { role: 'ROLE_USER', permissions: mocks.permissions, authorizationVersion: 'v1' },
  }),
}));

vi.mock('@/services/foundation/file/FileService', () => ({
  fileService: {
    getFileList: mocks.getFileList,
    downloadFile: mocks.downloadFile,
  },
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('AttachmentFileList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['FILE_READ', 'FILE_DOWNLOAD'];
    mocks.getFileList.mockResolvedValue([
      { atchFileSn: 55, fileSn: 1, fileExtsn: 'pdf', fileMg: 2048, orignlFileNm: '업무계획.pdf' },
    ]);
    mocks.downloadFile.mockResolvedValue(undefined);
  });

  it('FILE_READ 와 FILE_DOWNLOAD 권한이 있으면 파일 목록과 내려받기 단추를 그리고 내려받기를 호출한다', async () => {
    renderWithQuery(<AttachmentFileList atchFileSn={55} />);

    expect(await screen.findByText('업무계획.pdf')).toBeInTheDocument();
    const downloadButton = screen.getByRole('button', { name: /내려받기/ });
    fireEvent.click(downloadButton);

    await waitFor(() => expect(mocks.downloadFile).toHaveBeenCalledWith(55, 1, '업무계획.pdf'));
  });

  it('FILE_READ 만 있고 FILE_DOWNLOAD 권한이 없으면 파일 이름만 보이고 내려받기 단추는 숨긴다', async () => {
    mocks.permissions = ['FILE_READ'];
    renderWithQuery(<AttachmentFileList atchFileSn={55} />);

    expect(await screen.findByText('업무계획.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /내려받기/ })).toBeNull();
  });

  it('FILE_READ 권한이 없으면 목록 API 를 호출하지 않고 권한 안내를 표시한다', () => {
    mocks.permissions = ['FILE_DOWNLOAD'];
    renderWithQuery(<AttachmentFileList atchFileSn={55} />);

    expect(mocks.getFileList).not.toHaveBeenCalled();
    expect(screen.getByText('첨부파일 목록을 볼 수 있는 권한이 없습니다.')).toBeInTheDocument();
  });

  it('목록 조회 실패 시 오류 안내와 다시 시도 단추를 표시하고 재조회를 수행한다', async () => {
    mocks.getFileList
      .mockRejectedValueOnce(new Error('403'))
      .mockResolvedValueOnce([
        { atchFileSn: 55, fileSn: 1, fileExtsn: 'pdf', fileMg: 2048, orignlFileNm: '업무계획.pdf' },
      ]);
    renderWithQuery(<AttachmentFileList atchFileSn={55} />);

    expect(await screen.findByText('첨부파일 목록을 불러오지 못했습니다.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByText('업무계획.pdf')).toBeInTheDocument();
  });

  it('목록 조회 응답이 배열이 아니어도 예외 없이 비표시로 방어한다', async () => {
    mocks.getFileList.mockResolvedValueOnce({ editable: true } as unknown as []);
    const { container } = renderWithQuery(<AttachmentFileList atchFileSn={42} />);

    await waitFor(() => {
      expect(mocks.getFileList).toHaveBeenCalled();
      expect(container.firstChild).toBeNull();
    });
  });

  it('내려받기 실패 시 error 메서드가 없는 toast 목업에서도 안전하게 오류를 알린다', async () => {
    mocks.downloadFile.mockRejectedValueOnce(new Error('network fail'));
    renderWithQuery(<AttachmentFileList atchFileSn={55} />);

    const downloadButton = await screen.findByRole('button', { name: /내려받기/ });
    fireEvent.click(downloadButton);

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith('첨부파일을 내려받지 못했습니다.', 'error'),
    );
  });

  it('편집 모드에서 기존 첨부 제거·유지 토글을 호출한다', async () => {
    const onToggleClear = vi.fn();
    const { rerender } = renderWithQuery(
      <AttachmentFileList atchFileSn={55} clearable cleared={false} onToggleClear={onToggleClear} />,
    );

    expect(await screen.findByText('업무계획.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /기존 첨부 제거/ }));
    expect(onToggleClear).toHaveBeenCalledTimes(1);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    rerender(
      <QueryClientProvider client={client}>
        <AttachmentFileList atchFileSn={55} clearable cleared onToggleClear={onToggleClear} />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('button', { name: /기존 첨부 유지/ })).toBeInTheDocument();
  });
});
