'use client';

import React from 'react';
import { EditorContent, useEditor, useEditorState, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TableKit } from '@tiptap/extension-table';
import DOMPurify from 'isomorphic-dompurify';
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Heading2, Heading3, Italic, Link as LinkIcon, List, ListOrdered,
  Quote, Redo, Strikethrough, Type, Underline, Undo, Unlink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RichTextTableTools } from '@/components/ui/RichTextTableTools';
import { RICH_TEXT_TABLE_CLASSES } from '@/lib/rich-text-styles';
import { safeHref, type CmsRichDoc } from '@/lib/cms/document';

/**
 * 콘텐츠 페이지의 서식 본문 편집기(ADR-0039 결정 4·5). 저장 형식은 TipTap JSON 이며 허용 노드는 서버 검증기와 같다 — 제목 2·3,
 * 목록·인용·표, 굵게·기울임·밑줄·취소선·링크. 이미지는 본문이 아니라 이미지 칸으로 넣는다.
 *
 * - 붙여넣기는 통째로 거절하지 않는다. 문서 앱의 스타일·스크립트·미디어·클래스는 걷어 내고 남은 구조(문단·목록·표·링크)만 받는다.
 *   허용하지 않는 주소의 링크는 링크 서식만 빠진다(isAllowedUri).
 * - 서식 도구 줄은 탭 정지가 하나다(로빙) — 화살표·Home·End 로 도구 사이를 옮긴다.
 */

export function sanitizePastedCmsHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'h2', 'h3', 'h4', 'ul', 'ol', 'li',
      'blockquote', 'a', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'colspan', 'rowspan', 'start'],
    ALLOW_DATA_ATTR: false,
  });
}

interface CmsRichTextEditorProps {
  value: CmsRichDoc;
  onChange: (doc: CmsRichDoc) => void;
  /** 편집 영역의 접근 이름(예: '2번 영역 1단 본문'). */
  label: string;
  readOnly?: boolean;
  /** 붙여넣기에서 파일을 거절했을 때처럼 편집기가 알릴 일. */
  onNotice?: (message: string) => void;
}

interface ToolItem {
  label: string;
  icon: React.ReactNode;
  run: () => void;
  active?: boolean;
  disabled?: boolean;
}

export function CmsRichTextEditor({ value, onChange, label, readOnly = false, onNotice }: CmsRichTextEditorProps) {
  const emitted = React.useRef<CmsRichDoc | null>(value);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: false,
        isAllowedUri: (url) => safeHref(url) !== null,
        HTMLAttributes: { class: 'text-primary underline underline-offset-4', rel: 'noopener noreferrer', target: null },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right'] }),
      TableKit.configure({ table: { resizable: true, cellMinWidth: 72 } }),
    ],
    content: value as JSONContent,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        class: cn('min-h-[7rem] px-4 py-3 text-[length:var(--font-size-body)] leading-relaxed focus:outline-none',
          '[&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold',
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:pl-4',
          '[&_p+p]:mt-2'),
      },
      handlePaste: (_view, event) => {
        if (!event.clipboardData?.files.length) return false;
        event.preventDefault();
        onNotice?.('파일은 본문에 붙여 넣을 수 없습니다. 이미지는 이미지 칸으로 올려 주세요.');
        return true;
      },
      handleDrop: (_view, event) => {
        if (!(event as DragEvent).dataTransfer?.files.length) return false;
        event.preventDefault();
        onNotice?.('파일은 본문에 끌어 넣을 수 없습니다. 이미지는 이미지 칸으로 올려 주세요.');
        return true;
      },
      transformPastedHTML: sanitizePastedCmsHtml,
    },
    onUpdate: ({ editor: current }) => {
      const doc = current.getJSON() as CmsRichDoc;
      emitted.current = doc;
      onChange(doc);
    },
  }, []);

  useEditorState({ editor, selector: ({ transactionNumber }) => transactionNumber });

  // 바깥에서 문서를 바꿨을 때만(이력 불러오기 등) 편집기 내용을 갈아 끼운다. 편집기가 보낸 값을 다시 받은 것은 무시한다.
  React.useEffect(() => {
    if (!editor || value === emitted.current) return;
    emitted.current = value;
    editor.commands.setContent(value as JSONContent, { emitUpdate: false });
  }, [editor, value]);

  React.useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  const [focusIndex, setFocusIndex] = React.useState(0);
  const toolRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkValue, setLinkValue] = React.useState('');
  const [linkError, setLinkError] = React.useState<string | null>(null);
  const linkId = React.useId();

  if (!editor) return null;

  const chain = () => editor.chain().focus();
  const openLink = () => {
    setLinkValue(String(editor.getAttributes('link').href ?? ''));
    setLinkError(null);
  };
  const groups: ToolItem[][] = [
    [
      { label: '실행 취소', icon: <Undo size={16} />, run: () => chain().undo().run(), disabled: !editor.can().undo() },
      { label: '다시 실행', icon: <Redo size={16} />, run: () => chain().redo().run(), disabled: !editor.can().redo() },
    ],
    [
      { label: '굵게', icon: <Bold size={16} />, run: () => chain().toggleBold().run(), active: editor.isActive('bold') },
      { label: '기울임', icon: <Italic size={16} />, run: () => chain().toggleItalic().run(), active: editor.isActive('italic') },
      { label: '밑줄', icon: <Underline size={16} />, run: () => chain().toggleUnderline().run(), active: editor.isActive('underline') },
      { label: '취소선', icon: <Strikethrough size={16} />, run: () => chain().toggleStrike().run(), active: editor.isActive('strike') },
    ],
    [
      { label: '본문', icon: <Type size={16} />, run: () => chain().setParagraph().run(), active: editor.isActive('paragraph') },
      { label: '제목 2', icon: <Heading2 size={16} />, run: () => chain().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
      { label: '제목 3', icon: <Heading3 size={16} />, run: () => chain().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
    ],
    [
      { label: '글머리 기호 목록', icon: <List size={16} />, run: () => chain().toggleBulletList().run(), active: editor.isActive('bulletList') },
      { label: '번호 목록', icon: <ListOrdered size={16} />, run: () => chain().toggleOrderedList().run(), active: editor.isActive('orderedList') },
      { label: '인용', icon: <Quote size={16} />, run: () => chain().toggleBlockquote().run(), active: editor.isActive('blockquote') },
    ],
    [
      { label: '왼쪽 정렬', icon: <AlignLeft size={16} />, run: () => chain().setTextAlign('left').run(), active: editor.isActive({ textAlign: 'left' }) },
      { label: '가운데 정렬', icon: <AlignCenter size={16} />, run: () => chain().setTextAlign('center').run(), active: editor.isActive({ textAlign: 'center' }) },
      { label: '오른쪽 정렬', icon: <AlignRight size={16} />, run: () => chain().setTextAlign('right').run(), active: editor.isActive({ textAlign: 'right' }) },
    ],
    [
      { label: '링크 넣기', icon: <LinkIcon size={16} />, run: () => openLink(), active: editor.isActive('link') },
      { label: '링크 해제', icon: <Unlink size={16} />, run: () => chain().extendMarkRange('link').unsetLink().run(), disabled: !editor.isActive('link') },
    ],
  ];
  const tools = groups.flat();
  const current = Math.min(focusIndex, tools.length - 1);

  const onToolbarKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = toolRefs.current.findIndex((button) => button === event.target);
    if (index < 0) return;
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % tools.length; break;
      case 'ArrowLeft': next = (index - 1 + tools.length) % tools.length; break;
      case 'Home': next = 0; break;
      case 'End': next = tools.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setFocusIndex(next);
    toolRefs.current[next]?.focus();
  };

  // 링크는 편집기 안의 표시만 바꾸고 서버에 쓰지 않는다 — 폼이 아니라 입력 하나와 적용 단추다(Enter 로도 적용).
  const applyLink = () => {
    const href = safeHref(linkValue);
    if (!href) {
      setLinkError('https 주소, /로 시작하는 사이트 내부 경로, mailto·tel 만 쓸 수 있습니다.');
      return;
    }
    chain().extendMarkRange('link').setLink({ href }).run();
    setLinkOpen(false);
  };

  const LINK_FORM = (
    <PopoverContent align="start" className="w-80">
      <div className="space-y-2" role="group" aria-label="링크 넣기">
        <label className="block text-sm font-medium text-foreground" htmlFor={linkId}>링크 주소</label>
        <Input
          id={linkId}
          value={linkValue}
          placeholder="https://… 또는 /pages/…"
          aria-invalid={linkError ? true : undefined}
          aria-describedby={linkError ? `${linkId}-error` : undefined}
          onChange={(event) => { setLinkValue(event.target.value); setLinkError(null); }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
            event.preventDefault();
            applyLink();
          }}
        />
        {linkError && <p id={`${linkId}-error`} className="text-sm text-destructive">{linkError}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setLinkOpen(false)}>취소</Button>
          <Button type="button" size="sm" onClick={applyLink}>적용</Button>
        </div>
      </div>
    </PopoverContent>
  );

  let position = -1;
  return (
    <div className={cn('rounded-md border border-border bg-card focus-within:border-ring', RICH_TEXT_TABLE_CLASSES)}>
      {!readOnly && (
        <div
          role="toolbar"
          aria-label={`${label} 서식 도구`}
          onKeyDown={onToolbarKeyDown}
          className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/50 px-2 py-1"
        >
          {groups.map((group, groupIndex) => (
            <div key={groupIndex} className="flex items-center gap-0.5 border-r border-border pr-1 last:border-r-0">
              {group.map((tool) => {
                position += 1;
                const index = position;
                const button = (
                  <Button
                    key={tool.label}
                    ref={(node) => { toolRefs.current[index] = node; }}
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={cn(tool.active && 'bg-primary/10 text-primary')}
                    aria-label={tool.label}
                    title={tool.label}
                    aria-pressed={tool.active === undefined ? undefined : tool.active}
                    disabled={tool.disabled}
                    tabIndex={index === current ? 0 : -1}
                    onFocus={() => setFocusIndex(index)}
                    onClick={tool.run}
                  >
                    {tool.icon}
                  </Button>
                );
                if (tool.label !== '링크 넣기') return button;
                return (
                  <Popover key={tool.label} open={linkOpen} onOpenChange={setLinkOpen}>
                    <PopoverTrigger asChild>{button}</PopoverTrigger>
                    {LINK_FORM}
                  </Popover>
                );
              })}
            </div>
          ))}
          <RichTextTableTools editor={editor} readOnly={readOnly} />
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
