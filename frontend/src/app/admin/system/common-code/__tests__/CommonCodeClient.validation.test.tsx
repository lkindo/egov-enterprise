import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommonCodeClient from '../CommonCodeClient';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  getDetails: vi.fn(),
  saveDetail: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/CodeAdminService', () => ({
  codeAdminService: { getDetailCodeList: (...args: unknown[]) => mocks.getDetails(...args) },
}));
vi.mock('@/app/actions/codeActions', () => ({
  saveCodeDetail: (...args: unknown[]) => mocks.saveDetail(...args),
  deleteCodeDetail: vi.fn(),
  saveCmmnCodeHierarchyAction: vi.fn(),
}));
vi.mock('@/app/components/patterns/master-detail-page', () => ({
  MasterDetailPage: ({ title, actions, master, detailActions, detail }: {
    title: string;
    actions?: ReactNode;
    master?: ReactNode;
    detailActions?: ReactNode;
    detail?: ReactNode;
  }) => <main><h1>{title}</h1>{actions}{master}{detailActions}{detail}</main>,
}));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, title, children, footer }: {
    isOpen: boolean;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
  }) => isOpen ? <section aria-label={title}>{children}{footer}</section> : null,
}));
vi.mock('@/app/components/ui/code-picker', () => ({ CodePicker: () => null }));
vi.mock('@/app/components/ui/standard-data-table', () => ({ StandardDataTable: () => <div /> }));
vi.mock('@/components/ui/hub/HubStatusBadge', () => ({ HubStatusBadge: () => <span /> }));
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  KeyboardSensor: function KeyboardSensor() {},
  PointerSensor: function PointerSensor() {},
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  DragOverlay: ({ children }: { children: ReactNode }) => <>{children}</>,
  defaultDropAnimationSideEffects: vi.fn(() => vi.fn()),
  MeasuringStrategy: { Always: 'always' },
}));
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <>{children}</>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));
vi.mock('@dnd-kit/utilities', () => ({ CSS: { Translate: { toString: () => '' } } }));

const clCodes = [{ clsfCd: 'DOMAIN', clsfCdNm: '업무 도메인' }];
const groups = [{ clsfCd: 'DOMAIN', cdId: 'GRP1', cdIdNm: '사용자 상태', cdIdExpln: '사용자 상태 그룹' }];

function renderClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CommonCodeClient
        clCodes={clCodes as never[]}
        groups={groups as never[]}
        details={[]}
        selectedGroupId="GRP1"
      />
    </QueryClientProvider>,
  );
}

function openCreateModal() {
  renderClient();
  fireEvent.click(screen.getByRole('button', { name: /신규 상세 코드 등록/ }));
}

describe('CommonCodeClient real form validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.getDetails.mockResolvedValue({ list: [] });
    mocks.saveDetail.mockResolvedValue({ success: true, message: '저장 완료' });
  });

  it('invalid submit을 write하지 않고 summary와 첫 필드로 연결한다', async () => {
    openCreateModal();
    const code = screen.getByRole('textbox', { name: /^코드 식별자/ });

    fireEvent.click(screen.getByRole('button', { name: /^저장$/ }));

    expect(await screen.findByText('코드 식별자를 입력해 주세요.')).toBeVisible();
    expect(mocks.saveDetail).not.toHaveBeenCalled();
    expect(code).toHaveAttribute('aria-required', 'true');
    expect(code).toHaveAttribute('aria-invalid', 'true');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(/입력 오류/);
    await waitFor(() => expect(code).toHaveFocus());
  });

  it('Server Action fieldErrors를 inline으로 표시하고 입력값과 모달을 보존한다', async () => {
    const message = '코드 명칭은 이미 사용 중입니다.';
    mocks.saveDetail.mockResolvedValueOnce({
      success: false,
      message: '입력값을 확인해 주세요.',
      fieldErrors: { dtlCdNm: message },
    });
    openCreateModal();
    fireEvent.change(screen.getByRole('textbox', { name: /^코드 식별자/ }), { target: { value: 'NEW' } });
    const name = screen.getByRole('textbox', { name: /^표기 레이블/ });
    fireEvent.change(name, { target: { value: '사용자가 입력한 코드명' } });

    fireEvent.click(screen.getByRole('button', { name: /^저장$/ }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(name).toHaveValue('사용자가 입력한 코드명');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(name).toHaveFocus());
    expect(screen.getByRole('region', { name: '신규 명세 등록' })).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalledWith('입력값을 확인해 주세요.', 'error');
  });
});
