import { useEffect, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, Link, Zap, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 본문 편집기.
 *
 * [2026-09-03] 툴바가 실제로 동작한다. 종전에는 버튼 12개가 전부
 * `console.log('Applying style: ...')` 하나에 걸려 있어 **눌러도 아무 일도 일어나지 않았다**.
 * 굵게·기울임·코드·글머리·번호·링크·이미지·좌/중/우 정렬·전체 화면이 모두 그랬고,
 * 소비 화면은 게시글 작성·편집(`/admin/community/boards/[id]`) 실사용 경로다.
 *
 * <p><b>왜 HTML 태그를 넣는가.</b> 본문(`pstCn`)은 상세 화면에서 `DOMPurify.sanitize` 를 거쳐
 * `dangerouslySetInnerHTML` 로 렌더된다(`boards/detail/BoardDetailClient.tsx`). 즉 저장 형식이
 * HTML 이라 마크다운(`**굵게**`)을 넣으면 화면에 별표가 그대로 보인다. 여기서 만드는 태그는
 * DOMPurify 기본 정책이 통과시키는 것(`strong`·`em`·`code`·`ul`/`ol`/`li`·`a[href]`)으로만 제한한다.
 *
 * <p><b>왜 6개만 있는가.</b> 구현할 수 없거나 별도 결정이 필요한 버튼은 되살리지 않고 걷었다 —
 * 이미지는 업로드 경로가 선행이고, 좌/중/우 정렬은 `style` 속성이 sanitize 정책을 통과하는지
 * 판정이 선행이며, 전체 화면은 포커스 트랩·Esc 처리 없이 넣으면 새 접근성 문제가 된다.
 * 누를 수 없는 버튼을 남겨 두는 것이 종전의 문제였으므로 "있는데 안 되는" 상태로 두지 않는다.
 */

interface StandardEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

/** 변환 결과. 값과 함께 변환 후 커서/선택 위치를 돌려줘 호출부가 복원한다. */
export interface EditorEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

/** DOMPurify 기본 정책이 통과시키는 인라인 태그만 허용한다. */
export type InlineTag = 'strong' | 'em' | 'code';

/**
 * 선택 영역을 인라인 태그로 감싼다.
 *
 * <p>선택이 있으면 감싼 내용을 그대로 다시 선택 상태로 둔다(연속 적용이 가능하다).
 * 선택이 없으면 여는 태그와 닫는 태그 사이에 캐럿을 둔다 — 바로 타이핑하면 그 안에 들어간다.
 */
export function applyInlineTag(value: string, start: number, end: number, tag: InlineTag): EditorEdit {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const selected = value.slice(start, end);
  const caret = start + open.length;
  return {
    value: `${value.slice(0, start)}${open}${selected}${close}${value.slice(end)}`,
    selectionStart: caret,
    selectionEnd: caret + selected.length,
  };
}

/**
 * 선택이 걸친 줄 전체를 목록으로 바꾼다.
 *
 * <p>줄 단위로 동작하는 이유: 사용자가 세 줄을 선택하고 글머리를 누르면 기대하는 결과는
 * "세 줄이 세 항목" 이지 "선택 문자열 하나가 항목 하나" 가 아니다. 그래서 선택 시작이 걸친 줄의
 * 처음부터 선택 끝이 걸친 줄의 끝까지를 대상으로 잡는다. 빈 줄은 빈 항목을 만들지 않도록 버린다.
 * 대상이 전부 비어 있으면 항목 하나짜리 뼈대를 넣고 그 안에 캐럿을 둔다.
 */
export function applyListTag(value: string, start: number, end: number, tag: 'ul' | 'ol'): EditorEdit {
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const nextNewline = value.indexOf('\n', end);
  const lineEnd = nextNewline === -1 ? value.length : nextNewline;

  const items = value
    .slice(lineStart, lineEnd)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const body = (items.length > 0 ? items : ['']).map((item) => `  <li>${item}</li>`).join('\n');
  const block = `<${tag}>\n${body}\n</${tag}>`;
  const nextValue = `${value.slice(0, lineStart)}${block}${value.slice(lineEnd)}`;

  if (items.length === 0) {
    // 빈 목록 — 첫 항목 안에 캐럿을 둔다.
    const caret = lineStart + `<${tag}>\n  <li>`.length;
    return { value: nextValue, selectionStart: caret, selectionEnd: caret };
  }
  return { value: nextValue, selectionStart: lineStart, selectionEnd: lineStart + block.length };
}

/**
 * 선택 영역을 링크로 감싼다.
 *
 * <p>캐럿을 `href=""` 안에 두는 이유: 링크를 만든 직후의 다음 동작은 언제나 주소 입력이다.
 * 주소를 비운 채로 두면 sanitize 후에도 목적지 없는 `<a>` 가 남으므로 화면이 그 자리를 먼저 묻게 한다.
 */
export function applyLinkTag(value: string, start: number, end: number): EditorEdit {
  const selected = value.slice(start, end);
  const text = selected.length > 0 ? selected : '링크';
  const prefix = '<a href="';
  const caret = start + prefix.length;
  return {
    value: `${value.slice(0, start)}${prefix}">${text}</a>${value.slice(end)}`,
    selectionStart: caret,
    selectionEnd: caret,
  };
}

type EditorTransform = (value: string, start: number, end: number) => EditorEdit;

interface EditorTool {
  key: string;
  label: string;
  icon: React.ReactNode;
  transform: EditorTransform;
}

/**
 * 툴바 정의. 이 배열이 렌더되는 버튼의 단일 원본이다 — 새 버튼을 추가하려면 여기에
 * **동작하는 변환**을 함께 넣어야 한다(변환 없는 항목은 타입상 만들 수 없다).
 */
const TOOLBAR_GROUPS: EditorTool[][] = [
  [
    { key: 'bold', label: '굵게', icon: <Bold size={16} />, transform: (v, s, e) => applyInlineTag(v, s, e, 'strong') },
    { key: 'italic', label: '기울임', icon: <Italic size={16} />, transform: (v, s, e) => applyInlineTag(v, s, e, 'em') },
    { key: 'code', label: '코드', icon: <Code size={16} />, transform: (v, s, e) => applyInlineTag(v, s, e, 'code') },
  ],
  [
    { key: 'bullet', label: '글머리 기호', icon: <List size={16} />, transform: (v, s, e) => applyListTag(v, s, e, 'ul') },
    { key: 'number', label: '번호 매기기', icon: <ListOrdered size={16} />, transform: (v, s, e) => applyListTag(v, s, e, 'ol') },
  ],
  [
    { key: 'link', label: '링크 추가', icon: <Link size={16} />, transform: applyLinkTag },
  ],
];

export function StandardEditor({ value, onChange, placeholder, minHeight = "300px" }: StandardEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 변환 직후의 선택 위치. 값이 부모 state 라 리렌더 뒤에야 복원할 수 있다.
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);

  useEffect(() => {
    const element = textareaRef.current;
    const pending = pendingSelection.current;
    if (!element || !pending) {
      return;
    }
    pendingSelection.current = null;
    element.focus();
    element.setSelectionRange(pending.start, pending.end);
  });

  const runTransform = (transform: EditorTransform) => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }
    const edit = transform(value, element.selectionStart, element.selectionEnd);
    pendingSelection.current = { start: edit.selectionStart, end: edit.selectionEnd };
    onChange(edit.value);
  };

  return (
    <div className="hub-glass-premium rounded-[var(--radius-hub-section)] overflow-hidden bg-card/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all shadow-2xl border-2 border-border/40">
      <div
        className="flex flex-wrap items-center gap-1 p-4 border-b bg-muted/50 backdrop-blur-md"
        role="toolbar"
        aria-label="본문 서식 도구"
      >
        {TOOLBAR_GROUPS.map((group, index) => (
          <div key={group[0].key} className="flex items-center gap-1">
            {index > 0 ? <div className="w-px h-6 bg-border/60 mx-2" aria-hidden="true" /> : null}
            {group.map((tool) => (
              <EditorButton
                key={tool.key}
                onClick={() => runTransform(tool.transform)}
                icon={tool.icon}
                label={tool.label}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Content Area */}
      <div className="relative group">
          <div className="absolute top-4 left-4 pointer-events-none opacity-20 group-focus-within:opacity-0 transition-opacity">
              <Zap size={40} className="text-primary/20" />
          </div>
          <textarea
            ref={textareaRef}
            aria-label="에디터 본문 내용"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "엔터프라이즈 인사이트를 입력하십시오..."}
            style={{ minHeight }}
            className="w-full p-8 resize-none outline-none bg-transparent text-sm font-bold leading-relaxed text-foreground/80 placeholder:text-muted-foreground/30 font-mono tracking-tight"
          />
      </div>

      {/*
        [2026-09-03] 종전 푸터는 초록 점 + 'Ready for Production' 과
        '{길이} _ CHARACTERS_LOGGED' 를 보여 줬다. 그런 상태도, 로깅도 존재하지 않는다.
        대신 사용자가 실제로 알아야 하는 것을 적는다 — 상자 안에 태그가 보이는 이유다.
      */}
      <div className="px-6 py-3 border-t bg-muted/30 flex flex-wrap justify-between items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            본문은 HTML 로 저장됩니다. 서식 버튼은 선택한 글자에 태그를 넣습니다.
          </span>
          <span className="text-xs font-bold text-muted-foreground tabular-nums">
            {value.length.toLocaleString()}자
          </span>
      </div>
    </div>
  );
}

function EditorButton({ onClick, icon, label, className }: {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className={cn(
                "p-2.5 hover:bg-card rounded-lg transition-all hover:shadow-md hover:scale-110 active:scale-95 text-muted-foreground hover:text-primary border border-transparent hover:border-border/40",
                className
            )}
        >
            {icon}
        </button>
    );
}
