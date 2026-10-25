import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Editor, type JSONContent } from '@tiptap/react';
import { CmsRichTextEditor, cmsRichTextExtensions } from '../CmsRichTextEditor';
import { normalizeCmsDocument, type CmsRichDoc } from '@/lib/cms/document';

/**
 * 편집기 도구만 써서 만든 문서는 서버 검증기를 통과한다(ADR-0039 결정 5). 기본 TipTap 스키마는 인용·표 칸·목록 항목 안에 아무 블록이나
 * 받아 '제목 2 → 인용', 표 안 '제목 2' 같은 정상 조작이 서버가 거부할 문서를 만들었다. 판정은 서버와 같은 화면 판정기로 본다.
 */
const editors: Editor[] = [];
afterEach(() => { while (editors.length) editors.pop()?.destroy(); });

function editorWith(content: JSONContent | string) {
  const editor = new Editor({ extensions: cmsRichTextExtensions(), content });
  editors.push(editor);
  return editor;
}

const passesServerRules = (doc: JSONContent) => normalizeCmsDocument({
  schemaVersion: 1,
  sections: [{ id: 'a', label: '', layout: 'one', tone: 'default', spacing: 'normal', cells: [{ kind: 'rich', doc: doc as CmsRichDoc }] }],
}, 'publish').ok;

const paragraph = (text: string): JSONContent => ({ type: 'paragraph', content: [{ type: 'text', text }] });

describe('콘텐츠 서식 편집기 스키마', () => {
  it('제목에 인용을 걸 수 없고 문서는 그대로 서버 규칙을 지킨다', () => {
    const editor = editorWith({ type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '안내' }] }] });
    editor.commands.setTextSelection(2);
    expect(editor.can().toggleBlockquote()).toBe(false);
    editor.commands.toggleBlockquote();
    expect(passesServerRules(editor.getJSON())).toBe(true);
  });

  it('인용·표 칸·목록 항목 안에서는 제목을 만들 수 없다', () => {
    const quote = editorWith({ type: 'doc', content: [{ type: 'blockquote', content: [paragraph('인용')] }] });
    quote.commands.setTextSelection(3);
    expect(quote.can().toggleHeading({ level: 2 })).toBe(false);

    const table = editorWith({ type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [
      { type: 'tableCell', content: [paragraph('칸')] },
    ] }] }] });
    table.commands.setTextSelection(4);
    expect(table.can().toggleHeading({ level: 2 })).toBe(false);

    const list = editorWith({ type: 'doc', content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [paragraph('항목')] }] }] });
    list.commands.setTextSelection(4);
    expect(list.can().toggleHeading({ level: 3 })).toBe(false);
    expect(list.can().toggleBlockquote()).toBe(false);
    expect(passesServerRules(list.getJSON())).toBe(true);
  });

  it('허용하는 조작은 그대로 된다 — 문단을 제목으로, 문단을 인용으로, 표 칸 안 목록', () => {
    const editor = editorWith({ type: 'doc', content: [paragraph('본문')] });
    editor.commands.setTextSelection(2);
    expect(editor.can().toggleHeading({ level: 2 })).toBe(true);
    expect(editor.can().toggleBlockquote()).toBe(true);

    const table = editorWith({ type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [
      { type: 'tableCell', content: [paragraph('칸')] },
    ] }] }] });
    table.commands.setTextSelection(4);
    expect(table.can().toggleBulletList()).toBe(true);
    table.commands.toggleBulletList();
    expect(passesServerRules(table.getJSON())).toBe(true);
  });

  it('붙여넣은 HTML 의 인용 안 제목·표 안 제목도 서버 규칙에 맞게 들어온다', () => {
    const editor = editorWith('<blockquote><h2>인용 제목</h2><p>인용</p></blockquote>'
      + '<table><tbody><tr><td><h2>칸 제목</h2></td></tr></tbody></table><ul><li><h3>항목 제목</h3></li></ul>');
    expect(passesServerRules(editor.getJSON())).toBe(true);
  });
});

describe('콘텐츠 서식 도구 막대', () => {
  it('편집 이력이 없으면 탭 진입점은 비활성 실행 취소가 아니라 첫 활성 도구이고, 화살표는 비활성 도구를 건너뛴다', async () => {
    render(<CmsRichTextEditor value={{ type: 'doc', content: [paragraph('본문')] } as CmsRichDoc} onChange={() => {}} label="본문" />);
    const undo = await screen.findByRole('button', { name: '실행 취소' });
    expect(undo).toBeDisabled();
    expect(undo).toHaveAttribute('tabindex', '-1');
    const bold = screen.getByRole('button', { name: '굵게' });
    expect(bold).toHaveAttribute('tabindex', '0');

    bold.focus();
    fireEvent.keyDown(bold, { key: 'ArrowLeft' });
    // 왼쪽 끝을 넘으면 비활성 '실행 취소'·'다시 실행' 대신 마지막 활성 도구로 간다.
    await waitFor(() => expect(document.activeElement).not.toBe(undo));
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: '다시 실행' }));
    expect((document.activeElement as HTMLButtonElement).disabled).toBe(false);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Home' });
    await waitFor(() => expect(document.activeElement).toBe(bold));
  });
});
