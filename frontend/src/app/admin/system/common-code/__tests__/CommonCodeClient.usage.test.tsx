/**
 * 공통코드 — 사용처 표시와 영향 확인(2026-10-20).
 *
 * 서버는 그룹마다 이 제품이 그 그룹을 읽는 곳(`usages`)을 싣는다. 기능별 기여에서 오므로 일부 기능만 고른 생성물에서는
 * 그 구성이 읽는 그룹만 '읽음'이다(운영 계약 reusable-reference-data 가 기능 선언·읽는 코드·기여를 대조한다). 화면은
 * ① 그룹마다 읽음/읽지 않음을 말하고 ② 읽는 그룹을 사용 안 함으로 바꾸거나 상세 코드의 이름·사용 여부를 바꾸거나 지우기 전에
 * 사용처를 보이며 확인을 받는다. 읽지 않는 그룹의 변경은 묻지 않는다 — 제품 동작이 바뀌지 않는다.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommonCodeClient from '../CommonCodeClient';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  confirm: vi.fn(),
  refresh: vi.fn(),
  getDetails: vi.fn(),
  saveDetail: vi.fn(),
  deleteDetail: vi.fn(),
  saveHierarchy: vi.fn(),
  saveClCode: vi.fn(),
  saveCmmnCode: vi.fn(),
  useSortable: vi.fn(),
  formValues: {} as Record<string, unknown>,
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({ DynamicBreadcrumb: () => <nav aria-label="현재 위치" /> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: ['CODE_READ', 'CODE_CREATE', 'CODE_UPDATE', 'CODE_DELETE'], authorizationVersion: 'v1' } }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/CodeAdminService', () => ({ codeAdminService: { getDetailCodeList: mocks.getDetails } }));
vi.mock('@/app/actions/codeActions', () => ({
  saveCodeDetail: mocks.saveDetail,
  deleteCodeDetail: mocks.deleteDetail,
  saveCmmnCodeHierarchyAction: mocks.saveHierarchy,
  saveClCodeAction: mocks.saveClCode,
  saveCmmnCodeAction: mocks.saveCmmnCode,
}));
vi.mock('@/hooks/useAppForm', () => ({
  useAppForm: () => ({
    control: { values: mocks.formValues },
    reset: (next: Record<string, unknown>) => { mocks.formValues = { ...mocks.formValues, ...next }; },
    getValues: (name: string) => mocks.formValues[name],
    handleSubmit: (submit: (values: unknown) => unknown) => () => submit(mocks.formValues),
    formState: { isSubmitting: false },
    applyServerErrors: () => false,
    focusError: vi.fn(),
    setError: vi.fn(),
  }),
}));
vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: any) => children,
  FormControl: ({ children }: any) => children,
  FormField: ({ control, name, render: renderField }: any) => renderField({ field: { name, value: control.values[name], onChange: vi.fn() } }),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormMessage: () => null,
  FormErrorSummary: () => null,
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <span>{children}</span>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span>사용 중</span>,
}));
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: function KeyboardSensor() {},
  PointerSensor: function PointerSensor() {},
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  DragOverlay: ({ children }: any) => <div>{children}</div>,
  defaultDropAnimationSideEffects: vi.fn(() => vi.fn()),
  MeasuringStrategy: { Always: 'always' },
}));
vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: (items: any[]) => items,
  SortableContext: ({ children }: any) => children,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: {},
  useSortable: mocks.useSortable,
}));
vi.mock('@dnd-kit/utilities', () => ({ CSS: { Translate: { toString: () => '' } } }));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, onClose, title, footer, children }: any) => isOpen
    ? <section aria-label={title}><button type="button" onClick={onClose}>모달 닫기 요청</button>{children}{footer}</section>
    : null,
}));
vi.mock('@/app/components/ui/code-picker', () => ({ CodePicker: () => null }));
vi.mock('@/components/ui/hub/HubStatusBadge', () => ({ HubStatusBadge: ({ status }: any) => <span>{status}</span> }));
vi.mock('../CommonCodeChangeHistoryDialog', () => ({ CommonCodeChangeHistoryDialog: () => null }));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: any) => (
    <div data-testid="common-code-detail-table">
      {data.map((item: any, rowIndex: number) => (
        <div key={rowIndex}>{columns.map((column: any, index: number) => <div key={index}>{column.accessor(item)}</div>)}</div>
      ))}
    </div>
  ),
}));

const APPROVAL_USAGE = "결재 기안의 업무 구분 선택지와 상신 검증이 이 그룹의 '사용' 상세 코드만 받습니다.";
const clCodes = [
  { clsfCd: 'DOMAIN', clsfCdNm: '업무 도메인', clsfCdExpln: '', useYn: 'Y' },
  { clsfCd: 'LEGACY', clsfCdNm: '레거시', clsfCdExpln: '', useYn: 'Y' },
];
const groups = [
  { clsfCd: 'DOMAIN', cdId: 'COM075', cdIdNm: '결재 업무 구분', cdIdExpln: '', useYn: 'Y', usages: [APPROVAL_USAGE] },
  { clsfCd: 'LEGACY', cdId: 'COM046', cdIdNm: '모니터링 구분', cdIdExpln: '', useYn: 'Y', usages: [] },
];
const approvalDetails = [
  { cdId: 'COM075', dtlCd: 'WF', dtlCdNm: '검토', dtlCdExpln: '', useYn: 'Y', version: 0 },
];

function renderClient(selectedGroupId: string | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CommonCodeClient clCodes={clCodes as any} groups={groups as any} details={approvalDetails as any} selectedGroupId={selectedGroupId} />
    </QueryClientProvider>,
  );
}

describe('공통코드 — 사용처 표시와 영향 확인', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.formValues = {};
    mocks.getDetails.mockResolvedValue({ list: approvalDetails, total: approvalDetails.length });
    mocks.confirm.mockResolvedValue(true);
    mocks.saveDetail.mockResolvedValue({ success: true, message: '저장됨' });
    mocks.deleteDetail.mockResolvedValue({ success: true, message: '삭제됨' });
    mocks.saveClCode.mockResolvedValue({ success: true, message: '저장됨' });
    mocks.saveCmmnCode.mockResolvedValue({ success: true, message: '저장됨' });
    mocks.useSortable.mockReturnValue({
      attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null, transition: undefined, isDragging: false,
    });
  });

  it('목록은 이 제품이 읽는 그룹에만 "제품이 읽음"을 붙이고 이름에도 싣는다', () => {
    renderClient(null);
    const read = screen.getByRole('button', { name: '결재 업무 구분 (COM075) 선택 · 제품이 읽음' });
    expect(within(read).getByText('제품이 읽음')).toBeInTheDocument();
    const unread = screen.getByRole('button', { name: '모니터링 구분 (COM046) 선택' });
    expect(within(unread).queryByText('제품이 읽음')).not.toBeInTheDocument();
  });

  it('상세는 읽는 그룹이면 사용처를, 읽지 않는 그룹이면 그 사실과 이 화면이 모르는 것을 말한다', async () => {
    renderClient('COM075');
    const readPanel = await screen.findByRole('region', { name: '이 제품이 읽는 그룹' });
    expect(readPanel).toHaveTextContent(APPROVAL_USAGE);

    fireEvent.click(screen.getByRole('button', { name: '모니터링 구분 (COM046) 선택' }));
    const unreadPanel = await screen.findByRole('region', { name: '이 제품이 읽지 않는 그룹' });
    expect(unreadPanel).toHaveTextContent('제품 동작은 바뀌지 않습니다');
    expect(unreadPanel).toHaveTextContent('다른 시스템이 이 값을 쓰는지는 이 화면이 알 수 없습니다');
  });

  it('읽는 그룹을 사용 안 함으로 바꾸기 전에 사용처를 보이고, 취소하면 저장하지 않고 다시 시도할 수 있다', async () => {
    mocks.confirm.mockResolvedValueOnce(false);
    renderClient('COM075');
    fireEvent.click(screen.getByRole('button', { name: /그룹 수정/ }));
    mocks.formValues = { ...mocks.formValues, useYn: 'N' };

    fireEvent.click(within(screen.getByRole('region', { name: '코드 그룹 수정' })).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    const options = mocks.confirm.mock.calls[0][0];
    expect(options.message).toContain('이 제품이 읽는 그룹');
    expect(options.message).toContain('상세 코드 목록에 그 상세 코드가 보이지 않습니다');
    expect(options.detailsLabel).toBe('이 제품이 이 그룹을 읽는 곳');
    const { container } = render(<>{options.details}</>);
    expect(within(container).getByText(APPROVAL_USAGE)).toBeInTheDocument();
    expect(mocks.saveCmmnCode).not.toHaveBeenCalled();

    // 취소가 제출 잠금을 남기면 다시 저장할 수 없다 — 두 번째 시도는 확인을 다시 묻고 저장한다.
    fireEvent.click(within(screen.getByRole('region', { name: '코드 그룹 수정' })).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(mocks.saveCmmnCode).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledTimes(2);
  });

  it('읽지 않는 그룹을 사용 안 함으로 바꿀 때는 묻지 않는다 — 제품 동작이 바뀌지 않는다', async () => {
    renderClient('COM046');
    fireEvent.click(screen.getByRole('button', { name: /그룹 수정/ }));
    mocks.formValues = { ...mocks.formValues, useYn: 'N' };

    fireEvent.click(within(screen.getByRole('region', { name: '코드 그룹 수정' })).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(mocks.saveCmmnCode).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('읽는 그룹의 상세 코드 삭제는 사용처를 보이고, 행이 남아 되돌릴 수 있다는 사실을 말한다', async () => {
    renderClient('COM075');
    fireEvent.click(await screen.findByRole('button', { name: '검토 코드 삭제' }));

    await waitFor(() => expect(mocks.deleteDetail).toHaveBeenCalledWith(null, { cdId: 'COM075', dtlCd: 'WF' }));
    const options = mocks.confirm.mock.calls[0][0];
    expect(options.message).toContain('사용 안 함으로 바뀌며');
    expect(options.message).toContain('사용처에 영향');
    expect(options.message).not.toContain('영구히');
    expect(options.detailsLabel).toBe('이 제품이 이 그룹을 읽는 곳');
  });

  it('읽는 그룹의 상세 코드 이름을 바꾸면 확인을 받고, 새 상세 코드 등록은 묻지 않는다', async () => {
    renderClient('COM075');
    fireEvent.click(await screen.findByRole('button', { name: '검토 코드 수정' }));
    mocks.formValues = { ...mocks.formValues, dtlCdNm: '사전 검토' };
    fireEvent.click(within(screen.getByRole('region', { name: '아키텍처 명세 수정' })).getByRole('button', { name: /저장$/ }));

    await waitFor(() => expect(mocks.saveDetail).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.confirm.mock.calls[0][0].message).toContain('이름을 바꾸면 아래 사용처에 바로 반영됩니다');

    fireEvent.click(screen.getByRole('button', { name: '신규 상세 코드 등록' }));
    mocks.formValues = { ...mocks.formValues, dtlCd: 'NEW', dtlCdNm: '신규' };
    fireEvent.click(within(screen.getByRole('region', { name: '신규 명세 등록' })).getByRole('button', { name: /저장$/ }));
    await waitFor(() => expect(mocks.saveDetail).toHaveBeenCalledTimes(2));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
  });

  it('읽는 그룹이 든 분류를 미사용으로 바꾸면 그 그룹의 사용처를 함께 보인다', async () => {
    renderClient(null);
    fireEvent.click(screen.getByRole('button', { name: '업무 도메인 (DOMAIN) 선택' }));
    fireEvent.click(screen.getByRole('button', { name: /분류 수정/ }));
    mocks.formValues = { ...mocks.formValues, useYn: 'N' };

    fireEvent.click(within(screen.getByRole('region', { name: '코드 분류 수정' })).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(mocks.saveClCode).toHaveBeenCalledTimes(1));
    const options = mocks.confirm.mock.calls[0][0];
    expect(options.message).toContain('1개는 이 제품이 읽는 그룹');
    const { container } = render(<>{options.details}</>);
    expect(within(container).getByText('‘결재 업무 구분’(COM075)')).toBeInTheDocument();
    expect(within(container).getByText(APPROVAL_USAGE)).toBeInTheDocument();
  });
});
