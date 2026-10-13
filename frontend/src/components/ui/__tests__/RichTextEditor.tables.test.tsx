import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Editor } from '@tiptap/react';
import DOMPurify from 'isomorphic-dompurify';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import RichTextEditor from '../RichTextEditor';

// Keep the editor, its extensions, and the popover real. Only browser layout is
// missing in JSDOM; the existing toolbar mock cannot prove table persistence.
vi.unmock('lucide-react');

const rangeDescriptors = new Map<string, PropertyDescriptor | undefined>();
const scrollByDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollBy');

beforeAll(() => {
  Object.defineProperty(window, 'scrollBy', { configurable: true, value: () => {} });
  const rect = new DOMRect(0, 0, 100, 20);
  for (const [name, value] of Object.entries({
    getBoundingClientRect: () => rect,
    getClientRects: () => Object.assign([rect], { item: (index: number) => index === 0 ? rect : null }),
  })) {
    rangeDescriptors.set(name, Object.getOwnPropertyDescriptor(Range.prototype, name));
    Object.defineProperty(Range.prototype, name, { configurable: true, value });
  }
});

afterEach(cleanup);

afterAll(() => {
  if (scrollByDescriptor) Object.defineProperty(window, 'scrollBy', scrollByDescriptor);
  for (const [name, descriptor] of rangeDescriptors) {
    if (descriptor) Object.defineProperty(Range.prototype, name, descriptor);
    else Reflect.deleteProperty(Range.prototype, name);
  }
});

const savedTable = '<table><tbody><tr><th><p>항목</p></th><th><p>수량</p></th></tr>'
  + '<tr><td><p>사무용품</p></td><td><p>12</p></td></tr></tbody></table>';

async function getEditor() {
  const editable = await screen.findByRole('textbox', { name: '게시글 본문' });
  // Tiptap attaches the real Editor to its contenteditable DOM element.
  return (editable as HTMLElement & { editor: Editor }).editor;
}

function selectCell(editor: Editor, row = 0, column = 0) {
  const table = editor.view.dom.querySelector('table');
  expect(table).not.toBeNull();
  const cell = table!.rows[row].cells[column];
  act(() => { editor.commands.setTextSelection(editor.view.posAtDOM(cell, 0) + 1); });
}

async function tableAction(user: ReturnType<typeof userEvent.setup>, name: string) {
  if (!screen.queryByRole('dialog', { name: '표 편집 도구' })) {
    await user.click(screen.getByRole('button', { name: '표 도구' }));
  }
  const panel = await screen.findByRole('dialog', { name: '표 편집 도구' });
  const action = within(panel).getByRole('button', { name });
  expect(action).toBeEnabled();
  await user.click(action);
}

describe('RichTextEditor actual table editing', () => {
  it('기본 소비자는 표 도구를 표시하지 않는다', async () => {
    render(<RichTextEditor value="<p>정책 내용</p>" onChange={vi.fn()} aria-label="게시글 본문" />);
    await getEditor();
    expect(screen.queryByRole('button', { name: '표 도구' })).not.toBeInTheDocument();
  });

  it('3×3 헤더 표와 셀 내용을 HTML로 저장하고 살균 후 다시 편집한다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const first = render(<RichTextEditor enableTables value="" onChange={onChange} aria-label="게시글 본문" />);
    const editor = await getEditor();

    await tableAction(user, '표 삽입');
    const table = within(editor.view.dom).getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getAllByRole('columnheader')).toHaveLength(3);
    expect(within(table).getAllByRole('cell')).toHaveLength(6);

    selectCell(editor, 1, 0);
    act(() => { editor.commands.insertContent('하반기 실적'); });
    const html = onChange.mock.lastCall?.[0] as string;
    expect(html).toContain('하반기 실적');
    expect(html).toContain('<table');
    first.unmount();

    const restoredChange = vi.fn();
    render(<RichTextEditor enableTables value={DOMPurify.sanitize(html)} onChange={restoredChange} aria-label="게시글 본문" />);
    const restored = await getEditor();
    expect(screen.getByRole('button', { name: '실행 취소' })).toBeDisabled();
    const restoredTable = within(restored.view.dom).getByRole('table');
    expect(within(restoredTable).getAllByRole('row')).toHaveLength(3);
    expect(within(restoredTable).getAllByRole('columnheader')).toHaveLength(3);
    expect(within(restoredTable).getByRole('cell', { name: '하반기 실적' })).toBeInTheDocument();
    expect(restoredChange).not.toHaveBeenCalled();
  });

  it('선택한 셀에서 행·열과 머리글을 바꾸고 표를 삭제한다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RichTextEditor enableTables value={savedTable} onChange={onChange} aria-label="게시글 본문" />);
    const editor = await getEditor();
    const table = () => editor.view.dom.querySelector('table')!;

    for (const name of ['행 위에 추가', '행 아래에 추가']) {
      selectCell(editor, 1, 0);
      const previous = table().rows.length;
      await tableAction(user, name);
      expect(table().rows).toHaveLength(previous + 1);
    }
    selectCell(editor, 1, 0);
    await tableAction(user, '행 삭제');
    expect(table().rows).toHaveLength(3);

    for (const name of ['열 왼쪽에 추가', '열 오른쪽에 추가']) {
      selectCell(editor, 0, 0);
      const previous = table().rows[0].cells.length;
      await tableAction(user, name);
      expect(table().rows[0].cells).toHaveLength(previous + 1);
    }
    selectCell(editor, 0, 0);
    await tableAction(user, '열 삭제');
    expect(table().rows[0].cells).toHaveLength(3);

    selectCell(editor, 0, 0);
    await tableAction(user, '머리글 행 전환');
    expect(table().rows[0].querySelectorAll('th')).toHaveLength(0);
    await tableAction(user, '머리글 행 전환');
    expect(table().rows[0].querySelectorAll('th')).toHaveLength(3);

    selectCell(editor, 1, 0);
    await tableAction(user, '머리글 열 전환');
    expect(Array.from(table().rows).every(row => row.cells[0].tagName === 'TH')).toBe(true);
    await tableAction(user, '머리글 열 전환');
    // Removing a header column preserves its intersection with a header row.
    expect(table().rows[0].cells[0].tagName).toBe('TH');
    expect(Array.from(table().rows).slice(1).every(row => row.cells[0].tagName === 'TD')).toBe(true);

    await tableAction(user, '표 삭제');
    expect(editor.view.dom.querySelector('table')).toBeNull();
    expect(onChange.mock.lastCall?.[0]).not.toContain('<table');
  });

  it('표 크기와 불가능한 병합을 제한하고 삽입을 실행 취소·다시 실행한다', async () => {
    const user = userEvent.setup();
    render(<RichTextEditor enableTables value="" onChange={vi.fn()} aria-label="게시글 본문" />);
    const editor = await getEditor();
    expect(screen.getByRole('button', { name: '실행 취소' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '표 도구' }));
    const rows = screen.getByRole('spinbutton', { name: '행 수' });
    await user.clear(rows);
    await user.type(rows, '0');
    expect(screen.getByRole('button', { name: '표 삽입' })).toBeDisabled();
    await user.clear(rows);
    await user.type(rows, '2');
    const cols = screen.getByRole('spinbutton', { name: '열 수' });
    await user.clear(cols);
    await user.type(cols, '4');
    await tableAction(user, '표 삽입');
    expect(editor.view.dom.querySelectorAll('tr')).toHaveLength(2);
    expect(editor.view.dom.querySelectorAll('th')).toHaveLength(4);

    selectCell(editor, 0, 0);
    await user.click(screen.getByRole('button', { name: '표 도구' }));
    expect(screen.getByRole('button', { name: '셀 병합' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '셀 분할' })).toBeDisabled();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: '실행 취소' }));
    expect(editor.view.dom.querySelector('table')).toBeNull();
    await user.click(screen.getByRole('button', { name: '다시 실행' }));
    expect(editor.view.dom.querySelectorAll('tr')).toHaveLength(2);
    expect(editor.view.dom.querySelectorAll('th')).toHaveLength(4);
  });

  it('여러 셀을 병합하고 다시 분할해도 셀의 내용을 보존한다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RichTextEditor enableTables value={savedTable} onChange={onChange} aria-label="게시글 본문" />);
    const editor = await getEditor();
    const table = () => editor.view.dom.querySelector('table')!;
    // Touch/keyboard users can choose the endpoints without dragging cells.
    selectCell(editor, 1, 0);
    await tableAction(user, '셀 선택 시작');
    selectCell(editor, 1, 1);
    await tableAction(user, '이 셀까지 선택');
    await tableAction(user, '셀 병합');
    expect(table().rows[1].cells).toHaveLength(1);
    expect(table().rows[1].cells[0]).toHaveAttribute('colspan', '2');
    expect(table().rows[1].cells[0]).toHaveTextContent('사무용품12');
    expect(onChange.mock.lastCall?.[0]).toContain('colspan="2"');

    selectCell(editor, 1, 0);
    await tableAction(user, '셀 분할');
    expect(table().rows[1].cells).toHaveLength(2);
    expect(table()).toHaveTextContent('사무용품');
    expect(table()).toHaveTextContent('12');
  });

  it('초안 등 외부 HTML 복원은 표를 보존하고 onChange를 재발행하지 않는다', async () => {
    const onChange = vi.fn();
    const view = render(<RichTextEditor enableTables value="<p>이전 본문</p>" onChange={onChange} aria-label="게시글 본문" />);
    const editor = await getEditor();
    onChange.mockClear();

    view.rerender(<RichTextEditor enableTables value={savedTable} onChange={onChange} aria-label="게시글 본문" />);
    await waitFor(() => expect(within(editor.view.dom).getByRole('cell', { name: '사무용품' })).toBeInTheDocument());
    expect(editor.view.dom).not.toHaveTextContent('이전 본문');
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([
    { action: '표 삽입', value: '<p>초안</p>', inTable: false },
    { action: '행 아래에 추가', value: savedTable, inTable: true },
  ])('$action 팝오버가 열린 도중 읽기 전용이 되면 닫고 본문을 보존한다', async ({ action, value, inTable }) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = render(<RichTextEditor enableTables value={value} onChange={onChange} aria-label="게시글 본문" />);
    const editor = await getEditor();
    if (inTable) selectCell(editor, 1, 0);
    await user.click(screen.getByRole('button', { name: '표 도구' }));
    const panel = await screen.findByRole('dialog', { name: '표 편집 도구' });
    expect(within(panel).getByRole('button', { name: action })).toBeEnabled();
    // The portal is outside the disabled toolbar fieldset, so it needs its own mode handling.
    expect(panel.closest('fieldset')).toBeNull();
    const before = editor.getHTML();
    onChange.mockClear();

    view.rerender(<RichTextEditor enableTables readOnly value={value} onChange={onChange} aria-label="게시글 본문" />);
    await waitFor(() => expect(panel).not.toBeInTheDocument());
    const trigger = screen.getByRole('button', { name: '표 도구' });
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole('dialog', { name: '표 편집 도구' })).not.toBeInTheDocument();
    expect(editor.getHTML()).toBe(before);
    expect(onChange).not.toHaveBeenCalled();

    view.rerender(<RichTextEditor enableTables value={value} onChange={onChange} aria-label="게시글 본문" />);
    expect(screen.queryByRole('dialog', { name: '표 편집 도구' })).not.toBeInTheDocument();
    await tableAction(user, action);
    expect(editor.view.dom.querySelectorAll('tr')).toHaveLength(3);
    expect(onChange).toHaveBeenCalled();
  });

  it('셀 선택 도중 다른 초안을 복원하면 이전 셀 위치를 버린다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = render(<RichTextEditor enableTables value={savedTable} onChange={onChange} aria-label="게시글 본문" />);
    const editor = await getEditor();
    selectCell(editor, 1, 1);
    await tableAction(user, '셀 선택 시작');

    view.rerender(<RichTextEditor enableTables value="<table><tbody><tr><td><p>새 초안</p></td></tr></tbody></table>" onChange={onChange} aria-label="게시글 본문" />);
    selectCell(editor, 0, 0);
    await user.click(screen.getByRole('button', { name: '표 도구' }));
    expect(screen.getByRole('button', { name: '이 셀까지 선택' })).toBeDisabled();
    expect(editor.view.dom).toHaveTextContent('새 초안');
  });
});
