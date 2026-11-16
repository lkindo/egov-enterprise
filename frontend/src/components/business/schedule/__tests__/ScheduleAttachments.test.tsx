import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduleCreateForm } from '../ScheduleCreateForm';
import ScheduleCalendarClient from '@/app/smart-toolkit/schedule/ScheduleCalendarClient';

const mocks = vi.hoisted(() => ({
  permissions: ['FILE_UPLOAD', 'FILE_READ', 'FILE_DOWNLOAD'] as string[],
  uploadFiles: vi.fn(),
  getFileList: vi.fn(),
  downloadFile: vi.fn(),
  getDeptScheduleMonthList: vi.fn(),
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
vi.mock('@/services/business/schedule/deptScheduleService', () => ({
  getDeptScheduleMonthList: mocks.getDeptScheduleMonthList,
  createDeptSchedule: vi.fn(),
  updateDeptSchedule: vi.fn(),
  deleteDeptSchedule: vi.fn(),
}));
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast, error: mocks.toast, success: mocks.toast }),
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn().mockResolvedValue(true) }));
vi.mock('@/components/ui/calendar', () => ({ Calendar: () => <div data-testid="calendar" /> }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, children }: { actions: React.ReactNode; children: React.ReactNode }) => (
    <main>{actions}{children}</main>
  ),
}));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string }) =>
    isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null,
}));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('Schedule attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['FILE_UPLOAD', 'FILE_READ', 'FILE_DOWNLOAD'];
    mocks.uploadFiles.mockResolvedValue(91);
    mocks.getFileList.mockResolvedValue([
      { atchFileSn: 91, fileSn: 1, fileExtsn: 'pdf', fileMg: 1024, orignlFileNm: '회의자료.pdf' },
    ]);
    mocks.downloadFile.mockResolvedValue(undefined);
    mocks.getDeptScheduleMonthList.mockResolvedValue([
      {
        schdlSn: 10,
        schdlNm: '분기 보고',
        schdlBgngYmd: '20261116',
        schdlEndYmd: '20261116',
        schdlPlcNm: '대회의실',
        schdlCn: '안건 공유',
        schdlSeCd: '1',
        atchFileSn: 91,
        editable: true,
        deletable: false,
      },
    ]);
  });

  it('FILE_UPLOAD 권한으로 첨부를 올려 atchFileSn 을 전달하고 오류 재시도 시 중복 업로드를 피한다', async () => {
    const onSubmit = vi.fn()
      .mockRejectedValueOnce(new Error('서버 오류'))
      .mockResolvedValueOnce(undefined);
    const onEditStateChange = vi.fn();

    renderWithQuery(
      <ScheduleCreateForm
        defaultYmd="20261116"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        onEditStateChange={onEditStateChange}
      />,
    );

    const file = new File(['data'], 'meeting.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/일정명/), { target: { value: '주간 회의' } });
    fireEvent.change(screen.getByLabelText('파일 첨부 선택'), { target: { files: [file] } });

    await waitFor(() =>
      expect(onEditStateChange).toHaveBeenLastCalledWith(expect.objectContaining({ dirty: true })),
    );

    fireEvent.click(screen.getByRole('button', { name: '일정 등록' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(mocks.uploadFiles).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ schdlNm: '주간 회의', atchFileSn: 91 });

    fireEvent.click(screen.getByRole('button', { name: '일정 등록' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(mocks.uploadFiles).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[1][0]).toMatchObject({ atchFileSn: 91 });
  });

  it('수정 모드에서 기존 첨부 제거를 선택하면 atchFileSn 없이 저장한다', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithQuery(
      <ScheduleCreateForm
        mode="edit"
        defaultYmd="20261116"
        initialData={{
          schdlNm: '기존 일정',
          schdlBgngYmd: '20261116',
          schdlEndYmd: '20261116',
          schdlSeCd: '2',
          atchFileSn: 91,
        }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    expect(await screen.findByText('회의자료.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /기존 첨부 제거/ }));
    fireEvent.click(screen.getByRole('button', { name: '일정 수정' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].atchFileSn).toBeUndefined();
  });

  it('일정 행을 클릭하면 상세 모달에서 첨부파일 목록과 내려받기를 제공한다', async () => {
    renderWithQuery(<ScheduleCalendarClient initialYmd="20261116" />);

    const rowButton = await screen.findByRole('button', { name: '분기 보고 일정 상세 보기' });
    fireEvent.click(rowButton);

    expect(await screen.findByText('회의자료.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /내려받기/ }));
    await waitFor(() => expect(mocks.downloadFile).toHaveBeenCalledWith(91, 1, '회의자료.pdf'));
  });
});
