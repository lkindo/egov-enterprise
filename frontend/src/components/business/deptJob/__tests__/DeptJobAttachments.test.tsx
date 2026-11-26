import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeptJobForm } from '../DeptJobForm';
import DeptJobDetailClient from '@/app/smart-toolkit/dept-job/[id]/DeptJobDetailClient';

const mocks = vi.hoisted(() => ({
  permissions: ['FILE_UPLOAD', 'FILE_READ', 'FILE_DOWNLOAD'] as string[],
  uploadFiles: vi.fn(),
  getFileList: vi.fn(),
  downloadFile: vi.fn(),
  getDeptJob: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock('@/lib/navigation/use-return-to-list', () => ({
  useReturnToList: () => () => undefined,
}));
vi.mock('@/contexts/UnsavedChangesContext', () => ({ useUnsavedChanges: () => undefined }));
vi.mock('@/hooks/useDirtyCloseGuard', () => ({ useDirtyCloseGuard: (dirty: boolean, close: () => void) => close }));
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
vi.mock('@/services/business/user/deptJob/DeptJobUserService', () => ({
  deptJobUserService: {
    getDeptJobBoxes: vi.fn().mockResolvedValue({ list: [{ deptTaskBxSn: 1, deptTaskBxNm: '기본함' }] }),
    getDeptJob: mocks.getDeptJob,
    updateDeptJob: vi.fn(),
    deleteDeptJob: vi.fn(),
    reassignDeptJob: vi.fn(),
  },
}));
vi.mock('@/services/business/user/UserSearchService', () => ({
  userSearchService: { searchUsers: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn(), error: mocks.toastError, success: vi.fn() }),
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn().mockResolvedValue(true) }));

function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('DeptJob attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['FILE_UPLOAD', 'FILE_READ', 'FILE_DOWNLOAD'];
    mocks.uploadFiles.mockResolvedValue(77);
    mocks.getFileList.mockResolvedValue([
      { atchFileSn: 77, fileSn: 1, fileExtsn: 'docx', fileMg: 4096, orignlFileNm: '업무명세서.docx' },
    ]);
    mocks.downloadFile.mockResolvedValue(undefined);
    mocks.getDeptJob.mockResolvedValue({
      deptTaskSn: 9,
      deptTaskNm: '보안 점검',
      deptTaskCn: '점검 항목 확인',
      prrtyRnk: '2',
      atchFileSn: 77,
      editable: true,
      deletable: false,
      reassignable: false,
    });
  });

  it('FILE_UPLOAD 권한으로 첨부를 올려 atchFileSn 을 전달하고 업로드 실패 시 등록을 막는다', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    mocks.uploadFiles.mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { message: '허용되지 않는 파일 형식입니다.' } },
    });

    renderWithQuery(
      <DeptJobForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    );

    const file = new File(['abc'], 'spec.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/업무명/), { target: { value: '취약점 점검' } });
    fireEvent.change(screen.getByLabelText('파일 첨부 선택'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: '업무 등록' }));

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith('허용되지 않는 파일 형식입니다.'),
    );
    expect(onSubmit).not.toHaveBeenCalled();

    const validFile = new File(['ok'], 'spec.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    fireEvent.change(screen.getByLabelText('파일 첨부 선택'), { target: { files: [validFile] } });
    fireEvent.click(screen.getByRole('button', { name: '업무 등록' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({ deptTaskNm: '취약점 점검', atchFileSn: 77 });
  });

  it('FILE_UPLOAD 권한이 없으면 업로더를 숨기고 기존 첨부 제거 시 atchFileSn 을 비운다', async () => {
    mocks.permissions = ['FILE_READ'];
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    renderWithQuery(
      <DeptJobForm
        mode="edit"
        initialData={{ deptTaskNm: '기존 업무', deptTaskCn: '내용', prrtyRnk: '2', atchFileSn: 77 }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('파일 첨부 선택')).toBeNull();
    expect(await screen.findByText('업무명세서.docx')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /기존 첨부 제거/ }));
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0].atchFileSn).toBeUndefined();
  });

  it('상세 조회 화면에서 첨부파일 목록과 내려받기를 표시한다', async () => {
    renderWithQuery(<DeptJobDetailClient deptTaskSn={9} />);

    expect(await screen.findByText('업무명세서.docx')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /내려받기/ }));
    await waitFor(() => expect(mocks.downloadFile).toHaveBeenCalledWith(77, 1, '업무명세서.docx'));
  });
});
