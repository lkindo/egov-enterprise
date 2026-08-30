import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import CommonCodeClient from '../CommonCodeClient';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  confirm: vi.fn(),
  refresh: vi.fn(),
  getDetails: vi.fn(),
  saveDetail: vi.fn(),
  deleteDetail: vi.fn(),
  saveHierarchy: vi.fn(),
  useSortable: vi.fn(),
  reset: vi.fn(),
  applyServerErrors: vi.fn(),
  focusError: vi.fn(),
  announce: vi.fn(),
  isSubmitting: false,
}));

const formValues = {
  dtlCd: 'NEW',
  dtlCdNm: '신규 코드',
  useYn: 'Y',
  dtlCdExpln: '신규 설명',
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({
  DynamicBreadcrumb: () => <nav aria-label="현재 위치" />,
}));

vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/CodeAdminService', () => ({
  codeAdminService: { getDetailCodeList: mocks.getDetails },
}));
vi.mock('@/app/actions/codeActions', () => ({
  saveCodeDetail: mocks.saveDetail,
  deleteCodeDetail: mocks.deleteDetail,
  saveCmmnCodeHierarchyAction: mocks.saveHierarchy,
}));

vi.mock('@/hooks/useAppForm', () => ({
  useAppForm: () => ({
    control: { values: formValues },
    reset: mocks.reset,
    handleSubmit: (submit: (values: any) => unknown) => () => submit(formValues),
    formState: { isSubmitting: mocks.isSubmitting },
    applyServerErrors: mocks.applyServerErrors,
    focusError: mocks.focusError,
  }),
}));

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: any) => children,
  FormControl: ({ children }: any) => children,
  FormField: ({ control, name, render: renderField }: any) => renderField({
    field: { name, value: control.values[name], onChange: vi.fn() },
  }),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormMessage: () => null,
  FormErrorSummary: () => <div data-testid="common-code-form-error-summary" />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <span>{children}</span>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span>사용 중</span>,
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragStart, onDragEnd, onDragCancel, accessibility }: any) => (
    <div>
      {children}
      <span data-testid="code-dnd-instructions">{accessibility?.screenReaderInstructions?.draggable}</span>
      <button type="button" onClick={() => mocks.announce(accessibility?.announcements?.onDragStart({ active: { id: 'GRP1' } }))}>이동 시작 공지</button>
      <button type="button" onClick={() => mocks.announce(accessibility?.announcements?.onDragOver({ active: { id: 'GRP1' }, over: { id: 'GRP2' } }))}>같은 분류 공지</button>
      <button type="button" onClick={() => mocks.announce(accessibility?.announcements?.onDragEnd({ active: { id: 'GRP1' }, over: { id: 'OTHER' } }))}>다른 분류 공지</button>
      <button type="button" onClick={() => { mocks.announce(accessibility?.announcements?.onDragCancel({ active: { id: 'GRP1' }, over: null })); onDragCancel?.(); }}>이동 취소 공지</button>
      <button type="button" onClick={() => onDragStart({ active: { id: 'GRP1' } })}>드래그 시작</button>
      <button type="button" onClick={() => onDragEnd({ active: { id: 'GRP1' }, over: { id: 'OTHER' } })}>다른 분류로 드래그 완료</button>
      <button type="button" onClick={() => onDragEnd({ active: { id: 'GRP1' }, over: { id: 'GRP2' } })}>같은 분류에서 드래그 완료</button>
      <button type="button" onClick={() => onDragStart({ active: { id: 'GRP2' } })}>두 번째 그룹 드래그 시작</button>
      <button type="button" onClick={() => onDragEnd({ active: { id: 'GRP2' }, over: { id: 'OTHER' } })}>두 번째 그룹 드래그 완료</button>
    </div>
  ),
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
  arrayMove: (items: any[], from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  },
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
vi.mock('@/app/components/ui/code-picker', () => ({
  CodePicker: ({ isOpen, onSelect }: any) => isOpen ? (
    <div>
      <button
        type="button"
        onClick={() => onSelect({
          group: { clsfCd: 'DOMAIN', cdId: 'GRP1', cdIdNm: '사용자 상태', cdIdExpln: '사용자 상태 그룹' },
          code: { dtlCd: 'ACTIVE', dtlCdNm: '활성' },
        })}
      >
        선택기로 사용자 상태 선택
      </button>
      <button
        type="button"
        onClick={() => onSelect({
          group: { clsfCd: 'DOMAIN', cdId: 'MISSING', cdIdNm: '누락 그룹', cdIdExpln: '' },
          code: { dtlCd: 'LOST', dtlCdNm: '누락 코드' },
        })}
      >
        선택기로 누락 그룹 선택
      </button>
    </div>
  ) : null,
}));
vi.mock('@/components/ui/hub/HubStatusBadge', () => ({
  HubStatusBadge: ({ status }: any) => <span>{status}</span>,
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data, onRetry, isPremium }: any) => (
    <div data-testid="common-code-detail-table" data-entry-motion={isPremium ? 'enabled' : 'disabled'}>
      {data.map((item: any, rowIndex: number) => (
        <div key={rowIndex}>
          {columns.map((column: any, index: number) => <div key={index}>{column.accessor(item)}</div>)}
        </div>
      ))}
      <button type="button" onClick={onRetry}>상세 재시도</button>
    </div>
  ),
}));

const clCodes = [
  { clsfCd: 'DOMAIN', clsfCdNm: '업무 도메인' },
  { clsfCd: 'OTHER', clsfCdNm: '기타 분류' },
];
const groups = [
  { clsfCd: 'DOMAIN', cdId: 'GRP1', cdIdNm: '사용자 상태', cdIdExpln: '사용자 상태 그룹' },
  { clsfCd: 'DOMAIN', cdId: 'GRP2', cdIdNm: '게시 상태', cdIdExpln: '게시 상태 그룹' },
];
const details = [
  { cdId: 'GRP1', dtlCd: 'ACTIVE', dtlCdNm: '활성', dtlCdExpln: '정상 사용', useYn: 'Y' },
  { cdId: 'GRP1', dtlCd: 'STOP', dtlCdNm: '중지', dtlCdExpln: '', useYn: 'N' },
];

function renderClient(
  selectedGroupId: string | null = 'GRP1',
  overrides: Partial<ComponentProps<typeof CommonCodeClient>> = {},
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const renderTree = (
    nextSelectedGroupId: string | null,
    nextOverrides: Partial<ComponentProps<typeof CommonCodeClient>> = overrides,
  ) => (
    <QueryClientProvider client={client}>
      <CommonCodeClient
        clCodes={(nextOverrides.clCodes ?? clCodes) as any}
        groups={(nextOverrides.groups ?? groups) as any}
        details={(nextOverrides.details ?? details) as any}
        notice={nextOverrides.notice}
        loadFailed={nextOverrides.loadFailed}
        selectedGroupId={nextSelectedGroupId}
      />
    </QueryClientProvider>
  );
  const view = render(renderTree(selectedGroupId));
  return {
    ...view,
    client,
    rerenderClient: (
      nextSelectedGroupId: string | null,
      nextOverrides: Partial<ComponentProps<typeof CommonCodeClient>> = overrides,
    ) => view.rerender(renderTree(nextSelectedGroupId, nextOverrides)),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

describe('CommonCodeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.getDetails.mockResolvedValue({
      list: [...details, { cdId: 'OTHER', dtlCd: 'X' }],
      total: details.length + 1,
    });
    mocks.saveDetail.mockResolvedValue({ success: true, message: '코드 저장 완료' });
    mocks.deleteDetail.mockResolvedValue({ success: true, message: '코드 삭제 완료' });
    mocks.saveHierarchy.mockResolvedValue({ success: true, message: '계층 저장 완료' });
    mocks.applyServerErrors.mockReturnValue(true);
    mocks.isSubmitting = false;
    mocks.useSortable.mockImplementation(() => ({
      attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null,
      transition: undefined, isDragging: false,
    }));
  });

  it('loads only selected-group details and supports search with an honest empty state', async () => {
    renderClient();

    expect(screen.getByRole('heading', { level: 1, name: '공통 코드 관리' })).toBeInTheDocument();
    expect(screen.getByTestId('master-detail-page')).toBeInTheDocument();
    expect(screen.getByTestId('master-detail-master')).toBeInTheDocument();
    expect(screen.getByTestId('master-detail-detail')).toBeInTheDocument();
    expect(await screen.findByText('활성')).toBeInTheDocument();
    expect(screen.getByText('중지')).toBeInTheDocument();
    expect(screen.queryByText('X')).not.toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByTestId('common-code-detail-table')).toHaveAttribute('data-entry-motion', 'disabled');

    const firstGroup = screen.getByRole('button', { name: '사용자 상태 (GRP1) 선택' });
    const secondGroup = screen.getByRole('button', { name: '게시 상태 (GRP2) 선택' });
    expect(firstGroup).toHaveAttribute('data-a2-master-item');
    expect(firstGroup).toHaveAttribute('aria-current', 'true');
    expect(firstGroup).toHaveAttribute('tabindex', '0');
    expect(secondGroup).not.toHaveAttribute('aria-current');
    expect(secondGroup).toHaveAttribute('tabindex', '-1');

    firstGroup.focus();
    fireEvent.keyDown(firstGroup, { key: 'ArrowDown' });
    await waitFor(() => expect(secondGroup).toHaveFocus());
    await waitFor(() => expect(secondGroup).toHaveAttribute('aria-current', 'true'));
    expect(firstGroup).not.toHaveAttribute('aria-current');

    fireEvent.keyDown(secondGroup, { key: 'Tab' });
    expect(screen.getByRole('button', { name: '신규 상세 코드 등록' })).toHaveFocus();

    fireEvent.change(screen.getByRole('textbox', { name: '분류·그룹명 또는 코드로 검색' }), {
      target: { value: '존재하지않음' },
    });
    expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
    expect(within(screen.getByTestId('master-detail-detail')).getByRole('status')).toHaveTextContent('선택된 코드 없음');
    expect(screen.queryByRole('button', { name: '신규 상세 코드 등록' })).not.toBeInTheDocument();
  });

  it('renders classifications and groups in stable identifier order regardless of API order', () => {
    renderClient(null, {
      clCodes: [...clCodes].reverse() as any,
      groups: [...groups].reverse() as any,
    });

    const itemNames = Array.from(
      screen.getByTestId('master-detail-master').querySelectorAll<HTMLElement>('[data-a2-master-item]'),
    ).map((item) => item.getAttribute('aria-label'));
    expect(itemNames).toEqual([
      '업무 도메인 (DOMAIN) 선택',
      '사용자 상태 (GRP1) 선택',
      '게시 상태 (GRP2) 선택',
      '기타 분류 (OTHER) 선택',
    ]);
  });

  it('keeps drag handles outside A2 selection keyboard delegation', async () => {
    renderClient();
    await screen.findByText('활성');

    const selected = screen.getByRole('button', { name: '사용자 상태 (GRP1) 선택' });
    const handle = screen.getByRole('button', { name: '게시 상태 (GRP2) 소속 분류 이동 핸들 — 현재 업무 도메인 분류' });
    const selectedHandle = screen.getByRole('button', { name: '사용자 상태 (GRP1) 소속 분류 이동 핸들 — 현재 업무 도메인 분류' });
    expect(selectedHandle)
      .toHaveAttribute('tabindex', '0');
    expect(selectedHandle).toHaveAttribute('aria-roledescription', '코드 그룹 소속 분류 이동 핸들');
    expect(selected).toHaveClass('hover:bg-primary');
    expect(handle).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('button', { name: '업무 도메인 (DOMAIN) 분류는 이동할 수 없음' })).toBeDisabled();
    handle.focus();
    fireEvent.keyDown(handle, { key: 'ArrowUp' });

    expect(handle).toHaveFocus();
    expect(selected).toHaveAttribute('aria-current', 'true');
  });

  it('announces keyboard group moves in Korean with honest same- and cross-classification outcomes', () => {
    renderClient();
    expect(screen.getByTestId('code-dnd-instructions')).toHaveTextContent(
      '스페이스 또는 엔터 키로 코드 그룹 이동을 시작합니다',
    );

    fireEvent.click(screen.getByRole('button', { name: '이동 시작 공지' }));
    fireEvent.click(screen.getByRole('button', { name: '같은 분류 공지' }));
    fireEvent.click(screen.getByRole('button', { name: '다른 분류 공지' }));
    fireEvent.click(screen.getByRole('button', { name: '이동 취소 공지' }));

    expect(mocks.announce).toHaveBeenNthCalledWith(
      1,
      '사용자 상태 그룹 이동을 시작했습니다. 현재 소속은 업무 도메인 분류입니다.',
    );
    expect(mocks.announce).toHaveBeenNthCalledWith(
      2,
      '사용자 상태 그룹은 현재 업무 도메인 분류 위에 있습니다. 같은 분류 안의 순서는 저장되지 않습니다.',
    );
    expect(mocks.announce).toHaveBeenNthCalledWith(
      3,
      '사용자 상태 그룹을 기타 분류로 이동했습니다. 변경 내용을 저장해야 반영됩니다.',
    );
    expect(mocks.announce).toHaveBeenNthCalledWith(4, '사용자 상태 그룹 이동을 취소했습니다.');
  });

  it('disables hierarchy reordering while a filtered subset is visible', async () => {
    renderClient(null);
    fireEvent.change(screen.getByRole('textbox', { name: '분류·그룹명 또는 코드로 검색' }), {
      target: { value: '사용자' },
    });

    expect(screen.getByRole('button', { name: '사용자 상태 (GRP1) 소속 분류 이동 핸들 — 현재 업무 도메인 분류' })).toBeDisabled();
    expect(screen.getByText('검색 중에는 코드 그룹의 소속 분류를 변경할 수 없습니다.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '드래그 시작' }));
    fireEvent.click(screen.getByRole('button', { name: '다른 분류로 드래그 완료' }));

    expect(screen.getByRole('button', { name: '그룹 소속 저장' })).toBeDisabled();
    expect(mocks.saveHierarchy).not.toHaveBeenCalled();
  });

  it('reveals a CodePicker selection by clearing an incompatible tree search', async () => {
    renderClient();
    fireEvent.change(screen.getByRole('textbox', { name: '분류·그룹명 또는 코드로 검색' }), {
      target: { value: '게시' },
    });
    expect(screen.queryByRole('button', { name: '사용자 상태 (GRP1) 선택' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '코드 검색' }));
    fireEvent.click(screen.getByRole('button', { name: '선택기로 사용자 상태 선택' }));

    expect(screen.getByRole('textbox', { name: '분류·그룹명 또는 코드로 검색' })).toHaveValue('');
    expect(screen.getByRole('button', { name: '사용자 상태 (GRP1) 선택' })).toHaveAttribute('aria-current', 'true');
  });

  it('does not report success when a CodePicker group is absent from the current tree', async () => {
    renderClient(null);
    fireEvent.click(screen.getByRole('button', { name: '코드 검색' }));
    fireEvent.click(screen.getByRole('button', { name: '선택기로 누락 그룹 선택' }));

    expect(mocks.toast).toHaveBeenCalledWith(
      '선택한 코드 그룹을 현재 탐색기에서 찾을 수 없습니다. 데이터를 새로고침한 뒤 다시 시도해 주세요.',
      'error',
    );
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.stringContaining('누락 그룹이 선택되었습니다'), 'success');
    expect(within(screen.getByTestId('master-detail-detail')).getByRole('status')).toHaveTextContent('선택된 코드 없음');
  });

  it('clears a local selection when the external groupId seed is removed or invalidated', async () => {
    const view = renderClient();
    await screen.findByText('활성');
    fireEvent.click(screen.getByRole('button', { name: '게시 상태 (GRP2) 선택' }));
    expect(screen.getByRole('button', { name: '게시 상태 (GRP2) 선택' })).toHaveAttribute('aria-current', 'true');

    view.rerenderClient(null);
    expect(within(screen.getByTestId('master-detail-detail')).getByRole('status')).toHaveTextContent('선택된 코드 없음');

    view.rerenderClient('UNKNOWN');
    expect(within(screen.getByTestId('master-detail-detail')).getByRole('status')).toHaveTextContent('선택된 코드 없음');

    view.rerenderClient('GRP1');
    expect(screen.getByRole('button', { name: '사용자 상태 (GRP1) 선택' })).toHaveAttribute('aria-current', 'true');

    fireEvent.change(screen.getByRole('textbox', { name: '분류·그룹명 또는 코드로 검색' }), {
      target: { value: '사용자' },
    });
    view.rerenderClient('GRP2');
    expect(screen.getByRole('textbox', { name: '분류·그룹명 또는 코드로 검색' })).toHaveValue('');
    expect(screen.getByRole('button', { name: '게시 상태 (GRP2) 선택' })).toHaveAttribute('aria-current', 'true');
  });

  it('retries an unresolved seed and clears a resolved selection removed by refreshed hierarchy data', () => {
    const lateGroup = { clsfCd: 'DOMAIN', cdId: 'LATE', cdIdNm: '후속 그룹', cdIdExpln: '' };
    const unresolved = renderClient('LATE', { groups: groups as any });
    expect(within(screen.getByTestId('master-detail-detail')).getByRole('status')).toHaveTextContent('선택된 코드 없음');

    unresolved.rerenderClient('LATE', { groups: [...groups, lateGroup] as any });
    expect(screen.getByRole('button', { name: '후속 그룹 (LATE) 선택' })).toHaveAttribute('aria-current', 'true');

    unresolved.rerenderClient('LATE', { groups: groups as any });
    expect(within(screen.getByTestId('master-detail-detail')).getByRole('status')).toHaveTextContent('선택된 코드 없음');
  });

  it('reveals a selected group whose refreshed name no longer matches the active filter', () => {
    const view = renderClient('GRP1');
    fireEvent.change(screen.getByRole('textbox', { name: '분류·그룹명 또는 코드로 검색' }), {
      target: { value: '사용자' },
    });

    view.rerenderClient('GRP1', {
      groups: groups.map((group) => (
        group.cdId === 'GRP1' ? { ...group, cdIdNm: '계정 상태' } : group
      )) as any,
    });

    expect(screen.getByRole('textbox', { name: '분류·그룹명 또는 코드로 검색' })).toHaveValue('');
    expect(screen.getByRole('button', { name: '계정 상태 (GRP1) 선택' })).toHaveAttribute('aria-current', 'true');
  });

  it('filters SSR placeholder details to the selected group before the client query resolves', () => {
    mocks.getDetails.mockReturnValue(new Promise(() => {}));
    renderClient('GRP1', {
      details: [
        ...details,
        { cdId: 'OTHER', dtlCd: 'LEAK', dtlCdNm: '다른 그룹 코드', dtlCdExpln: '', useYn: 'Y' },
      ] as any,
    });

    expect(screen.getByText('활성')).toBeVisible();
    expect(screen.queryByText('다른 그룹 코드')).not.toBeInTheDocument();
  });

  it('distinguishes empty data, filtered results and load failure states', () => {
    const empty = renderClient(null, { clCodes: [], groups: [], details: [] });
    expect(screen.getByText('등록된 코드 분류·그룹이 없습니다.')).toBeVisible();
    empty.unmount();

    renderClient(null, { clCodes: [], groups: [], details: [], loadFailed: true });
    expect(screen.getByText('코드 분류·그룹을 불러오지 못했습니다.')).toBeVisible();
  });

  it('edits, creates and deletes detail codes against the selected group', async () => {
    renderClient();
    expect(await screen.findByText('활성')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '활성 코드 수정' }));
    const editModal = screen.getByRole('region', { name: '아키텍처 명세 수정' });
    expect(editModal).toHaveTextContent('GRP1');
    fireEvent.click(within(editModal).getByRole('button', { name: /저장$/ }));
    await waitFor(() => expect(mocks.saveDetail).toHaveBeenCalledWith(null, expect.objectContaining({
      cdId: 'GRP1', isNew: false,
    })));

    fireEvent.click(screen.getByRole('button', { name: '신규 상세 코드 등록' }));
    const createModal = screen.getByRole('region', { name: '신규 명세 등록' });
    expect(within(createModal).getByTestId('common-code-form-error-summary')).toBeInTheDocument();
    expect(within(createModal).getByPlaceholderText(/코드 사용처 및 시스템 제약 조건 설명/))
      .toHaveClass('focus-visible:ring-2', 'focus-visible:ring-ring');
    fireEvent.click(within(createModal).getByRole('button', { name: /저장$/ }));
    await waitFor(() => expect(mocks.saveDetail).toHaveBeenLastCalledWith(null, expect.objectContaining({
      cdId: 'GRP1', isNew: true,
    })));

    fireEvent.click(screen.getByRole('button', { name: '중지 코드 삭제' }));
    await waitFor(() => expect(mocks.deleteDetail).toHaveBeenCalledWith(null, { cdId: 'GRP1', dtlCd: 'STOP' }));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('중지') }));
  });

  it('상세 코드 삭제는 같은 tick 중복 실행을 막고 pending·실패를 안내한다', async () => {
    const pending = deferred<{ success: boolean; message: string }>();
    mocks.deleteDetail.mockReturnValueOnce(pending.promise);
    renderClient();
    const deleteButton = await screen.findByRole('button', { name: '중지 코드 삭제' });

    act(() => {
      deleteButton.click();
      deleteButton.click();
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.deleteDetail).toHaveBeenCalledTimes(1));
    const pendingButton = screen.getByRole('button', { name: '중지 코드 삭제 중…' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');

    await act(async () => pending.reject(new Error('network down')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('네트워크 오류가 발생했습니다.', 'error'));
  });

  it('상세 코드 삭제 중에는 신규 등록·수정으로 작업 대상을 바꾸지 않는다', async () => {
    const pending = deferred<{ success: boolean; message: string }>();
    mocks.deleteDetail.mockReturnValueOnce(pending.promise);
    renderClient();
    const deleteButton = await screen.findByRole('button', { name: '중지 코드 삭제' });

    fireEvent.click(deleteButton);
    await waitFor(() => expect(mocks.deleteDetail).toHaveBeenCalledTimes(1));

    const createButton = screen.getByRole('button', { name: '신규 상세 코드 등록' });
    const editButton = screen.getByRole('button', { name: '활성 코드 수정' });
    expect(createButton).toBeDisabled();
    expect(editButton).toBeDisabled();
    fireEvent.click(createButton);
    fireEvent.click(editButton);
    expect(screen.queryByRole('region', { name: /명세/ })).not.toBeInTheDocument();

    await act(async () => pending.reject(new Error('delete failed')));
    await waitFor(() => expect(createButton).toBeEnabled());
  });

  it('maps server-action field errors back to the editable detail form', async () => {
    mocks.saveDetail.mockResolvedValueOnce({
      success: false,
      message: '입력값을 확인해 주세요.',
      fieldErrors: { dtlCdNm: '코드 명칭은 이미 사용 중입니다.' },
    });
    renderClient();
    expect(await screen.findByText('활성')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '신규 상세 코드 등록' }));
    fireEvent.click(within(screen.getByRole('region', { name: '신규 명세 등록' })).getByRole('button', { name: /저장$/ }));

    await waitFor(() => expect(mocks.applyServerErrors).toHaveBeenCalledWith(expect.objectContaining({
      fieldErrors: { dtlCdNm: '코드 명칭은 이미 사용 중입니다.' },
    })));
    expect(mocks.toast).not.toHaveBeenCalledWith('입력값을 확인해 주세요.', 'error');
  });

  it('keeps the modal save target bound to the group that opened it', async () => {
    const view = renderClient('GRP1');
    const invalidateQueries = vi.spyOn(view.client, 'invalidateQueries');
    expect(await screen.findByText('활성')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '활성 코드 수정' }));
    await waitFor(() => expect(mocks.reset).toHaveBeenCalled());
    const resetCallCount = mocks.reset.mock.calls.length;

    view.rerenderClient('GRP2');
    const editModal = screen.getByRole('region', { name: '아키텍처 명세 수정' });
    expect(editModal).toHaveTextContent('GRP1');
    expect(mocks.reset).toHaveBeenCalledTimes(resetCallCount);
    fireEvent.click(within(editModal).getByRole('button', { name: /저장$/ }));

    await waitFor(() => expect(mocks.saveDetail).toHaveBeenCalledWith(null, expect.objectContaining({
      cdId: 'GRP1', isNew: false,
    })));
    expect(mocks.saveDetail).not.toHaveBeenCalledWith(null, expect.objectContaining({ cdId: 'GRP2' }));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['cmmn-detail-codes', 'GRP1'] });
  });

  it('does not close or replace a detail modal while its save is pending', async () => {
    const view = renderClient('GRP1');
    expect(await screen.findByText('활성')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '신규 상세 코드 등록' }));
    expect(screen.getByRole('region', { name: '신규 명세 등록' })).toBeVisible();

    mocks.isSubmitting = true;
    view.rerenderClient('GRP1');
    const pendingModal = screen.getByRole('region', { name: '신규 명세 등록' });
    expect(within(pendingModal).getByRole('button', { name: '취소' })).toBeDisabled();
    fireEvent.click(within(pendingModal).getByRole('button', { name: '모달 닫기 요청' }));
    expect(screen.getByRole('region', { name: '신규 명세 등록' })).toBeVisible();

    mocks.isSubmitting = false;
    view.rerenderClient('GRP1');
    fireEvent.click(within(screen.getByRole('region', { name: '신규 명세 등록' })).getByRole('button', { name: '취소' }));
    expect(screen.queryByRole('region', { name: '신규 명세 등록' })).not.toBeInTheDocument();
  });

  it('상세 저장 중 취소·삭제를 막고 structured 오류 뒤에도 modal·값·summary를 보존한다', async () => {
    const pending = deferred<{ success: boolean; message: string; fieldErrors?: Record<string, string> }>();
    mocks.saveDetail.mockReturnValueOnce(pending.promise);
    renderClient();
    expect(await screen.findByText('활성')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '활성 코드 수정' }));
    const modal = screen.getByRole('region', { name: '아키텍처 명세 수정' });
    const saveButton = within(modal).getByRole('button', { name: /저장$/ });
    const cancelButton = within(modal).getByRole('button', { name: '취소' });

    act(() => {
      saveButton.click();
      cancelButton.click();
      within(modal).getByRole('button', { name: '모달 닫기 요청' }).click();
    });

    await waitFor(() => expect(mocks.saveDetail).toHaveBeenCalledTimes(1));
    expect(cancelButton).toBeDisabled();
    const deleteButton = screen.getByRole('button', { name: '중지 코드 삭제' });
    expect(deleteButton).toBeDisabled();
    fireEvent.click(deleteButton);
    expect(mocks.deleteDetail).not.toHaveBeenCalled();

    await act(async () => pending.resolve({
      success: false,
      message: '입력값을 확인하세요.',
      fieldErrors: { dtlCdNm: '이미 사용 중인 코드 명칭입니다.' },
    }));

    await waitFor(() => expect(mocks.applyServerErrors).toHaveBeenCalledWith(expect.objectContaining({
      fieldErrors: { dtlCdNm: '이미 사용 중인 코드 명칭입니다.' },
    })));
    const preservedModal = screen.getByRole('region', { name: '아키텍처 명세 수정' });
    expect(within(preservedModal).getByTestId('common-code-form-error-summary')).toBeInTheDocument();
    expect(within(preservedModal).getByPlaceholderText(/레이블 명칭 입력/)).toHaveValue('신규 코드');
    expect(within(preservedModal).getByRole('button', { name: '취소' })).toBeEnabled();
  });

  it('moves a group to another classification and persists only that membership', async () => {
    const view = renderClient(null);
    const saveButton = screen.getByRole('button', { name: '그룹 소속 저장' });
    expect(saveButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '드래그 시작' }));
    expect(mocks.useSortable).not.toHaveBeenCalledWith({ id: 'GRP1', disabled: true });
    fireEvent.click(screen.getByRole('button', { name: '다른 분류로 드래그 완료' }));
    expect(screen.getByRole('button', { name: '사용자 상태 (GRP1) 선택' })).toHaveAttribute('aria-current', 'true');
    expect(saveButton).toBeEnabled();

    view.rerenderClient('GRP2');
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);
    await waitFor(() => expect(mocks.saveHierarchy).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'GRP1', parentId: 'OTHER', type: 'group' }),
    ])));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('blocks additional group moves while a hierarchy save is in flight and reports failure', async () => {
    let rejectSave: ((reason?: unknown) => void) | undefined;
    mocks.saveHierarchy.mockImplementation(() => new Promise((_resolve, reject) => {
      rejectSave = reject;
    }));
    renderClient(null);

    fireEvent.click(screen.getByRole('button', { name: '드래그 시작' }));
    fireEvent.click(screen.getByRole('button', { name: '다른 분류로 드래그 완료' }));
    const saveButton = screen.getByRole('button', { name: '그룹 소속 저장' });
    act(() => {
      saveButton.click();
      saveButton.click();
    });
    await waitFor(() => expect(mocks.saveHierarchy).toHaveBeenCalledTimes(1));
    const savingButton = await screen.findByRole('button', { name: '그룹 소속 저장 중…' });
    expect(savingButton).toBeDisabled();
    expect(savingButton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: '게시 상태 (GRP2) 소속 분류 이동 핸들 — 현재 업무 도메인 분류' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '두 번째 그룹 드래그 시작' }));
    fireEvent.click(screen.getByRole('button', { name: '두 번째 그룹 드래그 완료' }));
    await act(async () => rejectSave?.(new Error('hierarchy unavailable')));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('그룹 소속 저장 중 오류 발생', 'error'));
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '그룹 소속 저장' })).toBeEnabled();
  });

  it('does not mark same-classification drops as persistable order changes', () => {
    renderClient(null);
    const saveButton = screen.getByRole('button', { name: '그룹 소속 저장' });
    fireEvent.click(screen.getByRole('button', { name: '드래그 시작' }));
    fireEvent.click(screen.getByRole('button', { name: '같은 분류에서 드래그 완료' }));

    expect(saveButton).toBeDisabled();
    expect(mocks.toast).toHaveBeenCalledWith(
      '같은 분류 안의 순서는 저장되지 않습니다. 다른 분류로 이동해 주세요.',
      'info',
    );
    expect(mocks.saveHierarchy).not.toHaveBeenCalled();
  });

  it('runs the hierarchy save shortcut only after drag selection creates a change', async () => {
    renderClient(null);
    const firstGroup = screen.getByRole('button', { name: '사용자 상태 (GRP1) 선택' });

    fireEvent.keyDown(firstGroup, { key: 's', ctrlKey: true });
    expect(mocks.saveHierarchy).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '드래그 시작' }));
    fireEvent.click(screen.getByRole('button', { name: '다른 분류로 드래그 완료' }));
    fireEvent.keyDown(firstGroup, { key: 's', ctrlKey: true });

    await waitFor(() => expect(mocks.saveHierarchy).toHaveBeenCalledTimes(1));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('requires a group before opening the create modal', async () => {
    renderClient(null);
    expect(within(screen.getByTestId('master-detail-detail')).getByRole('status')).toHaveTextContent('선택된 코드 없음');
    expect(screen.getByRole('button', { name: '그룹 소속 저장' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '게시 상태 (GRP2) 선택' }));
    expect(await screen.findByText('게시 상태 그룹')).toBeInTheDocument();
  });
});
