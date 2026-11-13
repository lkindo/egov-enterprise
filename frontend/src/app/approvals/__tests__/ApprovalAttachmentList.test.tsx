import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApprovalAttachmentList } from '../ApprovalAttachmentList';

/**
 * [V2_151] 결재 첨부 목록 계약. 묶음이 없으면 아무것도 그리지 않고 조회하지 않는다. 내려받기는 그 묶음·파일로 일반 첨부 경로를
 * 부르며(열람 판정은 서버), 지우는 단추는 없다 — 결재에 붙은 첨부는 하나씩 지울 수 없다. 조회 실패는 권한 없음·없음과 구분하지
 * 않고 같은 문구로 알린다(첨부의 존재를 드러내지 않는다).
 */
const mocks = vi.hoisted(() => ({ getFileList: vi.fn(), downloadFile: vi.fn(), toast: vi.fn() }));

vi.mock('@/services/foundation/file/FileService', () => ({
  fileService: { getFileList: mocks.getFileList, downloadFile: mocks.downloadFile },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

function renderList(atchFileSn: number | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ApprovalAttachmentList atchFileSn={atchFileSn} /></QueryClientProvider>);
}

describe('ApprovalAttachmentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFileList.mockResolvedValue([{ fileSn: 1, orignlFileNm: '예산안.xlsx', fileExtsn: 'xlsx', fileMg: 2048 }]);
    mocks.downloadFile.mockResolvedValue(undefined);
  });

  it('묶음이 없으면 그리지도 조회하지도 않는다', () => {
    renderList(null);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(mocks.getFileList).not.toHaveBeenCalled();
  });

  it('파일을 그 묶음·파일 번호로 내려받고 지우는 단추는 없다', async () => {
    const user = userEvent.setup();
    renderList(77);
    await user.click(await screen.findByRole('button', { name: '예산안.xlsx 내려받기' }));
    await waitFor(() => expect(mocks.downloadFile).toHaveBeenCalledWith(77, 1, '예산안.xlsx'));
    expect(screen.queryByRole('button', { name: /삭제|지우기/ })).not.toBeInTheDocument();
    expect(screen.getByText('XLSX · 2 KB')).toBeInTheDocument();
  });

  it('조회가 거부되면 존재를 드러내지 않는 같은 문구와 다시 시도를 보인다', async () => {
    mocks.getFileList.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { response: { status: 403 } }));
    renderList(77);
    expect(await screen.findByText('첨부 파일을 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '첨부 파일 다시 시도' })).toBeInTheDocument();
  });
});
