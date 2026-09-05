import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createDraft: vi.fn(),
  getTaskTypes: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/services/business/user/approval/ApprovalUserService', () => ({
  approvalUserService: {
    createDraft: mocks.createDraft,
    getTaskTypes: mocks.getTaskTypes,
  },
}));

// 모달 셸은 열림 여부와 접근 가능한 이름만 계약이다.
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, title, children }: { isOpen: boolean; title: string; children: React.ReactNode }) => (
    isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null
  ),
}));

// 사용자 검색 피커는 자기 계약이 있다. 여기서는 '선택' 한 번으로 결재자를 돌려준다.
vi.mock('@/app/components/ui/user-picker', () => ({
  UserPicker: ({ isOpen, onSelect, onClose }: {
    isOpen: boolean;
    onSelect: (user: { esntlId: string; userNm: string; deptNm?: string }) => void;
    onClose: () => void;
  }) => (
    isOpen ? (
      <button
        type="button"
        onClick={() => { onSelect({ esntlId: 'BOSS_ESNTL', userNm: '김결재', deptNm: '총무과' }); onClose(); }}
      >
        피커에서 김결재 선택
      </button>
    ) : null
  ),
}));

// Radix Select 는 jsdom 에서 포인터 이벤트가 없어 열리지 않는다. 네이티브 select 로 대체해
// "값을 고른다" 는 계약만 검증한다.
vi.mock('@/components/ui/select', () => {
  const Select = ({ value, onValueChange, children }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select aria-label="업무 구분" value={value} onChange={(event) => onValueChange(event.target.value)}>
      <option value="">업무 구분을 선택하세요</option>
      {children}
    </select>
  );
  const passthrough = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  );
  return {
    Select,
    SelectContent: passthrough,
    SelectItem,
    SelectTrigger: passthrough,
    SelectValue: () => null,
  };
});

import { ApprovalDraftDialog } from '../ApprovalDraftDialog';

function renderDialog(props: Partial<React.ComponentProps<typeof ApprovalDraftDialog>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const onClose = vi.fn();
  const onCreated = vi.fn();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ApprovalDraftDialog isOpen onClose={onClose} onCreated={onCreated} {...props} />
    </QueryClientProvider>,
  );
  return { ...view, onClose, onCreated };
}

describe('ApprovalDraftDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTaskTypes.mockResolvedValue([
      { cdId: 'COM075', dtlCd: '01', dtlCdNm: '일반', useYn: 'Y' },
      { cdId: 'COM075', dtlCd: '99', dtlCdNm: '폐기', useYn: 'N' },
    ]);
    mocks.createDraft.mockResolvedValue(88);
  });

  /**
   * COM075 에 코드가 없으면 선택지를 지어내지 않는다(PD-DB-003). 사실을 말하고 상신을 막는다(G10).
   */
  it('업무 구분 코드가 없으면 사유를 보여 주고 상신을 막는다', async () => {
    mocks.getTaskTypes.mockResolvedValue([]);
    renderDialog();

    expect(await screen.findByText('등록된 업무 구분이 없어 결재를 올릴 수 없습니다.')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: '결재 상신' });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });

  it('사용 중지된 코드는 선택지에서 빼고, 비어 있는 채 상신하면 필드별 오류를 요약한다', async () => {
    renderDialog();

    const select = await screen.findByRole('combobox', { name: '업무 구분' });
    expect(screen.getByRole('option', { name: '일반' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '폐기' })).not.toBeInTheDocument();
    expect(select).toHaveValue('');

    fireEvent.submit(screen.getByRole('form', { name: '결재 기안 폼' }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('업무 구분을 선택해 주세요.');
    expect(summary).toHaveTextContent('결재자를 선택해 주세요.');
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });

  it('업무 구분·결재자·신청일을 채워 상신하면 API 계약대로 보내고 부모에게 문서 번호를 넘긴다', async () => {
    const { onClose, onCreated } = renderDialog();

    const select = await screen.findByRole('combobox', { name: '업무 구분' });
    fireEvent.change(select, { target: { value: '01' } });
    fireEvent.click(screen.getByRole('button', { name: /결재자 선택/ }));
    fireEvent.click(screen.getByRole('button', { name: '피커에서 김결재 선택' }));
    expect(screen.getByTestId('approval-draft-approver')).toHaveTextContent('김결재 · 총무과');

    const date = screen.getByLabelText('신청일') as HTMLInputElement;
    fireEvent.change(date, { target: { value: '2026-09-05' } });

    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));

    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledTimes(1));
    expect(mocks.createDraft).toHaveBeenCalledWith({ taskSeCd: '01', aprvrId: 'BOSS_ESNTL', reqYmd: '20260905' });
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(88));
    expect(onClose).toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('결재를 상신했습니다'), 'success');
  });

  it('서버 실패 시 다이얼로그와 입력을 보존하고 실패를 알린다', async () => {
    mocks.createDraft.mockRejectedValueOnce(new Error('결재 API 장애'));
    const { onClose, onCreated } = renderDialog();

    const select = await screen.findByRole('combobox', { name: '업무 구분' });
    fireEvent.change(select, { target: { value: '01' } });
    fireEvent.click(screen.getByRole('button', { name: /결재자 선택/ }));
    fireEvent.click(screen.getByRole('button', { name: '피커에서 김결재 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(onCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(select).toHaveValue('01');
    expect(screen.getByTestId('approval-draft-approver')).toHaveTextContent('김결재');
  });
});
