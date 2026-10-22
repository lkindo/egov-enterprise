import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContentPagesClient from '../ContentPagesClient';
import { templateDocument } from '@/lib/cms/document';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  getPages: vi.fn(),
  getPage: vi.fn(),
  getHome: vi.fn(),
  createPage: vi.fn(),
  saveDraft: vi.fn(),
  publish: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => '/admin/system/content-pages',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({ DynamicBreadcrumb: () => <nav aria-label="현재 위치">콘텐츠 페이지</nav> }));
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
    getPages: mocks.getPages,
    getPage: mocks.getPage,
    getHome: mocks.getHome,
    createPage: mocks.createPage,
    saveDraft: mocks.saveDraft,
    publish: mocks.publish,
  },
}));

const detail = (overrides: Record<string, unknown> = {}) => ({
  contsSn: 7,
  contsPathNm: 'service-guide',
  contsTtl: '이용 안내',
  contsExpln: '',
  document: templateDocument('blank'),
  status: 'DRAFT',
  unpublishedChanges: false,
  home: false,
  pathLocked: false,
  version: 3,
  publishedRevision: null,
  revisionCount: 0,
  ...overrides,
});

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><ContentPagesClient /></QueryClientProvider>);
}

async function openPage() {
  renderScreen();
  fireEvent.click(await screen.findByRole('button', { name: /이용 안내/ }));
  return screen.findByRole('textbox', { name: /페이지 제목/ });
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.permissions = ['CMS_ADMIN_READ', 'CMS_UPDATE', 'CMS_PUBLISH', 'CMS_HOME_UPDATE'];
  mocks.getPages.mockResolvedValue({ list: [{ contsSn: 7, contsPathNm: 'service-guide', contsTtl: '이용 안내', status: 'DRAFT', version: 3 }], total: 1, page: 1, totalPage: 1 });
  mocks.getHome.mockResolvedValue({ contsSn: null, version: 0 });
  mocks.getPage.mockResolvedValue(detail());
  mocks.confirm.mockResolvedValue(true);
});

describe('콘텐츠 페이지 관리(ADR-0039)', () => {
  it('바꾸기 전에는 저장할 수 없고, 저장은 읽은 버전과 정규화한 문서를 보낸다', async () => {
    const title = await openPage();
    const save = screen.getByRole('button', { name: '초안 저장' });
    expect(save).toBeDisabled();

    fireEvent.change(title, { target: { value: '바뀐 안내' } });
    expect(save).toBeEnabled();
    mocks.saveDraft.mockResolvedValue(detail({ contsTtl: '바뀐 안내', version: 4 }));
    fireEvent.click(save);

    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(1));
    const [contsSn, body] = mocks.saveDraft.mock.calls[0];
    expect(contsSn).toBe(7);
    expect(body).toMatchObject({ contsPathNm: 'service-guide', contsTtl: '바뀐 안내', version: 3 });
    expect(body.document.schemaVersion).toBe(1);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('초안을 저장했습니다'), 'success'));
  });

  it('다른 사람이 먼저 바꿨으면(409) 입력을 지우지 않고 알린다', async () => {
    const title = await openPage();
    fireEvent.change(title, { target: { value: '내가 고친 제목' } });
    mocks.saveDraft.mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('다른 사람이 먼저 이 페이지를 바꿨습니다');
    expect(screen.getByRole('textbox', { name: /페이지 제목/ })).toHaveValue('내가 고친 제목');
  });

  it('게시 대화상자는 로그인한 모든 사용자에게 공개됨을 알리고, 저장하지 않은 변경이 있으면 게시를 막는다', async () => {
    const title = await openPage();
    fireEvent.change(title, { target: { value: '저장 안 한 제목' } });
    fireEvent.click(screen.getByRole('button', { name: /게시하기/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/로그인한 모든 사용자/)).toBeInTheDocument();
    expect(within(dialog).getByText(/먼저 초안을 저장해 주세요/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '게시' })).toBeDisabled();
  });

  it('게시 권한이 없으면 게시·홈 지정 단추를 보이지 않는다', async () => {
    auth.permissions = ['CMS_ADMIN_READ', 'CMS_UPDATE', 'MENU_READ'];
    mocks.getPage.mockResolvedValue(detail({ status: 'PUBLISHED', publishedRevision: { contsRvsnSn: 1, revisionNumber: 1, current: true }, revisionCount: 1 }));
    await openPage();

    expect(screen.queryByRole('button', { name: /게시하기/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /업무 홈 소개로 보이기/ })).toBeNull();
    expect(screen.getByRole('button', { name: /메뉴에 추가/ })).toBeInTheDocument();
  });

  it('메뉴 관리 화면을 열 수 없으면 메뉴에 추가 단추를 보이지 않는다', async () => {
    mocks.getPage.mockResolvedValue(detail({ status: 'PUBLISHED', publishedRevision: { contsRvsnSn: 1, revisionNumber: 1, current: true }, revisionCount: 1 }));
    await openPage();

    expect(screen.getByRole('button', { name: /게시 중지/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /메뉴에 추가/ })).toBeNull();
  });

  it('새 페이지(CreatePageDialog): 잘못된 주소는 보내지 않고 그 칸을 가리킨다', async () => {
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: /새 페이지/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /페이지 제목/ }), { target: { value: '이용 안내' } });
    const path = within(dialog).getByRole('textbox', { name: /주소/ });
    fireEvent.change(path, { target: { value: 'Bad Path' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '초안 만들기' }));

    expect(await within(dialog).findAllByText(/영문 소문자·숫자·하이픈으로 입력해 주세요/)).not.toHaveLength(0);
    await waitFor(() => expect(path).toHaveAttribute('aria-invalid', 'true'));
    expect(mocks.createPage).not.toHaveBeenCalled();
  });

  it('새 페이지: 만드는 동안 단추를 잠가 한 번만 보내고, 이미 쓰는 주소(409)는 주소 칸에 알린다', async () => {
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: /새 페이지/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /페이지 제목/ }), { target: { value: ' 이용 안내 ' } });
    const path = within(dialog).getByRole('textbox', { name: /주소/ });
    fireEvent.change(path, { target: { value: 'service-guide' } });
    let rejectCreate!: (reason: unknown) => void;
    mocks.createPage.mockImplementation(() => new Promise((_, reject) => { rejectCreate = reject; }));
    const createButton = within(dialog).getByRole('button', { name: '초안 만들기' });

    fireEvent.click(createButton);
    fireEvent.click(createButton);
    await waitFor(() => expect(createButton).toBeDisabled());
    expect(createButton).toHaveAttribute('aria-busy', 'true');
    expect(mocks.createPage).toHaveBeenCalledTimes(1);
    expect(mocks.createPage).toHaveBeenCalledWith(expect.objectContaining({ contsTtl: '이용 안내', contsPathNm: 'service-guide' }));

    rejectCreate({ isAxiosError: true, response: { status: 409 } });
    expect(await within(dialog).findAllByText('이미 쓰는 주소입니다. 다른 주소를 입력해 주세요.')).not.toHaveLength(0);
    expect(path).toHaveValue('service-guide');
    expect(createButton).toBeEnabled();
  });

  it('저장하지 않은 변경이 있으면 새 페이지를 만들기 전에 묻고, 취소하면 입력이 그대로다', async () => {
    const title = await openPage();
    fireEvent.change(title, { target: { value: '저장 안 한 제목' } });
    mocks.confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: /새 페이지/ }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '저장하지 않은 변경' })));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(title).toHaveValue('저장 안 한 제목');

    mocks.confirm.mockResolvedValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: /새 페이지/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('게시한 페이지는 주소를 바꿀 수 없다', async () => {
    mocks.getPage.mockResolvedValue(detail({ status: 'PUBLISHED', pathLocked: true, revisionCount: 1 }));
    await openPage();
    expect(screen.getByText(/게시한 적이 있어 주소를 바꿀 수 없습니다/)).toBeInTheDocument();
  });
});
