import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentPageEditor } from '../ContentPageEditor';
import { emptyRichCell, templateDocument } from '@/lib/cms/document';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  getPage: vi.fn(),
  getHome: vi.fn(),
  saveDraft: vi.fn(),
  publish: vi.fn(),
  updateHome: vi.fn(),
  unpublish: vi.fn(),
  archive: vi.fn(),
  unarchive: vi.fn(),
  getRevisions: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/contexts/UnsavedChangesContext', () => ({ useUnsavedChanges: () => vi.fn() }));
vi.mock('@/components/cms/CmsRichTextEditor', () => ({
  CmsRichTextEditor: ({ label }: { label: string }) => <div data-testid="rich-editor">{label}</div>,
}));
vi.mock('@/app/components/ui/attachment-image', () => ({ AttachmentImage: () => <span data-testid="attachment" /> }));

const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: auth.permissions, authorizationVersion: 'v1' } }) }));

vi.mock('@/services/business/cms/CmsService', () => ({
  cmsService: {
    getPage: mocks.getPage,
    getHome: mocks.getHome,
    saveDraft: mocks.saveDraft,
    publish: mocks.publish,
    updateHome: mocks.updateHome,
    unpublish: mocks.unpublish,
    archive: mocks.archive,
    unarchive: mocks.unarchive,
    getRevisions: mocks.getRevisions,
  },
}));

const detail = (overrides: Record<string, unknown> = {}) => ({
  contsSn: 7,
  contsPathNm: 'service-guide',
  contsTtl: '이용 안내',
  contsExpln: '',
  document: templateDocument('guide'),
  status: 'DRAFT',
  unpublishedChanges: true,
  home: false,
  pathLocked: false,
  version: 3,
  publishedRevision: null,
  revisionCount: 0,
  ...overrides,
});

const published = (overrides: Record<string, unknown> = {}) => detail({
  status: 'PUBLISHED',
  unpublishedChanges: false,
  pathLocked: true,
  publishedRevision: { contsRvsnSn: 11, revisionNumber: 1, current: true, contsTtl: '이용 안내' },
  revisionCount: 1,
  ...overrides,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

function renderEditor() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ContentPageEditor contsSn={7} onDirtyChange={vi.fn()} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.permissions = ['CMS_ADMIN_READ', 'CMS_UPDATE', 'CMS_PUBLISH', 'CMS_HOME_UPDATE', 'FILE_UPLOAD'];
  mocks.getHome.mockResolvedValue({ contsSn: null, version: 0 });
  mocks.getPage.mockResolvedValue(detail());
  mocks.confirm.mockResolvedValue(true);
});

describe('ContentPageEditor — 초안 저장(ADR-0039)', () => {
  it('제목을 비우면 서버에 보내지 않고 칸 오류·요약으로 그 칸을 가리킨다', async () => {
    renderEditor();
    const title = await screen.findByRole('textbox', { name: /페이지 제목/ });
    fireEvent.change(title, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));

    expect(await screen.findAllByText('페이지 제목을 입력해 주세요.')).not.toHaveLength(0);
    await waitFor(() => expect(title).toHaveAttribute('aria-invalid', 'true'));
    expect(mocks.saveDraft).not.toHaveBeenCalled();
  });

  it('저장 중에는 단추가 잠겨 두 번 눌러도 한 번만 보내고, 실패하면 입력을 지키고 알린다', async () => {
    renderEditor();
    const title = await screen.findByRole('textbox', { name: /페이지 제목/ });
    fireEvent.change(title, { target: { value: '바뀐 안내' } });
    const pendingSave = deferred<unknown>();
    mocks.saveDraft.mockImplementation(() => pendingSave.promise);
    const saveButton = screen.getByRole('button', { name: '초안 저장' });

    fireEvent.click(saveButton);
    fireEvent.click(saveButton);
    await waitFor(() => expect(saveButton).toBeDisabled());
    expect(saveButton).toHaveAttribute('aria-busy', 'true');
    expect(mocks.saveDraft).toHaveBeenCalledTimes(1);
    expect(mocks.saveDraft.mock.calls[0][1]).toMatchObject({ contsTtl: '바뀐 안내', contsPathNm: 'service-guide', version: 3 });

    pendingSave.reject({ isAxiosError: true, response: { status: 500 } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('초안을 저장하지 못했습니다. 입력한 내용은 그대로 있습니다.', 'error'));
    expect(screen.getByRole('textbox', { name: /페이지 제목/ })).toHaveValue('바뀐 안내');
    expect(saveButton).toBeEnabled();
  });

  it('서버가 돌려준 필드 오류는 그 칸에 보이고 입력은 남는다', async () => {
    renderEditor();
    const path = await screen.findByRole('textbox', { name: /주소/ });
    fireEvent.change(path, { target: { value: 'used-path' } });
    mocks.saveDraft.mockRejectedValue({ response: { status: 400, data: { errors: [{ field: 'contsPathNm', message: '이미 쓰는 주소입니다.' }] } } });
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));

    expect(await screen.findAllByText('이미 쓰는 주소입니다.')).not.toHaveLength(0);
    expect(path).toHaveValue('used-path');
    expect(path).toHaveAttribute('aria-invalid', 'true');
  });

  it('다른 사람이 먼저 바꿨으면(409) 입력을 지우지 않고 알린다', async () => {
    renderEditor();
    const title = await screen.findByRole('textbox', { name: /페이지 제목/ });
    fireEvent.change(title, { target: { value: '내가 고친 제목' } });
    mocks.saveDraft.mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('다른 사람이 먼저 이 페이지를 바꿨습니다');
    expect(title).toHaveValue('내가 고친 제목');
  });
});

describe('ContentPageEditor — 업무 홈 지정', () => {
  it('toggleHome: 처리 중에는 단추를 잠가 updateHome 을 한 번만 보내고, 실패하면 알린다', async () => {
    mocks.getPage.mockResolvedValue(published());
    renderEditor();
    const homeButton = await screen.findByRole('button', { name: '업무 홈 소개로 보이기' });
    const pendingHome = deferred<unknown>();
    mocks.updateHome.mockImplementation(() => pendingHome.promise);

    fireEvent.click(homeButton);
    await waitFor(() => expect(homeButton).toBeDisabled());
    expect(homeButton).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(homeButton);
    expect(mocks.updateHome).toHaveBeenCalledTimes(1);
    expect(mocks.updateHome).toHaveBeenCalledWith(7, 0);
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('모든 로그인 사용자의 업무 홈') }));

    pendingHome.reject({ isAxiosError: true, response: { status: 500 } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('업무 홈 소개를 바꾸지 못했습니다.', 'error'));
    expect(homeButton).toBeEnabled();
  });

  it('업무 홈 지정을 취소하면 아무것도 보내지 않는다', async () => {
    mocks.getPage.mockResolvedValue(published());
    mocks.confirm.mockResolvedValue(false);
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: '업무 홈 소개로 보이기' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.updateHome).not.toHaveBeenCalled();
  });
});

describe('ContentPageEditor — 게시 대화상자(PublishDialog)', () => {
  it('게시 중에는 단추를 잠가 한 번만 보내고 저장한 초안의 버전과 변경 설명을 보낸다', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /게시하기/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /변경 설명/ }), { target: { value: '  문의처를 바꿈 ' } });
    const pendingPublish = deferred<unknown>();
    mocks.publish.mockImplementation(() => pendingPublish.promise);
    const publishButton = within(dialog).getByRole('button', { name: '게시' });

    fireEvent.click(publishButton);
    fireEvent.click(publishButton);
    await waitFor(() => expect(publishButton).toBeDisabled());
    expect(publishButton).toHaveAttribute('aria-busy', 'true');
    expect(mocks.publish).toHaveBeenCalledTimes(1);
    expect(mocks.publish).toHaveBeenCalledWith(7, 3, '문의처를 바꿈');

    pendingPublish.resolve(published({ version: 4 }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('게시했습니다'), 'success'));
  });

  it('게시 실패의 필드 오류는 대화상자 안에 보이고 대화상자를 닫지 않는다', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /게시하기/ }));
    const dialog = await screen.findByRole('dialog');
    mocks.publish.mockRejectedValue({ response: { status: 400, data: { errors: [{ field: 'rvsnRsn', message: '변경 설명이 너무 깁니다.' }] } } });
    fireEvent.click(within(dialog).getByRole('button', { name: '게시' }));

    expect(await within(dialog).findAllByText('변경 설명이 너무 깁니다.')).not.toHaveLength(0);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('다른 사람이 먼저 게시했으면(409) 대화상자를 닫고 충돌을 알린다', async () => {
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /게시하기/ }));
    const dialog = await screen.findByRole('dialog');
    mocks.publish.mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
    fireEvent.click(within(dialog).getByRole('button', { name: '게시' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('alert')).toHaveTextContent('다른 사람이 먼저 이 페이지를 바꿨습니다');
  });

  it('보이는 내용이 없으면 게시를 막는다', async () => {
    mocks.getPage.mockResolvedValue(detail({
      document: { schemaVersion: 1, sections: [{ id: 'a', label: '', layout: 'one', tone: 'default', spacing: 'normal', cells: [emptyRichCell()] }] },
    }));
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /게시하기/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/보이는 내용이 없습니다/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '게시' })).toBeDisabled();
  });
});
