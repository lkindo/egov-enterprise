import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RichTextEditorProps } from '@/components/ui/RichTextEditor';
import { createBoardMediaFile, getBoardMediaReferences, type BoardMediaReference } from '@/lib/attachments/board-media';
import { htmlToSemanticPlainText } from '@/lib/html-to-text';
import { boardDraftMemoryStorage, buildBoardDraftStorageKey } from '@/lib/drafts/board-draft-storage';
import { BoardRegistClient } from '../BoardRegistClient';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  replace: vi.fn(),
  saveBoardArticle: vi.fn(),
  getArticle: vi.fn(),
  getFileList: vi.fn(),
  toast: vi.fn(),
  clearDraft: vi.fn(),
  restoreDraft: vi.fn(),
  confirm: vi.fn(),
  authenticated: true,
  meta: {
    requiredEditPermissions: [] as string[],
    fileAtchPsbltyYn: 'Y',
    atchPsbltyFileQty: 20,
    atchPsbltyFileSz: 10 * 1024 * 1024,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back, replace: mocks.replace }),
}));
vi.mock('@/queries/board-master-query-options', () => ({ boardMasterQueryOptions: {
  meta: () => ({ queryKey: ['board-media-meta'], initialData: mocks.meta, staleTime: Infinity,
    queryFn: async () => mocks.meta }),
} }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.authenticated ? { id: 'writer', esntlId: 'writer-owner', authorizationVersion: 'test-v1', permissions: ['BOARD_CREATE', 'BOARD_UPDATE'] } : null }),
}));
vi.mock('@/app/actions/boardActions', () => ({
  saveBoardArticle: (...args: unknown[]) => mocks.saveBoardArticle(...args),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/file/FileService', () => ({
  fileService: { getFileList: mocks.getFileList, deleteFile: vi.fn() },
}));
vi.mock('@/services/business/knowledge/knowledgeService', () => ({
  knowledgeService: { getArticle: mocks.getArticle },
}));
vi.mock('@/hooks/use-auto-save-draft', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/use-auto-save-draft')>();
  return {
    useAutoSaveDraft(options: Parameters<typeof actual.useAutoSaveDraft>[0]) {
      const draft = actual.useAutoSaveDraft(options);
      return { ...draft, clearDraft: () => { mocks.clearDraft(); draft.clearDraft(); } };
    },
  };
});

// The real editor's DOM insertion/serialization has its own integration tests.
// This stub calls the actual board callback, then stores precisely the references it returned.
vi.mock('next/dynamic', () => ({
  default: () => function MockEditor({ value, onChange, media, readOnly, enableTables: _enableTables, className, ...props }: RichTextEditorProps) {
    return <div>
      <textarea {...props} className={`ProseMirror ${className ?? ''}`} value={value} readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)} />
      <input type="file" multiple aria-label="본문 미디어 선택" disabled={readOnly || media?.disabled}
        onChange={(event) => {
          const references = media?.onAddFiles(Array.from(event.target.files ?? [])) ?? [];
          if (references.length > 0) onChange(value + serializeMedia(references));
        }} />
    </div>;
  },
}));
vi.mock('@/app/components/ui/standard-file-uploader', () => ({
  StandardFileUploader: ({ onFilesChange }: { onFilesChange: (files: File[]) => void }) => (
    <input type="file" multiple aria-label="일반 첨부 선택"
      onChange={(event) => onFilesChange(Array.from(event.target.files ?? []))} />
  ),
}));

function serializeMedia(references: BoardMediaReference[]) {
  return references.map((reference) => {
    const figure = document.createElement('figure');
    figure.setAttribute('data-board-file', reference.name);
    figure.setAttribute('data-media-kind', reference.kind);
    figure.setAttribute('data-media-label', reference.label);
    const caption = document.createElement('figcaption');
    caption.textContent = reference.label;
    figure.append(caption);
    return figure.outerHTML;
  }).join('');
}

function picture(name = '회의 사진.png') {
  const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9XsAAAAASUVORK5CYII='), character => character.charCodeAt(0));
  return new File([bytes], name, { type: 'image/png' });
}

function sizedFile(name: string, size: number) {
  const file = new File(['boundary fixture'], name);
  // Exercise the browser's byte-count checks without allocating 50MiB; backend tests validate actual bytes.
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function renderSubject(
  props: Partial<Parameters<typeof BoardRegistClient>[0]> = {},
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }),
) {
  return { ...render(<QueryClientProvider client={client}><BoardRegistClient bbsId="BBSMSTR_AAAAAAAAAAAA" {...props} /></QueryClientProvider>), client };
}

function editor() {
  return screen.getByRole('textbox', { name: /게시글 본문 내용/ }) as HTMLTextAreaElement;
}

function fillTitle() {
  fireEvent.change(screen.getByRole('textbox', { name: '게시글 제목' }), { target: { value: '미디어 게시글' } });
}

function addMedia(files: File[]) {
  fireEvent.change(screen.getByLabelText('본문 미디어 선택'), { target: { files } });
}

function addAttachments(files: File[]) {
  fireEvent.change(screen.getByLabelText('일반 첨부 선택'), { target: { files } });
}

function submit() {
  fireEvent.submit(screen.getByRole('button', { name: '게시글 등록' }).closest('form')!);
}

function submittedData(index = 0): FormData {
  const data = mocks.saveBoardArticle.mock.calls[index][1];
  expect(data).toBeInstanceOf(FormData);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  boardDraftMemoryStorage.clear();
  mocks.confirm.mockResolvedValue(true);
  mocks.authenticated = true;
  mocks.replace.mockReset();
  mocks.getArticle.mockReset().mockResolvedValue({ pstSn: 7, pstTtl: '저장된 제목', pstCn: '<p>저장된 본문</p>' });
  mocks.getFileList.mockReset().mockResolvedValue([]);
  mocks.meta = { requiredEditPermissions: [], fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 20, atchPsbltyFileSz: 10 * 1024 * 1024 };
  mocks.saveBoardArticle.mockResolvedValue({ success: true, redirect: '/boards' });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  boardDraftMemoryStorage.clear();
});

describe('BoardRegistClient 본문 미디어 저장', () => {
  it('SSR 초기값만 있는 비활성 상세 캐시도 수정 결과를 조회해 갱신한 뒤 이동하며 기존 첨부에 새 파일만 추가한다', async () => {
    const bbsId = 'BBSMSTR_AAAAAAAAAAAA';
    const pstSn = 7;
    const detailKey = ['article-detail', bbsId, pstSn] as const;
    const existingMedia = createBoardMediaFile(picture('기존.png')).reference;
    const initialData = {
      bbsId, pstSn, userId: 'writer-owner', atchFileSn: 11, inqCnt: 4,
      pstTtl: '수정 전 제목', pstCn: `<p>수정 전 본문</p>${serializeMedia([existingMedia])}`,
    };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    // Match the inactive detail page: SSR initialData exists, but no query fetch has completed.
    const detailQuery = client.getQueryCache().build(client, {
      queryKey: detailKey, initialData, gcTime: Infinity,
      queryFn: () => mocks.getArticle(bbsId, pstSn),
    });
    expect(detailQuery.getObserversCount()).toBe(0);
    expect(detailQuery.state.dataUpdateCount).toBe(0);
    expect(detailQuery.isDisabled()).toBe(true);
    mocks.getFileList.mockResolvedValue([{
      atchFileSn: 11, fileSn: 0, fileExtsn: 'png', orignlFileNm: existingMedia.name,
    }]);
    let finishRefresh!: (data: typeof initialData) => void;
    mocks.getArticle.mockReturnValueOnce(new Promise<typeof initialData>(resolve => { finishRefresh = resolve; }));
    const cacheAtNavigation: unknown[] = [];
    mocks.replace.mockImplementationOnce(() => { cacheAtNavigation.push(client.getQueryData(detailKey)); });
    renderSubject({ pstSn, initialData }, client);
    await screen.findByText(existingMedia.name);
    expect(mocks.getArticle).not.toHaveBeenCalled();
    fillTitle();
    addMedia([picture('새 이미지.png')]);
    const content = editor().value;
    const references = getBoardMediaReferences(content);

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => expect(mocks.getArticle).toHaveBeenCalledWith(bbsId, pstSn, { countView: false }));
    expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1);
    expect(mocks.getArticle).toHaveBeenCalledTimes(1);
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.clearDraft).not.toHaveBeenCalled();
    expect(client.getQueryData(detailKey)).toEqual(initialData);
    const data = submittedData();
    expect(data.get('atchFileSn')).toBe('11');
    expect(data.get('pstSn')).toBe('7');
    expect(data.get('pstCn')).toBe(content);
    expect(references.map(reference => reference.name)).toContain(existingMedia.name);
    const files = data.getAll('files') as File[];
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe(references[1].name);
    expect(files[0].name).not.toBe(existingMedia.name);

    const fresh = { ...initialData, pstTtl: '미디어 게시글', pstCn: content };
    await act(async () => { finishRefresh(fresh); });

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/boards'));
    expect(client.getQueryData(detailKey)).toEqual(fresh);
    expect(cacheAtNavigation).toEqual([fresh]);
    expect(mocks.clearDraft).toHaveBeenCalledTimes(1);
  });

  it('저장 후 상세 재조회가 실패하면 이전 캐시를 제거하고 이미 성공한 저장을 완료한다', async () => {
    const bbsId = 'BBSMSTR_AAAAAAAAAAAA';
    const pstSn = 7;
    const detailKey = ['article-detail', bbsId, pstSn] as const;
    const initialData = { pstSn, userId: 'writer-owner', pstTtl: '이전 제목', pstCn: '<p>이전 본문</p>' };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    client.getQueryCache().build(client, {
      queryKey: detailKey, initialData, gcTime: Infinity,
      queryFn: () => mocks.getArticle(bbsId, pstSn),
    });
    mocks.getArticle.mockRejectedValueOnce(new Error('상세 조회 연결 실패'));
    renderSubject({ pstSn, initialData }, client);
    fillTitle();
    fireEvent.change(editor(), { target: { value: '<p>저장할 새 본문</p>' } });

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/boards'));
    expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1);
    expect(mocks.getArticle).toHaveBeenCalledWith(bbsId, pstSn, { countView: false });
    expect(client.getQueryCache().find({ queryKey: detailKey, exact: true })).toBeUndefined();
    expect(mocks.clearDraft).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith('게시글을 수정했습니다.', 'success');
    expect(mocks.toast).not.toHaveBeenCalledWith('게시글을 저장하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.', 'error');
  });

  it('기존 초안이 없던 수정 화면은 첫 자동저장 뒤 자신이 쓴 초안을 복구하라고 묻지 않는다', async () => {
    vi.useFakeTimers();
    const key = buildBoardDraftStorageKey({
      ownerId: 'writer-owner', boardId: 'BBSMSTR_AAAAAAAAAAAA', action: 'update', recordId: '7',
    });
    await act(async () => {
      renderSubject({ pstSn: 7, initialData: { pstSn: 7, userId: 'writer-owner', pstTtl: '서버 제목', pstCn: '<p>서버 본문</p>' } });
    });
    fillTitle();
    addMedia([picture()]);
    const content = editor().value;

    await act(async () => { vi.advanceTimersByTime(3000); });

    expect(JSON.parse(boardDraftMemoryStorage.getItem(key)!)).toMatchObject({ title: '미디어 게시글', content });
    expect(boardDraftMemoryStorage.getFiles(key)).toHaveLength(1);
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(editor()).toHaveValue(content);
  });

  it('사용자 범위가 준비될 때까지 초안 판단을 미루고 준비된 사용자의 초안만 복구한다', async () => {
    vi.useFakeTimers();
    mocks.authenticated = false;
    let decide!: (value: boolean) => void;
    mocks.confirm.mockReturnValueOnce(new Promise<boolean>(resolve => { decide = resolve; }));
    const key = buildBoardDraftStorageKey({
      ownerId: 'writer-owner', boardId: 'BBSMSTR_AAAAAAAAAAAA', action: 'update', recordId: '7',
    });
    const media = createBoardMediaFile(picture());
    const content = serializeMedia([media.reference]);
    boardDraftMemoryStorage.setItem(key, JSON.stringify({
      version: 2, title: '기존 사용자 초안', content,
      savedAt: new Date().toISOString(), expiresAt: Date.now() + 60_000,
    }));
    boardDraftMemoryStorage.setFiles(key, [media.file]);
    const initialData = { pstSn: 7, userId: 'writer-owner', pstTtl: '서버 제목', pstCn: '<p>서버 본문</p>' };
    const view = renderSubject({ pstSn: 7, initialData });
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(editor()).toHaveValue(initialData.pstCn);

    mocks.authenticated = true;
    view.rerender(<QueryClientProvider client={view.client}>
      <BoardRegistClient bbsId="BBSMSTR_AAAAAAAAAAAA" pstSn={7} initialData={initialData} />
    </QueryClientProvider>);
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(6000); });
    expect(boardDraftMemoryStorage.getFiles(key)[0]).toBe(media.file);
    await act(async () => { decide(true); });
    expect(editor()).toHaveValue(content);
    expect(screen.getByRole('textbox', { name: '게시글 제목' })).toHaveValue('기존 사용자 초안');
  });

  it.each([true, false])('초안 복구 응답(%s)을 6초 기다려도 원본 파일을 보존하고 응답 뒤 저장을 재개한다', async (restore) => {
    vi.useFakeTimers();
    let decide!: (value: boolean) => void;
    mocks.confirm.mockReturnValueOnce(new Promise<boolean>(resolve => { decide = resolve; }));
    const key = buildBoardDraftStorageKey({
      ownerId: 'writer-owner', boardId: 'BBSMSTR_AAAAAAAAAAAA', action: 'update', recordId: '7',
    });
    const media = createBoardMediaFile(picture());
    const content = `<p>수정하다 남긴 본문</p>${serializeMedia([media.reference])}`;
    const draft = {
      version: 2, title: '수정하던 제목', content,
      savedAt: new Date().toISOString(), expiresAt: Date.now() + 60_000,
    };
    const initialData = { pstSn: 7, userId: 'writer-owner', pstTtl: '서버에 저장된 제목', pstCn: '<p>서버에 저장된 본문</p>' };
    boardDraftMemoryStorage.setItem(key, JSON.stringify(draft));
    boardDraftMemoryStorage.setFiles(key, [media.file]);
    renderSubject({ pstSn: 7, initialData });
    expect(mocks.confirm).toHaveBeenCalledTimes(1);

    await act(async () => { vi.advanceTimersByTime(6000); });

    expect(JSON.parse(boardDraftMemoryStorage.getItem(key)!)).toEqual(draft);
    expect(boardDraftMemoryStorage.getFiles(key)[0]).toBe(media.file);
    await act(async () => { decide(restore); });
    expect(editor()).toHaveValue(restore ? content : initialData.pstCn);
    expect(screen.getByRole('textbox', { name: '게시글 제목' })).toHaveValue(restore ? draft.title : initialData.pstTtl);
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(JSON.parse(boardDraftMemoryStorage.getItem(key)!)).toMatchObject({
      title: restore ? draft.title : initialData.pstTtl,
      content: restore ? content : initialData.pstCn,
    });
    expect(boardDraftMemoryStorage.getFiles(key)).toEqual(restore ? [media.file] : []);

    vi.useRealTimers();
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1));
    expect(submittedData().get('pstCn')).toBe(restore ? content : initialData.pstCn);
    expect(submittedData().getAll('files')).toHaveLength(restore ? 1 : 0);
    if (restore) expect(submittedData().getAll('files')[0]).toBe(media.file);
  });

  it('텍스트가 없는 이미지 본문도 저장하며 marker 이름과 multipart 파일명이 일치한다', async () => {
    renderSubject();
    fillTitle();
    const file = picture();
    addMedia([file]);
    const [reference] = getBoardMediaReferences(editor().value);
    const imageOnly = serializeMedia([{ ...reference, label: '' }]);
    expect(htmlToSemanticPlainText(imageOnly)).toBe('');
    fireEvent.change(editor(), { target: { value: imageOnly } });

    submit();

    await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1));
    const data = submittedData();
    const files = data.getAll('files') as File[];
    expect(files).toHaveLength(1);
    expect(files[0]).toBeInstanceOf(File);
    expect(files[0].name).toBe(reference.name);
    expect(files[0].name).not.toBe(file.name);
    expect(files[0].size).toBe(file.size);
    expect(files[0].type).toBe('image/png');
    expect(data.get('pstCn')).toBe(imageOnly);
    expect(data.get('pstCn')).not.toMatch(/blob:|data:|\bsrc=/);
  });

  it('본문 marker에 연결되는 실제 파일이 없으면 저장하지 않고 본문 오류로 안내한다', async () => {
    renderSubject();
    fillTitle();
    const missing = createBoardMediaFile(picture()).reference;
    const content = serializeMedia([missing]);
    fireEvent.change(editor(), { target: { value: content } });

    submit();

    expect(await screen.findByText('본문의 이미지·영상 파일을 확인할 수 없습니다. 해당 항목을 본문에서 제거한 뒤 파일을 다시 첨부해 주세요.')).toBeVisible();
    await waitFor(() => expect(editor()).toHaveFocus());
    expect(editor()).toHaveValue(content);
    expect(mocks.saveBoardArticle).not.toHaveBeenCalled();
  });

  it('일반 첨부와 미디어의 파일 수를 합산하고 허용된 두 파일만 저장한다', async () => {
    mocks.meta.atchPsbltyFileQty = 2;
    renderSubject();
    fillTitle();
    const attachment = new File(['document'], '안내.txt', { type: 'text/plain' });
    addAttachments([attachment]);
    addMedia([picture()]);
    const content = editor().value;
    addMedia([picture('추가.png')]);
    expect(editor()).toHaveValue(content);
    expect(mocks.toast).toHaveBeenCalledWith('일반 첨부와 본문 미디어를 합친 파일 수 또는 전체 크기(50MB)가 허용 범위를 넘습니다.', 'error');

    submit();

    await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1));
    const files = submittedData().getAll('files') as File[];
    expect(files.map(file => file.name)).toEqual([attachment.name, getBoardMediaReferences(content)[0].name]);
  });

  it('일반 첨부가 50MiB이면 미디어 추가를 거부하고 기존 본문을 유지한다', () => {
    renderSubject();
    fillTitle();
    fireEvent.change(editor(), { target: { value: '<p>기존 본문</p>' } });
    addAttachments(Array.from({ length: 5 }, (_, index) => sizedFile(`part-${index}.txt`, 10 * 1024 * 1024)));

    addMedia([picture()]);

    expect(editor()).toHaveValue('<p>기존 본문</p>');
    expect(mocks.toast).toHaveBeenCalledWith('일반 첨부와 본문 미디어를 합친 파일 수 또는 전체 크기(50MB)가 허용 범위를 넘습니다.', 'error');
    expect(mocks.saveBoardArticle).not.toHaveBeenCalled();
  });

  it('미디어를 넣은 뒤 일반 첨부로 합계 50MiB를 넘겨도 제출 시 차단한다', async () => {
    renderSubject();
    fillTitle();
    addMedia([picture()]);
    const content = editor().value;
    addAttachments(Array.from({ length: 5 }, (_, index) => sizedFile(`part-${index}.txt`, 10 * 1024 * 1024)));

    submit();

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('첨부 가능한 파일 수와 크기를 확인해 주세요. 본문 미디어도 첨부 제한에 포함됩니다.', 'error'));
    expect(mocks.saveBoardArticle).not.toHaveBeenCalled();
    expect(editor()).toHaveValue(content);
  });

  it('파일당 10MiB를 넘는 미디어는 본문에 추가하지 않는다', () => {
    renderSubject();
    addMedia([sizedFile('too-large.png', 10 * 1024 * 1024 + 1)]);
    expect(getBoardMediaReferences(editor().value)).toEqual([]);
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('파일 하나당 10MB'), 'error');
  });

  it('본문에서 제거한 미디어는 저장할 파일에서 제외한다', async () => {
    renderSubject();
    fillTitle();
    addMedia([picture()]);
    expect(getBoardMediaReferences(editor().value)).toHaveLength(1);
    fireEvent.change(editor(), { target: { value: '<p>미디어를 제거한 본문</p>' } });

    submit();

    await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1));
    expect(submittedData().getAll('files')).toEqual([]);
    expect(submittedData().get('pstCn')).toBe('<p>미디어를 제거한 본문</p>');
  });

  it('저장 실패 후 재시도는 같은 미디어 파일과 현재 수정한 입력을 보낸다', async () => {
    mocks.saveBoardArticle.mockResolvedValueOnce({ success: false, message: '저장 서버에 연결할 수 없습니다.' });
    renderSubject();
    fillTitle();
    addMedia([picture()]);
    const content = editor().value;
    submit();
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('저장 서버에 연결할 수 없습니다. 입력 내용은 유지됩니다.', 'error'));
    expect(editor()).toHaveValue(content);
    expect(mocks.clearDraft).not.toHaveBeenCalled();
    const firstFile = submittedData().getAll('files')[0];
    fireEvent.change(screen.getByRole('textbox', { name: '게시글 제목' }), { target: { value: '재시도 제목' } });
    const updated = `${content}<p>추가한 본문</p>`;
    fireEvent.change(editor(), { target: { value: updated } });

    submit();

    await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(2));
    expect(submittedData(1).get('pstTtl')).toBe('재시도 제목');
    expect(submittedData(1).get('pstCn')).toBe(updated);
    expect(submittedData(1).getAll('files')).toHaveLength(1);
    expect(submittedData(1).getAll('files')[0]).toBe(firstFile);
    await waitFor(() => expect(mocks.clearDraft).toHaveBeenCalledTimes(1));
  });

  it('저장 중에는 에디터와 첨부 입력을 잠그고 중복 제출하지 않는다', async () => {
    let finish!: (result: { success: boolean; redirect: string }) => void;
    mocks.saveBoardArticle.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    renderSubject();
    fillTitle();
    addMedia([picture()]);
    const content = editor().value;
    submit();
    await waitFor(() => expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1));

    expect(screen.getByRole('textbox', { name: '게시글 제목' })).toBeDisabled();
    expect(editor()).toHaveProperty('readOnly', true);
    expect(screen.getByLabelText('본문 미디어 선택')).toBeDisabled();
    expect(screen.getByLabelText('일반 첨부 선택')).toBeDisabled();
    expect(screen.getByRole('button', { name: '게시글 등록' })).toBeDisabled();
    submit();
    expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1);
    expect(editor()).toHaveValue(content);
    await act(async () => finish({ success: true, redirect: '/boards' }));
    expect(mocks.saveBoardArticle).toHaveBeenCalledTimes(1);
  });
});
