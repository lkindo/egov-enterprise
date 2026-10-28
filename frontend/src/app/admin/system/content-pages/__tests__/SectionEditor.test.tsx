import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEditor, type SectionEditorProps } from '../SectionEditor';
import type { CmsCell, CmsSection } from '@/lib/cms/document';
import { API_PATH_WARNING, UNKNOWN_PATH_WARNING, UNPUBLISHED_PAGE_WARNING } from '@/components/cms/InternalPathPicker';

const mocks = vi.hoisted(() => ({ uploadFiles: vi.fn(), getPublishedPages: vi.fn() }));
vi.mock('@/services/foundation/file/FileService', () => ({ fileService: { uploadFiles: mocks.uploadFiles } }));
vi.mock('@/services/business/cms/CmsService', () => ({ cmsService: { getPublishedPages: mocks.getPublishedPages } }));
vi.mock('@/app/components/ui/attachment-image', () => ({
  AttachmentImage: ({ atchFileSn }: { atchFileSn: number }) => <span data-testid="attachment" data-sn={atchFileSn} />,
}));
vi.mock('@/components/cms/CmsRichTextEditor', () => ({ CmsRichTextEditor: () => <div data-testid="rich-editor" /> }));

const sectionWith = (...cells: CmsCell[]): CmsSection => ({
  id: 's1',
  label: '안내',
  layout: cells.length === 1 ? 'one' : cells.length === 2 ? 'two' : 'three',
  tone: 'default',
  spacing: 'normal',
  cells,
});
const imageCell = (atchFileSn = 0): CmsCell => ({ kind: 'image', atchFileSn, alt: '', decorative: false, caption: '' });
const linksCell = (...items: { title: string; url: string }[]): CmsCell => ({ kind: 'links', items });
const filesCell = (...items: { atchFileSn: number; title: string }[]): CmsCell => ({ kind: 'files', items });
const richCell = (): CmsCell => ({ kind: 'rich', doc: { type: 'doc', content: [{ type: 'paragraph' }] } });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

function renderSection(props: Partial<SectionEditorProps> = {}) {
  const onChange = vi.fn();
  const onNotice = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SectionEditor section={sectionWith(imageCell())} index={0} total={1} readOnly={false} canUpload
        onChange={onChange} onLayoutChange={vi.fn()} onMove={vi.fn()} onRemove={vi.fn()} onNotice={onNotice} {...props} />
    </QueryClientProvider>,
  );
  return { onChange, onNotice, client };
}

/** 이 칸의 바뀐 값 — onChange 로 받은 영역의 첫 칸. */
const changedCell = (onChange: ReturnType<typeof vi.fn>) => (onChange.mock.lastCall?.[0] as CmsSection).cells[0];

const imageFile = (name = 'guide.png', type = 'image/png') => new File(['png'], name, { type });
/** 서버 사유가 없는 axios 오류(전송 원문은 사용자 문장으로 쓰지 않는다). */
const transportError = () => Object.assign(new Error('Request failed with status code 400'), { isAxiosError: true, response: { status: 400 } });
const serverError = (message: string) => Object.assign(new Error('Request failed with status code 400'), {
  isAxiosError: true, response: { status: 400, data: { message } },
});

/** 첫 바로가기의 '사이트 안에서 고르기' 를 연다. 시험 환경의 대화상자 대역은 제목을 접근 이름으로 잇지 않아 제목으로 확인한다. */
async function openPicker() {
  fireEvent.click(screen.getByRole('button', { name: '1번 주소 사이트 안에서 고르기' }));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByRole('heading', { name: '사이트 안에서 고르기' })).toBeInTheDocument();
  return dialog;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPublishedPages.mockResolvedValue({ list: [], total: 0, page: 1, size: 100, totalPage: 0 });
});

describe('SectionEditor — ImageCellEditor 이미지 올리기', () => {
  it('올리는 동안 단추를 잠가 uploadFiles 를 한 번만 부르고, 실패하면 칸 안에 알린다', async () => {
    const { onChange, onNotice } = renderSection();
    const pendingUpload = deferred<number>();
    mocks.uploadFiles.mockImplementation(() => pendingUpload.promise);
    const fileInput = screen.getByLabelText('안내 1단 이미지 파일');
    const uploadButton = screen.getByRole('button', { name: '이미지 올리기' });

    fireEvent.change(fileInput, { target: { files: [imageFile()] } });
    fireEvent.click(uploadButton);
    await waitFor(() => expect(uploadButton).toBeDisabled());
    expect(uploadButton).toHaveAttribute('aria-busy', 'true');
    fireEvent.change(fileInput, { target: { files: [imageFile()] } });
    expect(mocks.uploadFiles).toHaveBeenCalledTimes(1);

    pendingUpload.reject(transportError());
    expect(await screen.findByRole('alert')).toHaveTextContent('이미지를 올리지 못했습니다');
    expect(onNotice).toHaveBeenCalledWith('이미지를 올리지 못했습니다. 파일 형식과 크기를 확인해 주세요.');
    expect(onChange).not.toHaveBeenCalled();
    expect(uploadButton).toBeEnabled();
  });

  it('서버가 준 거절 사유를 칸 안에 보이고 올리기 단추에 잇는다', async () => {
    const { onNotice } = renderSection();
    mocks.uploadFiles.mockRejectedValue(serverError('허용하지 않는 파일 형식입니다.'));
    fireEvent.change(screen.getByLabelText('안내 1단 이미지 파일'), { target: { files: [imageFile()] } });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('이미지를 올리지 못했습니다. 허용하지 않는 파일 형식입니다.');
    expect(onNotice).toHaveBeenCalledWith('이미지를 올리지 못했습니다. 허용하지 않는 파일 형식입니다.');
    expect(screen.getByRole('button', { name: '이미지 올리기' }).getAttribute('aria-describedby')).toContain(alert.id);
  });

  it('webp 는 고를 수 없고, 골라도 올리지 않고 받는 형식을 말한다', () => {
    const { onChange } = renderSection();
    const fileInput = screen.getByLabelText('안내 1단 이미지 파일');
    expect(fileInput).toHaveAttribute('accept', '.png,.jpg,.jpeg,.gif');
    expect(screen.getByText(/png·jpg·jpeg·gif 이미지를 한 장씩 올립니다\(파일 하나에 10MB 까지\)/)).toBeInTheDocument();

    fireEvent.change(fileInput, { target: { files: [imageFile('photo.webp', 'image/webp')] } });
    expect(mocks.uploadFiles).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('이미지를 올리지 못했습니다. png·jpg·jpeg·gif 파일만 올릴 수 있습니다.');
  });

  it('10MB 를 넘는 이미지는 올리지 않는다', () => {
    renderSection();
    const large = imageFile();
    Object.defineProperty(large, 'size', { value: 10 * 1024 * 1024 + 1 });
    fireEvent.change(screen.getByLabelText('안내 1단 이미지 파일'), { target: { files: [large] } });
    expect(mocks.uploadFiles).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('파일 하나는 10MB 까지 올릴 수 있습니다.');
  });

  it('고르지 않은 이미지 자리는 초안 저장이 되고 게시 전에 골라야 한다고 말한다', () => {
    renderSection();
    expect(screen.getByText('아직 이미지가 없습니다. 초안으로 저장할 수 있고, 게시하기 전에 골라야 합니다.')).toBeInTheDocument();
  });

  it('파일 올리기 권한이 없으면 올리기 단추를 두지 않고 이유를 말한다', () => {
    renderSection({ canUpload: false });
    expect(screen.queryByRole('button', { name: '이미지 올리기' })).toBeNull();
    expect(screen.queryByLabelText('안내 1단 이미지 파일')).toBeNull();
    expect(screen.getByText('이미지를 올리려면 파일 올리기 권한이 필요합니다.')).toBeInTheDocument();
  });

  it('이미지를 고르지 않았어도 설명을 적어 둔 칸은 종류를 바꾸기 전에 묻는다', () => {
    const { onChange } = renderSection({ section: sectionWith({ kind: 'image', atchFileSn: 0, alt: '안내도', decorative: false, caption: '' }) });
    fireEvent.change(screen.getByLabelText('안내 1단 내용'), { target: { value: 'rich' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('지금 내용을 지우고 본문·표(으)로 바꿀까요?');
  });

  it('영역 이름이 같아도 칸 오류 id 는 영역마다 다르다', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const common = { index: 0, total: 2, readOnly: false, canUpload: true, onChange: vi.fn(), onLayoutChange: vi.fn(),
      onMove: vi.fn(), onRemove: vi.fn(), onNotice: vi.fn() };
    mocks.uploadFiles.mockRejectedValue(transportError());
    render(
      <QueryClientProvider client={client}>
        <SectionEditor {...common} section={{ ...sectionWith(imageCell()), id: 'a' }} />
        <SectionEditor {...common} section={{ ...sectionWith(imageCell()), id: 'b' }} />
      </QueryClientProvider>,
    );
    for (const input of screen.getAllByLabelText('안내 1단 이미지 파일')) {
      fireEvent.change(input, { target: { files: [imageFile()] } });
    }
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
    const ids = screen.getAllByRole('alert').map((alert) => alert.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('올린 파일 번호를 칸에 넣는다', async () => {
    const { onChange } = renderSection();
    mocks.uploadFiles.mockResolvedValue(41);
    fireEvent.change(screen.getByLabelText('안내 1단 이미지 파일'), { target: { files: [imageFile()] } });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      cells: [expect.objectContaining({ kind: 'image', atchFileSn: 41 })],
    })));
  });
});

describe('SectionEditor — 내려받기 파일 칸', () => {
  it('빈 본문 칸을 내려받기 파일 칸으로 바로 바꾼다', () => {
    const { onChange } = renderSection({ section: sectionWith(richCell()) });
    fireEvent.change(screen.getByLabelText('안내 1단 내용'), { target: { value: 'files' } });
    expect(changedCell(onChange)).toEqual({ kind: 'files', items: [] });
  });

  it('파일이 있는 칸을 다른 종류로 바꾸면 먼저 묻는다', () => {
    const { onChange } = renderSection({ section: sectionWith(filesCell({ atchFileSn: 3, title: '서식' })) });
    fireEvent.change(screen.getByLabelText('안내 1단 내용'), { target: { value: 'rich' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('지금 내용을 지우고 본문·표(으)로 바꿀까요?');
  });

  it('올린 파일을 확장자를 뺀 파일 이름으로 더한다', async () => {
    const { onChange, onNotice } = renderSection({ section: sectionWith(filesCell({ atchFileSn: 3, title: '기존' })) });
    mocks.uploadFiles.mockResolvedValue(9);
    const fileInput = screen.getByLabelText('안내 1단 내려받기 파일');
    expect(fileInput).toHaveAttribute('accept', '.pdf,.hwp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt');

    fireEvent.change(fileInput, { target: { files: [new File(['%PDF'], '2026 신청 안내.v2.pdf', { type: 'application/pdf' })] } });

    await waitFor(() => expect(changedCell(onChange)).toEqual({
      kind: 'files', items: [{ atchFileSn: 3, title: '기존' }, { atchFileSn: 9, title: '2026 신청 안내.v2' }],
    }));
    expect(mocks.uploadFiles).toHaveBeenCalledWith([expect.any(File)]);
    expect(onNotice).toHaveBeenCalledWith('파일을 올렸습니다. 초안을 저장하면 이 페이지에 연결됩니다.');
  });

  it('압축 파일은 올리지 않고 받는 형식을 말한다', () => {
    const { onChange } = renderSection({ section: sectionWith(filesCell()) });
    fireEvent.change(screen.getByLabelText('안내 1단 내려받기 파일'), { target: { files: [new File(['zip'], '자료.zip')] } });
    expect(mocks.uploadFiles).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('파일을 올리지 못했습니다. pdf·hwp·doc·docx·xls·xlsx·ppt·pptx·txt 파일만 올릴 수 있습니다.');
  });

  it('서버가 거절하면 사유를 보이고 칸은 그대로 둔다', async () => {
    const { onChange } = renderSection({ section: sectionWith(filesCell()) });
    mocks.uploadFiles.mockRejectedValue(serverError('파일 크기가 너무 큽니다.'));
    fireEvent.change(screen.getByLabelText('안내 1단 내려받기 파일'), { target: { files: [new File(['x'], 'a.hwp')] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('파일을 올리지 못했습니다. 파일 크기가 너무 큽니다.');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('이름을 고치고, 순서를 바꾸고, 지운다', () => {
    const { onChange } = renderSection({
      section: sectionWith(filesCell({ atchFileSn: 3, title: '서식' }, { atchFileSn: 4, title: '안내문' })),
    });
    fireEvent.change(screen.getByLabelText('1번 파일 이름(사용자에게 보임)'), { target: { value: '신청 서식' } });
    expect(changedCell(onChange)).toEqual({ kind: 'files', items: [{ atchFileSn: 3, title: '신청 서식' }, { atchFileSn: 4, title: '안내문' }] });

    expect(screen.getByRole('button', { name: '1번 파일 위로 옮기기' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '1번 파일 아래로 옮기기' }));
    expect(changedCell(onChange)).toEqual({ kind: 'files', items: [{ atchFileSn: 4, title: '안내문' }, { atchFileSn: 3, title: '서식' }] });

    fireEvent.click(screen.getByRole('button', { name: '2번 파일 지우기' }));
    expect(changedCell(onChange)).toEqual({ kind: 'files', items: [{ atchFileSn: 3, title: '서식' }] });
  });

  it('10개를 채우면 더 올리지 못하게 잠그고 이유를 말한다', () => {
    const items = Array.from({ length: 10 }, (_, position) => ({ atchFileSn: position + 1, title: `파일 ${position + 1}` }));
    renderSection({ section: sectionWith(filesCell(...items)) });
    expect(screen.getByRole('button', { name: '파일 올리기' })).toBeDisabled();
    expect(screen.getByText(/10개를 모두 채웠습니다\. 더 올리려면 하나를 지우세요\./)).toBeInTheDocument();
  });

  it('파일이 없으면 초안 저장은 되고 게시 전에 올려야 한다고 말한다', () => {
    renderSection({ section: sectionWith(filesCell()) });
    expect(screen.getByText('아직 파일이 없습니다. 초안으로 저장할 수 있고, 게시하기 전에 하나 이상 올려야 합니다.')).toBeInTheDocument();
  });
});

describe('SectionEditor — 문제 표시(issues)', () => {
  it('영역 머리에 요약하고, 칸 문제는 그 칸에 보이며 칸 입력에 잇는다', () => {
    renderSection({
      section: sectionWith(imageCell(), linksCell({ title: '', url: '' })),
      issues: [
        { message: '보이는 내용이 없습니다.' },
        { cell: 0, message: '영역 1 1단: 이미지를 선택해 주세요' },
        { cell: 1, message: '영역 1 2단 바로가기 1 이름: 값을 입력해 주세요' },
      ],
    });
    const summary = screen.getByRole('alert');
    expect(summary).toHaveTextContent('안내에 고칠 곳이 3개 있습니다.');
    expect(summary).toHaveTextContent('보이는 내용이 없습니다.');
    // 칸 문제는 요약 목록이 아니라 그 칸에 보인다.
    expect(summary).not.toHaveTextContent('이미지를 선택해 주세요');

    const firstKind = screen.getByLabelText('안내 1단 내용');
    expect(firstKind).toHaveAttribute('aria-invalid', 'true');
    const firstIssues = document.getElementById(firstKind.getAttribute('aria-describedby') ?? '');
    expect(firstIssues).toHaveTextContent('영역 1 1단: 이미지를 선택해 주세요');
    expect(firstIssues?.closest('[data-cell-index]')).toHaveAttribute('data-cell-index', '0');
    expect(screen.getByRole('button', { name: '이미지 올리기' }).getAttribute('aria-describedby')).toContain(firstIssues?.id);
    expect(screen.getByLabelText('이미지 설명(대체 텍스트)')).toHaveAttribute('aria-invalid', 'true');

    const title = screen.getByLabelText('1번 이름');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(title.getAttribute('aria-describedby') ?? '')).toHaveTextContent('바로가기 1 이름: 값을 입력해 주세요');
    expect(screen.getByLabelText('1번 주소')).toHaveAttribute('aria-invalid', 'true');
  });

  it('문제가 없으면 요약도 aria-invalid 도 없다', () => {
    renderSection({ section: sectionWith(imageCell(), linksCell({ title: '', url: '' })) });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('안내 1단 내용')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('1번 주소')).not.toHaveAttribute('aria-invalid');
  });

  it('칸마다 data-cell-index 를 두고 영역의 data-section-index 는 그대로다', () => {
    renderSection({ section: sectionWith(imageCell(), richCell()), index: 2, total: 3 });
    const section = document.querySelector('[data-section-index="2"]');
    expect(section).not.toBeNull();
    expect(section?.querySelector('[data-cell-index="1"]')).toContainElement(screen.getByLabelText('안내 2단 내용'));
  });
});

describe('SectionEditor — 아래에 영역 더하기·복제', () => {
  it('아래에 더할 단 구성을 골라 onInsertBelow 를 부르고 닫는다', () => {
    const onInsertBelow = vi.fn();
    renderSection({ onInsertBelow });
    const toggle = screen.getByRole('button', { name: '안내 아래에 영역 더하기' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const group = screen.getByRole('group', { name: '안내 아래에 더할 영역의 단 구성' });
    fireEvent.click(within(group).getByRole('button', { name: '2단 (같은 너비)' }));

    expect(onInsertBelow).toHaveBeenCalledWith('two');
    expect(screen.queryByRole('group', { name: '안내 아래에 더할 영역의 단 구성' })).toBeNull();
    expect(toggle).toHaveFocus();
  });

  it('Esc 로 고르기를 닫고 단추로 돌아간다', () => {
    const onInsertBelow = vi.fn();
    renderSection({ onInsertBelow });
    const toggle = screen.getByRole('button', { name: '안내 아래에 영역 더하기' });
    fireEvent.click(toggle);
    fireEvent.keyDown(within(screen.getByRole('group', { name: '안내 아래에 더할 영역의 단 구성' })).getByRole('button', { name: '1단' }), { key: 'Escape' });
    expect(screen.queryByRole('group', { name: '안내 아래에 더할 영역의 단 구성' })).toBeNull();
    expect(toggle).toHaveFocus();
    expect(onInsertBelow).not.toHaveBeenCalled();
  });

  it('복제 단추가 onDuplicate 를 부른다', () => {
    const onDuplicate = vi.fn();
    renderSection({ onDuplicate });
    fireEvent.click(screen.getByRole('button', { name: '안내 복제' }));
    expect(onDuplicate).toHaveBeenCalledTimes(1);
  });

  it('처리기가 없으면 단추를 두지 않고, 영역이 50개면 잠근다', () => {
    renderSection();
    expect(screen.queryByRole('button', { name: '안내 아래에 영역 더하기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '안내 복제' })).toBeNull();
  });

  it('영역이 50개면 더하기·복제를 잠근다', () => {
    renderSection({ onInsertBelow: vi.fn(), onDuplicate: vi.fn(), total: 50 });
    expect(screen.getByRole('button', { name: '안내 아래에 영역 더하기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '안내 복제' })).toBeDisabled();
  });
});

describe('SectionEditor — 바로가기 주소', () => {
  it('빈 주소는 초안에서 받으므로 오류로 보이지 않는다', () => {
    renderSection({ section: sectionWith(linksCell({ title: '안내', url: '' })) });
    expect(screen.getByLabelText('1번 주소')).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByText(/https 주소, \/로 시작하는 사이트 내부 경로/)).toBeNull();
  });

  it('허용하지 않는 주소는 지금처럼 오류다', () => {
    renderSection({ section: sectionWith(linksCell({ title: '안내', url: 'javascript:alert(1)' })) });
    const url = screen.getByLabelText('1번 주소');
    expect(url).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(url.getAttribute('aria-describedby') ?? '')).toHaveTextContent('https 주소, /로 시작하는 사이트 내부 경로');
  });

  it('/api/ 주소는 막지 않고 내려받기 파일 칸을 쓰라고 알린다', () => {
    renderSection({ section: sectionWith(linksCell({ title: '서식', url: '/api/v1/files/12/1' })) });
    const url = screen.getByLabelText('1번 주소');
    expect(url).not.toHaveAttribute('aria-invalid');
    expect(document.getElementById(url.getAttribute('aria-describedby') ?? '')).toHaveTextContent(API_PATH_WARNING);
  });

  it('알려진 화면이 아닌 사이트 안 주소는 열 수 없을 수 있다고 알리고, 알려진 화면은 조용하다', () => {
    renderSection({ section: sectionWith(linksCell({ title: '없음', url: '/no-such-screen' }, { title: '홈', url: '/' })) });
    expect(screen.getAllByText(UNKNOWN_PATH_WARNING)).toHaveLength(1);
    expect(screen.getByLabelText('2번 주소')).not.toHaveAttribute('aria-describedby');
  });

  it('/pages/ 주소는 게시 중인 페이지인지 보고 아니면 알린다', async () => {
    mocks.getPublishedPages.mockResolvedValue({
      list: [{ contsPathNm: 'service-guide', contsTtl: '이용 안내' }], total: 1, page: 1, size: 100, totalPage: 1,
    });
    renderSection({ section: sectionWith(linksCell({ title: '안내', url: '/pages/service-guide' }, { title: '옛 안내', url: '/pages/old-guide' })) });
    expect(await screen.findByText(UNPUBLISHED_PAGE_WARNING)).toBeInTheDocument();
    expect(screen.getAllByText(UNPUBLISHED_PAGE_WARNING)).toHaveLength(1);
    expect(screen.getByLabelText('1번 주소')).not.toHaveAttribute('aria-describedby');
    expect(mocks.getPublishedPages).toHaveBeenCalledWith({ keyword: '', page: 1, size: 100 });
  });

  it('게시 목록을 다 읽지 못하면 /pages/ 주소를 의심하지 않는다', async () => {
    mocks.getPublishedPages.mockResolvedValue({
      list: [{ contsPathNm: 'service-guide', contsTtl: '이용 안내' }], total: 150, page: 1, size: 100, totalPage: 2,
    });
    const { client } = renderSection({ section: sectionWith(linksCell({ title: '옛 안내', url: '/pages/old-guide' })) });
    // 목록을 받아 다시 그린 뒤에 본다 — 받기 전에 보면 판정을 건너뛴 것과 구분되지 않는다.
    await waitFor(() => expect(client.getQueryCache().findAll({ queryKey: ['cms', 'published'] })[0]?.state.status).toBe('success'));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(screen.queryByText(UNPUBLISHED_PAGE_WARNING)).toBeNull();
  });

  it('/pages/ 주소가 없으면 게시 목록을 읽지 않는다', () => {
    renderSection({ section: sectionWith(linksCell({ title: '홈', url: '/' })) });
    expect(mocks.getPublishedPages).not.toHaveBeenCalled();
  });

  it('사이트 안에서 게시된 페이지를 고르면 주소와 빈 이름을 채운다', async () => {
    mocks.getPublishedPages.mockResolvedValue({
      list: [{ contsPathNm: 'service-guide', contsTtl: '이용 안내' }], total: 1, page: 1, size: 20, totalPage: 1,
    });
    const { onChange } = renderSection({ section: sectionWith(linksCell({ title: '', url: '' })) });
    const dialog = await openPicker();
    fireEvent.click(await within(dialog).findByRole('button', { name: /이용 안내/ }));

    expect(changedCell(onChange)).toEqual({ kind: 'links', items: [{ title: '이용 안내', url: '/pages/service-guide' }] });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('앱 화면을 고르면 주소만 바꾸고 적어 둔 이름은 두며, 관리 화면을 표시한다', async () => {
    const { onChange } = renderSection({ section: sectionWith(linksCell({ title: '처음으로', url: '' })) });
    const dialog = await openPicker();
    fireEvent.click(within(dialog).getByRole('tab', { name: '앱 화면' }));
    fireEvent.change(within(dialog).getByLabelText('화면 찾기'), { target: { value: '관리자 업무 현황' } });
    expect(within(dialog).getByRole('button', { name: /관리자 업무 현황/ })).toHaveTextContent('관리 화면');

    fireEvent.change(within(dialog).getByLabelText('화면 찾기'), { target: { value: '업무 홈' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /^업무 홈/ }));
    expect(changedCell(onChange)).toEqual({ kind: 'links', items: [{ title: '처음으로', url: '/' }] });
  });

  it('주소에 번호가 들어가는 화면은 고를 수 없음을 표시한다', async () => {
    // 화면 목록은 생성물마다 구성으로 다시 만든다 — 예시는 모든 생성물에 남는 core 동적 화면(부서 업무 상세)으로 둔다(가이드 §4.2).
    //   기능 소유 화면(예: 설문 응답 '/survey/[id]')을 쓰면 그 기능이 빠진 구성에서 목록에 없어 붉다.
    const dynamicRoute = '/smart-toolkit/dept-job/[id]';
    renderSection({ section: sectionWith(linksCell({ title: '', url: '' })) });
    const dialog = await openPicker();
    fireEvent.click(within(dialog).getByRole('tab', { name: '앱 화면' }));
    fireEvent.change(within(dialog).getByLabelText('화면 찾기'), { target: { value: dynamicRoute } });
    const row = within(dialog).getByText(dynamicRoute).closest('li');
    expect(row).toHaveTextContent('번호 직접 입력');
    expect(within(row as HTMLElement).queryByRole('button')).toBeNull();
  });
});
