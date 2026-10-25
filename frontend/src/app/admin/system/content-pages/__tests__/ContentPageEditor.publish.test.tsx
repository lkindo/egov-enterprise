import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentPageEditor } from '../ContentPageEditor';
import { emptyRichCell, type CmsCell, type CmsDocument, type CmsSection } from '@/lib/cms/document';
import type { GroupSource, MenuSource } from '@/lib/navigation/route-menu-links';

/** 게시 대화상자·미리보기·게시한 뒤 할 일(ADR-0042). 편집기 전체를 그리고 서비스만 대역으로 둔다. */
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  getPage: vi.fn(),
  getHome: vi.fn(),
  saveDraft: vi.fn(),
  publish: vi.fn(),
  updateHome: vi.fn(),
  getRevisions: vi.fn(),
  getRevision: vi.fn(),
  handOffScreen: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/contexts/UnsavedChangesContext', () => ({ useUnsavedChanges: () => vi.fn() }));
vi.mock('@/components/cms/CmsRichTextEditor', () => ({
  CmsRichTextEditor: ({ label, invalid, describedBy }: { label: string; invalid?: boolean; describedBy?: string }) => (
    <div data-testid="rich-editor" role="textbox" aria-label={label} contentEditable suppressContentEditableWarning tabIndex={0}
      aria-invalid={invalid ? 'true' : undefined} aria-describedby={describedBy} />
  ),
}));
vi.mock('@/app/components/ui/attachment-image', () => ({ AttachmentImage: () => <span data-testid="attachment" /> }));
vi.mock('@/lib/navigation/target-handoff', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/target-handoff')>()),
  handOffScreen: mocks.handOffScreen,
}));

const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: auth.permissions, authorizationVersion: 'v1' } }) }));

const menuAccess = vi.hoisted(() => ({
  menuSource: null as MenuSource | null,
  groupSource: null as GroupSource | null,
}));
vi.mock('@/lib/navigation/use-menu-access-sources', () => ({
  useMenuAccessSources: () => ({ menuSource: menuAccess.menuSource, groupSource: menuAccess.groupSource, retry: vi.fn() }),
}));

vi.mock('@/services/business/cms/CmsService', () => ({
  cmsService: {
    getPage: mocks.getPage,
    getHome: mocks.getHome,
    saveDraft: mocks.saveDraft,
    publish: mocks.publish,
    updateHome: mocks.updateHome,
    getRevisions: mocks.getRevisions,
    getRevision: mocks.getRevision,
  },
}));

const rich = (...texts: string[]): CmsCell => ({
  kind: 'rich',
  doc: { type: 'doc', content: texts.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })) },
});
const section = (id: string, label: string, cells: CmsCell[], layout: CmsSection['layout'] = 'one'): CmsSection => ({
  id, label, layout, tone: 'default', spacing: 'normal', cells,
});
const doc = (...sections: CmsSection[]): CmsDocument => ({ schemaVersion: 1, sections });
const readyDocument = () => doc(section('intro', '안내', [rich('신청은 온라인으로 합니다.')]), section('steps', '절차', [rich('준비 사항을 확인합니다.')]));

const detail = (overrides: Record<string, unknown> = {}) => ({
  contsSn: 7,
  contsPathNm: 'service-guide',
  contsTtl: '이용 안내',
  contsExpln: '',
  document: readyDocument(),
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

async function openPublish() {
  fireEvent.click(await screen.findByRole('button', { name: /게시하기/ }));
  return screen.findByRole('dialog', { name: '저장한 초안 게시' });
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.permissions = ['CMS_ADMIN_READ', 'CMS_UPDATE', 'CMS_PUBLISH', 'CMS_HOME_UPDATE', 'FILE_UPLOAD'];
  menuAccess.menuSource = null;
  menuAccess.groupSource = null;
  mocks.getHome.mockResolvedValue({ contsSn: null, version: 0 });
  mocks.getPage.mockResolvedValue(detail());
  mocks.getRevisions.mockResolvedValue([]);
  mocks.confirm.mockResolvedValue(true);
  mocks.handOffScreen.mockReturnValue(true);
});

describe('ContentPageEditor — 게시 대화상자(PublishDialog)', () => {
  it('게시 중에는 단추를 잠가 한 번만 보내고 저장한 초안의 버전과 변경 설명을 보낸 뒤, 결과를 부풀리지 않고 알린다', async () => {
    renderEditor();
    const dialog = await openPublish();
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
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      '게시했습니다. 주소를 아는 로그인 사용자는 이제 v1 게시본을 봅니다. 사용자가 찾을 수 있게 메뉴에 연결하세요.', 'success'));
  });

  it('주소 고정 안내는 상태가 아니라 주소가 고정됐는지로 정한다', async () => {
    const { unmount } = renderEditor();
    expect(await openPublish()).toHaveTextContent('처음 게시하면 주소가 고정됩니다.');
    unmount();

    // 게시를 중지한 페이지는 게시 중이 아니지만 주소는 이미 고정돼 있다.
    mocks.getPage.mockResolvedValue(detail({ status: 'UNPUBLISHED', pathLocked: true, revisionCount: 1, unpublishedChanges: false }));
    renderEditor();
    const dialog = await openPublish();
    expect(dialog).toHaveTextContent('/pages/service-guide');
    expect(dialog).not.toHaveTextContent('처음 게시하면 주소가 고정됩니다.');
  });

  it('저장하지 않은 변경이 있으면 막지 않고 초안을 저장한 뒤 받은 버전으로 게시한다', async () => {
    renderEditor();
    fireEvent.change(await screen.findByRole('textbox', { name: /요약/ }), { target: { value: '새 요약' } });
    mocks.saveDraft.mockResolvedValue(detail({ contsExpln: '새 요약', version: 4 }));
    mocks.publish.mockResolvedValue(published({ contsExpln: '새 요약', version: 5 }));
    const dialog = await openPublish();
    expect(dialog).toHaveTextContent('저장하지 않은 변경이 있습니다.');

    fireEvent.click(within(dialog).getByRole('button', { name: '저장하고 게시' }));
    await waitFor(() => expect(mocks.publish).toHaveBeenCalledWith(7, 4, undefined));
    expect(mocks.saveDraft.mock.calls[0][1]).toMatchObject({ contsExpln: '새 요약', version: 3 });
    expect(mocks.saveDraft.mock.invocationCallOrder[0]).toBeLessThan(mocks.publish.mock.invocationCallOrder[0]);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.stringContaining('초안을 저장했습니다'), 'success');
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('게시했습니다'), 'success');
  });

  it('저장하고 게시에서 저장이 실패하면 게시하지 않고 대화상자를 닫아 그 칸을 가리킨다', async () => {
    renderEditor();
    const path = await screen.findByRole('textbox', { name: /주소/ });
    fireEvent.change(path, { target: { value: 'used-path' } });
    mocks.saveDraft.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { code: 'C008' } } });
    const dialog = await openPublish();

    fireEvent.click(within(dialog).getByRole('button', { name: '저장하고 게시' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findAllByText('이미 쓰는 주소입니다. 다른 주소를 입력해 주세요.')).not.toHaveLength(0);
    await waitFor(() => expect(path).toHaveFocus());
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('초안을 저장하지 못해 게시하지 않았습니다. 표시한 칸을 고친 뒤 다시 게시해 주세요.', 'error');
  });

  it('게시를 막는 문제를 칸마다 보이고, 이 칸으로 가기는 대화상자를 닫고 그 칸에 문제를 표시해 포커스를 옮긴다', async () => {
    mocks.getPage.mockResolvedValue(detail({
      document: doc(
        section('intro', '안내', [rich('안내할 내용을 작성해 주세요.')]),
        section('photo', '사진', [{ kind: 'image', atchFileSn: 0, alt: '청사', decorative: false, caption: '' }, rich('청사 안내')], 'two'),
      ),
    }));
    const { container } = renderEditor();
    const dialog = await openPublish();

    const alert = within(dialog).getByText(/게시를 막는 문제 2개/).closest('[role="alert"]') as HTMLElement;
    // 문서 순서로 늘어놓는다 — 시작 양식 문장(1번 영역)이 게시 판정 문제(2번 영역)보다 먼저다.
    const items = within(alert).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('1번 영역 ‘안내’ 1단 — 시작 양식의 작성 안내 문장이 남아 있습니다');
    expect(items[1]).toHaveTextContent('2번 영역 ‘사진’ 1단 — 이미지를 선택해 주세요');
    expect(within(dialog).getByRole('button', { name: '게시' })).toBeDisabled();

    fireEvent.click(within(items[1]).getByRole('button', { name: '이 칸으로 가기' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const photo = container.querySelector<HTMLElement>('[data-section-index="1"]')!;
    expect(within(photo).getByText('사진에 고칠 곳이 1개 있습니다.')).toBeInTheDocument();
    await waitFor(() => expect(within(photo).getByRole('button', { name: '이미지 올리기' })).toHaveFocus());
    // 다른 칸의 문제도 함께 표시된다 — 고치면 사라지는 살아 있는 판정이다.
    expect(container.querySelector('[data-section-index="0"] [aria-invalid="true"][role="textbox"]')).not.toBeNull();
  });

  it('편집할 수 없으면 칸으로 가기를 두지 않는다', async () => {
    auth.permissions = ['CMS_ADMIN_READ', 'CMS_PUBLISH'];
    mocks.getPage.mockResolvedValue(detail({ document: doc(section('intro', '안내', [rich('내용을 작성해 주세요.')])) }));
    renderEditor();
    const dialog = await openPublish();
    expect(within(dialog).getByText(/게시를 막는 문제 1개/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '이 칸으로 가기' })).toBeNull();
  });

  it('빈 칸 수와 업무 홈 소개는 막지 않고 알린다', async () => {
    mocks.getHome.mockResolvedValue({ contsSn: 7, contsTtl: '이용 안내', version: 1 });
    mocks.getPage.mockResolvedValue(published({
      unpublishedChanges: true,
      document: doc(section('intro', '안내', [rich('신청 안내'), emptyRichCell()], 'two')),
    }));
    mocks.getRevision.mockResolvedValue({ contsRvsnSn: 11, revisionNumber: 1, contsTtl: '이용 안내', contsExpln: '', document: readyDocument() });
    renderEditor();
    const dialog = await openPublish();

    expect(dialog).toHaveTextContent('아무 내용도 없는 칸이 1개 있습니다. 게시하면 그 자리는 비어 보입니다.');
    expect(dialog).toHaveTextContent('이 페이지는 업무 홈 소개입니다. 게시하면 모든 사용자의 업무 홈 맨 위가 바뀝니다.');
    expect(within(dialog).getByRole('button', { name: '게시' })).toBeEnabled();
  });

  it('지금 게시본과 영역 식별자로 맞춰 바뀐 영역·새 영역·지운 영역과 제목 변경을 보인다', async () => {
    mocks.getPage.mockResolvedValue(published({
      contsTtl: '새 제목',
      unpublishedChanges: true,
      document: doc(
        section('intro', '안내', [rich('신청은 방문으로도 합니다.')]),
        section('steps', '절차', [rich('준비 사항을 확인합니다.')]),
        section('contact', '문의', [rich('문의처')]),
      ),
    }));
    mocks.getRevision.mockResolvedValue({
      contsRvsnSn: 11,
      revisionNumber: 1,
      contsTtl: '이용 안내',
      contsExpln: '',
      document: doc(
        section('intro', '안내', [rich('신청은 온라인으로 합니다.')]),
        section('steps', '절차', [rich('준비 사항을 확인합니다.')]),
        section('faq', '자주 묻는 질문', [rich('질문')]),
      ),
    });
    renderEditor();
    const dialog = await openPublish();

    const changes = within(dialog).getByRole('region', { name: '지금 게시본(v1)과 바뀐 점' });
    await waitFor(() => expect(changes).toHaveTextContent('바뀐 영역 1개: 안내'));
    expect(changes).toHaveTextContent('제목을 바꿨습니다.');
    expect(changes).toHaveTextContent('새 영역 1개: 문의');
    expect(changes).toHaveTextContent('지운 영역 1개: 자주 묻는 질문');
    expect(changes).not.toHaveTextContent('요약을 바꿨습니다.');
    expect(mocks.getRevision).toHaveBeenCalledWith(7, 11);
  });

  it('게시 실패의 필드 오류는 대화상자 안에 보이고 대화상자를 닫지 않는다', async () => {
    renderEditor();
    const dialog = await openPublish();
    mocks.publish.mockRejectedValue({ response: { status: 400, data: { errors: [{ field: 'rvsnRsn', message: '변경 설명이 너무 깁니다.' }] } } });
    fireEvent.click(within(dialog).getByRole('button', { name: '게시' }));

    expect(await within(dialog).findAllByText('변경 설명이 너무 깁니다.')).not.toHaveLength(0);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('다른 사람이 먼저 게시했으면(409 C013) 대화상자를 닫고 충돌을 알린다', async () => {
    renderEditor();
    const dialog = await openPublish();
    mocks.publish.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { code: 'C013' } } });
    fireEvent.click(within(dialog).getByRole('button', { name: '게시' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByText(/다른 사람이 먼저 이 페이지를 바꿨습니다/)).toBeInTheDocument();
  });

  it('보이는 내용이 없으면 게시를 막는다', async () => {
    mocks.getPage.mockResolvedValue(detail({ document: doc(section('a', '', [emptyRichCell()])) }));
    renderEditor();
    const dialog = await openPublish();
    expect(within(dialog).getByText(/보이는 내용이 없습니다/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '게시' })).toBeDisabled();
  });
});

describe('ContentPageEditor — 미리보기', () => {
  it('넓은 화면·휴대전화 폭·업무 홈 소개로 보고, 미완성 칸은 점선 자리로 보인다', async () => {
    mocks.getPage.mockResolvedValue(detail({
      contsExpln: '요약 문장',
      document: doc(section('photo', '사진', [{ kind: 'image', atchFileSn: 0, alt: '', decorative: false, caption: '' }, rich('청사 안내')], 'two')),
    }));
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: /미리보기/ }));
    const dialog = await screen.findByRole('dialog', { name: '미리보기 — 저장하지 않은 변경 포함' });

    expect(within(dialog).getByRole('heading', { level: 1, name: '이용 안내' })).toBeInTheDocument();
    expect(within(dialog).getByText('요약 문장')).toBeInTheDocument();
    expect(dialog.querySelector('[data-cms-placeholder="image"]')).not.toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: '휴대전화 폭' }));
    expect(within(dialog).getByTestId('cms-preview-frame')).toHaveClass('w-[390px]');

    fireEvent.click(within(dialog).getByRole('button', { name: '업무 홈 소개' }));
    const home = within(dialog).getByTestId('cms-preview-home');
    expect(within(home).getByRole('heading', { level: 2, name: '이용 안내' })).toBeInTheDocument();
    expect(within(home).queryByText('요약 문장')).toBeNull();
    expect(within(home).queryByRole('heading', { level: 1 })).toBeNull();
    expect(within(dialog).getByRole('button', { name: '업무 홈 소개' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('ContentPageEditor — 게시한 뒤 할 일(PageNextSteps)', () => {
  const groups: GroupSource = {
    status: 'ready',
    groups: [{ code: 'ROLE_USER', name: '일반 사용자', grants: [] }],
  };

  it('게시 중이면 게시본 열기(새 창)·주소 복사·메뉴에 추가를 보이고, 메뉴에 추가는 이 주소를 메뉴 관리로 넘긴다', async () => {
    auth.permissions = [...auth.permissions, 'MENU_READ', 'MENU_CREATE', 'MENU_UPDATE'];
    mocks.getPage.mockResolvedValue(published());
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderEditor();

    const steps = await screen.findByRole('region', { name: '게시한 뒤 할 일' });
    const open = within(steps).getByRole('link', { name: /게시본 열기/ });
    expect(open).toHaveAttribute('href', '/pages/service-guide');
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAccessibleName(/^게시본 열기 ?\(새 창\)$/);

    fireEvent.click(within(steps).getByRole('button', { name: '주소 복사' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/pages/service-guide`));
    expect(mocks.toast).toHaveBeenCalledWith('페이지 주소를 복사했습니다.', 'success');

    fireEvent.click(within(steps).getByRole('button', { name: '메뉴에 추가' }));
    expect(mocks.handOffScreen).toHaveBeenCalledWith({ route: '/pages/service-guide', label: '이용 안내' });
    expect(mocks.push).toHaveBeenCalledWith('/admin/system/menus');
  });

  it('메뉴 등록·수정 권한이 없으면 메뉴에 추가 대신 메뉴 관리 권한자에게 요청하라고 안내한다', async () => {
    auth.permissions = [...auth.permissions, 'MENU_READ'];
    mocks.getPage.mockResolvedValue(published());
    renderEditor();
    const steps = await screen.findByRole('region', { name: '게시한 뒤 할 일' });
    expect(within(steps).queryByRole('button', { name: '메뉴에 추가' })).toBeNull();
    expect(steps).toHaveTextContent('메뉴 연결은 메뉴 관리 권한(메뉴 등록·수정) 보유자에게 요청하세요.');
  });

  it('일반 그룹에 보이는 활성 메뉴가 없으면 경고하고, 확인할 수 없으면 단정하지 않는다', async () => {
    menuAccess.menuSource = { status: 'ready', menus: [] };
    menuAccess.groupSource = groups;
    mocks.getPage.mockResolvedValue(published());
    const { unmount } = renderEditor();
    expect(await screen.findByText(/일반 사용자가 볼 수 있는 메뉴가 없습니다 — 메뉴를 일반 사용자 그룹이 보는 영역에 두고 그 그룹의 메뉴 표시를 켜세요/))
      .toBeInTheDocument();
    unmount();

    menuAccess.menuSource = { status: 'failed' };
    renderEditor();
    await screen.findByRole('region', { name: '게시한 뒤 할 일' });
    expect(screen.queryByText(/일반 사용자가 볼 수 있는 메뉴가 없습니다/)).toBeNull();
  });

  it('일반 그룹에 보이는 메뉴가 있으면 게시 알림이 메뉴 연결을 요구하지 않는다', async () => {
    menuAccess.menuSource = {
      status: 'ready',
      menus: [{ menuNo: 2, menuNm: '이용 안내', upMenuSn: null, menuOrdr: 1, modernRoute: '/pages/service-guide', useYn: 'Y' }],
    };
    menuAccess.groupSource = {
      status: 'ready',
      groups: [{ code: 'ROLE_USER', name: '일반 사용자', grants: [{ type: 'NAVIGATION', code: '2' }] }],
    };
    mocks.publish.mockResolvedValue(published({ version: 4 }));
    renderEditor();
    const dialog = await openPublish();
    fireEvent.click(within(dialog).getByRole('button', { name: '게시' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('게시했습니다. 주소를 아는 로그인 사용자는 이제 v1 게시본을 봅니다.', 'success'));
  });

  it('게시 중이 아니면 할 일을 보이지 않는다', async () => {
    renderEditor();
    await screen.findByRole('button', { name: /게시하기/ });
    expect(screen.queryByRole('region', { name: '게시한 뒤 할 일' })).toBeNull();
  });
});
