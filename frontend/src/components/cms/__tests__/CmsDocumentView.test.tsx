import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CmsDocumentView } from '../CmsDocumentView';
import type { CmsCell, CmsDocument, CmsSection } from '@/lib/cms/document';

const files = vi.hoisted(() => ({
  getFileList: vi.fn(),
  downloadFile: vi.fn(),
}));

vi.mock('@/app/components/ui/attachment-image', () => ({
  AttachmentImage: ({ atchFileSn, alt, className }: { atchFileSn: number; alt: string; className?: string }) => (
    <span data-testid="attachment" data-sn={atchFileSn} data-alt={alt} className={className} />
  ),
}));

vi.mock('@/services/foundation/file/FileService', () => ({ fileService: files }));

const doc = (content: unknown[]) => ({ type: 'doc', content }) as never;

function render2(document: CmsDocument, options: { showPlaceholders?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CmsDocumentView document={document} showPlaceholders={options.showPlaceholders} />
    </QueryClientProvider>,
  );
}

const section = (layout: CmsSection['layout'], cells: CmsCell[], id = 'a'): CmsSection =>
  ({ id, label: '', layout, tone: 'default', spacing: 'normal', cells });
const one = (...sections: CmsSection[]): CmsDocument => ({ schemaVersion: 1, sections });
const paragraph = (text: string): CmsCell =>
  ({ kind: 'rich', doc: doc([{ type: 'paragraph', content: [{ type: 'text', text }] }]) });
const emptyRich = (): CmsCell => ({ kind: 'rich', doc: doc([{ type: 'paragraph' }]) });

beforeEach(() => {
  files.getFileList.mockReset();
  files.downloadFile.mockReset();
});

describe('CmsDocumentView — HTML 문자열 없이 문서를 그린다(ADR-0039)', () => {
  it('본문 글자는 글자로만 그리고 끼워 넣은 태그를 실행하지 않는다', () => {
    const { container } = render2({
      schemaVersion: 1,
      sections: [{ id: 'a', label: '편집용 이름', layout: 'one', tone: 'default', spacing: 'normal', cells: [{
        kind: 'rich',
        doc: doc([{ type: 'paragraph', content: [{ type: 'text', text: '<img src=x onerror=alert(1)><script>x</script>' }] }]),
      }] }],
    });
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)><script>x</script>')).toBeInTheDocument();
    // 영역 이름은 편집용이라 사용자 화면에 나오지 않는다.
    expect(screen.queryByText('편집용 이름')).toBeNull();
  });

  it('본문 제목은 h2·h3 이고, 허용하지 않은 주소의 링크는 링크가 되지 않으며 바깥 주소는 새 창으로 알린다', () => {
    render2({
      schemaVersion: 1,
      sections: [{ id: 'a', label: '', layout: 'one', tone: 'default', spacing: 'normal', cells: [{
        kind: 'rich',
        doc: doc([
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '큰 제목' }] },
          { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '작은 제목' }] },
          { type: 'paragraph', content: [
            { type: 'text', text: '나쁜 링크', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] },
            { type: 'text', text: '바깥 링크', marks: [{ type: 'link', attrs: { href: 'https://www.example.go.kr' } }] },
            { type: 'text', text: '안쪽 링크', marks: [{ type: 'link', attrs: { href: '/pages/guide' } }] },
          ] },
        ]),
      }] }],
    });
    expect(screen.getByRole('heading', { level: 2, name: '큰 제목' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '작은 제목' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /나쁜 링크/ })).toBeNull();
    const external = screen.getByRole('link', { name: /바깥 링크/ });
    expect(external).toHaveAttribute('target', '_blank');
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');
    expect(external).toHaveTextContent('(새 창)');
    expect(screen.getByRole('link', { name: '안쪽 링크' })).not.toHaveAttribute('target');
  });

  it('표의 첫 행 머리글은 열 머리글, 다른 행 머리글은 행 머리글이고 병합·열 너비를 지킨다', () => {
    const { container } = render2({
      schemaVersion: 1,
      sections: [{ id: 'a', label: '', layout: 'one', tone: 'default', spacing: 'normal', cells: [{
        kind: 'rich',
        doc: doc([{ type: 'table', content: [
          { type: 'tableRow', content: [
            { type: 'tableHeader', attrs: { colspan: 2, colwidth: [120, 0] }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '구분' }] }] },
          ] },
          { type: 'tableRow', content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: '대상' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '구성원' }] }] },
          ] },
        ] }]),
      }] }],
    });
    const table = within(screen.getByRole('table'));
    expect(table.getByRole('columnheader', { name: '구분' })).toHaveAttribute('colspan', '2');
    expect(table.getByRole('rowheader', { name: '대상' })).toBeInTheDocument();
    expect(container.querySelector('col')?.getAttribute('style')).toContain('120px');
  });

  it('이미지 칸은 첨부로 그리고 꾸밈 이미지는 빈 대체 텍스트이며, 바로가기는 링크 목록이다', () => {
    render2({
      schemaVersion: 1,
      sections: [{ id: 'a', label: '', layout: 'two', tone: 'emphasis', spacing: 'relaxed', cells: [
        { kind: 'image', atchFileSn: 41, alt: '', decorative: true, caption: '설명 문구' },
        { kind: 'links', items: [{ title: '이용 안내', url: '/pages/portal-guide' }, { title: '문의', url: 'mailto:help@example.go.kr' }] },
      ] }],
    });
    const image = screen.getByTestId('attachment');
    expect(image).toHaveAttribute('data-sn', '41');
    expect(image).toHaveAttribute('data-alt', '');
    expect(screen.getByText('설명 문구')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '이용 안내' })).toHaveAttribute('href', '/pages/portal-guide');
    expect(screen.getByRole('link', { name: '문의' })).toHaveAttribute('href', 'mailto:help@example.go.kr');
  });

  it('표 영역의 이름은 문서 안 순번이다 — 표가 여럿이어도 이름이 겹치지 않는다', () => {
    const table = (text: string) => ({ type: 'table', content: [
      { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }] },
    ] });
    render2(one(
      section('one', [{ kind: 'rich', doc: doc([table('첫 표')]) }], 'a'),
      section('one', [{ kind: 'rich', doc: doc([table('둘째 표')]) }], 'b'),
    ));
    expect(screen.getByRole('region', { name: '표 1' })).toHaveTextContent('첫 표');
    expect(screen.getByRole('region', { name: '표 2' })).toHaveTextContent('둘째 표');
  });
});

describe('CmsDocumentView — 상자 폭으로 단을 나눈다(ADR-0042)', () => {
  it('루트가 컨테이너이고 단 배치는 화면 폭(md:)이 아니라 컨테이너 폭(@2xl:)으로 바뀐다', () => {
    const { container } = render2(one(
      section('two', [paragraph('왼쪽'), paragraph('오른쪽')], 'a'),
      { ...section('three', [paragraph('가'), paragraph('나'), paragraph('다')], 'b'), tone: 'subtle' },
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('@container');
    expect(container.querySelector('[data-cms-section="a"]')).toHaveClass('@2xl:grid-cols-2');
    expect(container.querySelector('[data-cms-section="b"]')).toHaveClass('@2xl:grid-cols-3', '@2xl:px-6');
    expect(container.innerHTML).not.toMatch(/(^|[\s"])md:/);
  });
});

describe('CmsDocumentView — 링크는 목적지를 드러낸다(ADR-0042)', () => {
  it('사이트 안 링크는 같은 창이고, 바깥 링크만 새 창 표시(아이콘·글)가 붙는다', () => {
    const { container } = render2(one(section('one', [{
      kind: 'rich',
      doc: doc([{ type: 'paragraph', content: [
        { type: 'text', text: '안쪽 링크', marks: [{ type: 'link', attrs: { href: '/pages/guide' } }] },
        { type: 'text', text: '바깥 링크', marks: [{ type: 'link', attrs: { href: 'https://www.example.go.kr' } }] },
        { type: 'text', text: '메일', marks: [{ type: 'link', attrs: { href: 'mailto:help@example.go.kr' } }] },
      ] }]),
    }])));
    const inside = screen.getByRole('link', { name: '안쪽 링크' });
    expect(inside).toHaveAttribute('href', '/pages/guide');
    expect(inside.querySelector('[data-testid^="icon-"]')).toBeNull();
    const outside = screen.getByRole('link', { name: /^바깥 링크\s*\(새 창\)$/ });
    expect(outside).toHaveAttribute('target', '_blank');
    expect(outside.querySelector('[data-testid="icon-externallink"]')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('link', { name: '메일' })).not.toHaveAttribute('target');
    expect(container.querySelectorAll('[target="_blank"]')).toHaveLength(1);
  });

  it('바로가기의 대각선 화살표는 바깥 링크에만 있고 안쪽 링크는 꺾쇠다', () => {
    render2(one(section('one', [{ kind: 'links', items: [
      { title: '이용 안내', url: '/pages/portal-guide' },
      { title: '기관 누리집', url: 'https://www.example.go.kr' },
    ] }])));
    const inside = screen.getByRole('link', { name: '이용 안내' });
    expect(inside).not.toHaveAttribute('target');
    expect(inside.querySelector('[data-testid="icon-chevronright"]')).not.toBeNull();
    expect(inside.querySelector('[data-testid="icon-arrowupright"]')).toBeNull();
    const outside = screen.getByRole('link', { name: /^기관 누리집\s*\(새 창\)$/ });
    expect(outside).toHaveAttribute('target', '_blank');
    expect(outside).toHaveAttribute('rel', 'noopener noreferrer');
    expect(outside.querySelector('[data-testid="icon-arrowupright"]')).not.toBeNull();
    expect(outside.querySelector('[data-testid="icon-chevronright"]')).toBeNull();
  });
});

describe('CmsDocumentView — 미완성 칸(ADR-0042 초안)', () => {
  const draft = one(
    section('two', [
      { kind: 'links', items: [{ title: '이용 안내', url: '/pages/guide' }, { title: '', url: '' }, { title: '이름만', url: '' }] },
      { kind: 'image', atchFileSn: 0, alt: '', decorative: false, caption: '' },
    ], 'a'),
    section('one', [{ kind: 'files', items: [] }], 'b'),
    section('one', [emptyRich()], 'c'),
  );

  it('사용자 화면은 빈 바로가기 항목·고르지 않은 이미지·빈 영역을 그리지 않는다', () => {
    const { container } = render2(draft);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('link', { name: '이용 안내' })).toBeInTheDocument();
    expect(screen.queryByText(/이름만/)).toBeNull();
    expect(screen.queryByTestId('attachment')).toBeNull();
    expect(container.querySelector('[data-cms-placeholder]')).toBeNull();
    // 모든 칸이 빈 영역(내려받기·본문)은 통째로 빠지고, 여러 단 영역의 빈 칸은 넓은 폭에서만 자리를 지킨다.
    expect(container.querySelector('[data-cms-section="b"]')).toBeNull();
    expect(container.querySelector('[data-cms-section="c"]')).toBeNull();
    const spacer = container.querySelector('[data-cms-section="a"] [data-cms-empty-cell]');
    expect(spacer).toHaveClass('hidden', '@2xl:block');
    expect(spacer).toHaveAttribute('aria-hidden', 'true');
  });

  it('관리 미리보기(showPlaceholders)는 미완성 칸을 점선 자리로 보인다', () => {
    const { container } = render2(draft, { showPlaceholders: true });
    expect(screen.getByText('이름이나 주소를 아직 넣지 않은 바로가기')).toBeInTheDocument();
    expect(screen.getByText('이름만 — 주소를 아직 넣지 않았습니다')).toBeInTheDocument();
    expect(screen.getByText('이미지를 아직 고르지 않았습니다')).toBeInTheDocument();
    expect(screen.getByText('내려받을 파일을 아직 올리지 않았습니다')).toBeInTheDocument();
    expect(screen.getByText('내용이 없는 칸입니다')).toBeInTheDocument();
    expect(container.querySelector('[data-cms-section="b"]')).not.toBeNull();
    expect(container.querySelector('[data-cms-empty-cell]')).toBeNull();
  });
});

describe('CmsDocumentView — 이미지 칸', () => {
  it('작은 이미지를 칸 폭으로 늘리지 않고, 못 보일 때 드러낼 대체 텍스트 글을 둔다', () => {
    const { container } = render2(one(section('one', [
      { kind: 'image', atchFileSn: 7, alt: '처리 절차도', decorative: false, caption: '' },
    ])));
    const image = screen.getByTestId('attachment');
    expect(image).toHaveClass('max-w-full', 'h-auto');
    expect(image).not.toHaveClass('w-full');
    // 대체 표시(아이콘이 든 role=img)가 있을 때만 CSS 로 드러나는 글이다 — 화면낭독기는 대체 표시의 이름으로 이미 읽는다.
    const altText = container.querySelector('[data-cms-image-alt]');
    expect(altText).toHaveTextContent('처리 절차도');
    expect(altText).toHaveAttribute('aria-hidden', 'true');
    expect(altText).toHaveClass('hidden', 'group-has-[[role=img]>svg]/cms-image:block');
  });

  it('꾸밈 이미지는 대체 텍스트 글을 두지 않는다', () => {
    const { container } = render2(one(section('one', [
      { kind: 'image', atchFileSn: 7, alt: '', decorative: true, caption: '' },
    ])));
    expect(container.querySelector('[data-cms-image-alt]')).toBeNull();
  });
});

describe('CmsDocumentView — 내려받기 파일 칸(ADR-0042)', () => {
  it('항목마다 이름·형식·크기와 내려받기 단추를 보이고, 누르면 그 첨부를 원래 파일 이름으로 받는다', async () => {
    files.getFileList.mockImplementation(async (atchFileSn: number) => atchFileSn === 11
      ? [{ atchFileSn: 11, fileSn: 0, fileExtsn: 'pdf', fileMg: 1_258_291, orignlFileNm: '신청서.pdf' }]
      : [{ atchFileSn: 12, fileSn: 3, fileExtsn: 'hwp', fileMg: 2_048, orignlFileNm: '안내.hwp' }]);
    files.downloadFile.mockResolvedValue(undefined);
    render2(one(section('one', [{ kind: 'files', items: [
      { atchFileSn: 11, title: '신청서 양식' },
      { atchFileSn: 12, title: '' },
    ] }])));
    const list = screen.getByRole('list', { name: '내려받기 파일' });
    expect(await within(list).findByText('PDF · 1.2 MB')).toBeInTheDocument();
    expect(await within(list).findByText('HWP · 2 KB')).toBeInTheDocument();
    // 이름이 비면 원래 파일 이름을 보인다.
    expect(within(list).getByText('안내.hwp', { selector: '.font-medium' })).toBeInTheDocument();
    expect(files.getFileList).toHaveBeenCalledWith(11, expect.objectContaining({ suppressErrorToast: true }));

    fireEvent.click(within(list).getByRole('button', { name: /^신청서 양식\s*내려받기$/ }));
    await waitFor(() => expect(files.downloadFile).toHaveBeenCalledWith(11, 0, '신청서.pdf'));
  });

  it('파일 정보를 못 읽으면 그 줄이 알리고 다시 시도할 수 있다 — 내려받기 단추를 두지 않는다', async () => {
    files.getFileList.mockRejectedValueOnce(new Error('403'))
      .mockResolvedValueOnce([{ atchFileSn: 11, fileSn: 0, fileExtsn: 'pdf', fileMg: 10, orignlFileNm: 'a.pdf' }]);
    render2(one(section('one', [{ kind: 'files', items: [{ atchFileSn: 11, title: '신청서 양식' }] }])));
    expect(await screen.findByText('파일을 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /내려받기/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^신청서 양식\s*파일 정보\s*다시 시도$/ }));
    expect(await screen.findByRole('button', { name: /^신청서 양식\s*내려받기$/ })).toBeInTheDocument();
  });
});
