import type { ReactElement } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorForm } from '@/components/admin/security/AuthorForm';
import { NetworkForm } from '@/components/admin/system/NetworkForm';
import { ProgramForm } from '@/components/admin/system/ProgramForm';
import { DepartmentForm } from '@/components/admin/user/DepartmentForm';
import { UserManageForm } from '@/components/admin/user/UserManageForm';
import { DeptJobForm } from '@/components/business/deptJob/DeptJobForm';
import { ReportCreateForm } from '@/components/business/report/ReportCreateForm';

const mocks = vi.hoisted(() => ({
  createProgram: vi.fn(),
  getDeptJobBoxes: vi.fn(),
  searchAssignableUsers: vi.fn(),
  updateProgram: vi.fn(),
}));

vi.mock('@/services/foundation/system/ProgramAdminService', () => ({
  programAdminService: {
    createProgram: (...args: unknown[]) => mocks.createProgram(...args),
    deleteProgram: vi.fn(),
    updateProgram: (...args: unknown[]) => mocks.updateProgram(...args),
  },
}));

vi.mock('@/services/business/user/deptJob/DeptJobUserService', () => ({
  deptJobUserService: {
    getDeptJobBoxes: (...args: unknown[]) => mocks.getDeptJobBoxes(...args),
  },
}));

vi.mock('@/services/business/user/UserSearchService', () => ({
  userSearchService: {
    searchAssignableUsers: (...args: unknown[]) => mocks.searchAssignableUsers(...args),
  },
}));

function renderWithClient(node: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

function deferred() {
  let resolve: () => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<void>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

type ContractCase = {
  name: string;
  render: (submit: () => Promise<void>) => ReactElement;
  submitName: RegExp;
  firstFieldName: RegExp;
  maxLength?: string;
  prepareValid?: () => void;
  renderValid: (submit: () => Promise<void>) => ReactElement;
  serverField: string;
  serverFieldName: RegExp;
};

const cases: ContractCase[] = [
  {
    name: 'AuthorForm',
    render: (onSubmit) => <AuthorForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />,
    submitName: /권한 배포/,
    firstFieldName: /보안 역할 식별자/,
    maxLength: '20',
    renderValid: (onSubmit) => (
      <AuthorForm
        mode="create"
        initialData={{ authrtCd: 'ROLE_TEST', authrtNm: '테스트 역할' }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    ),
    serverField: 'authrtNm',
    serverFieldName: /역할 레이블 명칭/,
  },
  {
    name: 'NetworkForm',
    render: (onSubmit) => <NetworkForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    submitName: /저장하기/,
    firstFieldName: /관리항목/,
    renderValid: (onSubmit) => (
      <NetworkForm
        initialData={{
          manageIem: '내부망',
          userNm: '관리자',
          ntwrkIp: '192.168.0.1',
          subnet: '255.255.255.0',
          gtwy: '192.168.0.254',
          useYn: 'Y',
        }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    ),
    serverField: 'ntwrkIp',
    serverFieldName: /IP 주소/,
  },
  {
    name: 'ProgramForm',
    render: () => (
      <ProgramForm open onOpenChange={vi.fn()} onSuccess={vi.fn()} />
    ),
    submitName: /시스템 동기화/,
    firstFieldName: /프로그램 파일명/,
    maxLength: '100',
    prepareValid: () => {
      fireEvent.change(screen.getByRole('textbox', { name: /프로그램 파일명/ }), {
        target: { value: 'TEST_PROGRAM' },
      });
      fireEvent.change(screen.getByRole('textbox', { name: /프로그램 설명/ }), {
        target: { value: '테스트 프로그램' },
      });
    },
    renderValid: () => <ProgramForm open onOpenChange={vi.fn()} onSuccess={vi.fn()} />,
    serverField: 'prgrmKornNm',
    serverFieldName: /프로그램 설명/,
  },
  {
    name: 'DepartmentForm',
    render: (onSubmit) => <DepartmentForm mode="create" onSubmit={onSubmit} onCancel={vi.fn()} />,
    submitName: /부서 등록/,
    firstFieldName: /부서 명칭/,
    maxLength: '100',
    renderValid: (onSubmit) => (
      <DepartmentForm
        mode="create"
        initialData={{ ognzNm: '테스트 부서' }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    ),
    serverField: 'ognzNm',
    serverFieldName: /부서 명칭/,
  },
  {
    name: 'UserManageForm',
    render: (onSubmit) => (
      <UserManageForm mode="create" departments={[]} onSubmit={onSubmit} onCancel={vi.fn()} />
    ),
    submitName: /신규 등록|정보 수정/,
    firstFieldName: /사용자 아이디/,
    maxLength: '20',
    renderValid: (onSubmit) => (
      <UserManageForm
        mode="edit"
        initialData={{ userId: 'user_01', userNm: '테스트 사용자' }}
        departments={[]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    ),
    serverField: 'userNm',
    serverFieldName: /사용자 성함/,
  },
  {
    name: 'DeptJobForm',
    render: (onSubmit) => <DeptJobForm onSubmit={onSubmit} onCancel={vi.fn()} />,
    submitName: /업무 등록/,
    firstFieldName: /업무명/,
    maxLength: '100',
    renderValid: (onSubmit) => (
      <DeptJobForm initialData={{ deptTaskNm: '테스트 업무' }} onSubmit={onSubmit} onCancel={vi.fn()} />
    ),
    serverField: 'deptTaskNm',
    serverFieldName: /업무명/,
  },
  {
    name: 'ReportCreateForm',
    render: (onSubmit) => (
      <ReportCreateForm defaultYmd="20260826" onSubmit={onSubmit} onCancel={vi.fn()} />
    ),
    submitName: /보고 등록/,
    firstFieldName: /보고 제목/,
    maxLength: '200',
    renderValid: (onSubmit) => (
      <ReportCreateForm
        defaultYmd="20260826"
        initialData={{ rptTtl: '테스트 보고' }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    ),
    serverField: 'rptTtl',
    serverFieldName: /보고 제목/,
  },
];

describe('shared useAppForm visual validation contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDeptJobBoxes.mockResolvedValue({ list: [] });
    mocks.searchAssignableUsers.mockResolvedValue([]);
  });

  it.each(cases)('$name: invalid submit은 write 없이 시각 summary와 첫 field로 연결된다', async (entry) => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithClient(entry.render(onSubmit));
    const firstField = screen.getByRole('textbox', { name: entry.firstFieldName });
    const submit = screen.getByRole('button', { name: entry.submitName });

    await user.click(submit);

    await waitFor(() => expect(firstField).toHaveFocus());
    expect(firstField).toHaveAttribute('aria-required', 'true');
    expect(firstField).toHaveAttribute('aria-invalid', 'true');
    if (entry.maxLength) expect(firstField).toHaveAttribute('maxlength', entry.maxLength);
    const summary = document.querySelector('[data-form-error-summary="true"]');
    expect(summary).toHaveTextContent(/입력 오류/);
    expect(summary?.querySelector('button')).not.toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(mocks.createProgram).not.toHaveBeenCalled();
  });

  it.each(cases)('$name: server field 오류를 inline summary와 해당 field로 연결한다', async (entry) => {
    const user = userEvent.setup();
    const message = `${entry.name} 서버 필드 오류`;
    const error = {
      response: { data: { errors: [{ field: entry.serverField, message }] } },
    };
    const onSubmit = vi.fn().mockRejectedValue(error);
    if (entry.name === 'ProgramForm') mocks.createProgram.mockRejectedValueOnce(error);
    renderWithClient(entry.renderValid(onSubmit));
    entry.prepareValid?.();
    const target = screen.getByRole('textbox', { name: entry.serverFieldName });

    await user.click(screen.getByRole('button', { name: entry.submitName }));

    expect(await screen.findByText(message)).toBeVisible();
    await waitFor(() => expect(target).toHaveFocus());
    expect(target).toHaveAttribute('aria-invalid', 'true');
    expect(document.querySelector('[data-form-error-summary="true"] button')).not.toBeNull();
    if (entry.name === 'ProgramForm') {
      expect(mocks.createProgram).toHaveBeenCalledTimes(1);
    } else {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    }
  });

  it.each(cases.filter((entry) => entry.name !== 'ProgramForm'))(
    '$name: 저장 중 같은 tick의 중복 submit을 한 번만 전송하고 버튼을 잠근다',
    async (entry) => {
      const pending = deferred();
      const onSubmit = vi.fn().mockReturnValue(pending.promise);
      renderWithClient(entry.renderValid(onSubmit));
      const submit = screen.getByRole('button', { name: entry.submitName });
      const form = submit.closest('form');
      expect(form).not.toBeNull();

      act(() => {
        fireEvent.submit(form!);
        fireEvent.submit(form!);
      });

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(submit).toBeDisabled();

      await act(async () => pending.resolve());
      await waitFor(() => expect(submit).not.toBeDisabled());
    },
  );

  it.each([
    {
      name: 'DepartmentForm',
      render: (onSubmit: () => Promise<void>, onCancel: () => void) => (
        <DepartmentForm
          mode="create"
          initialData={{ ognzNm: '보존할 부서' }}
          onSubmit={onSubmit}
          onCancel={onCancel}
          externalBusy
        />
      ),
      submitName: /부서 등록/,
    },
    {
      name: 'UserManageForm',
      render: (onSubmit: () => Promise<void>, onCancel: () => void) => (
        <UserManageForm
          mode="edit"
          initialData={{ userId: 'user_01', userNm: '보존할 사용자' }}
          departments={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
          externalBusy
        />
      ),
      submitName: /정보 수정/,
    },
  ])('$name: externalBusy는 submit/cancel을 막되 비개시 submit을 busy로 표시하지 않는다', async (entry) => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();
    renderWithClient(entry.render(onSubmit, onCancel));
    const submit = screen.getByRole('button', { name: entry.submitName });
    const cancel = screen.getByRole('button', { name: '취소' });

    expect(submit).toBeDisabled();
    expect(submit).not.toHaveAttribute('aria-busy');
    expect(cancel).toBeDisabled();
    fireEvent.submit(submit.closest('form')!);
    submit.click();
    cancel.click();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'DepartmentForm',
      field: 'ognzNm',
      message: '이미 사용 중인 부서명입니다.',
      value: '보존할 부서',
      fieldName: /부서 명칭/,
      submitName: /부서 등록/,
      render: (onSubmit: () => Promise<void>, onCancel: () => void) => (
        <DepartmentForm
          mode="create"
          initialData={{ ognzNm: '보존할 부서' }}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      ),
    },
    {
      name: 'UserManageForm',
      field: 'userNm',
      message: '이미 사용 중인 사용자명입니다.',
      value: '보존할 사용자',
      fieldName: /사용자 성함/,
      submitName: /정보 수정/,
      render: (onSubmit: () => Promise<void>, onCancel: () => void) => (
        <UserManageForm
          mode="edit"
          initialData={{ userId: 'user_01', userNm: '보존할 사용자' }}
          departments={[]}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      ),
    },
  ])('$name: deferred structured field 오류 뒤 입력값·summary·cancel을 보존한다', async (entry) => {
    const pending = deferred();
    const onSubmit = vi.fn().mockReturnValue(pending.promise);
    const onCancel = vi.fn();
    renderWithClient(<section role="dialog">{entry.render(onSubmit, onCancel)}</section>);
    const field = screen.getByRole('textbox', { name: entry.fieldName });
    const submit = screen.getByRole('button', { name: entry.submitName });
    const cancel = screen.getByRole('button', { name: '취소' });

    fireEvent.click(submit);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: /처리 중…/ })).toHaveAttribute('aria-busy', 'true');
    expect(cancel).toBeDisabled();

    await act(async () => pending.reject({
      response: { data: { errors: [{ field: entry.field, message: entry.message }] } },
    }));

    expect(await screen.findByText(entry.message)).toBeVisible();
    expect(field).toHaveValue(entry.value);
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(entry.message);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(cancel).toBeEnabled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
