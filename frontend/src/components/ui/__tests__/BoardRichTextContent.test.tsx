import { cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoardRichTextContent } from '../BoardRichTextContent';

vi.mock('../BoardMedia', () => ({
  BoardMedia: ({ reference, atchFileSn }: { reference: { label: string }; atchFileSn?: number }) => (
    <div role="img" aria-label={reference.label} data-attachment-group={atchFileSn} />
  ),
}));

afterEach(cleanup);

const name = 'media-12345678-1234-4234-8234-123456789abc-photo.png';
const html = `<p>업무 안내</p><figure data-board-file="${name}" data-media-kind="image" data-media-label="회의 사진"><figcaption>회의 사진</figcaption></figure>`;

describe('BoardRichTextContent', () => {
  it('서버 출력은 결정적인 본문·설명만 포함하고 임의 URL을 요청하지 않는다', () => {
    const output = renderToString(<BoardRichTextContent html={html.replace('<figcaption>', '<img src="https://evil.test/x"><figcaption>')} atchFileSn={11} />);
    expect(output).toContain('업무 안내');
    expect(output).toContain('<figcaption>회의 사진</figcaption>');
    expect(output).not.toContain('evil.test');
    expect(output).not.toContain('role="img"');
  });

  it('실제 게시글 문맥으로만 인증 미디어를 연결하고 본문 변경 시 이전 표시를 제거한다', async () => {
    const view = render(<BoardRichTextContent html={html} atchFileSn={11} />);
    expect(await screen.findByRole('img', { name: '회의 사진' })).toHaveAttribute('data-attachment-group', '11');
    view.rerender(<BoardRichTextContent html="<p>새 본문</p>" atchFileSn={11} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('새 본문')).toBeInTheDocument();
  });

  it('첨부 묶음 문맥이 없거나 참조가 위조되면 설명만 남긴다', () => {
    const view = render(<BoardRichTextContent html={html} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('회의 사진')).toBeInTheDocument();
    view.rerender(<BoardRichTextContent html={html.replace(name, '../other.png')} atchFileSn={11} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('첨부 연결을 확인할 수 없습니다.')).toBeInTheDocument();
  });
});
