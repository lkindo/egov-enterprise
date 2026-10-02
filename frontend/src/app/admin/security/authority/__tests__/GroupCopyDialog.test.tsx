import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnsavedChangesProvider } from '@/contexts/UnsavedChangesContext';
import { GroupCopyDialog } from '../components/GroupCopyDialog';

const mocks = vi.hoisted(() => ({ permissions: [] as string[], toast: vi.fn(), createGroupCopy: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'operator', permissions: mocks.permissions, authorizationVersion: 'auth-v1' } }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/services/foundation/system/AuthorizationAdminService', () => ({ authorizationAdminService: { createGroupCopy: mocks.createGroupCopy } }));

const source = {
  code: 'CONTENT', name: '콘텐츠 담당', description: '콘텐츠 운영', version: 'content-v7', complete: true as const,
  grants: [{ type: 'OPERATION' as const, code: 'BOARD_READ' }, { type: 'OPERATION' as const, code: 'BOARD_CREATE' }, { type: 'NAVIGATION' as const, code: '10' }],
};

function renderDialog(overrides: Partial<typeof source> = {}) {
  const onClose = vi.fn();
  const onCopied = vi.fn();
  render(<UnsavedChangesProvider><GroupCopyDialog source={{ ...source, ...overrides }} onClose={onClose} onCopied={onCopied} /></UnsavedChangesProvider>);
  return { onClose, onCopied };
}
const fill = (code: string, name: string) => {
  fireEvent.change(screen.getByRole('textbox', { name: '그룹 코드' }), { target: { value: code } });
  fireEvent.change(screen.getByRole('textbox', { name: '그룹명' }), { target: { value: name } });
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permissions = ['AUTHRT_CREATE', 'AUTHRT_GRANT', 'AUTHRT_ASSIGN', 'AUTHRT_READ'];
});

describe('이 그룹으로 새 그룹 만들기', () => {
  it('원본의 저장된 권한 수와 복사하지 않는 것을 말하고, 이름은 원본 사본으로 시작한다', () => {
    renderDialog();
    expect(screen.getByText(/기능권한 2개 · 메뉴 표시 1개/)).toBeInTheDocument();
    expect(screen.getByText(/원본에서 저장하지 않은 변경과 구성원은 복사하지 않습니다/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '그룹명' })).toHaveValue('콘텐츠 담당 사본');
    expect(screen.getByRole('textbox', { name: '그룹 코드' })).toHaveValue('');
  });

  it('제출은 원본 버전과 함께 한 번만 보내고, 보내는 동안 잠그며, 실패하면 알리고 입력을 남긴다', async () => {
    let rejectWrite: (error: unknown) => void = () => undefined;
    mocks.createGroupCopy.mockImplementation(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
    const { onCopied } = renderDialog();
    fill('CONTENT_COPY', '콘텐츠 보조');
    const submit = screen.getByRole('button', { name: '새 그룹 만들기' });
    act(() => { fireEvent.click(submit); fireEvent.click(submit); });
    await waitFor(() => expect(mocks.createGroupCopy).toHaveBeenCalledTimes(1));
    expect(mocks.createGroupCopy).toHaveBeenCalledWith('CONTENT', { code: 'CONTENT_COPY', name: '콘텐츠 보조', description: '콘텐츠 운영', sourceVersion: 'content-v7' });
    const busy = screen.getByRole('button', { name: '저장 중…' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    act(() => rejectWrite(Object.assign(new Error('Request failed with status code 400'), { isAxiosError: true, response: { status: 400, data: { message: '이미 존재하는 그룹입니다.' } } })));
    await waitFor(() => expect(screen.getByRole('button', { name: '새 그룹 만들기' })).toBeEnabled());
    expect(mocks.toast).toHaveBeenCalledWith('이미 존재하는 그룹입니다.', 'error');
    expect(screen.getByRole('textbox', { name: '그룹 코드' })).toHaveValue('CONTENT_COPY');
    expect(onCopied).not.toHaveBeenCalled();
  });

  it('성공하면 새 그룹을 알리고 넘긴다', async () => {
    const created = { ...source, code: 'CONTENT_COPY', name: '콘텐츠 보조', version: 'copy-v1' };
    mocks.createGroupCopy.mockResolvedValue(created);
    const { onCopied } = renderDialog();
    fill('CONTENT_COPY', '콘텐츠 보조');
    await userEvent.click(screen.getByRole('button', { name: '새 그룹 만들기' }));
    await waitFor(() => expect(onCopied).toHaveBeenCalledWith(created));
    expect(mocks.toast).toHaveBeenCalledWith("'콘텐츠 보조' 그룹을 만들었습니다. 구성원은 '구성원' 탭에서 추가하세요.", 'success');
  });

  it('그룹 코드는 서버와 같은 규칙으로 막고 보내지 않는다', async () => {
    renderDialog();
    fill('content-copy', '콘텐츠 보조');
    await userEvent.click(screen.getByRole('button', { name: '새 그룹 만들기' }));
    expect(await screen.findByText('그룹 코드는 영문 대문자로 시작하고 영문 대문자·숫자·밑줄(_)만 쓸 수 있습니다.')).toBeInTheDocument();
    expect(mocks.createGroupCopy).not.toHaveBeenCalled();
  });

  it('원본에 보호 권한이 있으면 권한 배정 권한까지 요구하고, 없으면 만들기를 막는다', () => {
    mocks.permissions = ['AUTHRT_CREATE', 'AUTHRT_GRANT'];
    renderDialog({ grants: [...source.grants, { type: 'OPERATION' as const, code: 'USER_PASSWORD' }] });
    expect(screen.getByText(/보호 권한\(USER_PASSWORD\)이 있어, 복제하려면 권한 설정과 권한 배정 권한이 모두 필요합니다/)).toBeInTheDocument();
    expect(screen.getByText('지금 계정에는 권한 배정 권한이 없어 이 그룹을 복제할 수 없습니다.')).toHaveAttribute('role', 'alert');
    expect(screen.getByRole('button', { name: '새 그룹 만들기' })).toBeDisabled();
  });

  it('그룹 등록과 권한 설정을 함께 갖지 않으면 만들 수 없다', () => {
    mocks.permissions = ['AUTHRT_CREATE'];
    renderDialog();
    expect(screen.getByText('그룹을 만들려면 그룹 등록과 권한 설정 권한이 모두 필요합니다.')).toHaveAttribute('role', 'alert');
    expect(screen.getByRole('button', { name: '새 그룹 만들기' })).toBeDisabled();
  });
});
