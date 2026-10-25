import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentPageEditor } from '../ContentPageEditor';
import type { CmsCell, CmsDocument, CmsSection } from '@/lib/cms/document';
import type { GroupSource, MenuSource } from '@/lib/navigation/route-menu-links';

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
  getRevision: vi.fn(),
  deleteDraftPage: vi.fn(),
  purgePage: vi.fn(),
  purgeRevision: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/contexts/UnsavedChangesContext', () => ({ useUnsavedChanges: () => vi.fn() }));
// 본문 편집 영역의 대역 — 실제 편집기처럼 포커스를 받고 문제 표시(aria-invalid)를 단다.
vi.mock('@/components/cms/CmsRichTextEditor', () => ({
  CmsRichTextEditor: ({ label, invalid, describedBy }: { label: string; invalid?: boolean; describedBy?: string }) => (
    <div data-testid="rich-editor" role="textbox" aria-label={label} contentEditable suppressContentEditableWarning tabIndex={0}
      aria-invalid={invalid ? 'true' : undefined} aria-describedby={describedBy} />
  ),
}));
vi.mock('@/app/components/ui/attachment-image', () => ({ AttachmentImage: () => <span data-testid="attachment" /> }));

const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: auth.permissions, authorizationVersion: 'v1' } }) }));

/** 메뉴 연결 판정의 원천. 기본은 확인 중(null)이다. */
const menuAccess = vi.hoisted(() => ({
  menuSource: null as MenuSource | null,
  groupSource: null as GroupSource | null,
  retry: vi.fn(),
}));
vi.mock('@/lib/navigation/use-menu-access-sources', () => ({
  useMenuAccessSources: () => ({ menuSource: menuAccess.menuSource, groupSource: menuAccess.groupSource, retry: menuAccess.retry }),
}));

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
    getRevision: mocks.getRevision,
    deleteDraftPage: mocks.deleteDraftPage,
    purgePage: mocks.purgePage,
    purgeRevision: mocks.purgeRevision,
  },
}));

const rich = (...texts: string[]): CmsCell => ({
  kind: 'rich',
  doc: { type: 'doc', content: texts.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })) },
});
const section = (id: string, label: string, cells: CmsCell[], layout: CmsSection['layout'] = 'one'): CmsSection => ({
  id, label, layout, tone: 'default', spacing: 'normal', cells,
});
/** 게시할 수 있는 문서 — 시작 양식의 작성 안내 문장이 없다. */
const readyDocument = (): CmsDocument => ({
  schemaVersion: 1,
  sections: [section('intro', '안내', [rich('신청은 온라인으로 합니다.')]), section('steps', '절차', [rich('준비 사항을 확인합니다.')])],
});

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

const conflictError = (code?: string) => ({ isAxiosError: true, response: { status: 409, data: code ? { code } : {} } });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

function renderEditor(props: { onDeleted?: () => void } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ContentPageEditor contsSn={7} onDirtyChange={vi.fn()} {...props} />
    </QueryClientProvider>,
  );
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
});

describe('ContentPageEditor — 초안 저장(ADR-0039·ADR-0042)', () => {
  it('제목을 비우면 서버에 보내지 않고 칸 오류·요약으로 그 칸을 가리킨다', async () => {
    renderEditor();
    const title = await screen.findByRole('textbox', { name: /페이지 제목/ });
    fireEvent.change(title, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));

    expect(await screen.findAllByText('페이지 제목을 입력해 주세요.')).not.toHaveLength(0);
    await waitFor(() => expect(title).toHaveAttribute('aria-invalid', 'true'));
    await waitFor(() => expect(title).toHaveFocus());
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

  it('이미 쓰는 주소(409 C008)는 주소 칸 오류로 보이고 동시 수정으로 알리지 않는다', async () => {
    renderEditor();
    const path = await screen.findByRole('textbox', { name: /주소/ });
    fireEvent.change(path, { target: { value: 'used-path' } });
    mocks.saveDraft.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { code: 'C008', message: '이미 쓰는 주소입니다. 다른 주소를 입력해 주세요' } },
    });
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));

    expect(await screen.findAllByText('이미 쓰는 주소입니다. 다른 주소를 입력해 주세요.')).not.toHaveLength(0);
    expect(path).toHaveValue('used-path');
    await waitFor(() => expect(path).toHaveAttribute('aria-invalid', 'true'));
    await waitFor(() => expect(path).toHaveFocus());
    expect(screen.queryByText(/다른 사람이 먼저 이 페이지를 바꿨습니다/)).toBeNull();
  });

  it('다른 사람이 먼저 바꿨으면(409 C013) 입력을 지우지 않고 두 선택지를 알린다', async () => {
    renderEditor();
    const title = await screen.findByRole('textbox', { name: /페이지 제목/ });
    fireEvent.change(title, { target: { value: '내가 고친 제목' } });
    mocks.saveDraft.mockRejectedValue(conflictError('C013'));
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));

    const banner = await screen.findByText(/다른 사람이 먼저 이 페이지를 바꿨습니다/);
    const alert = banner.closest('[role="alert"]') as HTMLElement;
    expect(within(alert).getByRole('button', { name: '최신 내용 불러오기(이 화면의 변경을 버림)' })).toBeInTheDocument();
    expect(within(alert).getByRole('button', { name: '내 변경으로 덮어쓰기(다른 사람의 저장 내용을 버림)' })).toBeInTheDocument();
    expect(title).toHaveValue('내가 고친 제목');
    expect(screen.queryByText('이미 쓰는 주소입니다. 다른 주소를 입력해 주세요.')).toBeNull();
  });

  it('코드가 없는 409 는 동시 수정으로 단정하지 않고 저장 실패로 알린다', async () => {
    renderEditor();
    fireEvent.change(await screen.findByRole('textbox', { name: /페이지 제목/ }), { target: { value: '바뀐 제목' } });
    mocks.saveDraft.mockRejectedValue(conflictError());
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('초안을 저장하지 못했습니다. 입력한 내용은 그대로 있습니다.', 'error'));
    expect(screen.queryByText(/다른 사람이 먼저 이 페이지를 바꿨습니다/)).toBeNull();
  });

  it('본문 판정에 걸리면 보내지 않고 그 영역·칸에 문제를 보이며 그 칸의 입력으로 포커스를 옮긴다', async () => {
    mocks.getPage.mockResolvedValue(detail({
      document: {
        schemaVersion: 1,
        sections: [
          section('intro', '안내', [rich('신청은 온라인으로 합니다.')]),
          section('links', '바로가기', [{ kind: 'links', items: [{ title: '신청', url: 'javascript:alert(1)' }] }]),
        ],
      },
    }));
    const { container } = renderEditor();
    fireEvent.change(await screen.findByRole('textbox', { name: /페이지 제목/ }), { target: { value: '바뀐 제목' } });
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));

    expect(await screen.findByText('바로가기에 고칠 곳이 1개 있습니다.')).toBeInTheDocument();
    const url = container.querySelector<HTMLInputElement>('[data-section-index="1"] [data-cell-index="0"] input[placeholder^="/pages/"]');
    await waitFor(() => expect(url).toHaveFocus());
    expect(mocks.saveDraft).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.anything(), 'error');
  });

  it('저장 응답을 기다리는 동안 고친 입력은 응답이 덮지 않고, 다음 저장이 새 버전으로 그 입력을 보낸다', async () => {
    renderEditor();
    const title = await screen.findByRole('textbox', { name: /페이지 제목/ });
    fireEvent.change(title, { target: { value: '제목 A' } });
    const pendingSave = deferred<unknown>();
    mocks.saveDraft.mockImplementationOnce(() => pendingSave.promise);
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));
    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(1));

    fireEvent.change(title, { target: { value: '제목 B' } });
    pendingSave.resolve(detail({ contsTtl: '제목 A', version: 4 }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('초안을 저장했습니다'), 'success'));
    expect(title).toHaveValue('제목 B');
    expect(screen.getByText('저장하지 않은 변경')).toBeInTheDocument();

    mocks.saveDraft.mockResolvedValueOnce(detail({ contsTtl: '제목 B', version: 5 }));
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));
    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(2));
    expect(mocks.saveDraft.mock.calls[1][1]).toMatchObject({ contsTtl: '제목 B', version: 4 });
  });
});

describe('ContentPageEditor — 동시 수정 배너(409 C013)', () => {
  it('바꾼 것이 없으면 최신 내용 불러오기는 묻지 않고 불러온다', async () => {
    mocks.getPage.mockResolvedValue(published());
    mocks.unpublish.mockRejectedValue(conflictError('C013'));
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: '게시 중지' }));
    await screen.findByText(/다른 사람이 먼저 이 페이지를 바꿨습니다/);
    mocks.confirm.mockClear();
    mocks.getPage.mockResolvedValue(published({ contsTtl: '남이 고친 제목', version: 9 }));

    fireEvent.click(screen.getByRole('button', { name: '최신 내용 불러오기' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: /페이지 제목/ })).toHaveValue('남이 고친 제목'));
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(screen.queryByText(/다른 사람이 먼저 이 페이지를 바꿨습니다/)).toBeNull();
  });

  it('바꾼 것이 있으면 최신 내용 불러오기 전에 버릴지 묻고, 취소하면 입력을 그대로 둔다', async () => {
    renderEditor();
    const title = await screen.findByRole('textbox', { name: /페이지 제목/ });
    fireEvent.change(title, { target: { value: '내 제목' } });
    mocks.saveDraft.mockRejectedValue(conflictError('C013'));
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));
    await screen.findByText(/다른 사람이 먼저 이 페이지를 바꿨습니다/);
    mocks.confirm.mockResolvedValueOnce(false);

    fireEvent.click(screen.getByRole('button', { name: '최신 내용 불러오기(이 화면의 변경을 버림)' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '최신 내용 불러오기', variant: 'destructive' })));
    expect(title).toHaveValue('내 제목');
    expect(mocks.getPage).toHaveBeenCalledTimes(1);
  });

  it('내 변경으로 덮어쓰기는 확인한 뒤 최신 버전을 읽어 그 버전으로 내 초안을 다시 저장한다', async () => {
    renderEditor();
    const title = await screen.findByRole('textbox', { name: /페이지 제목/ });
    fireEvent.change(title, { target: { value: '내 제목' } });
    mocks.saveDraft.mockRejectedValueOnce(conflictError('C013'));
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));
    await screen.findByText(/다른 사람이 먼저 이 페이지를 바꿨습니다/);
    mocks.getPage.mockResolvedValue(detail({ contsTtl: '남의 제목', version: 8 }));
    mocks.saveDraft.mockResolvedValueOnce(detail({ contsTtl: '내 제목', version: 9 }));

    fireEvent.click(screen.getByRole('button', { name: '내 변경으로 덮어쓰기(다른 사람의 저장 내용을 버림)' }));
    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(2));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '내 변경으로 덮어쓰기', variant: 'destructive' }));
    expect(mocks.saveDraft.mock.calls[1][1]).toMatchObject({ contsTtl: '내 제목', version: 8 });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('내 변경으로 덮어써 초안을 저장했습니다'), 'success'));
    expect(title).toHaveValue('내 제목');
    expect(screen.queryByText(/다른 사람이 먼저 이 페이지를 바꿨습니다/)).toBeNull();
  });
});

describe('ContentPageEditor — 영역 편집', () => {
  const threeSections = () => detail({
    document: {
      schemaVersion: 1,
      sections: [section('a', '가', [rich('가 내용')]), section('b', '나', [rich('나 내용')]), section('c', '다', [rich('다 내용')])],
    },
  });

  it('영역을 옮기면 옮긴 영역의 같은 방향 단추로, 끝에 닿으면 반대 방향 단추로 포커스가 간다', async () => {
    mocks.getPage.mockResolvedValue(threeSections());
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: '가 아래로 옮기기' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '가 아래로 옮기기' })).toHaveFocus());

    fireEvent.click(screen.getByRole('button', { name: '가 아래로 옮기기' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '가 위로 옮기기' })).toHaveFocus());
    expect(screen.getByRole('button', { name: '가 아래로 옮기기' })).toBeDisabled();
  });

  it('위로 옮겨 맨 위에 닿으면 아래로 옮기기 단추로 간다(문서의 다른 입력으로 튀지 않는다)', async () => {
    mocks.getPage.mockResolvedValue(threeSections());
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: '나 위로 옮기기' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '나 아래로 옮기기' })).toHaveFocus());
    expect(screen.getByRole('textbox', { name: /페이지 제목/ })).not.toHaveFocus();
  });

  it('영역 아래에 새 영역을 더하면 바로 아래에 생기고 그 영역의 첫 입력으로 간다', async () => {
    const { container } = renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: '안내 아래에 영역 더하기' }));
    fireEvent.click(within(screen.getByRole('group', { name: '안내 아래에 더할 영역의 단 구성' })).getByRole('button', { name: '3단' }));

    expect(await screen.findByText('· 3개')).toBeInTheDocument();
    const inserted = container.querySelector<HTMLElement>('[data-section-index="1"]')!;
    expect(inserted.querySelectorAll('[data-cell-index]')).toHaveLength(3);
    await waitFor(() => expect(inserted.querySelector('input')).toHaveFocus());
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('2번째에 3단 영역을 더했습니다.');
  });

  it('영역을 복제하면 첨부를 떼고 새 식별자로 바로 아래에 둔다', async () => {
    mocks.getPage.mockResolvedValue(detail({
      document: {
        schemaVersion: 1,
        sections: [section('photo', '사진', [{ kind: 'image', atchFileSn: 5, alt: '청사 전경', decorative: false, caption: '' }, rich('설명')], 'two')],
      },
    }));
    const { container } = renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: '사진 복제' }));

    await waitFor(() => expect(container.querySelectorAll('[data-section-index]')).toHaveLength(2));
    expect(within(container.querySelector<HTMLElement>('[data-section-index="1"]')!).getByDisplayValue('사진 (복제)')).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('이미지와 내려받기 파일은 한 곳에만 쓸 수 있어 복제하지 않았습니다'), 'info');

    mocks.saveDraft.mockResolvedValue(detail());
    fireEvent.click(screen.getByRole('button', { name: '초안 저장' }));
    await waitFor(() => expect(mocks.saveDraft).toHaveBeenCalledTimes(1));
    const sent = mocks.saveDraft.mock.calls[0][1].document as CmsDocument;
    expect(sent.sections).toHaveLength(2);
    expect(sent.sections[0].cells[0]).toMatchObject({ kind: 'image', atchFileSn: 5 });
    expect(sent.sections[1].cells[0]).toMatchObject({ kind: 'image', atchFileSn: 0, alt: '청사 전경' });
    expect(sent.sections[1].id).not.toBe(sent.sections[0].id);
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
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('업무 홈을 볼 수 있는 모든 사용자의 업무 홈') }));

    pendingHome.reject({ isAxiosError: true, response: { status: 500 } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('업무 홈 소개를 바꾸지 못했습니다.', 'error'));
    expect(homeButton).toBeEnabled();
  });

  it('지금 소개의 게시본 제목을 알리고, 영역이 많으면 업무 홈 카드가 밀릴 수 있다고 알린다', async () => {
    mocks.getHome.mockResolvedValue({ contsSn: 99, contsTtl: '기관 소개', version: 2 });
    mocks.getPage.mockResolvedValue(published({
      document: { schemaVersion: 1, sections: [section('a', '가', [rich('가')]), section('b', '나', [rich('나')]), section('c', '다', [rich('다')])] },
    }));
    mocks.confirm.mockResolvedValue(false);
    renderEditor();
    const homeButton = await screen.findByRole('button', { name: '업무 홈 소개로 보이기' });
    await waitFor(() => expect(homeButton).toBeEnabled());
    fireEvent.click(homeButton);

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    const { message } = mocks.confirm.mock.calls[0][0] as { message: string };
    expect(message).toContain('지금 보이는 ‘기관 소개’은(는) 내려갑니다');
    expect(message).toContain('업무 홈의 카드가 아래로 밀릴 수 있습니다');
    expect(mocks.updateHome).not.toHaveBeenCalled();
  });
});

describe('ContentPageEditor — 게시 중지·보관의 메뉴 안내', () => {
  const menus = [
    { menuNo: 1, menuNm: '관리 센터', upMenuSn: null, menuOrdr: 1, modernRoute: null, useYn: 'Y' },
    { menuNo: 2, menuNm: '이용 안내', upMenuSn: 1, menuOrdr: 1, modernRoute: '/pages/service-guide', useYn: 'Y' },
    { menuNo: 3, menuNm: '옛 안내', upMenuSn: 1, menuOrdr: 2, modernRoute: '/pages/service-guide', useYn: 'N' },
  ];

  it('게시 중지 확인에 이 페이지를 가리키는 활성 메뉴 수와 위치를 넣는다', async () => {
    menuAccess.menuSource = { status: 'ready', menus };
    menuAccess.groupSource = { status: 'ready', groups: [] };
    mocks.getPage.mockResolvedValue(published());
    mocks.confirm.mockResolvedValue(false);
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: '게시 중지' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.confirm.mock.calls[0][0]).toMatchObject({
      title: '게시 중지',
      variant: 'destructive',
      message: expect.stringContaining('이 페이지를 가리키는 메뉴 1개(관리 센터 › 이용 안내)는 그대로 남습니다 — 메뉴 관리에서 정리하세요.'),
    });
    expect(mocks.unpublish).not.toHaveBeenCalled();
  });

  it('메뉴를 판정할 수 없으면(권한 없음) 일반 문구로 알린다', async () => {
    menuAccess.menuSource = { status: 'no-permission' };
    menuAccess.groupSource = { status: 'no-permission' };
    mocks.getPage.mockResolvedValue(detail({ status: 'UNPUBLISHED', pathLocked: true, revisionCount: 1, unpublishedChanges: false }));
    mocks.confirm.mockResolvedValue(false);
    renderEditor();
    fireEvent.click(await screen.findByRole('button', { name: '보관' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.confirm.mock.calls[0][0].message).toContain('이 페이지로 가는 메뉴는 그대로 남으니 메뉴 관리에서 정리해 주세요.');
  });

  it('게시 중지는 저장하지 않은 변경을 덮지 않는다', async () => {
    mocks.getPage.mockResolvedValue(published());
    mocks.unpublish.mockResolvedValue(detail({ status: 'UNPUBLISHED', pathLocked: true, revisionCount: 1, version: 4 }));
    renderEditor();
    const title = await screen.findByRole('textbox', { name: /페이지 제목/ });
    fireEvent.change(title, { target: { value: '고치는 중' } });
    fireEvent.click(screen.getByRole('button', { name: '게시 중지' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('게시를 중지했습니다'), 'success'));
    expect(title).toHaveValue('고치는 중');
    expect(screen.getByText('게시 중지', { selector: '[data-slot="badge"]' })).toBeInTheDocument();
  });
});

describe('ContentPageEditor — 작성자 안내·읽지 못한 초안', () => {
  it('작성 권한만 있고 게시 권한이 없으면 게시는 게시 권한자가 한다고 알린다', async () => {
    auth.permissions = ['CMS_ADMIN_READ', 'CMS_UPDATE', 'FILE_UPLOAD'];
    renderEditor();
    expect(await screen.findByText('게시는 콘텐츠 게시 권한자가 합니다. 저장한 초안은 목록의 ‘게시 대기’에 보입니다.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /게시하기/ })).toBeNull();
  });

  it('게시 권한이 있으면 작성자 안내를 보이지 않는다', async () => {
    renderEditor();
    await screen.findByRole('button', { name: /게시하기/ });
    expect(screen.queryByText(/게시는 콘텐츠 게시 권한자가 합니다/)).toBeNull();
  });

  it('저장된 초안을 읽지 못했으면 무엇을 못 읽었는지와 복구 길, 저장하면 바뀐다는 것을 알린다', async () => {
    mocks.getPage.mockResolvedValue(published({ documentError: '문서: 지원하지 않는 문서 형식입니다', revisionCount: 2 }));
    renderEditor();
    const banner = (await screen.findByText('저장된 초안의 본문을 읽지 못해 빈 본문으로 열었습니다.')).closest('[role="alert"]') as HTMLElement;
    expect(banner).toHaveTextContent('읽지 못한 까닭: 문서: 지원하지 않는 문서 형식입니다');
    expect(banner).toHaveTextContent('게시 이력에서 지난 게시본을 불러와 고치세요');
    expect(banner).toHaveTextContent('이대로 저장하면 저장된 초안이 지금 화면의 내용으로 바뀝니다');
    fireEvent.click(within(banner).getByRole('button', { name: '게시 이력 열기' }));
    expect(await screen.findByRole('dialog', { name: '게시 이력' })).toBeInTheDocument();
  });
});

describe('ContentPageEditor — 초안 삭제(한 번도 게시하지 않은 페이지)', () => {
  it('게시한 적이 있거나 작성 권한이 없으면 페이지 삭제를 두지 않는다', async () => {
    mocks.getPage.mockResolvedValue(published());
    const { unmount } = renderEditor();
    await screen.findByRole('button', { name: '게시 중지' });
    expect(screen.queryByRole('button', { name: '페이지 삭제' })).toBeNull();
    unmount();

    auth.permissions = ['CMS_ADMIN_READ', 'CMS_PUBLISH'];
    mocks.getPage.mockResolvedValue(detail());
    renderEditor();
    await screen.findByRole('button', { name: '보관' });
    expect(screen.queryByRole('button', { name: '페이지 삭제' })).toBeNull();
  });

  it('확인한 뒤 지우고 목록에 알린다 — 저장하지 않은 변경도 버려진다고 묻는다', async () => {
    const onDeleted = vi.fn();
    mocks.deleteDraftPage.mockResolvedValue(undefined);
    renderEditor({ onDeleted });
    fireEvent.change(await screen.findByRole('textbox', { name: /페이지 제목/ }), { target: { value: '고치는 중' } });
    fireEvent.click(screen.getByRole('button', { name: '페이지 삭제' }));

    await waitFor(() => expect(mocks.deleteDraftPage).toHaveBeenCalledWith(7, 3));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: '페이지 삭제',
      confirmText: '페이지 삭제',
      variant: 'destructive',
      message: expect.stringContaining('저장하지 않은 변경도 함께 버려집니다'),
    }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(mocks.toast).toHaveBeenCalledWith('페이지를 지웠습니다.', 'success');
  });

  it('deletePage — 처리 중에는 단추가 잠기고 두 번 눌러도 한 번만 보내며, 실패하면 알리고 페이지를 그대로 둔다', async () => {
    const onDeleted = vi.fn();
    let rejectDelete: (reason: unknown) => void = () => {};
    mocks.deleteDraftPage.mockReturnValue(new Promise((_, reject) => { rejectDelete = reject; }));
    renderEditor({ onDeleted });
    const button = await screen.findByRole('button', { name: '페이지 삭제' });

    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mocks.deleteDraftPage).toHaveBeenCalledTimes(1);

    rejectDelete({ isAxiosError: true, response: { status: 500, data: { message: '서버 오류로 지우지 못했습니다' } } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('서버 오류로 지우지 못했습니다', 'error'));
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '페이지 삭제' })).not.toBeDisabled();
  });

  it('확인을 취소하면 보내지 않고, 서버가 거부하면 그 문구로 알린다', async () => {
    const onDeleted = vi.fn();
    mocks.confirm.mockResolvedValueOnce(false);
    renderEditor({ onDeleted });
    fireEvent.click(await screen.findByRole('button', { name: '페이지 삭제' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.deleteDraftPage).not.toHaveBeenCalled();

    mocks.deleteDraftPage.mockRejectedValue({ isAxiosError: true, response: { status: 400, data: { message: '게시한 적이 있는 페이지는 지울 수 없습니다' } } });
    fireEvent.click(screen.getByRole('button', { name: '페이지 삭제' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('게시한 적이 있는 페이지는 지울 수 없습니다', 'error'));
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
