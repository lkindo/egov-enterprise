import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportCreateForm } from '@/components/business/report/ReportCreateForm';
import WorkReportClient from '../WorkReportClient';

const mocks = vi.hoisted(() => ({
  permissions: ['FILE_UPLOAD', 'FILE_READ', 'FILE_DOWNLOAD'] as string[],
  uploadFiles: vi.fn(),
  getFileList: vi.fn(),
  downloadFile: vi.fn(),
  getReports: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
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
vi.mock('@/services/business/user/ReportService', () => ({
  reportService: {
    getReports: mocks.getReports,
    createReport: vi.fn(),
    updateReport: vi.fn(),
    deleteReport: vi.fn(),
  },
}));
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast, error: mocks.toast, success: mocks.toast }),
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn().mockResolvedValue(true) }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, children }: { actions: React.ReactNode; children: React.ReactNode }) => (
    <main>{actions}{children}</main>
  ),
}));
vi.mock('@/app/components/patterns/keyword-filter', () => ({
  KeywordFilter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string }) =>
    isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null,
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('WorkReport attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['FILE_UPLOAD', 'FILE_READ', 'FILE_DOWNLOAD'];
    mocks.uploadFiles.mockResolvedValue(64);
    mocks.getFileList.mockResolvedValue([
      { atchFileSn: 64, fileSn: 1, fileExtsn: 'xlsx', fileMg: 8192, orignlFileNm: '주간실적.xlsx' },
    ]);
    mocks.downloadFile.mockResolvedValue(undefined);
    mocks.getReports.mockResolvedValue({
      list: [
        {
          rptpSn: 5,
          rptTtl: '주간 실적 보고',
          rptCn: '주요 실적 요약',
          rptYmd: '20261116',
          userId: 'USR_1',
          userNm: '홍길동',
          atchFileSn: 64,
        },
      ],
      totalPage: 1,
      total: 1,
    });
  });

  it('FILE_UPLOAD 권한으로 첨부를 올려 atchFileSn 을 전달하고 업로드 실패 시 등록을 막는다', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    mocks.uploadFiles.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: '파일 크기를 초과했습니다.' } },
    });

    renderWithQuery(
      <ReportCreateForm
        defaultYmd="20261116"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    const file = new File(['abc'], 'huge.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    fireEvent.change(screen.getByLabelText(/보고 제목/), { target: { value: '주간 업무 보고' } });
    fireEvent.change(screen.getByLabelText('파일 첨부 선택'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: '보고 등록' }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith('파일 크기를 초과했습니다.'),
    );
    expect(onSubmit).not.toHaveBeenCalled();

    const validFile = new File(['ok'], 'report.xlsx', { type: 'application/vnd.ms-excel' });
    fireEvent.change(screen.getByLabelText('파일 첨부 선택'), { target: { files: [validFile] } });
    fireEvent.click(screen.getByRole('button', { name: '보고 등록' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ rptTtl: '주간 업무 보고', atchFileSn: 64 });
  });

  it('수정 모드에서 기존 첨부 제거를 선택하면 atchFileSn 없이 저장한다', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithQuery(
      <ReportCreateForm
        mode="edit"
        defaultYmd="20261116"
        initialData={{
          rptTtl: '기존 보고',
          rptCn: '본문',
          rptYmd: '20261116',
          atchFileSn: 64,
        }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    expect(await screen.findByText('주간실적.xlsx')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /기존 첨부 제거/ }));
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0].atchFileSn).toBeUndefined();
  });

  it('업무 보고 행을 클릭하면 상세 모달에서 첨부파일 목록과 내려받기를 제공한다', async () => {
    renderWithQuery(<WorkReportClient initialYmd="20261116" />);

    const rowButton = await screen.findByRole('button', { name: '주간 실적 보고 업무 보고 상세 보기' });
    fireEvent.click(rowButton);

    expect(await screen.findByText('주간실적.xlsx')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /내려받기/ }));
    await waitFor(() => expect(mocks.downloadFile).toHaveBeenCalledWith(64, 1, '주간실적.xlsx'));
  });
});
