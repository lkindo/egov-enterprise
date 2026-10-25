import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CmsRichTextEditor, pasteNotice, preparePastedCmsHtml } from '../CmsRichTextEditor';
import type { CmsRichDoc, CmsRichNode } from '@/lib/cms/document';

/**
 * 서식 본문의 링크 넣기·문제 연결·붙여넣기 알림(ADR-0042).
 * - 글자를 고르지 않고 '링크 넣기' 를 하면 종전에는 빈 선택에 링크 서식만 걸려 아무것도 보이지 않았다 — 링크 글자를 받아 넣는다.
 * - 붙여넣기가 걷어 낸 이미지·바꾼 제목은 조용히 버리지 않고 알린다.
 */
const mocks = vi.hoisted(() => ({ getPublishedPages: vi.fn() }));
vi.mock('@/services/business/cms/CmsService', () => ({ cmsService: { getPublishedPages: mocks.getPublishedPages } }));

const emptyDoc = (): CmsRichDoc => ({ type: 'doc', content: [{ type: 'paragraph' }] });

/** 문서의 글자 조각을 모두 모은다. */
function textNodes(doc: CmsRichDoc): CmsRichNode[] {
  const out: CmsRichNode[] = [];
  const walk = (node: CmsRichNode) => {
    if (node.type === 'text') out.push(node);
    (node.content ?? []).forEach(walk);
  };
  doc.content.forEach(walk);
  return out;
}

async function openLinkForm() {
  fireEvent.click(await screen.findByRole('button', { name: '링크 넣기' }));
  return screen.findByRole('group', { name: '링크 넣기' });
}

describe('콘텐츠 서식 편집기 — 고른 글자 없이 링크 넣기', () => {
  it('링크 글자를 받아 그 글자에 링크를 걸어 넣는다', async () => {
    const onChange = vi.fn();
    render(<CmsRichTextEditor value={emptyDoc()} onChange={onChange} label="본문" />);
    await openLinkForm();
    fireEvent.change(screen.getByLabelText('링크 주소'), { target: { value: 'https://www.example.go.kr' } });
    fireEvent.change(screen.getByLabelText('링크 글자'), { target: { value: '기관 누리집' } });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const doc = onChange.mock.lastCall?.[0] as CmsRichDoc;
    expect(textNodes(doc)).toEqual([
      expect.objectContaining({ text: '기관 누리집', marks: [expect.objectContaining({ type: 'link', attrs: expect.objectContaining({ href: 'https://www.example.go.kr' }) })] }),
    ]);
  });

  it('링크 글자를 비우면 주소를 글자로 넣는다(Enter 로도 적용)', async () => {
    const onChange = vi.fn();
    render(<CmsRichTextEditor value={emptyDoc()} onChange={onChange} label="본문" />);
    await openLinkForm();
    const address = screen.getByLabelText('링크 주소');
    fireEvent.change(address, { target: { value: '/pages/service-guide' } });
    fireEvent.keyDown(address, { key: 'Enter' });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(textNodes(onChange.mock.lastCall?.[0] as CmsRichDoc)).toEqual([
      expect.objectContaining({ text: '/pages/service-guide', marks: [expect.objectContaining({ type: 'link' })] }),
    ]);
  });

  it('허용하지 않는 주소는 넣지 않고 입력에 오류를 잇는다', async () => {
    const onChange = vi.fn();
    render(<CmsRichTextEditor value={emptyDoc()} onChange={onChange} label="본문" />);
    await openLinkForm();
    // 편집기는 처음 그릴 때 정규화한 문서를 한 번 내보낸다 — 그 뒤의 변경만 본다.
    onChange.mockClear();
    const address = screen.getByLabelText('링크 주소');
    fireEvent.change(address, { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(address).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(address.getAttribute('aria-describedby') ?? '')).toHaveTextContent('https 주소');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('사이트 안에서 고른 주소와 이름을 링크 입력에 채워 돌아온다', async () => {
    mocks.getPublishedPages.mockResolvedValue({
      list: [{ contsPathNm: 'service-guide', contsTtl: '이용 안내' }], total: 1, page: 1, size: 20, totalPage: 1,
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <CmsRichTextEditor value={emptyDoc()} onChange={vi.fn()} label="본문" />
      </QueryClientProvider>,
    );
    await openLinkForm();
    expect(screen.queryByRole('heading', { name: '사이트 안에서 고르기' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '사이트 안에서 고르기' }));
    expect(await screen.findByRole('heading', { name: '사이트 안에서 고르기' })).toBeInTheDocument();
    // 고르기 대화상자가 뜨는 동안 링크 팝오버는 닫는다(팝오버가 대화상자 위에 뜨지 않게).
    expect(screen.queryByRole('group', { name: '링크 넣기' })).toBeNull();

    const dialog = screen.getByRole('heading', { name: '사이트 안에서 고르기' }).closest('[role="dialog"]') as HTMLElement;
    fireEvent.click(await within(dialog).findByRole('button', { name: /이용 안내/ }));
    await screen.findByRole('group', { name: '링크 넣기' });
    expect(screen.getByLabelText('링크 주소')).toHaveValue('/pages/service-guide');
    expect(screen.getByLabelText('링크 글자')).toHaveValue('이용 안내');
  });
});

describe('콘텐츠 서식 편집기 — 문제 연결', () => {
  it('invalid·describedBy 를 편집 영역에 잇고, 풀리면 뗀다', async () => {
    const { rerender } = render(
      <CmsRichTextEditor value={emptyDoc()} onChange={vi.fn()} label="안내 1단 본문" invalid describedBy="cell-issues" />,
    );
    const textbox = await screen.findByRole('textbox', { name: '안내 1단 본문' });
    expect(textbox).toHaveAttribute('aria-invalid', 'true');
    expect(textbox).toHaveAttribute('aria-describedby', 'cell-issues');

    rerender(<CmsRichTextEditor value={emptyDoc()} onChange={vi.fn()} label="안내 1단 본문" />);
    await waitFor(() => expect(textbox).not.toHaveAttribute('aria-invalid'));
    expect(textbox).not.toHaveAttribute('aria-describedby');
  });
});

describe('콘텐츠 서식 편집기 — 붙여넣기 알림', () => {
  it('제목 1 은 제목 2 로, 제목 4~6 은 제목 3 으로 바꾸고 이미지는 세어 뺀다', () => {
    const prepared = preparePastedCmsHtml('<h1>큰 제목</h1><h4>작은 제목</h4><h6>더 작은 제목</h6>'
      + '<p>안내<img src="data:image/png;base64,AA"></p><picture><img src="a.png"></picture><h2>그대로</h2>');
    expect(prepared.html).toContain('<h2>큰 제목</h2>');
    expect(prepared.html).toContain('<h3>작은 제목</h3>');
    expect(prepared.html).toContain('<h3>더 작은 제목</h3>');
    expect(prepared.html).toContain('<h2>그대로</h2>');
    expect(prepared.html).not.toMatch(/<img|<h1|<h4|<h6/i);
    expect(prepared).toMatchObject({ droppedMedia: 2, promotedHeadings: 1, demotedHeadings: 2 });
    expect(pasteNotice(prepared)).toBe('붙여 넣은 내용의 이미지·동영상 2개는 본문에 넣지 않았습니다. 이미지는 이미지 칸으로 올려 주세요. '
      + '제목 1 은 제목 2 로 바꿨습니다. 제목 4~6 은 제목 3 으로 바꿨습니다.');
  });

  it('바뀐 것이 없으면 알리지 않는다', () => {
    const prepared = preparePastedCmsHtml('<p>문단</p><ul><li>항목</li></ul>');
    expect(pasteNotice(prepared)).toBeNull();
  });

  it('붙여 넣으면 바뀐 것을 onNotice 로 알리고 제목 1 은 제목 2 로 들어온다', async () => {
    const onChange = vi.fn();
    const onNotice = vi.fn();
    render(<CmsRichTextEditor value={emptyDoc()} onChange={onChange} onNotice={onNotice} label="본문" />);
    const textbox = await screen.findByRole('textbox', { name: '본문' });
    const html = '<h1>신청 안내</h1><p>본문<img src="https://www.example.go.kr/a.png"></p>';
    fireEvent.paste(textbox, {
      clipboardData: {
        files: [],
        types: ['text/html', 'text/plain'],
        getData: (type: string) => (type === 'text/html' ? html : type === 'text/plain' ? '신청 안내 본문' : ''),
      },
    });

    expect(onNotice).toHaveBeenCalledWith('붙여 넣은 내용의 이미지·동영상 1개는 본문에 넣지 않았습니다. 이미지는 이미지 칸으로 올려 주세요. '
      + '제목 1 은 제목 2 로 바꿨습니다.');
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const doc = onChange.mock.lastCall?.[0] as CmsRichDoc;
    expect(doc.content).toContainEqual(expect.objectContaining({ type: 'heading', attrs: expect.objectContaining({ level: 2 }) }));
  });
});
