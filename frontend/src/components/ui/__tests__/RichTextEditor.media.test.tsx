import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Editor } from '@tiptap/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBoardMediaFile, getBoardMediaReferences } from '@/lib/attachments/board-media';
import RichTextEditor from '../RichTextEditor';

vi.unmock('lucide-react');
const network = vi.hoisted(() => ({ getFileList: vi.fn(), fetchBlob: vi.fn() }));
vi.mock('@/services/foundation/file/FileService', () => ({ fileService: network }));

const rangeDescriptors = new Map<string, PropertyDescriptor | undefined>();
const scrollDescriptor = Object.getOwnPropertyDescriptor(window, 'scrollBy');
const createDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
const createUrl = vi.fn();
const revokeUrl = vi.fn();

beforeAll(() => {
  // Only layout and object URLs are missing in JSDOM; Tiptap and its DOM events stay real.
  Object.defineProperty(window, 'scrollBy', { configurable: true, value: () => {} });
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createUrl });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeUrl });
  const rect = new DOMRect(0, 0, 100, 20);
  for (const [name, value] of Object.entries({
    getBoundingClientRect: () => rect,
    getClientRects: () => Object.assign([rect], { item: (index: number) => index === 0 ? rect : null }),
  })) {
    rangeDescriptors.set(name, Object.getOwnPropertyDescriptor(Range.prototype, name));
    Object.defineProperty(Range.prototype, name, { configurable: true, value });
  }
});

beforeEach(() => {
  vi.clearAllMocks();
  createUrl.mockImplementation(() => `blob:editor-media-${createUrl.mock.calls.length}`);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

afterAll(() => {
  for (const [target, name, descriptor] of [
    [window, 'scrollBy', scrollDescriptor],
    [URL, 'createObjectURL', createDescriptor],
    [URL, 'revokeObjectURL', revokeDescriptor],
  ] as const) {
    if (descriptor) Object.defineProperty(target, name, descriptor);
    else Reflect.deleteProperty(target, name);
  }
  for (const [name, descriptor] of rangeDescriptors) {
    if (descriptor) Object.defineProperty(Range.prototype, name, descriptor);
    else Reflect.deleteProperty(Range.prototype, name);
  }
});

function picture() {
  const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9XsAAAAASUVORK5CYII='), character => character.charCodeAt(0));
  return new File([bytes], '회의 사진.png', { type: 'image/png' });
}

function Subject({ onChange, onAdd, readOnly = false, disabled = false }: {
  onChange: (html: string) => void;
  onAdd: (files: File[]) => void;
  readOnly?: boolean;
  disabled?: boolean;
}) {
  const [value, setValue] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  return <RichTextEditor value={value} readOnly={readOnly} aria-label="게시글 본문"
    onChange={(html) => { setValue(html); onChange(html); }}
    media={{ attachments: [], pendingFiles, disabled, onAddFiles: (files) => {
      onAdd(files);
      const additions = files.map(createBoardMediaFile);
      setPendingFiles(current => [...current, ...additions.map(item => item.file)]);
      return additions.map(item => item.reference);
    } }} />;
}

async function getEditor() {
  const editable = await screen.findByRole('textbox', { name: '게시글 본문' });
  return (editable as HTMLElement & { editor: Editor }).editor;
}

function transfer(files: File[]) {
  return { files, types: ['Files'], getData: () => '' };
}

function paste(editor: Editor, files: File[]) {
  fireEvent.paste(editor.view.dom, { clipboardData: transfer(files) });
}

describe('RichTextEditor 실제 미디어 입력', () => {
  it.each(['drop', 'paste', 'button'] as const)('%s로 넣은 이미지는 미리보기 URL 대신 첨부 marker만 저장한다', async (path) => {
    const onChange = vi.fn();
    const onAdd = vi.fn();
    const view = render(<Subject onChange={onChange} onAdd={onAdd} />);
    const editor = await getEditor();
    const file = picture();
    if (path === 'drop') {
      vi.spyOn(editor.view, 'posAtCoords').mockReturnValue({ pos: 1, inside: -1 });
      fireEvent.drop(editor.view.dom, { dataTransfer: transfer([file]), clientX: 1, clientY: 1 });
    } else if (path === 'paste') {
      paste(editor, [file]);
    } else {
      const input = screen.getByLabelText('본문 이미지 파일') as HTMLInputElement;
      const openPicker = vi.spyOn(input, 'click');
      fireEvent.click(screen.getByRole('button', { name: '이미지 삽입' }));
      expect(openPicker).toHaveBeenCalledTimes(1);
      fireEvent.change(input, { target: { files: [file] } });
    }

    expect(await screen.findByRole('img', { name: file.name })).toHaveAttribute('src', 'blob:editor-media-1');
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith([file]);
    const html = editor.getHTML();
    expect(onChange.mock.lastCall?.[0]).toBe(html);
    const references = getBoardMediaReferences(html);
    expect(references).toHaveLength(1);
    expect(references[0]).toMatchObject({ label: file.name, kind: 'image' });
    expect(references[0].name).toMatch(/^media-[0-9a-f-]{36}-회의_사진\.png$/);
    expect(html).not.toMatch(/blob:|data:|<img|<video|\bsrc=/);
    expect(network.getFileList).not.toHaveBeenCalled();
    expect(network.fetchBlob).not.toHaveBeenCalled();
    view.unmount();
    expect(revokeUrl).toHaveBeenCalledWith('blob:editor-media-1');
  });

  it('영상 버튼도 같은 marker를 만들고 저장 HTML에서 다시 편집할 수 있다', async () => {
    const onChange = vi.fn();
    const view = render(<Subject onChange={onChange} onAdd={vi.fn()} />);
    const editor = await getEditor();
    const file = new File(['video fixture'], '교육.webm', { type: 'video/webm' });
    const input = screen.getByLabelText('본문 영상 파일') as HTMLInputElement;
    const openPicker = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: '영상 삽입' }));
    expect(openPicker).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByLabelText('영상 설명')).toHaveValue(file.name);
    const html = editor.getHTML();
    const [reference] = getBoardMediaReferences(html);
    expect(reference).toMatchObject({ label: file.name, kind: 'video' });
    expect(html).not.toMatch(/blob:|data:|<video|\bsrc=/);
    view.unmount();

    const restoredChange = vi.fn();
    render(<RichTextEditor value={html} onChange={restoredChange} aria-label="게시글 본문"
      media={{ attachments: [], pendingFiles: [new File([file], reference.name)], onAddFiles: vi.fn() }} />);
    const restored = await getEditor();
    expect(getBoardMediaReferences(restored.getHTML())).toEqual([reference]);
    expect(screen.getByLabelText('영상 설명')).toHaveValue(file.name);
    expect(restoredChange).not.toHaveBeenCalled();
  });

  it('미디어 삽입은 실행 취소·다시 실행되고 본문에서 제거하면 marker도 사라진다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Subject onChange={onChange} onAdd={vi.fn()} />);
    const editor = await getEditor();
    paste(editor, [picture()]);
    await screen.findByRole('img', { name: '회의 사진.png' });
    const [reference] = getBoardMediaReferences(editor.getHTML());

    await user.click(screen.getByRole('button', { name: '실행 취소' }));
    expect(getBoardMediaReferences(editor.getHTML())).toEqual([]);
    await user.click(screen.getByRole('button', { name: '다시 실행' }));
    expect(getBoardMediaReferences(editor.getHTML())).toEqual([reference]);
    await user.click(await screen.findByRole('button', { name: '본문에서 제거' }));
    expect(getBoardMediaReferences(editor.getHTML())).toEqual([]);
    expect(onChange.mock.lastCall?.[0]).not.toContain('data-board-file');
  });

  it('읽기 전용으로 바뀌면 미디어 설명·제거와 파일 입력을 잠근다', async () => {
    const onChange = vi.fn();
    const onAdd = vi.fn();
    const view = render(<Subject onChange={onChange} onAdd={onAdd} />);
    const editor = await getEditor();
    paste(editor, [picture()]);
    await screen.findByRole('img', { name: '회의 사진.png' });
    const html = editor.getHTML();

    view.rerender(<Subject onChange={onChange} onAdd={onAdd} readOnly />);

    await waitFor(() => expect(editor.isEditable).toBe(false));
    expect(screen.getByRole('button', { name: '이미지 삽입' })).toBeDisabled();
    await waitFor(() => expect(screen.getByLabelText('이미지 설명')).toBeDisabled());
    expect(screen.getByRole('button', { name: '본문에서 제거' })).toBeDisabled();
    act(() => paste(editor, [picture()]));
    fireEvent.change(screen.getByLabelText('본문 이미지 파일'), { target: { files: [picture()] } });
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(editor.getHTML()).toBe(html);
  });

  it('게시판 첨부가 비활성화되면 붙여넣기와 파일 선택으로 미디어를 추가하지 않는다', async () => {
    const onAdd = vi.fn();
    render(<Subject onChange={vi.fn()} onAdd={onAdd} disabled />);
    const editor = await getEditor();
    paste(editor, [picture()]);
    fireEvent.change(screen.getByLabelText('본문 이미지 파일'), { target: { files: [picture()] } });
    expect(screen.getByRole('button', { name: '이미지 삽입' })).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
    expect(getBoardMediaReferences(editor.getHTML())).toEqual([]);
  });
});
