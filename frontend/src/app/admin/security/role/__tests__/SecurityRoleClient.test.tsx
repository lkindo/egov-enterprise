import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecurityRoleClient from '../SecurityRoleClient';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  confirm: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/RoleAdminService', () => ({
  roleAdminService: {
    getRoleList: mocks.list,
    createRole: mocks.create,
    updateRole: mocks.update,
    deleteRole: mocks.remove,
  },
}));

vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, actions }: { title: string; actions: React.ReactNode }) => (
    <header>{title}{actions}</header>
  ),
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section><h2>{title}</h2>{children}</section>
  ),
}));
vi.mock('@/components/ui/hub/HubMetrics', () => ({
  HubMetricGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  HubMetricCard: ({ title, value }: { title: string; value: React.ReactNode }) => (
    <span>{title}: {value}</span>
  ),
}));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, title, children }: { isOpen: boolean; title: string; children: React.ReactNode }) =>
    isOpen ? <section aria-label={title}>{children}</section> : null,
}));
/*
  [2026-08-28] mock 이 required·description 을 통째로 버리고 있었다. 그래서 필수 표시(*)와
  필드 설명이 **검사 대상 밖**이었고, 실제 컴포넌트에서 required 를 붙였다 떼도 이 파일의
  테스트는 아무 반응이 없었다. 실제 FormField(standard-form.tsx)와 같은 것을 그린다.
*/
vi.mock('@/app/components/ui/standard-form', () => ({
  FormField: ({ label, children, error, htmlFor, required, description }: {
    label: string;
    children: React.ReactNode;
    error?: string;
    htmlFor?: string;
    required?: boolean;
    description?: string;
  }) => (
    <div>
      <label htmlFor={htmlFor}>
        {label}
        {required ? <span aria-hidden="true">*</span> : null}
      </label>
      {children}
      {error ? <p id={`${htmlFor}-error`}>{error}</p> : null}
      {description ? <p id={`${htmlFor}-description`}>{description}</p> : null}
    </div>
  ),
}));
vi.mock('@/components/common/PagePagination', () => ({
  PagePagination: ({ onPageChange }: { onPageChange: (page: number) => void }) => (
    <button type="button" onClick={() => onPageChange(2)}>롤 다음 페이지</button>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data, pagination }: {
    columns: Array<{ accessor: (role: any) => React.ReactNode }>;
    data: Array<{ roleNm?: string }>;
    pagination?: { onPageChange: (page: number) => void };
  }) => (
    <div>
      {data.map((role, rowIndex) => (
        <div key={role.roleNm ?? rowIndex}>
          {columns.map((column, columnIndex) => <div key={columnIndex}>{column.accessor(role)}</div>)}
        </div>
      ))}
      {/* [2026-08-24 A1 이행] 별도 PagePagination 이 표 내장 페이저로 수렴했다. */}
      <button type="button" onClick={() => pagination?.onPageChange(2)}>롤 다음 페이지</button>
    </div>
  ),
}));

function renderClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SecurityRoleClient />
    </QueryClientProvider>,
  );
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
}

describe('SecurityRoleClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.list.mockResolvedValue({
      // 수정 진입이 기존 값을 그대로 싣는지 보려면 fixture 가 실제 롤 모양이어야 한다.
      list: [{
        roleId: 'ROLE_ADMIN',
        roleNm: '관리자 롤',
        rolePatrn: '관리 화면',
        roleTypeCd: 'url',
        roleSort: '3',
        roleExpln: '',
      }],
      page: 1,
      size: 10,
      total: 11,
      totalPage: 2,
    });
    mocks.create.mockResolvedValue(undefined);
    mocks.update.mockResolvedValue(undefined);
    mocks.remove.mockResolvedValue(undefined);
  });

  /*
   * 종전에는 등록·삭제만 있어 **롤 명칭 오타 하나도 고칠 수 없었다** — 지우고 다시 만드는 것이
   * 유일한 방법이었다. 수정 경로는 위아래로 다 열려 있었는데(PUT /{roleCode} → updateRole →
   * RoleInfo.update) 화면만 부르지 않았다.
   */
  it('목록에서 수정을 열어 저장하면 생성이 아니라 수정으로 나간다', async () => {
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '관리자 롤 롤 수정' }));

    // 편집 진입이면 기존 값이 폼에 실린다.
    expect(screen.getByLabelText('롤 레이블 명칭', { exact: false })).toHaveValue('관리자 롤');

    // 수정 진입은 나머지 값도 그대로 물고 온다 — 여기서 다시 채우지 않아도 저장이 되어야 한다.
    expect(screen.getByLabelText('정렬 순서', { exact: false })).toHaveValue(3);
    fireEvent.change(screen.getByLabelText('롤 레이블 명칭', { exact: false }), { target: { value: '관리자 롤(수정)' } });
    // 목록 행의 수정 버튼도 같은 문구로 끝나므로 모달 안에서 찾는다.
    const dialog = screen.getByRole('region', { name: '보안 롤 수정' });
    fireEvent.click(within(dialog).getByRole('button', { name: '롤 수정' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][0]).toBe('ROLE_ADMIN');
    expect(mocks.update.mock.calls[0][1]).toMatchObject({ roleId: 'ROLE_ADMIN', roleNm: '관리자 롤(수정)' });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('수정 중에는 롤 ID 를 바꿀 수 없다 — PK 이자 PUT 경로 변수라 바꾸면 다른 롤을 덮어쓴다', async () => {
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '관리자 롤 롤 수정' }));

    expect(screen.getByLabelText('보안 롤 식별값(Role Code)', { exact: false })).toHaveAttribute('readonly');
  });

  it('등록 진입은 이전 편집 값을 물고 가지 않는다', async () => {
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '관리자 롤 롤 수정' }));
    fireEvent.click(screen.getByRole('button', { name: /신규 보안 롤 설정/ }));

    expect(screen.getByLabelText('보안 롤 식별값(Role Code)', { exact: false })).toHaveValue('');
    expect(screen.getByLabelText('보안 롤 식별값(Role Code)', { exact: false })).not.toHaveAttribute('readonly');
  });

  it('converts the 1-based UI page to the 0-based API page', async () => {
    renderClient();

    await waitFor(() => {
      expect(mocks.list).toHaveBeenCalledWith({ page: 0, size: 10, pageUnit: 10, searchKeyword: '' });
    });

    fireEvent.click(await screen.findByRole('button', { name: '롤 다음 페이지' }));

    await waitFor(() => {
      expect(mocks.list).toHaveBeenCalledWith({ page: 1, size: 10, pageUnit: 10, searchKeyword: '' });
    });
  });

  it('validates required, length, and integer fields before creating a role', async () => {
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: /신규 보안 롤 설정/ }));

    const roleId = screen.getByLabelText('보안 롤 식별값(Role Code)', { exact: false });
    fireEvent.click(screen.getByRole('button', { name: /롤 아키텍처 배포/ }));

    expect(mocks.create).not.toHaveBeenCalled();
    expect(await screen.findByText('롤 ID를 입력해 주세요.')).toBeInTheDocument();
    expect(roleId).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(roleId).toHaveFocus());

    fireEvent.change(roleId, { target: { value: 'R'.repeat(21) } });
    fireEvent.change(screen.getByLabelText('롤 레이블 명칭', { exact: false }), { target: { value: '신규 롤' } });
    // 정렬 순서는 이제 선택이지만, **값이 있으면** 형식 제약은 그대로다.
    fireEvent.change(screen.getByLabelText('정렬 순서', { exact: false }), { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: /롤 아키텍처 배포/ }));

    expect(mocks.create).not.toHaveBeenCalled();
    expect(await screen.findByText('롤 ID: 최대 20자까지 입력할 수 있습니다.')).toBeInTheDocument();
    expect(screen.getByText('정렬 순서는 0 이상의 정수여야 합니다.')).toBeInTheDocument();
  });

  /**
   * 접근 통제에 쓰이지 않는 값을 강제로 지어내게 하지 않는다.
   *
   * 세 필드(적용 대상 표기·롤 분류·정렬 순서)는 화면 스스로 "접근 통제에는 사용되지
   * 않습니다" 라고 밝힌다 — 인가 경로(DbUrlAuthorizationManager)는 tb_prgrm_lst.url 과
   * tb_role_prgrm_map 만 본다. 그런데 그렇게 적어 놓고도 세 값을 required 로 강제하고 있었다.
   *
   * 수정 경로가 열리면서 그 강제가 실동작으로 드러난다 — 시드 롤(ROLE_ADMIN·ROLE_USER)은
   * R__seed_framework.sql 이 세 컬럼을 채우지 않으므로, 명칭 오타 하나를 고치려 해도
   * 관리자가 무의미한 값 세 개를 지어내야 저장된다.
   */
  it('접근 통제에 쓰이지 않는 세 값은 비워 두고도 저장된다', async () => {
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: /신규 보안 롤 설정/ }));

    fireEvent.change(screen.getByLabelText('보안 롤 식별값(Role Code)', { exact: false }), { target: { value: 'ROLE_X' } });
    fireEvent.change(screen.getByLabelText('롤 레이블 명칭', { exact: false }), { target: { value: '신규 롤' } });
    // 적용 대상 표기·정렬 순서는 건드리지 않는다.
    fireEvent.click(screen.getByRole('button', { name: /롤 아키텍처 배포/ }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create.mock.calls[0][0]).toMatchObject({ roleId: 'ROLE_X', roleNm: '신규 롤' });
  });

  it('세 필드에 required 표시를 남기지 않는다 — 안 쓰는 값을 필수로 보이게 하지 않는다', async () => {
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: /신규 보안 롤 설정/ }));

    /*
     * 두 축을 함께 본다. 입력 요소의 required 속성만 보면 라벨의 필수 표시(*)가 남아도
     * 통과한다 — 사용자는 그 별표를 보고 "채워야 한다"고 읽으므로 그것도 거짓말이다.
     * FormField 는 required 일 때 라벨 안에 별표 span 을 그린다.
     */
    for (const label of ['적용 대상 표기', '롤 분류', '정렬 순서']) {
      const field = screen.getByLabelText(label, { exact: false });
      expect(field).not.toBeRequired();
      const labelEl = document.querySelector(`label[for="${field.id}"]`);
      expect(labelEl?.textContent).not.toContain('*');
    }

    // 반대로 진짜 필수는 두 축 모두 그대로다.
    for (const label of ['보안 롤 식별값(Role Code)', '롤 레이블 명칭']) {
      const field = screen.getByLabelText(label, { exact: false });
      expect(field).toBeRequired();
      expect(document.querySelector(`label[for="${field.id}"]`)?.textContent).toContain('*');
    }
  });

  it('화면 설명이 URL 패턴으로 동작한다고 약속하지 않는다', async () => {
    /*
     * 종전 설명은 '리소스·URL 패턴 기준의 보안 롤을 조회·설정합니다' 였다. 세 필드에
     * '접근 통제에는 사용되지 않습니다' 라고 적어 두고 제목 밑에서 반대로 말하면 잘못된
     * 안전 확신이 그대로 남는다.
     */
    renderClient();
    await screen.findByRole('button', { name: /신규 보안 롤 설정/ });

    expect(screen.queryByText(/리소스·URL 패턴 기준의 보안 롤/)).not.toBeInTheDocument();
    expect(screen.getByText(/URL 접근 통제는 시스템 프로그램 관리에서 설정합니다/)).toBeInTheDocument();
  });

  it('같은 tick의 롤 저장은 동기 잠금으로 한 번만 전송한다', async () => {
    const pending = deferred<void>();
    mocks.create.mockReturnValueOnce(pending.promise);
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: /신규 보안 롤 설정/ }));
    fireEvent.change(screen.getByLabelText('보안 롤 식별값(Role Code)', { exact: false }), { target: { value: 'ROLE_NEW' } });
    fireEvent.change(screen.getByLabelText('롤 레이블 명칭', { exact: false }), { target: { value: '신규 롤' } });
    fireEvent.change(screen.getByLabelText('적용 대상 표기', { exact: false }), { target: { value: '/api/**' } });
    const submit = screen.getByRole('button', { name: /롤 아키텍처 배포/ });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    const cancel = screen.getByRole('button', { name: '취소' });
    expect(cancel).toBeDisabled();
    const remove = screen.getByRole('button', { name: '관리자 롤 롤 삭제' });
    expect(remove).toBeDisabled();
    fireEvent.click(remove);
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    await act(async () => pending.resolve());
  });

  it('maps a structured server field error inline, preserves values, and focuses that field', async () => {
    const pending = deferred<void>();
    mocks.create.mockReturnValueOnce(pending.promise);
    const serverError = {
      response: { data: { errors: [{ field: 'roleNm', message: '이미 사용 중인 롤 명칭입니다.' }] } },
    };
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: /신규 보안 롤 설정/ }));
    fireEvent.change(screen.getByLabelText('보안 롤 식별값(Role Code)', { exact: false }), { target: { value: 'ROLE_NEW' } });
    const roleName = screen.getByLabelText('롤 레이블 명칭', { exact: false });
    fireEvent.change(roleName, { target: { value: '입력한 롤 명칭' } });
    fireEvent.change(screen.getByLabelText('적용 대상 표기', { exact: false }), { target: { value: '/api/**' } });

    fireEvent.click(screen.getByRole('button', { name: /롤 아키텍처 배포/ }));

    const cancel = screen.getByRole('button', { name: '취소' });
    await waitFor(() => expect(cancel).toBeDisabled());
    await act(async () => pending.reject(serverError));

    expect(await screen.findByText('이미 사용 중인 롤 명칭입니다.')).toBeVisible();
    expect(roleName).toHaveValue('입력한 롤 명칭');
    expect(roleName).toHaveAttribute('aria-invalid', 'true');
    expect(roleName).toHaveAttribute('aria-errormessage', 'roleNm-error');
    await waitFor(() => expect(roleName).toHaveFocus());
    expect(screen.getByRole('region', { name: '신규 세분화 보안 롤 설정' })).toBeInTheDocument();
    expect(cancel).toBeEnabled();
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('deleteRole 롤 삭제를 동기 잠금하고 pending 제어를 알리며 실패 시 행과 제어를 복구한다', async () => {
    const pending = deferred<void>();
    mocks.remove.mockReturnValueOnce(pending.promise);
    renderClient();
    await screen.findByText('관리자 롤');
    const remove = screen.getByRole('button', { name: '관리자 롤 롤 삭제' });

    act(() => {
      remove.click();
      remove.click();
    });

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1));
    const busy = screen.getByRole('button', { name: '관리자 롤 롤 삭제 중' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: /신규 보안 롤 설정/ })).toBeDisabled();

    await act(async () => pending.reject(new Error('롤 삭제 API 장애')));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('삭제 처리 중 시스템 예외가 발생했습니다.', 'error'));
    expect(screen.getByText('관리자 롤')).toBeVisible();
    expect(screen.getByRole('button', { name: '관리자 롤 롤 삭제' })).toBeEnabled();
  });
});
