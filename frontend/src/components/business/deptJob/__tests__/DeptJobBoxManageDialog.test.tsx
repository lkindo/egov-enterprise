import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeptJobBoxManageDialog } from '../DeptJobBoxManageDialog';

/**
 * 🗂 업무함 관리 다이얼로그 계약 (DEC-OPS-037, 감사 D10-01).
 *
 * 판정은 "어느 식별자로 어떤 sink 를 부르는가" 다 — 등록은 이름·부서·정렬을 그대로 보내고(빈 정렬은 보내지
 * 않는다), 수정은 행의 deptTaskBoxSn 을 경로로 보내며, 삭제는 확인 후 한 번만 부르고 pending 동안
 * disabled·aria-busy 이고 실패(서버 409 '산하 업무 존재' 포함)는 토스트로 드러난다.
 */
const mocks = vi.hoisted(() => ({
  getDeptJobBoxes: vi.fn(),
  createDeptJobBox: vi.fn(),
  updateDeptJobBox: vi.fn(),
  deleteDeptJobBox: vi.fn(),
  getDeptTree: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () => function TestModal({
    children, footer, isOpen, onClose, title,
  }: { children: ReactNode; footer?: ReactNode; isOpen: boolean; onClose?: () => void; title: string }) {
    return isOpen ? (
      <section aria-label={title}>
        <button type="button" onClick={onClose}>모달 닫기 요청</button>
        {children}{footer}
      </section>
    ) : null;
  },
}));
// Radix Select 는 jsdom 에서 pointer 이벤트로 열리지 않는다 — 네이티브 select 로 대체해 값 전달만 검사한다.
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value?: string; onValueChange: (value: string) => void; children: ReactNode }) => (
    <select data-testid="mock-select" value={value ?? ''} onChange={(event) => onValueChange(event.target.value)}>{children}</select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));
vi.mock('@/services/business/user/deptJob/DeptJobUserService', () => ({
  deptJobUserService: {
    getDeptJobBoxes: mocks.getDeptJobBoxes,
    createDeptJobBox: mocks.createDeptJobBox,
    updateDeptJobBox: mocks.updateDeptJobBox,
    deleteDeptJobBox: mocks.deleteDeptJobBox,
  },
}));
vi.mock('@/services/foundation/system/DeptAdminService', () => ({
  deptAdminService: { getDeptTree: mocks.getDeptTree },
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

const boxes = [
  { deptTaskBoxSn: 1, deptTaskBoxNm: '기획', deptId: 'D1', deptNm: '기획부', sortOrdr: 1 },
  { deptTaskBoxSn: 2, deptTaskBoxNm: '인사', deptId: undefined, sortOrdr: undefined },
];

function renderDialog(onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DeptJobBoxManageDialog isOpen onClose={onClose} />
    </QueryClientProvider>,
  );
}

describe('DeptJobBoxManageDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDeptJobBoxes.mockResolvedValue({ list: boxes, total: 2, page: 0, size: 10, totalPage: 1 });
    mocks.getDeptTree.mockResolvedValue([{ ognzId: 'D1', ognzNm: '기획부' }, { ognzId: 'D2', ognzNm: '인사부' }]);
    mocks.createDeptJobBox.mockResolvedValue(3);
    mocks.updateDeptJobBox.mockResolvedValue(undefined);
    mocks.deleteDeptJobBox.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('등록된 업무함을 부서·순서와 함께 나열한다', async () => {
    renderDialog();
    const list = await screen.findByRole('list', { name: '업무함 목록' });
    expect(within(list).getByText('기획')).toBeInTheDocument();
    expect(within(list).getByText('기획부 · 순서 1')).toBeInTheDocument();
    expect(within(list).getByText('부서 미지정')).toBeInTheDocument();
    expect(mocks.getDeptJobBoxes).toHaveBeenCalledWith({ page: 0, size: 10 });
  });

  it('등록은 이름·부서를 보내고 빈 정렬 순서는 보내지 않는다', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByRole('list', { name: '업무함 목록' });
    await user.type(screen.getByRole('textbox', { name: /업무함 이름/ }), '대외협력');
    await waitFor(() => expect(screen.getByRole('option', { name: '인사부' })).toBeInTheDocument());
    await user.selectOptions(screen.getByTestId('mock-select'), 'D2');
    await user.click(screen.getByRole('button', { name: '업무함 등록' }));

    await waitFor(() => expect(mocks.createDeptJobBox).toHaveBeenCalledTimes(1));
    expect(mocks.createDeptJobBox).toHaveBeenCalledWith({ deptTaskBoxNm: '대외협력', deptId: 'D2' });
    expect(mocks.toast).toHaveBeenCalledWith('업무함을 등록했습니다.', 'success');
    await waitFor(() => expect(screen.getByRole('textbox', { name: /업무함 이름/ })).toHaveValue(''));
  });

  it('빈 이름은 서버를 부르지 않고 인라인 오류를 낸다', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByRole('list', { name: '업무함 목록' });
    await user.click(screen.getByRole('button', { name: '업무함 등록' }));
    expect(await screen.findAllByText('업무함 이름을 입력하세요.')).not.toHaveLength(0);
    expect(mocks.createDeptJobBox).not.toHaveBeenCalled();
  });

  it('수정은 행의 값을 폼에 싣고 deptTaskBoxSn 경로로 PUT 한다', async () => {
    const user = userEvent.setup();
    renderDialog();
    const list = await screen.findByRole('list', { name: '업무함 목록' });
    await user.click(within(list).getByRole('button', { name: '기획 수정' }));
    const nameInput = screen.getByRole('textbox', { name: /업무함 이름/ });
    expect(nameInput).toHaveValue('기획');
    expect(screen.getByRole('form', { name: '업무함 수정' })).toBeInTheDocument();
    await user.clear(nameInput);
    await user.type(nameInput, '기획조정');
    await user.click(screen.getByRole('button', { name: '수정 저장' }));

    await waitFor(() => expect(mocks.updateDeptJobBox).toHaveBeenCalledTimes(1));
    expect(mocks.updateDeptJobBox).toHaveBeenCalledWith(1, { deptTaskBoxNm: '기획조정', deptId: 'D1', sortOrdr: 1 });
    expect(mocks.createDeptJobBox).not.toHaveBeenCalled();
  });

  it('삭제는 확인 뒤 한 번만 부르고 pending 동안 disabled·aria-busy 이며, 실패(산하 업무 409)는 토스트로 드러내고 행을 남긴다', async () => {
    let rejectDelete: (reason?: unknown) => void = () => undefined;
    mocks.deleteDeptJobBox.mockImplementation(() => new Promise<void>((_resolve, reject) => { rejectDelete = reject; }));
    renderDialog();
    const list = await screen.findByRole('list', { name: '업무함 목록' });
    const deleteButton = within(list).getByRole('button', { name: '기획 삭제' });
    fireEvent.dblClick(deleteButton);
    fireEvent.click(deleteButton);

    await waitFor(() => expect(mocks.deleteDeptJobBox).toHaveBeenCalledTimes(1));
    expect(mocks.deleteDeptJobBox).toHaveBeenCalledWith(1);
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute('aria-busy', 'true');
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '업무함 삭제', variant: 'destructive' }));

    await act(async () => rejectDelete({ response: { status: 409, data: { message: '업무가 남아 있어 삭제할 수 없습니다.' } } }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(within(list).getByText('기획')).toBeInTheDocument();
    await waitFor(() => expect(within(list).getByRole('button', { name: '기획 삭제' })).not.toBeDisabled());
    expect(within(list).getByRole('button', { name: '기획 삭제' })).toHaveAttribute('aria-busy', 'false');
  });

  it('삭제 성공은 토스트를 내고 목록을 다시 읽는다', async () => {
    const user = userEvent.setup();
    renderDialog();
    const list = await screen.findByRole('list', { name: '업무함 목록' });
    await user.click(within(list).getByRole('button', { name: '인사 삭제' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('업무함을 삭제했습니다.', 'success'));
    expect(mocks.deleteDeptJobBox).toHaveBeenCalledWith(2);
    await waitFor(() => expect(mocks.getDeptJobBoxes).toHaveBeenCalledTimes(2));
  });

  it('확인을 거절하면 아무것도 부르지 않는다', async () => {
    mocks.confirm.mockResolvedValue(false);
    const user = userEvent.setup();
    renderDialog();
    const list = await screen.findByRole('list', { name: '업무함 목록' });
    await user.click(within(list).getByRole('button', { name: '인사 삭제' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.deleteDeptJobBox).not.toHaveBeenCalled();
  });
});
