import { act } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ addReferences: vi.fn(), checkApprovers: vi.fn(), searchAssignableUsers: vi.fn(), toast: vi.fn(), confirm: vi.fn() }));
// 지금 차례인 결재자. 참조자 추가는 결재 권한(APPROVAL_APPROVE)으로 보이고, 자격 확인은 기안 권한(APPROVAL_CREATE)이 있어야 부른다.
const auth = vi.hoisted(() => ({ user: { esntlId: 'APPROVER', authorizationVersion: 'test-v1', permissions: ['APPROVAL_APPROVE', 'APPROVAL_CREATE'] as string[] } }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('@/services/business/user/approval/ApprovalUserService', () => ({
  approvalUserService: { addReferences: mocks.addReferences, checkApprovers: mocks.checkApprovers },
}));
vi.mock('@/services/business/user/UserSearchService', () => ({ userSearchService: { searchAssignableUsers: mocks.searchAssignableUsers } }));
import { ApprovalReferencePanel } from '../ApprovalReferencePanel';
import { approvalKeys } from '@/queries/approval-query-options';

// 최참조는 결재 권한이 없지만 결재 조회 권한이 있다. 정참조는 결재 조회 권한이 없다.
const PEOPLE = [['READER', '최참조'], ['NOREAD', '정참조'], ['APPROVER', '김결재'], ['DRAFTER', '홍기안'], ['OLDREF', '구참조']]
  .map(([esntlId, userNm]) => ({ esntlId, userNm, deptNm: '총무팀', absent: false }));
const profile = (id: string) => ({
  esntlId: id, eligible: id !== 'READER', ineligibleReason: id === 'READER' ? 'NO_PERMISSION' : undefined,
  referenceEligible: id !== 'NOREAD', referenceIneligibleReason: id === 'NOREAD' ? 'NO_READ_PERMISSION' : undefined,
});
const DOCUMENT = {
  ifmlAtrzSn: 31, docTtl: '출장비 정산', aplcntId: 'DRAFTER', aprvYn: 'A', atrzCycl: 1, version: 4, canApprove: true, canAddReference: true,
  stages: [{ order: 1, kind: 'APPROVAL' as const, status: 'ACTIVE' as const, approvers: [{ userId: 'APPROVER', userNm: '김결재', status: 'ACTIVE' as const }] }],
  references: [{ userId: 'OLDREF', userNm: '구참조', deptNm: '총무팀', atrzCycl: 1, designator: 'APPROVER' as const }],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function renderPanel(document: Record<string, unknown> = DOCUMENT, disabled = false) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const view = render(<QueryClientProvider client={queryClient}><ApprovalReferencePanel document={document as never} disabled={disabled} /></QueryClientProvider>);
  return { ...view, invalidate };
}

async function searchIn(picker: HTMLElement, name: string) {
  fireEvent.change(within(picker).getByRole('textbox', { name: '참조자 이름 검색' }), { target: { value: name } });
  fireEvent.click(within(picker).getByRole('button', { name: '찾기' }));
  await within(picker).findByText(/명을 찾았습니다|찾는 사람이 없습니다/);
}

/** '참조자 추가' 를 펼쳐 한 사람을 고른다(아직 지정하지 않는다). */
async function choose(name: string) {
  fireEvent.click(screen.getByRole('button', { name: '참조자 추가' }));
  const picker = await screen.findByRole('group', { name: '참조자 고르기' });
  await searchIn(picker, name);
  const candidate = await within(picker).findByRole('button', { name: new RegExp(`^${name}`) });
  await waitFor(() => expect(candidate).toBeEnabled());
  fireEvent.click(candidate);
  return picker;
}

describe('ApprovalReferencePanel (D4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user.permissions = ['APPROVAL_APPROVE', 'APPROVAL_CREATE'];
    mocks.confirm.mockResolvedValue(true);
    mocks.addReferences.mockResolvedValue(1);
    mocks.searchAssignableUsers.mockImplementation(async (keyword: string) => PEOPLE.filter(person => person.userNm.includes(keyword)));
    mocks.checkApprovers.mockImplementation(async (ids: string[]) => ids.map(profile));
  });

  it('참조자 목록은 누가 지정했는지와 지정 차수를 보이고, 서버 힌트와 결재 권한이 모두 있을 때만 결재자의 참조자 추가를 연다', () => {
    const first = renderPanel();
    const list = screen.getByRole('list', { name: '참조자 목록' });
    expect(list).toHaveTextContent('구참조');
    expect(list).toHaveTextContent('1차 · 결재자가 추가');
    expect(screen.getByRole('heading', { name: '참조자 (1명)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '참조자 추가' })).toBeInTheDocument();
    first.unmount();

    // 기안자가 이 차수에 지정했거나 차례가 아니면 서버가 힌트를 끈다 — 목록이 비었는지로 추론하지 않는다.
    const hinted = renderPanel({ ...DOCUMENT, canAddReference: false, references: [] });
    expect(hinted.container).toBeEmptyDOMElement();
    hinted.unmount();
    const listed = renderPanel({ ...DOCUMENT, canAddReference: false });
    expect(screen.getByRole('list', { name: '참조자 목록' })).toHaveTextContent('구참조');
    expect(screen.queryByRole('button', { name: '참조자 추가' })).not.toBeInTheDocument();
    listed.unmount();

    // 결재 권한이 방금 회수돼 상세가 낡았어도 버튼을 남기지 않는다.
    auth.user.permissions = ['APPROVAL_CREATE'];
    renderPanel();
    expect(screen.queryByRole('button', { name: '참조자 추가' })).not.toBeInTheDocument();
  });

  it('참조자 고르기는 결재 조회 권한으로 판정하고, 결재선·기안자·이미 참조자인 사람은 사유와 함께 막는다', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '참조자 추가' }));
    expect(screen.getByRole('button', { name: '참조자 추가' })).toHaveAttribute('aria-expanded', 'true');
    const picker = await screen.findByRole('group', { name: '참조자 고르기' });
    await searchIn(picker, '참조');
    await waitFor(() => expect(within(picker).getByRole('button', { name: /^정참조.*결재 조회 권한 없음/ })).toBeDisabled());
    // 결재 권한만 없는 사람은 참조자가 될 수 있다.
    expect(within(picker).getByRole('button', { name: /^최참조/ })).toBeEnabled();
    expect(within(picker).getByRole('button', { name: /^구참조.*이미 이 차수의 참조자입니다/ })).toBeDisabled();
    await searchIn(picker, '홍기안');
    expect(within(picker).getByRole('button', { name: /^홍기안.*기안자입니다/ })).toBeDisabled();
    await searchIn(picker, '김결재');
    expect(within(picker).getByRole('button', { name: /^김결재.*본인/ })).toBeDisabled();
    expect(mocks.addReferences).not.toHaveBeenCalled();
  });

  it('참조는 차수마다 기록된다 — 이전 차수에만 지정된 참조자는 이 차수에 다시 지정할 수 있고 20명 자리를 더 차지하지 않는다', async () => {
    // 2차 문서. 구참조는 1차에 지정됐고 이 차수에는 아직 아니다. 나머지 19명은 이 차수에 다른 결재자가 더했다 — 기안자가 이 차수에
    // 지정했다면 서버가 결재자 추가 힌트를 끄므로(규칙 3) 이 상태는 결재자가 더한 경우에만 생긴다. 문서에 이미 20명이 참조돼 있다.
    const nineteen = Array.from({ length: 19 }, (_, index) => ({ userId: `R${index}`, userNm: `참조${index}`, atrzCycl: 2, designator: 'APPROVER' as const }));
    renderPanel({ ...DOCUMENT, atrzCycl: 2, references: [...DOCUMENT.references, ...nineteen] });
    const picker = await choose('구참조');
    expect(screen.getByRole('list', { name: '추가할 참조자' })).toHaveTextContent('구참조');
    // 처음 참조되는 사람은 자리가 없어 막힌다.
    await searchIn(picker, '최참조');
    expect(within(picker).getByRole('button', { name: /^최참조.*지정 한도에 도달했습니다/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '참조자 지정 (1명)' }));
    await waitFor(() => expect(mocks.addReferences).toHaveBeenCalledWith(31, ['OLDREF'], 4));
  });

  it('기안 권한이 없는 결재자에게는 자격 확인을 부르지 않는다 — 지정할 때 서버가 같은 규칙으로 본다', async () => {
    auth.user.permissions = ['APPROVAL_APPROVE'];
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '참조자 추가' }));
    const picker = await screen.findByRole('group', { name: '참조자 고르기' });
    await searchIn(picker, '참조');
    expect(within(picker).getByRole('button', { name: /^정참조/ })).toBeEnabled();
    expect(mocks.checkApprovers).not.toHaveBeenCalled();
    // 고를 수 있다고 말하지 않고, 지정할 때 서버가 확인한다고 말한다. 고른 사람이 바로 지정된다고도 하지 않는다.
    expect(within(picker).getByText('고른 사람은 ‘추가할 참조자’ 에 모이고, ‘참조자 지정’ 을 눌러야 지정됩니다. 결재 조회 권한과 사용 여부는 지정할 때 서버가 확인합니다.')).toBeInTheDocument();
    expect(within(picker).queryByText(/바로 참조자 목록에 들어가고/)).not.toBeInTheDocument();
  });

  it('참조자 지정은 한 번만 보내고 보내는 동안 다시 누를 수 없으며, 실패하면 고른 사람을 남긴 채 사유를 보인다', async () => {
    // 지역 이름은 census 가 세는 write sink(addReferencesMutation.mutateAsync)와 같은 이름으로 둔다.
    const addReferencesMutation = mocks.addReferences;
    const pending = deferred<number>();
    addReferencesMutation.mockReturnValueOnce(pending.promise);
    renderPanel();
    await choose('최참조');
    const submit = screen.getByRole('button', { name: '참조자 지정 (1명)' });

    act(() => { fireEvent.click(submit); fireEvent.click(submit); });

    await waitFor(() => expect(addReferencesMutation).toHaveBeenCalledTimes(1));
    expect(addReferencesMutation).toHaveBeenCalledWith(31, ['READER'], 4);
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    await act(async () => { pending.reject(new Error('지금 차례인 결재자만 참조자를 더할 수 있습니다.')); });

    expect(await screen.findByRole('alert')).toHaveTextContent('지금 차례인 결재자만 참조자를 더할 수 있습니다. 고른 사람은 그대로 두었습니다.');
    expect(screen.getByRole('list', { name: '추가할 참조자' })).toHaveTextContent('최참조');
    expect(submit).toBeEnabled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it('지정 전에 되돌릴 수 없음을 이름과 함께 확인받고, 취소하면 보내지 않는다', async () => {
    mocks.confirm.mockResolvedValueOnce(false);
    renderPanel();
    await choose('최참조');
    fireEvent.click(screen.getByRole('button', { name: '참조자 지정 (1명)' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    const request = mocks.confirm.mock.calls[0][0];
    expect(request.message).toContain('‘출장비 정산’ 문서에 1명을 참조자로 지정합니다: 최참조.');
    expect(request.message).toContain('지정은 되돌릴 수 없습니다.');
    expect(request.confirmText).toBe('참조자 지정');
    expect(mocks.addReferences).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: '참조자 지정 (1명)' })).toBeEnabled());
  });

  it('지정하면 읽은 버전으로 보내고 고른 사람을 비우며 알린다', async () => {
    mocks.addReferences.mockResolvedValueOnce(1);
    renderPanel();
    await choose('최참조');
    fireEvent.click(screen.getByRole('button', { name: '참조자 지정 (1명)' }));
    await waitFor(() => expect(mocks.addReferences).toHaveBeenCalledWith(31, ['READER'], 4));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('1명을 참조자로 지정했습니다. 이 문서에 처음 지정된 사람에게 알림이 갑니다.', 'success'));
    expect(screen.queryByRole('list', { name: '추가할 참조자' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '참조자 고르기' })).not.toBeInTheDocument();
  });

  it('다른 곳에서 문서가 바뀌었으면(409) 서버 사유를 보이고 그 문서와 목록을 다시 읽는다', async () => {
    mocks.addReferences.mockRejectedValueOnce({ response: { status: 409, data: { code: 'C013', message: '기안자가 참조자를 지정한 결재는 결재자가 참조자를 더할 수 없습니다.' } } });
    const { invalidate } = renderPanel();
    await choose('최참조');
    fireEvent.click(screen.getByRole('button', { name: '참조자 지정 (1명)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('기안자가 참조자를 지정한 결재는 결재자가 참조자를 더할 수 없습니다. 고른 사람은 그대로 두었습니다. 최신 문서를 다시 불러왔습니다.');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: approvalKeys.detail(31) });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: approvalKeys.lists() });
  });

  it('문서 버전을 모르면 보내지 않고 다시 불러오라고 말한다', async () => {
    renderPanel({ ...DOCUMENT, version: undefined });
    await choose('최참조');
    fireEvent.click(screen.getByRole('button', { name: '참조자 지정 (1명)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('문서 버전을 확인할 수 없습니다.');
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.addReferences).not.toHaveBeenCalled();
  });

  it('다른 처리 중이면 참조자를 더하지 않는다', async () => {
    renderPanel(DOCUMENT, true);
    expect(screen.getByRole('button', { name: '참조자 추가' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '참조자 지정 (0명)' })).toBeDisabled();
  });
});
