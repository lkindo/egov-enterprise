/**
 * 공통코드 — 분류·그룹(구조) 편집 배선 계약.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 이 화면은 **상세 코드만** 만들고 고칠 수 있었다. 그 상위인 코드 분류와 코드 그룹은
 * 서버(POST/PUT `/codes/cl`·`/codes/cmmn`)와 프런트 서비스(`createClCode` 등 6개)에 전부
 * 살아 있는데 **화면이 노출하지 않았다.** 그래서 새 코드 체계를 도입하려면 DB 를 직접
 * 건드려야 했고, 분류명 오타 수정도 불가능했다.
 *
 * 배선 자체보다 **두 가지 거짓말을 막는 것**이 이 테스트의 핵심이다.
 *
 * 1) 소속 분류는 수정 화면에서 바꿀 수 없다. 서버의 `updateCmmnCode` 는 명칭·설명·사용여부만
 *    갱신하고 `clsfCd` 를 건드리지 않는다(`CommonCodeGroup#update`). 편집 가능한 컨트롤을
 *    두면 저장 성공 토스트가 뜨는데 소속은 그대로인 상태가 된다.
 *
 * 2) 분류를 미사용(useYn='N')으로 바꾸면 **소속 코드 그룹이 전부 목록에서 사라진다.**
 *    코드그룹 조회가 `commonCodeCategory.useYn.eq("Y")` 로 조인 필터를 걸기 때문이다
 *    (`CommonCodeGroupRepositoryImpl`). 데이터가 지워지는 것은 아니지만 사용자에게는
 *    없어진 것처럼 보이므로 저장 전에 결과를 말해야 한다.
 */

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
  saveClCode: vi.fn(),
  saveCmmnCode: vi.fn(),
  useSortable: vi.fn(),
  /** useAppForm 목이 폼별로 돌려줄 값. 테스트가 케이스마다 바꾼다. */
  formValues: {} as Record<string, unknown>,
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
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
  StandardModal: ({ isOpen, title, footer, children }: any) => isOpen
    ? <section aria-label={title}>{children}{footer}</section>
    : null,
}));
vi.mock('@/app/components/ui/code-picker', () => ({ CodePicker: () => null }));
vi.mock('@/components/ui/hub/HubStatusBadge', () => ({
  HubStatusBadge: ({ status }: any) => <span>{status}</span>,
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: () => <div data-testid="common-code-detail-table" />,
}));

const clCodes = [
  { clsfCd: 'DOMAIN', clsfCdNm: '업무 도메인', clsfCdExpln: '업무 축', useYn: 'Y' },
  { clsfCd: 'OTHER', clsfCdNm: '기타 분류', clsfCdExpln: '', useYn: 'Y' },
];
const groups = [
  { clsfCd: 'DOMAIN', cdId: 'GRP1', cdIdNm: '사용자 상태', cdIdExpln: '사용자 상태 그룹', useYn: 'Y' },
  { clsfCd: 'DOMAIN', cdId: 'GRP2', cdIdNm: '게시 상태', cdIdExpln: '게시 상태 그룹', useYn: 'Y' },
];

function renderClient(selectedGroupId: string | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CommonCodeClient
        clCodes={clCodes as any}
        groups={groups as any}
        details={[] as any}
        selectedGroupId={selectedGroupId}
      />
    </QueryClientProvider>,
  );
}

describe('공통코드 — 분류·그룹 구조 편집', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.formValues = {};
    mocks.getDetails.mockResolvedValue({ list: [], total: 0 });
    mocks.confirm.mockResolvedValue(true);
    mocks.saveClCode.mockResolvedValue({ success: true, message: '저장됨' });
    mocks.saveCmmnCode.mockResolvedValue({ success: true, message: '저장됨' });
    mocks.useSortable.mockReturnValue({
      attributes: {}, listeners: {}, setNodeRef: vi.fn(),
      setActivatorNodeRef: vi.fn(), transform: null, transition: undefined, isDragging: false,
    });
  });

  it('분류·그룹 등록 진입점을 화면이 제공한다 — 종전에는 DB 를 직접 건드려야 했다', () => {
    renderClient();
    expect(screen.getByRole('button', { name: '분류 등록' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '그룹 등록' })).toBeEnabled();
  });

  it('분류가 하나도 없으면 그룹 등록을 막는다 — 서버가 소속 분류를 필수로 요구한다', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <CommonCodeClient clCodes={[] as any} groups={[] as any} details={[] as any} selectedGroupId={null} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: '그룹 등록' })).toBeDisabled();
  });

  it('분류를 선택하면 분류 수정을, 그룹을 선택하면 그룹 수정을 제공한다', () => {
    renderClient('GRP1');
    expect(screen.getByRole('button', { name: /그룹 수정/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /분류 수정/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '업무 도메인 (DOMAIN) 선택' }));
    expect(screen.getByRole('button', { name: /분류 수정/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /그룹 수정/ })).not.toBeInTheDocument();
  });

  it('그룹 수정 창은 소속 분류를 편집 컨트롤로 두지 않는다 — 서버가 clsfCd 를 갱신하지 않는다', () => {
    renderClient('GRP1');
    fireEvent.click(screen.getByRole('button', { name: /그룹 수정/ }));

    const modal = screen.getByRole('region', { name: '코드 그룹 수정' });
    expect(modal).toHaveTextContent('DOMAIN');
    // 편집 가능한 것처럼 보이면 "저장했는데 소속이 그대로"인 침묵 실패가 된다.
    expect(modal).toHaveTextContent('소속 분류는 이 창에서 바꿀 수 없습니다');
  });

  it('그룹 등록은 소속 분류를 선택지로 제공한다 — 등록 시에는 서버가 실제로 반영한다', () => {
    renderClient();
    fireEvent.click(screen.getByRole('button', { name: '그룹 등록' }));

    const modal = screen.getByRole('region', { name: '코드 그룹 등록' });
    expect(modal).toHaveTextContent('업무 도메인 (DOMAIN)');
    expect(modal).toHaveTextContent('기타 분류 (OTHER)');
    expect(modal).not.toHaveTextContent('소속 분류는 이 창에서 바꿀 수 없습니다');
  });

  it('분류를 미사용으로 바꾸기 전에 소속 그룹이 함께 사라진다고 고지한다', async () => {
    renderClient();
    fireEvent.click(screen.getByRole('button', { name: '업무 도메인 (DOMAIN) 선택' }));
    fireEvent.click(screen.getByRole('button', { name: /분류 수정/ }));

    // 폼 목은 reset 으로 채워진 값을 그대로 제출한다. 사용자가 미사용으로 바꾼 상태를 만든다.
    mocks.formValues = { ...mocks.formValues, useYn: 'N' };
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    const message = String(mocks.confirm.mock.calls[0][0].message);
    expect(message).toContain('2개');
    expect(message).toContain('사라집니다');
    await waitFor(() => expect(mocks.saveClCode).toHaveBeenCalledTimes(1));
  });

  it('고지를 취소하면 저장하지 않는다', async () => {
    mocks.confirm.mockResolvedValue(false);
    renderClient();
    fireEvent.click(screen.getByRole('button', { name: '업무 도메인 (DOMAIN) 선택' }));
    fireEvent.click(screen.getByRole('button', { name: /분류 수정/ }));

    mocks.formValues = { ...mocks.formValues, useYn: 'N' };
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.saveClCode).not.toHaveBeenCalled();
  });

  it('소속 그룹이 없는 분류는 고지 없이 바로 저장한다 — 사라질 것이 없다', async () => {
    renderClient();
    fireEvent.click(screen.getByRole('button', { name: '기타 분류 (OTHER) 선택' }));
    fireEvent.click(screen.getByRole('button', { name: /분류 수정/ }));

    mocks.formValues = { ...mocks.formValues, useYn: 'N' };
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(mocks.saveClCode).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('저장에 성공하면 목록을 다시 읽는다 — 새 분류·그룹이 즉시 트리에 나타나야 한다', async () => {
    renderClient();
    fireEvent.click(screen.getByRole('button', { name: '분류 등록' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(mocks.saveClCode).toHaveBeenCalledTimes(1));
    expect(mocks.saveClCode.mock.calls[0][1]).toMatchObject({ isNew: true });
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it('수정 저장은 isNew=false 로 나간다 — 뒤집히면 등록으로 가서 중복 오류가 난다', async () => {
    renderClient('GRP1');
    fireEvent.click(screen.getByRole('button', { name: /그룹 수정/ }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(mocks.saveCmmnCode).toHaveBeenCalledTimes(1));
    expect(mocks.saveCmmnCode.mock.calls[0][1]).toMatchObject({ isNew: false });
  });
});
