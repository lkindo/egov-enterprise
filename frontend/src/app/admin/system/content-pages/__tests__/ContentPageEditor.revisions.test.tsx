import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentPageEditor } from '../ContentPageEditor';
import { CASE_REFERENCE_PATTERN } from '../PurgeDialogs';
import type { CmsCell, CmsDocument, CmsSection } from '@/lib/cms/document';

/** 게시 이력(불러오기·게시본 파기)과 페이지 파기(ADR-0042). */
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  getPage: vi.fn(),
  getHome: vi.fn(),
  getRevisions: vi.fn(),
  getRevision: vi.fn(),
  purgePage: vi.fn(),
  purgeRevision: vi.fn(),
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
vi.mock('@/lib/navigation/use-menu-access-sources', () => ({
  useMenuAccessSources: () => ({ menuSource: { status: 'no-permission' }, groupSource: { status: 'no-permission' }, retry: vi.fn() }),
}));

vi.mock('@/services/business/cms/CmsService', () => ({
  cmsService: {
    getPage: mocks.getPage,
    getHome: mocks.getHome,
    getRevisions: mocks.getRevisions,
    getRevision: mocks.getRevision,
    purgePage: mocks.purgePage,
    purgeRevision: mocks.purgeRevision,
  },
}));

const rich = (text: string): CmsCell => ({ kind: 'rich', doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } });
const section = (id: string, label: string, cells: CmsCell[]): CmsSection => ({
  id, label, layout: 'one', tone: 'default', spacing: 'normal', cells,
});
const docWith = (text: string): CmsDocument => ({ schemaVersion: 1, sections: [section('intro', '안내', [rich(text)])] });

/** 게시를 중지한 페이지 — 게시 이력 둘(v2 가 마지막). */
const unpublished = (overrides: Record<string, unknown> = {}) => ({
  contsSn: 7,
  contsPathNm: 'service-guide',
  contsTtl: '이용 안내',
  contsExpln: '',
  document: docWith('지금 초안'),
  status: 'UNPUBLISHED',
  unpublishedChanges: false,
  home: false,
  pathLocked: true,
  version: 3,
  publishedRevision: null,
  revisionCount: 2,
  ...overrides,
});

const revisions = (currentSn: number | null = null) => [
  { contsRvsnSn: 12, revisionNumber: 2, contsTtl: '이용 안내', rvsnRsn: '문의처 변경', frstRgtrId: 'admin', crtDt: '2026-10-20T09:00:00', current: currentSn === 12 },
  { contsRvsnSn: 11, revisionNumber: 1, contsTtl: '첫 안내', rvsnRsn: '', frstRgtrId: 'admin', crtDt: '2026-10-10T09:00:00', current: currentSn === 11 },
];

function renderEditor(props: { onDeleted?: () => void } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ContentPageEditor contsSn={7} onDirtyChange={vi.fn()} {...props} />
    </QueryClientProvider>,
  );
}

async function openRevisions() {
  fireEvent.click(await screen.findByRole('button', { name: /게시 이력 2/ }));
  return screen.findByRole('dialog', { name: '게시 이력' });
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.permissions = ['CMS_ADMIN_READ', 'CMS_UPDATE', 'CMS_PUBLISH', 'FILE_UPLOAD'];
  mocks.getHome.mockResolvedValue({ contsSn: null, version: 0 });
  mocks.getPage.mockResolvedValue(unpublished());
  mocks.getRevisions.mockResolvedValue(revisions());
  mocks.getRevision.mockResolvedValue({ contsRvsnSn: 11, revisionNumber: 1, contsTtl: '첫 안내', contsExpln: '첫 요약', document: docWith('첫 게시본') });
  mocks.confirm.mockResolvedValue(true);
});

describe('ContentPageEditor — 게시 이력 불러오기', () => {
  it('저장하지 않은 변경이 있으면 버릴지 먼저 묻고, 취소하면 입력을 그대로 둔다', async () => {
    renderEditor();
    const title = await screen.findByRole('textbox', { name: /페이지 제목/ });
    fireEvent.change(title, { target: { value: '고치는 중' } });
    const dialog = await openRevisions();
    fireEvent.click(await within(dialog).findByRole('button', { name: 'v1 보기' }));
    mocks.confirm.mockResolvedValueOnce(false);

    fireEvent.click(await within(dialog).findByRole('button', { name: '이 내용으로 편집하기' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: '게시본 불러오기', confirmText: '변경 버리고 불러오기', variant: 'destructive',
    })));
    expect(title).toHaveValue('고치는 중');
    expect(screen.getByRole('dialog', { name: '게시 이력' })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: '이 내용으로 편집하기' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: /페이지 제목/ })).toHaveValue('첫 안내'));
    expect(screen.getByRole('textbox', { name: /요약/ })).toHaveValue('첫 요약');
  });

  it('바꾼 것이 없으면 묻지 않고 불러온다', async () => {
    renderEditor();
    const dialog = await openRevisions();
    fireEvent.click(await within(dialog).findByRole('button', { name: 'v1 보기' }));
    fireEvent.click(await within(dialog).findByRole('button', { name: '이 내용으로 편집하기' }));

    await waitFor(() => expect(screen.getByRole('textbox', { name: /페이지 제목/ })).toHaveValue('첫 안내'));
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
});

describe('ContentPageEditor — 게시본 파기(CMS_PURGE)', () => {
  it('파기 권한이 없으면 게시본 파기 단추를 두지 않는다', async () => {
    renderEditor();
    const dialog = await openRevisions();
    await within(dialog).findByRole('button', { name: 'v1 보기' });
    expect(within(dialog).queryByRole('button', { name: /게시본 파기/ })).toBeNull();
  });

  it('지금 보이는 게시본에는 파기 단추가 없다', async () => {
    auth.permissions = [...auth.permissions, 'CMS_PURGE'];
    mocks.getPage.mockResolvedValue(unpublished({
      status: 'PUBLISHED',
      publishedRevision: { contsRvsnSn: 12, revisionNumber: 2, current: true, contsTtl: '이용 안내' },
    }));
    mocks.getRevisions.mockResolvedValue(revisions(12));
    renderEditor();
    const dialog = await openRevisions();
    expect(await within(dialog).findByRole('button', { name: 'v1 게시본 파기' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'v2 게시본 파기' })).toBeNull();
  });

  it('처리 근거 번호 형식을 검사하고, 맞으면 이 버전으로 보내 받은 상세로 갱신하고 이력을 다시 읽는다', async () => {
    auth.permissions = [...auth.permissions, 'CMS_PURGE'];
    mocks.purgeRevision.mockResolvedValue(unpublished({ revisionCount: 1, version: 3 }));
    renderEditor();
    const dialog = await openRevisions();
    fireEvent.click(await within(dialog).findByRole('button', { name: 'v1 게시본 파기' }));
    const form = within(dialog).getByRole('form', { name: 'v1 게시본 파기' });
    expect(form).toHaveTextContent('뒤에 게시한 본의 번호가 하나씩 당겨집니다(예: v2 → v1).');
    const reference = within(form).getByRole('textbox', { name: /처리 근거 번호/ });
    await waitFor(() => expect(reference).toHaveFocus());

    fireEvent.change(reference, { target: { value: '개인정보 오게시' } });
    fireEvent.click(within(form).getByRole('button', { name: '게시본 파기' }));
    expect(await within(form).findAllByText(/처리 근거 번호는 영문이나 숫자로 시작하고/)).not.toHaveLength(0);
    expect(mocks.purgeRevision).not.toHaveBeenCalled();

    fireEvent.change(reference, { target: { value: ' INC-2026-0012 ' } });
    fireEvent.click(within(form).getByRole('button', { name: '게시본 파기' }));
    await waitFor(() => expect(mocks.purgeRevision).toHaveBeenCalledWith(7, 11, { version: 3, caseReference: 'INC-2026-0012' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('게시본 v1을 파기했습니다'), 'success'));
    await waitFor(() => expect(mocks.getRevisions).toHaveBeenCalledTimes(2));
    expect(within(dialog).queryByRole('form', { name: 'v1 게시본 파기' })).toBeNull();
  });

  it('서버가 거부하면 그 문구를 그대로 보이고 입력을 남긴다', async () => {
    auth.permissions = [...auth.permissions, 'CMS_PURGE'];
    mocks.purgeRevision.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { message: '지금 사용자에게 보이는 게시본은 파기할 수 없습니다. 고친 본을 다시 게시하거나 게시를 중지한 뒤 파기해 주세요' } },
    });
    renderEditor();
    const dialog = await openRevisions();
    fireEvent.click(await within(dialog).findByRole('button', { name: 'v1 게시본 파기' }));
    const form = within(dialog).getByRole('form', { name: 'v1 게시본 파기' });
    fireEvent.change(within(form).getByRole('textbox', { name: /처리 근거 번호/ }), { target: { value: 'INC-1' } });
    fireEvent.click(within(form).getByRole('button', { name: '게시본 파기' }));

    expect(await within(form).findByRole('alert')).toHaveTextContent('지금 사용자에게 보이는 게시본은 파기할 수 없습니다');
    expect(within(form).getByRole('textbox', { name: /처리 근거 번호/ })).toHaveValue('INC-1');
  });

  it('처리 근거 번호 형식은 서버 계약과 같다(영문·숫자로 시작, 영문·숫자·. _ - 만, 200자까지)', () => {
    expect(CASE_REFERENCE_PATTERN.test('INC-2026-0012')).toBe(true);
    expect(CASE_REFERENCE_PATTERN.test('a.b_c-1')).toBe(true);
    expect(CASE_REFERENCE_PATTERN.test('-INC')).toBe(false);
    expect(CASE_REFERENCE_PATTERN.test('INC 1')).toBe(false);
    expect(CASE_REFERENCE_PATTERN.test('사고-1')).toBe(false);
    expect(CASE_REFERENCE_PATTERN.test('A'.repeat(200))).toBe(true);
    expect(CASE_REFERENCE_PATTERN.test('A'.repeat(201))).toBe(false);
  });
});

describe('ContentPageEditor — 페이지 파기(CMS_PURGE)', () => {
  it('파기 권한자에게, 게시 중이 아니고 게시 이력이 있는 페이지에만 영구 파기를 보인다', async () => {
    auth.permissions = [...auth.permissions, 'CMS_PURGE'];
    const { unmount } = renderEditor();
    expect(await screen.findByRole('button', { name: '영구 파기' })).toBeInTheDocument();
    unmount();

    mocks.getPage.mockResolvedValue(unpublished({
      status: 'PUBLISHED', publishedRevision: { contsRvsnSn: 12, revisionNumber: 2, current: true, contsTtl: '이용 안내' },
    }));
    const published = renderEditor();
    await screen.findByRole('button', { name: '게시 중지' });
    expect(screen.queryByRole('button', { name: '영구 파기' })).toBeNull();
    published.unmount();

    mocks.getPage.mockResolvedValue(unpublished({ status: 'DRAFT', pathLocked: false, revisionCount: 0 }));
    const draft = renderEditor();
    await screen.findByRole('button', { name: '페이지 삭제' });
    expect(screen.queryByRole('button', { name: '영구 파기' })).toBeNull();
    draft.unmount();

    auth.permissions = auth.permissions.filter((code) => code !== 'CMS_PURGE');
    mocks.getPage.mockResolvedValue(unpublished());
    renderEditor();
    await screen.findByRole('button', { name: '보관' });
    expect(screen.queryByRole('button', { name: '영구 파기' })).toBeNull();
  });

  it('되돌릴 수 없음과 지워지는 것을 알리고, 주소 재입력과 근거 번호를 확인한 뒤 파기하고 목록에 알린다', async () => {
    auth.permissions = [...auth.permissions, 'CMS_PURGE'];
    const onDeleted = vi.fn();
    mocks.purgePage.mockResolvedValue(undefined);
    renderEditor({ onDeleted });
    fireEvent.click(await screen.findByRole('button', { name: '영구 파기' }));
    const dialog = await screen.findByRole('dialog', { name: '페이지 영구 파기' });
    expect(dialog).toHaveTextContent('파기하면 되돌릴 수 없습니다.');
    expect(dialog).toHaveTextContent('저장한 초안, 게시 이력의 게시본 2개, 이 페이지에 올린 이미지·내려받기 파일이 모두 지워집니다.');
    expect(dialog).toHaveTextContent('사고에 대응할 때만 씁니다');
    expect(dialog).toHaveTextContent('사유 본문이나 개인정보는 쓰지 마세요');

    const submit = within(dialog).getByRole('button', { name: '페이지 파기' });
    fireEvent.click(submit);
    expect(await within(dialog).findAllByText('확인용 주소를 입력해 주세요.')).not.toHaveLength(0);
    expect(within(dialog).getAllByText('처리 근거 번호를 입력해 주세요.')).not.toHaveLength(0);

    const address = within(dialog).getByRole('textbox', { name: /확인용 주소/ });
    fireEvent.change(address, { target: { value: 'service-guid' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /처리 근거 번호/ }), { target: { value: 'INC-7' } });
    fireEvent.click(submit);
    expect(await within(dialog).findAllByText('이 페이지의 주소와 다릅니다. /pages/ 뒤의 주소를 그대로 입력해 주세요.')).not.toHaveLength(0);
    expect(mocks.purgePage).not.toHaveBeenCalled();

    fireEvent.change(address, { target: { value: 'service-guide' } });
    fireEvent.click(submit);
    await waitFor(() => expect(mocks.purgePage).toHaveBeenCalledWith(7, { version: 3, contsPathNm: 'service-guide', caseReference: 'INC-7' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(mocks.toast).toHaveBeenCalledWith('페이지를 파기했습니다.', 'success');
  });

  it('서버가 거부하면 대화상자에 그 문구를 보이고 페이지는 그대로다', async () => {
    auth.permissions = [...auth.permissions, 'CMS_PURGE'];
    const onDeleted = vi.fn();
    mocks.purgePage.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { message: '게시 중인 페이지는 파기할 수 없습니다. 게시를 먼저 중지해 주세요' } },
    });
    renderEditor({ onDeleted });
    fireEvent.click(await screen.findByRole('button', { name: '영구 파기' }));
    const dialog = await screen.findByRole('dialog', { name: '페이지 영구 파기' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /확인용 주소/ }), { target: { value: 'service-guide' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: /처리 근거 번호/ }), { target: { value: 'INC-7' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '페이지 파기' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('게시 중인 페이지는 파기할 수 없습니다. 게시를 먼저 중지해 주세요');
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: '페이지 영구 파기' })).toBeInTheDocument();
  });
});
