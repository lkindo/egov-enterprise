import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import RichTextEditor from '../RichTextEditor';

const tiptap = vi.hoisted(() => {
  const run = vi.fn(() => true);
  const chain = new Proxy({ run }, {
    get(target, property) {
      if (property === 'run') return target.run;
      return vi.fn(() => chain);
    },
  });

  return {
    options: undefined as {
      editorProps?: { attributes?: Record<string, string> };
    } | undefined,
    editor: {
      chain: vi.fn(() => chain),
      commands: { setContent: vi.fn() },
      getHTML: vi.fn(() => ''),
      isActive: vi.fn((nameOrAttributes: string | Record<string, string>) => (
        nameOrAttributes === 'paragraph'
        || (typeof nameOrAttributes === 'object' && nameOrAttributes.textAlign === 'left')
      )),
      storage: { characterCount: { words: vi.fn(() => 3) } },
    },
  };
});

vi.mock('@tiptap/react', () => ({
  useEditor: (options: typeof tiptap.options) => {
    tiptap.options = options;
    return tiptap.editor;
  },
  EditorContent: () => {
    const { class: className, ...attributes } = tiptap.options?.editorProps?.attributes ?? {};
    return (
      <div
        {...attributes}
        className={className}
        contentEditable
        suppressContentEditableWarning
        data-testid="editor-content"
      />
    );
  },
}));

vi.mock('@tiptap/starter-kit', () => ({
  default: { configure: vi.fn(() => ({})) },
}));
vi.mock('@tiptap/extension-link', () => ({
  default: { configure: vi.fn(() => ({})) },
}));
vi.mock('@tiptap/extension-image', () => ({
  default: { configure: vi.fn(() => ({})) },
}));
vi.mock('@tiptap/extension-text-align', () => ({
  default: { configure: vi.fn(() => ({})) },
}));
vi.mock('@tiptap/extension-character-count', () => ({
  default: {},
}));

const toggleNames = [
  '제목 1',
  '제목 2',
  '본문',
  '글머리 기호 목록',
  '번호 목록',
  '인용문',
  '왼쪽 정렬',
  '가운데 정렬',
  '오른쪽 정렬',
  '양쪽 정렬',
];

describe('RichTextEditor toolbar accessibility', () => {
  it('호출부의 식별자와 접근성 설명을 실제 contenteditable 표면에 전달한다', () => {
    render(
      <>
        <span id="policy-content-label">정책 내용</span>
        <span id="policy-content-help">필수 입력 항목</span>
        <RichTextEditor
          id="policy-content"
          aria-label="정책 본문"
          aria-labelledby="policy-content-label"
          aria-describedby="policy-content-help"
          value=""
          onChange={vi.fn()}
        />
      </>,
    );

    const editable = screen.getByRole('textbox', { name: '정책 내용' });
    expect(editable).toHaveAttribute('contenteditable', 'true');
    expect(editable).toHaveAttribute('id', 'policy-content');
    expect(editable).toHaveAttribute('aria-label', '정책 본문');
    expect(editable).toHaveAttribute('aria-labelledby', 'policy-content-label');
    expect(editable).toHaveAttribute('aria-describedby', 'policy-content-help');
    expect(editable).toHaveAttribute('aria-multiline', 'true');
  });

  it('14개 아이콘 도구에 한국어 이름과 도움말을 제공하고 토글 상태를 노출한다', () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);

    const names = [
      '실행 취소',
      '다시 실행',
      ...toggleNames,
      '링크 삽입 (현재 사용할 수 없음)',
      '이미지 삽입 (현재 사용할 수 없음)',
    ];

    expect(screen.getByRole('toolbar', { name: '문서 서식 도구' })).toBeInTheDocument();
    for (const name of names) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('title', name);
    }

    for (const name of toggleNames) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed');
    }
    expect(screen.getByRole('button', { name: '본문' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('구현되지 않은 링크·이미지 동작은 키보드로 실행되지 않는 비활성 버튼이다', async () => {
    const user = userEvent.setup();
    render(<RichTextEditor value="" onChange={vi.fn()} />);

    const link = screen.getByRole('button', { name: '링크 삽입 (현재 사용할 수 없음)' });
    const image = screen.getByRole('button', { name: '이미지 삽입 (현재 사용할 수 없음)' });
    expect(link).toBeDisabled();
    expect(image).toBeDisabled();

    await user.tab();
    const tabStops: HTMLElement[] = [];
    for (let index = 0; index < 14; index += 1) {
      tabStops.push(document.activeElement as HTMLElement);
      await user.tab();
    }
    expect(tabStops).not.toContain(link);
    expect(tabStops).not.toContain(image);
  });

  it('지원하지 않는 실시간 동기화 상태를 표시하지 않는다', () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);

    expect(screen.queryByText('실시간 문서 동기화 활성화')).not.toBeInTheDocument();
    expect(screen.getByText('서식 있는 텍스트 편집기')).toBeInTheDocument();
    expect(screen.getByText('3단어')).toBeInTheDocument();
  });
});
