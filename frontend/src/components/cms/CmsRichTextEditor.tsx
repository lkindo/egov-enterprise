'use client';

import React from 'react';
import { EditorContent, useEditor, useEditorState, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TableCell, TableHeader, TableKit } from '@tiptap/extension-table';
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
import { InternalPathPicker } from '@/components/cms/InternalPathPicker';

/**
 * 콘텐츠 페이지의 서식 본문 편집기(ADR-0039 결정 4·5). 저장 형식은 TipTap JSON 이며 허용 노드는 서버 검증기와 같다 — 제목 2·3,
 * 목록·인용·표, 굵게·기울임·밑줄·취소선·링크. 이미지는 본문이 아니라 이미지 칸으로 넣는다.
 *
 * - 붙여넣기는 통째로 거절하지 않는다. 문서 앱의 스타일·스크립트·미디어·클래스는 걷어 내고 남은 구조(문단·목록·표·링크)만 받는다.
 *   허용하지 않는 주소의 링크는 링크 서식만 빠진다(isAllowedUri). 걷어 낸 것이 사용자 눈에 띄는 내용이면 조용히 버리지 않고
 *   알린다(ADR-0042) — 이미지·동영상은 빠졌다고, 제목 1 은 제목 2 로·제목 4~6 은 제목 3 으로 바꿨다고 말한다.
 * - 글자를 고르지 않고 '링크 넣기' 를 하면 링크 글자를 함께 받아 넣는다(종전에는 아무 일도 일어나지 않았다). 주소는 '사이트 안에서
 *   고르기' 로 게시된 페이지·앱 화면에서 고를 수 있다.
 * - 서식 도구 줄은 탭 정지가 하나다(로빙) — 화살표·Home·End 로 쓸 수 있는 도구 사이를 옮긴다(비활성 단추는 건너뛴다).
 * - 편집기 스키마는 서버 검증기의 중첩 규칙과 같다 — 인용 안에는 문단만, 목록 항목과 표 칸 안에는 문단·목록만 둔다. 기본 스키마는
 *   그 자리에 아무 블록이나 받아, 도구만 써도 서버가 거부할 문서(인용 안 제목, 표 안 제목)가 만들어졌다.
 */

/** 서버 검증기(CmsDocumentValidator)의 중첩 규칙. 붙여넣은 내용도 이 스키마에 맞춰 들어온다. */
const CONTENT_RULES: Record<string, string> = {
  blockquote: 'paragraph+',
  listItem: 'paragraph (paragraph | bulletList | orderedList)*',
};
const CELL_CONTENT = '(paragraph | bulletList | orderedList)+';

/** 콘텐츠 페이지 서식 본문의 확장 목록. 화면 편집기와 스키마 시험이 같은 목록을 쓴다. */
export function cmsRichTextExtensions() {
  const CmsStarterKit = StarterKit.extend({
    addExtensions() {
      return (this.parent?.() ?? []).map((extension) => {
        const content = CONTENT_RULES[extension.name];
        return content ? extension.extend({ content }) : extension;
      });
    },
  });
  return [
    CmsStarterKit.configure({
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
    TableKit.configure({ table: { resizable: true, cellMinWidth: 72 }, tableCell: false, tableHeader: false }),
    TableCell.extend({ content: CELL_CONTENT }),
    TableHeader.extend({ content: CELL_CONTENT }),
  ];
}

export function sanitizePastedCmsHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'h2', 'h3', 'h4', 'ul', 'ol', 'li',
      'blockquote', 'a', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'colspan', 'rowspan', 'start'],
    ALLOW_DATA_ATTR: false,
  });
}

/** 본문에 넣지 못해 붙여넣기에서 빠지는 미디어(picture 는 안의 img 로 센다). */
const PASTED_MEDIA = 'img, svg, video, audio, canvas, object, embed, iframe';

export interface PreparedCmsPaste {
  /** 정리한 HTML(sanitizePastedCmsHtml 를 거친 것). */
  html: string;
  /** 빠진 이미지·동영상 수. */
  droppedMedia: number;
  /** 제목 2 로 바꾼 제목 1 수. */
  promotedHeadings: number;
  /** 제목 3 으로 바꾼 제목 4~6 수. */
  demotedHeadings: number;
}

/**
 * 붙여 넣은 HTML 을 본문 규칙에 맞추고 무엇이 바뀌었는지 센다. 본문 제목은 제목 2·3 뿐이라 제목 1 은 제목 2 로, 제목 4~6 은 제목 3
 * 으로 바꾼다 — 종전에는 태그가 걷혀 평범한 문단이 됐다. 이미지·동영상은 본문에 넣지 않는다(이미지는 이미지 칸으로 올린다).
 */
export function preparePastedCmsHtml(html: string): PreparedCmsPaste {
  if (typeof DOMParser === 'undefined') {
    return { html: sanitizePastedCmsHtml(html), droppedMedia: 0, promotedHeadings: 0, demotedHeadings: 0 };
  }
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const droppedMedia = parsed.body.querySelectorAll(PASTED_MEDIA).length;
  let promotedHeadings = 0;
  let demotedHeadings = 0;
  parsed.body.querySelectorAll('h1, h4, h5, h6').forEach((heading) => {
    const promoted = heading.tagName === 'H1';
    if (promoted) promotedHeadings += 1;
    else demotedHeadings += 1;
    const replacement = parsed.createElement(promoted ? 'h2' : 'h3');
    replacement.append(...Array.from(heading.childNodes));
    heading.replaceWith(replacement);
  });
  return { html: sanitizePastedCmsHtml(parsed.body.innerHTML), droppedMedia, promotedHeadings, demotedHeadings };
}

/** 붙여넣기에서 바뀐 것을 알리는 문장. 바뀐 것이 없으면 null. */
export function pasteNotice({ droppedMedia, promotedHeadings, demotedHeadings }: PreparedCmsPaste): string | null {
  const parts: string[] = [];
  if (droppedMedia > 0) parts.push(`붙여 넣은 내용의 이미지·동영상 ${droppedMedia}개는 본문에 넣지 않았습니다. 이미지는 이미지 칸으로 올려 주세요.`);
  if (promotedHeadings > 0) parts.push('제목 1 은 제목 2 로 바꿨습니다.');
  if (demotedHeadings > 0) parts.push('제목 4~6 은 제목 3 으로 바꿨습니다.');
  return parts.length ? parts.join(' ') : null;
}

interface CmsRichTextEditorProps {
  value: CmsRichDoc;
  onChange: (doc: CmsRichDoc) => void;
  /** 편집 영역의 접근 이름(예: '2번 영역 1단 본문'). */
  label: string;
  readOnly?: boolean;
  /** 붙여넣기에서 파일을 거절했을 때처럼 편집기가 알릴 일. */
  onNotice?: (message: string) => void;
  /** 이 본문에 고칠 문제가 있다(편집 영역의 aria-invalid). */
  invalid?: boolean;
  /** 편집 영역을 설명하는 요소 id(문제 목록 등). */
  describedBy?: string;
}

interface ToolItem {
  label: string;
  icon: React.ReactNode;
  run: () => void;
  active?: boolean;
  disabled?: boolean;
}

export function CmsRichTextEditor({
  value, onChange, label, readOnly = false, onNotice, invalid = false, describedBy,
}: CmsRichTextEditorProps) {
  const emitted = React.useRef<CmsRichDoc | null>(value);
  // useEditor(deps []) 는 렌더마다 바뀐 옵션을 setOptions 로 넘긴다 — 아래 속성·처리기는 늘 최신 값을 쓴다.
  //   ProseMirror 는 속성 값을 String() 으로 쓰므로 없는 값은 키째 뺀다("undefined" 가 들어가지 않게).
  const describedAttributes: Record<string, string> = {};
  if (invalid) describedAttributes['aria-invalid'] = 'true';
  if (describedBy) describedAttributes['aria-describedby'] = describedBy;
  const editor = useEditor({
    extensions: cmsRichTextExtensions(),
    content: value as JSONContent,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        ...describedAttributes,
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
      transformPastedHTML: (html) => {
        const prepared = preparePastedCmsHtml(html);
        const notice = pasteNotice(prepared);
        if (notice) onNotice?.(notice);
        return prepared.html;
      },
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
  // 고른 글자가 없으면(링크 안도 아니면) 링크를 걸 글자를 함께 받는다 — 빈 선택에 링크 서식만 걸면 아무것도 보이지 않는다.
  const [linkNeedsText, setLinkNeedsText] = React.useState(false);
  const [linkText, setLinkText] = React.useState('');
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const linkId = React.useId();

  if (!editor) return null;

  const chain = () => editor.chain().focus();
  const openLink = () => {
    setLinkValue(String(editor.getAttributes('link').href ?? ''));
    setLinkNeedsText(editor.state.selection.empty && !editor.isActive('link'));
    setLinkText('');
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
      { label: '제목 2', icon: <Heading2 size={16} />, run: () => chain().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }),
        disabled: !editor.can().toggleHeading({ level: 2 }) },
      { label: '제목 3', icon: <Heading3 size={16} />, run: () => chain().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }),
        disabled: !editor.can().toggleHeading({ level: 3 }) },
    ],
    [
      { label: '글머리 기호 목록', icon: <List size={16} />, run: () => chain().toggleBulletList().run(), active: editor.isActive('bulletList'),
        disabled: !editor.can().toggleBulletList() },
      { label: '번호 목록', icon: <ListOrdered size={16} />, run: () => chain().toggleOrderedList().run(), active: editor.isActive('orderedList'),
        disabled: !editor.can().toggleOrderedList() },
      { label: '인용', icon: <Quote size={16} />, run: () => chain().toggleBlockquote().run(), active: editor.isActive('blockquote'),
        disabled: !editor.can().toggleBlockquote() },
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
  const usable = tools.map((tool, index) => (tool.disabled ? -1 : index)).filter((index) => index >= 0);
  const current = usable.includes(focusIndex) ? focusIndex : (usable.find((index) => index > focusIndex) ?? usable[0] ?? -1);

  const onToolbarKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = toolRefs.current.findIndex((button) => button === event.target);
    if (index < 0 || usable.length === 0) return;
    const at = usable.indexOf(index);
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = usable[(at + 1) % usable.length]; break;
      case 'ArrowLeft': next = usable[(at - 1 + usable.length) % usable.length]; break;
      case 'Home': next = usable[0]; break;
      case 'End': next = usable[usable.length - 1]; break;
      default: return;
    }
    event.preventDefault();
    setFocusIndex(next);
    toolRefs.current[next]?.focus();
  };

  // 링크는 편집기 안의 표시만 바꾸고 서버에 쓰지 않는다 — 폼이 아니라 입력과 적용 단추다(Enter 로도 적용).
  const applyLink = () => {
    const href = safeHref(linkValue);
    if (!href) {
      setLinkError('https 주소, /로 시작하는 사이트 내부 경로, mailto·tel 만 쓸 수 있습니다.');
      return;
    }
    if (linkNeedsText) {
      // 고른 글자가 없으면 링크 글자(비우면 주소)를 넣고 그 글자에 링크를 건다.
      chain().insertContent({ type: 'text', text: linkText.trim() || href, marks: [{ type: 'link', attrs: { href } }] }).run();
    } else {
      chain().extendMarkRange('link').setLink({ href }).run();
    }
    setLinkOpen(false);
  };
  const applyOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    applyLink();
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
          onKeyDown={applyOnEnter}
        />
        {linkError && <p id={`${linkId}-error`} className="text-sm text-destructive">{linkError}</p>}
        <Button type="button" variant="outline" size="sm" onClick={() => { setLinkOpen(false); setPickerOpen(true); }}>
          사이트 안에서 고르기
        </Button>
        {linkNeedsText && (
          <>
            <label className="block text-sm font-medium text-foreground" htmlFor={`${linkId}-text`}>링크 글자</label>
            <Input
              id={`${linkId}-text`}
              value={linkText}
              maxLength={200}
              aria-describedby={`${linkId}-text-hint`}
              onChange={(event) => setLinkText(event.target.value)}
              onKeyDown={applyOnEnter}
            />
            <p id={`${linkId}-text-hint`} className="text-xs text-muted-foreground">
              고른 글자가 없어 이 글자를 넣고 링크를 겁니다. 비우면 주소를 그대로 넣습니다.
            </p>
          </>
        )}
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
      {!readOnly && (
        // 고르기 대화상자는 링크 팝오버 밖에 둔다 — 팝오버가 대화상자 위에 뜨지 않게 닫고 열며, 닫히면 링크 입력으로 돌아간다
        //   (포커스는 다시 열린 팝오버가 받는다. 대화상자를 부른 단추는 팝오버와 함께 사라졌다).
        <InternalPathPicker
          open={pickerOpen}
          onOpenChange={(open) => {
            setPickerOpen(open);
            if (!open) setLinkOpen(true);
          }}
          onSelect={({ path, title }) => {
            setLinkValue(path);
            setLinkError(null);
            if (linkNeedsText && !linkText.trim() && title) setLinkText(title.slice(0, 200));
          }}
          onCloseAutoFocus={(event) => event.preventDefault()}
        />
      )}
    </div>
  );
}
