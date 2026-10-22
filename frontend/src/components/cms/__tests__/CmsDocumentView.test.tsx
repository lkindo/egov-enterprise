import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CmsDocumentView } from '../CmsDocumentView';
import type { CmsDocument } from '@/lib/cms/document';

vi.mock('@/app/components/ui/attachment-image', () => ({
  AttachmentImage: ({ atchFileSn, alt }: { atchFileSn: number; alt: string }) => (
    <span data-testid="attachment" data-sn={atchFileSn} data-alt={alt} />
  ),
}));

const doc = (content: unknown[]) => ({ type: 'doc', content }) as never;

function render2(document: CmsDocument) {
  return render(<CmsDocumentView document={document} />);
}

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
});
