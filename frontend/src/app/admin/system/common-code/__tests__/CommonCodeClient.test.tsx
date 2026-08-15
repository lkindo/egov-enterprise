import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  reset: vi.fn(),
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
    formState: { isSubmitting: false },
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
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <span>{children}</span>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span>사용 중</span>,
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragStart, onDragEnd }: any) => (
    <div>
      {children}
      <button type="button" onClick={() => onDragStart({ active: { id: 'GRP1' } })}>드래그 시작</button>
      <button type="button" onClick={() => onDragEnd({ active: { id: 'GRP1' }, over: { id: 'GRP2' } })}>드래그 완료</button>
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
  useSortable: () => ({
    attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null,
    transition: undefined, isDragging: false,
  }),
}));
vi.mock('@dnd-kit/utilities', () => ({ CSS: { Translate: { toString: () => '' } } }));

vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, title, footer, children }: any) => isOpen
    ? <section aria-label={title}>{children}{footer}</section>
    : null,
}));
vi.mock('@/components/ui/hub/HubStatusBadge', () => ({
  HubStatusBadge: ({ status }: any) => <span>{status}</span>,
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data, onRetry }: any) => (
    <div>
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
];
const groups = [
  { clsfCd: 'DOMAIN', cdId: 'GRP1', cdIdNm: '사용자 상태', cdIdExpln: '사용자 상태 그룹' },
  { clsfCd: 'DOMAIN', cdId: 'GRP2', cdIdNm: '게시 상태', cdIdExpln: '게시 상태 그룹' },
];
const details = [
  { cdId: 'GRP1', dtlCd: 'ACTIVE', dtlCdNm: '활성', dtlCdExpln: '정상 사용', useYn: 'Y' },
  { cdId: 'GRP1', dtlCd: 'STOP', dtlCdNm: '중지', dtlCdExpln: '', useYn: 'N' },
];

function renderClient(selectedGroupId: string | null = 'GRP1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CommonCodeClient
        clCodes={clCodes as any}
        groups={groups as any}
        details={details as any}
        selectedGroupId={selectedGroupId}
      />
    </QueryClientProvider>,
  );
}

describe('CommonCodeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.getDetails.mockResolvedValue({ list: [...details, { cdId: 'OTHER', dtlCd: 'X' }] });
    mocks.saveDetail.mockResolvedValue({ success: true, message: '코드 저장 완료' });
    mocks.deleteDetail.mockResolvedValue({ success: true, message: '코드 삭제 완료' });
    mocks.saveHierarchy.mockResolvedValue({ success: true, message: '계층 저장 완료' });
  });

  it('loads only selected-group details and supports search with an honest empty state', async () => {
    renderClient();

    expect(await screen.findByText('활성')).toBeInTheDocument();
    expect(screen.getByText('중지')).toBeInTheDocument();
    expect(screen.queryByText('X')).not.toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: '코드 분류·그룹 검색' }), {
      target: { value: '존재하지않음' },
    });
    expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
  });

  it('edits, creates and deletes detail codes against the selected group', async () => {
    renderClient();
    expect(await screen.findByText('활성')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '활성 코드 수정' }));
    expect(screen.getByRole('region', { name: '아키텍처 명세 수정' })).toHaveTextContent('GRP1');
    fireEvent.click(screen.getByRole('button', { name: /저장$/ }));
    await waitFor(() => expect(mocks.saveDetail).toHaveBeenCalledWith(null, expect.objectContaining({
      cdId: 'GRP1', isNew: false,
    })));

    fireEvent.click(screen.getByRole('button', { name: /신규 등록/ }));
    fireEvent.click(screen.getByRole('button', { name: /저장$/ }));
    await waitFor(() => expect(mocks.saveDetail).toHaveBeenLastCalledWith(null, expect.objectContaining({
      cdId: 'GRP1', isNew: true,
    })));

    fireEvent.click(screen.getByRole('button', { name: '중지 코드 삭제' }));
    await waitFor(() => expect(mocks.deleteDetail).toHaveBeenCalledWith(null, { cdId: 'GRP1', dtlCd: 'STOP' }));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('중지') }));
  });

  it('reorders and persists the code hierarchy', async () => {
    renderClient();
    await screen.findByText('활성');
    fireEvent.click(screen.getByRole('button', { name: '드래그 시작' }));
    fireEvent.click(screen.getByRole('button', { name: '드래그 완료' }));
    expect(screen.getByRole('button', { name: '변경한 코드 계층 구조 저장' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '변경한 코드 계층 구조 저장' }));
    await waitFor(() => expect(mocks.saveHierarchy).toHaveBeenCalled());
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('requires a group before opening the create modal', async () => {
    renderClient(null);
    expect(await screen.findByText('선택된 코드 없음')).toBeInTheDocument();
    fireEvent.click(screen.getByText('게시 상태'));
    expect(await screen.findByText('게시 상태 그룹')).toBeInTheDocument();
  });
});
