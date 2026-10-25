import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContentPagesClient from '../ContentPagesClient';
import { templateDocument } from '@/lib/cms/document';
import { handOffContentPage } from '@/lib/cms/editor-handoff';
import type { GroupSource, MenuSource } from '@/lib/navigation/route-menu-links';

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

/** 메뉴 연결 판정의 원천. 기본은 확인 중(null)이라 '메뉴 연결 없음' 을 붙이지 않는다. */
const menuAccess = vi.hoisted(() => ({
  menuSource: null as MenuSource | null,
  groupSource: null as GroupSource | null,
}));
vi.mock('@/lib/navigation/use-menu-access-sources', () => ({
  useMenuAccessSources: () => ({ menuSource: menuAccess.menuSource, groupSource: menuAccess.groupSource, retry: vi.fn() }),
}));

/** 목록이 편집기에 넘긴 onDeleted 를 잡는다 — 편집기는 그대로 그린다. */
const editorProps = vi.hoisted(() => ({ onDeleted: undefined as undefined | (() => void) }));
vi.mock('../ContentPageEditor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ContentPageEditor')>();
  const { createElement, forwardRef } = await import('react');
  const Editor = actual.ContentPageEditor as unknown as React.ComponentType<Record<string, unknown>>;
  const Spy = forwardRef<unknown, Record<string, unknown>>(function EditorSpy(props, ref) {
    editorProps.onDeleted = props.onDeleted as (() => void) | undefined;
    return createElement(Editor, { ...props, ref });
  });
  return { ...actual, ContentPageEditor: Spy };
});

vi.mock('@/services/business/cms/CmsService', () => ({
  cmsService: {
    getPages: mocks.getPages,
    getPage: mocks.getPage,
    getHome: mocks.getHome,
    createPage: mocks.createPage,
    saveDraft: mocks.saveDraft,
    publish: mocks.publish,
    getRevisions: vi.fn().mockResolvedValue([]),
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

const row = (overrides: Record<string, unknown> = {}) => ({
  contsSn: 7, contsPathNm: 'service-guide', contsTtl: '이용 안내', status: 'DRAFT', version: 3, ...overrides,
});
const pageOf = (list: unknown[], total = list.length, totalPage = Math.max(1, Math.ceil(total / 20))) =>
  ({ list, total, page: 1, totalPage });
const lastListParams = () => mocks.getPages.mock.calls.at(-1)?.[0];

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><ContentPagesClient /></QueryClientProvider>);
}

async function openPage() {
  renderScreen();
  fireEvent.click(await screen.findByRole('button', { name: /이용 안내/ }));
  return screen.findByRole('textbox', { name: /페이지 제목/ });
}

async function openCreateDialog() {
  renderScreen();
  fireEvent.click(await screen.findByRole('button', { name: /새 페이지/ }));
  return screen.findByRole('dialog');
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  auth.permissions = ['CMS_ADMIN_READ', 'CMS_UPDATE', 'CMS_PUBLISH', 'CMS_HOME_UPDATE'];
  menuAccess.menuSource = null;
  menuAccess.groupSource = null;
  editorProps.onDeleted = undefined;
  mocks.getPages.mockResolvedValue(pageOf([row()]));
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

  it('다른 사람이 먼저 바꿨으면(409 C013) 입력을 지우지 않고 알린다', async () => {
    const title = await openPage();
    fireEvent.change(title, { target: { value: '내가 고친 제목' } });
    mocks.saveDraft.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { code: 'C013' } } });
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('다른 사람이 먼저 이 페이지를 바꿨습니다');
    expect(screen.getByRole('textbox', { name: /페이지 제목/ })).toHaveValue('내가 고친 제목');
  });

  it('게시 대화상자는 로그인한 모든 사용자에게 공개됨을 알리고, 저장하지 않은 변경이 있으면 저장하고 게시하게 한다(ADR-0042)', async () => {
    // 작성 안내 문장이 없는 양식 — 게시를 막는 문제가 없다.
    mocks.getPage.mockResolvedValue(detail({ document: templateDocument('intro') }));
    const title = await openPage();
    fireEvent.change(title, { target: { value: '저장 안 한 제목' } });
    fireEvent.click(screen.getByRole('button', { name: /게시하기/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/로그인한 모든 사용자/)).toBeInTheDocument();
    expect(within(dialog).getByText(/저장하지 않은 변경이 있습니다/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '저장하고 게시' })).toBeEnabled();
  });

  it('시작 양식의 작성 안내 문장이 남아 있으면 게시를 막고 그 칸을 알린다(ADR-0042)', async () => {
    await openPage();
    fireEvent.click(screen.getByRole('button', { name: /게시하기/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/게시를 막는 문제 1개/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '게시' })).toBeDisabled();
  });

  it('게시 권한이 없으면 게시·홈 지정 단추를 보이지 않고, 메뉴 조회 권한만으로는 메뉴에 추가를 보이지 않는다', async () => {
    // '메뉴에 추가' 는 화면 관리와 같은 기준이다 — 메뉴 등록·수정 권한과 메뉴 관리 화면 접근이 함께 있어야 한다(ADR-0042).
    auth.permissions = ['CMS_ADMIN_READ', 'CMS_UPDATE', 'MENU_READ'];
    mocks.getPage.mockResolvedValue(detail({ status: 'PUBLISHED', publishedRevision: { contsRvsnSn: 1, revisionNumber: 1, current: true }, revisionCount: 1 }));
    await openPage();

    expect(screen.queryByRole('button', { name: /게시하기/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /업무 홈 소개로 보이기/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /메뉴에 추가/ })).toBeNull();
    expect(screen.getByText(/메뉴 연결은 메뉴 관리 권한/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /주소 복사/ })).toBeInTheDocument();
  });

  it('메뉴 관리 화면을 열 수 없으면 메뉴에 추가 단추를 보이지 않는다', async () => {
    mocks.getPage.mockResolvedValue(detail({ status: 'PUBLISHED', publishedRevision: { contsRvsnSn: 1, revisionNumber: 1, current: true }, revisionCount: 1 }));
    await openPage();

    // 목록의 상태 조건에도 같은 이름('게시 중지')의 단추가 있다 — 편집 영역 안의 단추만 본다.
    const editor = screen.getByTestId('master-detail-detail');
    expect(within(editor).getByRole('button', { name: /게시 중지/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /메뉴에 추가/ })).toBeNull();
  });

  it('새 페이지(CreatePageDialog): 잘못된 주소는 보내지 않고 그 칸을 가리킨다', async () => {
    const dialog = await openCreateDialog();
    fireEvent.change(within(dialog).getByRole('textbox', { name: /페이지 제목/ }), { target: { value: '이용 안내' } });
    const path = within(dialog).getByRole('textbox', { name: /주소/ });
    fireEvent.change(path, { target: { value: 'Bad Path' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '초안 만들기' }));

    expect(await within(dialog).findAllByText(/영문 소문자·숫자·하이픈으로 입력해 주세요/)).not.toHaveLength(0);
    await waitFor(() => expect(path).toHaveAttribute('aria-invalid', 'true'));
    expect(mocks.createPage).not.toHaveBeenCalled();
  });

  it('새 페이지: 만드는 동안 단추를 잠가 한 번만 보내고, 이미 쓰는 주소(409 C008)는 주소 칸에 알린다', async () => {
    const dialog = await openCreateDialog();
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

    rejectCreate({ isAxiosError: true, response: { status: 409, data: { code: 'C008' } } });
    expect(await within(dialog).findAllByText('이미 쓰는 주소입니다. 다른 주소를 입력해 주세요.')).not.toHaveLength(0);
    expect(path).toHaveValue('service-guide');
    expect(createButton).toBeEnabled();
  });

  it('새 페이지: 주소 중복이 아닌 409 는 주소 칸에 붙이지 않고 사유를 알린다', async () => {
    const dialog = await openCreateDialog();
    fireEvent.change(within(dialog).getByRole('textbox', { name: /페이지 제목/ }), { target: { value: '이용 안내' } });
    const path = within(dialog).getByRole('textbox', { name: /주소/ });
    fireEvent.change(path, { target: { value: 'service-guide' } });
    mocks.createPage.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { code: 'C013' } } });
    fireEvent.click(within(dialog).getByRole('button', { name: '초안 만들기' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('페이지를 만들지 못했습니다'), 'error'));
    expect(within(dialog).queryByText('이미 쓰는 주소입니다. 다른 주소를 입력해 주세요.')).toBeNull();
    expect(path).not.toHaveAttribute('aria-invalid');
    expect(path).toHaveValue('service-guide');
  });

  it('새 페이지: 기존 페이지를 고르면 그 초안의 글을 복사하고 이미지·내려받기 파일은 떼어 만든다', async () => {
    mocks.getPage.mockResolvedValue(detail({
      document: {
        schemaVersion: 1,
        sections: [{
          id: 's1', label: '', layout: 'two', tone: 'default', spacing: 'normal',
          cells: [
            { kind: 'image', atchFileSn: 5, alt: '안내도', decorative: false, caption: '' },
            { kind: 'files', items: [{ atchFileSn: 6, title: '신청서' }] },
          ],
        }],
      },
    }));
    mocks.createPage.mockResolvedValue(11);
    const dialog = await openCreateDialog();
    fireEvent.change(within(dialog).getByRole('textbox', { name: /페이지 제목/ }), { target: { value: '복사한 안내' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /주소/ }), { target: { value: 'copied-guide' } });
    fireEvent.click(within(dialog).getByRole('radio', { name: '기존 페이지 복사' }));

    expect(within(dialog).getByText(/이미지와 내려받기 파일은 복사하지 않으니/)).toBeInTheDocument();
    fireEvent.click(await within(dialog).findByRole('radio', { name: /이용 안내/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: '초안 만들기' }));

    await waitFor(() => expect(mocks.createPage).toHaveBeenCalledTimes(1));
    expect(mocks.getPage).toHaveBeenCalledWith(7);
    const body = mocks.createPage.mock.calls[0][0];
    expect(body).toMatchObject({ contsTtl: '복사한 안내', contsPathNm: 'copied-guide' });
    expect(body.document.sections[0].cells).toEqual([
      { kind: 'image', atchFileSn: 0, alt: '안내도', decorative: false, caption: '' },
      { kind: 'files', items: [] },
    ]);
  });

  it('새 페이지: 복사할 페이지를 고르지 않거나 그 초안을 읽지 못하면 만들지 않는다', async () => {
    const dialog = await openCreateDialog();
    fireEvent.change(within(dialog).getByRole('textbox', { name: /페이지 제목/ }), { target: { value: '복사한 안내' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /주소/ }), { target: { value: 'copied-guide' } });
    fireEvent.click(within(dialog).getByRole('radio', { name: '기존 페이지 복사' }));
    fireEvent.click(within(dialog).getByRole('button', { name: '초안 만들기' }));

    expect(await within(dialog).findAllByText('복사할 페이지를 골라 주세요.')).not.toHaveLength(0);
    await waitFor(() => expect(within(dialog).getByRole('textbox', { name: '복사할 페이지 찾기' })).toHaveAttribute('aria-invalid', 'true'));
    expect(mocks.getPage).not.toHaveBeenCalled();

    mocks.getPage.mockResolvedValue(detail({ documentError: '형식이 맞지 않습니다.' }));
    fireEvent.click(await within(dialog).findByRole('radio', { name: /이용 안내/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: '초안 만들기' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('복사하지 않았습니다'), 'error'));
    expect(mocks.createPage).not.toHaveBeenCalled();
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

describe('콘텐츠 페이지 목록(ADR-0042)', () => {
  it('상태 조건은 보관 제외 전체·게시 대기·게시 중·게시 중지·초안·보관이고, 고른 값으로 목록을 다시 읽는다', async () => {
    renderScreen();
    const group = await screen.findByRole('group', { name: '상태' });
    expect(within(group).getAllByRole('button').map((button) => button.textContent))
      .toEqual(['전체(보관 제외)', '게시 대기', '게시 중', '게시 중지', '초안', '보관']);
    expect(lastListParams()).toMatchObject({ status: 'ACTIVE', page: 1 });

    fireEvent.click(within(group).getByRole('button', { name: '게시 대기' }));
    await waitFor(() => expect(lastListParams()).toMatchObject({ status: 'PENDING', page: 1 }));
    expect(within(group).getByRole('button', { name: '게시 대기' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/게시한 뒤 저장한 수정이 아직 게시되지 않은 페이지/)).toBeInTheDocument();

    fireEvent.click(within(group).getByRole('button', { name: '게시 중지' }));
    await waitFor(() => expect(lastListParams()).toMatchObject({ status: 'UNPUBLISHED', page: 1 }));
  });

  it('행은 상태 배지와 수정일·게시일을 짧게 보이고, 목록 머리가 최근 수정 순임을 밝힌다', async () => {
    mocks.getPages.mockResolvedValue(pageOf([
      row({ contsSn: 7, status: 'PUBLISHED', unpublishedChanges: true, home: true, mdfcnDt: '2026-10-25T09:30:00', publishedAt: '2026-10-20T08:00:00' }),
      row({ contsSn: 8, contsPathNm: 'paused', contsTtl: '내린 안내', status: 'UNPUBLISHED', mdfcnDt: '2026-10-24T18:00:00' }),
    ]));
    renderScreen();

    const published = await screen.findByRole('button', { name: /이용 안내/ });
    expect(within(published).getByText('게시 중')).toBeInTheDocument();
    expect(within(published).getByText('게시 전 수정 있음')).toBeInTheDocument();
    expect(within(published).getByText('업무 홈 소개')).toBeInTheDocument();
    expect(within(published).getByText('수정 2026-10-25 · 게시 2026-10-20')).toBeInTheDocument();

    const paused = screen.getByRole('button', { name: /내린 안내/ });
    expect(within(paused).getByText('게시 중지')).toBeInTheDocument();
    expect(within(paused).getByText('수정 2026-10-24')).toBeInTheDocument();
    expect(screen.getByText(/최근 수정 순/)).toBeInTheDocument();
  });

  it('게시 중인데 일반 그룹에 보이는 활성 메뉴가 없는 페이지에만 메뉴 연결 없음을 붙인다', async () => {
    menuAccess.menuSource = {
      status: 'ready',
      menus: [
        { menuNo: 4000, menuNm: '안내', upMenuSn: null, menuOrdr: 1, modernRoute: null, useYn: 'Y' },
        { menuNo: 4010, menuNm: '연결된 안내', upMenuSn: 4000, menuOrdr: 2, modernRoute: '/pages/linked', useYn: 'Y' },
      ],
    };
    menuAccess.groupSource = {
      status: 'ready',
      groups: [{ code: 'ROLE_USER', name: '사용자', grants: [4000, 4010].map((id) => ({ type: 'NAVIGATION', code: String(id) })) }],
    };
    mocks.getPages.mockResolvedValue(pageOf([
      row({ contsSn: 7, status: 'PUBLISHED' }),
      row({ contsSn: 8, contsPathNm: 'linked', contsTtl: '연결된 안내', status: 'PUBLISHED' }),
      row({ contsSn: 9, contsPathNm: 'draft-page', contsTtl: '쓰는 중인 안내', status: 'DRAFT' }),
    ]));
    renderScreen();

    expect(within(await screen.findByRole('button', { name: /이용 안내/ })).getByText('메뉴 연결 없음')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /연결된 안내/ })).queryByText('메뉴 연결 없음')).toBeNull();
    expect(within(screen.getByRole('button', { name: /쓰는 중인 안내/ })).queryByText('메뉴 연결 없음')).toBeNull();
  });

  it('메뉴·그룹을 확인할 수 없거나 확인하는 중이면 메뉴 연결 없음으로 추정하지 않는다', async () => {
    mocks.getPages.mockResolvedValue(pageOf([row({ contsSn: 7, status: 'PUBLISHED' })]));
    menuAccess.menuSource = { status: 'failed' };
    menuAccess.groupSource = { status: 'failed' };
    const view = renderScreen();
    await screen.findByRole('button', { name: /이용 안내/ });
    expect(screen.queryByText('메뉴 연결 없음')).toBeNull();

    view.unmount();
    menuAccess.menuSource = { status: 'no-permission' };
    menuAccess.groupSource = { status: 'ready', groups: [] };
    const second = renderScreen();
    await screen.findByRole('button', { name: /이용 안내/ });
    expect(screen.queryByText('메뉴 연결 없음')).toBeNull();

    second.unmount();
    menuAccess.menuSource = null;
    menuAccess.groupSource = null;
    renderScreen();
    await screen.findByRole('button', { name: /이용 안내/ });
    expect(screen.queryByText('메뉴 연결 없음')).toBeNull();
  });

  it('마지막 쪽이 비면 앞 쪽으로 돌아간다', async () => {
    let lastPageEmptied = false;
    mocks.getPages.mockImplementation(async (params: { page: number }) => {
      if (params.page === 2) return lastPageEmptied ? { list: [], total: 20, page: 2, totalPage: 1 } : pageOf([row({ contsSn: 30, contsTtl: '스물한째 안내' })], 21, 2);
      return lastPageEmptied ? pageOf([row()], 20, 1) : pageOf([row()], 21, 2);
    });
    renderScreen();
    await screen.findByRole('button', { name: /이용 안내/ });
    lastPageEmptied = true;
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    await waitFor(() => expect(mocks.getPages.mock.calls.some(([params]) => params.page === 2)).toBe(true));
    await waitFor(() => expect(lastListParams()).toMatchObject({ page: 1 }));
    expect(await screen.findByRole('button', { name: /이용 안내/ })).toBeInTheDocument();
  });

  it('고른 페이지가 목록 쪽 이동으로 목록에서 빠져도 편집 머리는 그 페이지 제목이다', async () => {
    mocks.getPages.mockImplementation(async (params: { page: number }) => (params.page === 2
      ? { ...pageOf([row({ contsSn: 30, contsPathNm: 'other', contsTtl: '다른 안내' })], 21, 2), page: 2 }
      : pageOf([row()], 21, 2)));
    await openPage();
    expect(screen.getByRole('region', { name: '이용 안내' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByRole('button', { name: /다른 안내/ });
    expect(screen.getByRole('region', { name: '이용 안내' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '페이지 편집' })).toBeNull();
  });

  it('처음 쓰는 화면은 새 페이지로 시작하라고 알리고, 만들 권한이 없으면 그 사실을 알린다', async () => {
    mocks.getPages.mockResolvedValue(pageOf([], 0, 0));
    const view = renderScreen();
    expect(await screen.findByText('아직 만든 콘텐츠 페이지가 없습니다.')).toBeInTheDocument();
    expect(screen.getByText(/‘새 페이지’를 눌러 페이지를 만드세요/)).toBeInTheDocument();
    expect(screen.queryByText('조건에 맞는 페이지가 없습니다.')).toBeNull();

    view.unmount();
    auth.permissions = ['CMS_ADMIN_READ'];
    renderScreen();
    expect(await screen.findByText('아직 만든 콘텐츠 페이지가 없습니다.')).toBeInTheDocument();
    expect(screen.getByText(/페이지를 만들 권한이 없습니다/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /새 페이지/ })).toBeNull();
  });

  it('보관한 페이지만 있으면 처음 쓰는 화면이라고 하지 않는다', async () => {
    mocks.getPages.mockImplementation(async (params: { status: string }) =>
      (params.status === 'ARCHIVED' ? pageOf([row({ status: 'ARCHIVED' })], 2) : pageOf([], 0, 0)));
    renderScreen();
    expect(await screen.findByText(/상태 ‘보관’에서 볼 수 있습니다/)).toHaveTextContent('보관한 페이지 2개');
    expect(screen.getByText('보관하지 않은 페이지가 없습니다.')).toBeInTheDocument();
    expect(screen.queryByText('아직 만든 콘텐츠 페이지가 없습니다.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '보관한 페이지 보기' }));
    await waitFor(() => expect(lastListParams()).toMatchObject({ status: 'ARCHIVED', page: 1, size: 20 }));
  });

  it('조건에 맞는 페이지가 없으면 조건을 밝히고, 조건 지우기로 전체를 다시 본다', async () => {
    renderScreen();
    await screen.findByRole('button', { name: /이용 안내/ });
    mocks.getPages.mockResolvedValue(pageOf([], 0, 0));
    fireEvent.change(screen.getByRole('textbox', { name: '제목 또는 주소' }), { target: { value: '없는 안내' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    expect(await screen.findByText('조건에 맞는 페이지가 없습니다.')).toBeInTheDocument();
    expect(screen.getByText(/검색어 “없는 안내”/)).toBeInTheDocument();
    expect(screen.queryByText('아직 만든 콘텐츠 페이지가 없습니다.')).toBeNull();

    mocks.getPages.mockResolvedValue(pageOf([row()]));
    fireEvent.click(screen.getByRole('button', { name: '조건 지우기' }));
    await waitFor(() => expect(lastListParams()).toMatchObject({ keyword: '', status: 'ACTIVE', page: 1 }));
    expect(screen.getByRole('textbox', { name: '제목 또는 주소' })).toHaveValue('');
    expect(await screen.findByRole('button', { name: /이용 안내/ })).toBeInTheDocument();
  });

  it('목록을 읽지 못하면 알리고 다시 시도할 수 있다', async () => {
    mocks.getPages.mockRejectedValueOnce({ isAxiosError: true, response: { status: 500 } });
    renderScreen();
    expect(await screen.findByText(/페이지 목록을 불러오지 못했습니다/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByRole('button', { name: /이용 안내/ })).toBeInTheDocument();
    expect(screen.queryByText(/페이지 목록을 불러오지 못했습니다/)).toBeNull();
  });

  it('열람 화면에서 넘어온 편집은 그 주소로 찾아 그 페이지를 한 번 고른다', async () => {
    handOffContentPage('service-guide');
    renderScreen();

    expect(await screen.findByRole('textbox', { name: /페이지 제목/ })).toHaveValue('이용 안내');
    expect(mocks.getPages).toHaveBeenCalledWith(expect.objectContaining({ keyword: 'service-guide', status: 'ACTIVE', page: 1 }));
    expect(screen.getByRole('textbox', { name: '제목 또는 주소' })).toHaveValue('service-guide');
    expect(screen.getByRole('button', { name: /이용 안내/ })).toHaveAttribute('aria-current', 'true');
    expect(window.sessionStorage.length).toBe(0);
  });

  it('편집기가 페이지를 지우면 고른 페이지를 비우고 목록을 다시 읽는다', async () => {
    await openPage();
    const before = mocks.getPages.mock.calls.length;
    expect(editorProps.onDeleted).toBeTypeOf('function');

    mocks.getPages.mockResolvedValue(pageOf([], 0, 0));
    act(() => { editorProps.onDeleted?.(); });

    expect(await screen.findByText('페이지를 고르세요')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '페이지 편집' })).toBeInTheDocument();
    await waitFor(() => expect(mocks.getPages.mock.calls.length).toBeGreaterThan(before));
  });

  it('게시 권한이 없는 작성자에게 게시는 게시 권한자가 하고 저장한 초안은 게시 대기에 보인다고 알린다', async () => {
    auth.permissions = ['CMS_ADMIN_READ', 'CMS_UPDATE', 'FILE_UPLOAD'];
    renderScreen();
    await screen.findByRole('button', { name: /이용 안내/ });
    expect(screen.getByText(/게시는 게시 권한이 있는 사람이 합니다/)).toHaveTextContent('‘게시 대기’');

    mocks.createPage.mockResolvedValue(11);
    fireEvent.click(screen.getByRole('button', { name: /새 페이지/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /페이지 제목/ }), { target: { value: '새 안내' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /주소/ }), { target: { value: 'new-guide' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '초안 만들기' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('게시 권한이 있는 사람이 게시합니다'), 'success'));
  });

  it('무엇을 어디에 올리는지 접어 안내하고, 열 수 있는 화면만 링크한다', async () => {
    const view = renderScreen();
    await screen.findByRole('button', { name: /이용 안내/ });
    expect(screen.getByText('무엇을 어디에 올리나요?')).toBeInTheDocument();
    for (const kind of ['도움말 콘텐츠', '온라인 매뉴얼', 'FAQ', '위키', 'Q&A', '공지 게시판', '배너', '팝업', '약관']) {
      expect(screen.getByText(kind)).toBeInTheDocument();
    }
    expect(screen.queryByRole('link', { name: '시스템 정책 관리' })).toBeNull();

    view.unmount();
    auth.permissions = ['CMS_ADMIN_READ', 'POLICY_READ'];
    renderScreen();
    await screen.findByRole('button', { name: /이용 안내/ });
    expect(screen.getByRole('link', { name: '시스템 정책 관리' })).toHaveAttribute('href', '/admin/system/policies');
  });
});
