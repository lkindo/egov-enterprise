'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import CharacterCount from '@tiptap/extension-character-count';
import { 
  List, ListOrdered, 
  Heading1, Heading2, Quote, 
  Link as LinkIcon, Image as ImageIcon,
  Undo, Redo, 
  Type, AlignLeft, AlignCenter, AlignRight, AlignJustify
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface RichTextEditorProps extends Pick<
  React.AriaAttributes,
  'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'aria-invalid'
> {
  id?: string;
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

function buildEditableAttributes({
  id,
  placeholder,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  ariaInvalid,
}: {
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: React.AriaAttributes['aria-invalid'];
}): Record<string, string> {
  return {
    class: cn(
      'prose dark:prose-invert prose-slate max-w-none min-h-[400px] outline-none p-10 font-sans text-lg focus:ring-0',
      'prose-headings:font-bold prose-headings:tracking-tighter prose-headings:uppercase',
      'prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:bg-primary/5 prose-blockquote:px-8 prose-blockquote:py-4 prose-blockquote:rounded-r-2xl'
    ),
    role: 'textbox',
    'aria-multiline': 'true',
    ...(id ? { id } : {}),
    ...(placeholder ? { 'aria-placeholder': placeholder } : {}),
    ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
    ...(ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : {}),
    ...(ariaDescribedBy ? { 'aria-describedby': ariaDescribedBy } : {}),
    ...(ariaInvalid !== undefined ? { 'aria-invalid': String(ariaInvalid) } : {}),
  };
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: RichTextEditorProps) {
  const editableAttributes = buildEditableAttributes({
    id,
    placeholder,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
    ariaInvalid,
  });
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline decoration-primary/30 underline-offset-4 cursor-pointer',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      CharacterCount,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: editableAttributes,
    },
  });

  // 외부에서 value가 변경되었을 때 에디터 내용 동기화 (초기 로딩 및 외부 초기화 대응)
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={cn("relative group border-2 border-border/50 rounded-lg bg-card dark:bg-muted/10 overflow-hidden transition-all focus-within:border-primary/20 focus-within:shadow-2xl focus-within:shadow-primary/5", className)}>
      
      {/* --- Top Persistent Toolbar --- */}
      <div
        role="toolbar"
        aria-label="문서 서식 도구"
        className="flex items-center flex-wrap gap-2 p-4 bg-muted dark:bg-muted/20 border-b border-border/50 relative z-20"
      >
        <ToolbarGroup>
          <ToolbarButton label="실행 취소" onClick={() => editor.chain().focus().undo().run()} icon={<Undo size={18} />} />
          <ToolbarButton label="다시 실행" onClick={() => editor.chain().focus().redo().run()} icon={<Redo size={18} />} />
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton 
            label="제목 1"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
            active={editor.isActive('heading', { level: 1 })} 
            icon={<Heading1 size={18} />} 
          />
          <ToolbarButton 
            label="제목 2"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
            active={editor.isActive('heading', { level: 2 })} 
            icon={<Heading2 size={18} />} 
          />
          <ToolbarButton 
            label="본문"
            onClick={() => editor.chain().focus().setParagraph().run()} 
            active={editor.isActive('paragraph')} 
            icon={<Type size={18} />} 
          />
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton 
            label="글머리 기호 목록"
            onClick={() => editor.chain().focus().toggleBulletList().run()} 
            active={editor.isActive('bulletList')} 
            icon={<List size={18} />} 
          />
          <ToolbarButton 
            label="번호 목록"
            onClick={() => editor.chain().focus().toggleOrderedList().run()} 
            active={editor.isActive('orderedList')} 
            icon={<ListOrdered size={18} />} 
          />
          <ToolbarButton 
            label="인용문"
            onClick={() => editor.chain().focus().toggleBlockquote().run()} 
            active={editor.isActive('blockquote')} 
            icon={<Quote size={18} />} 
          />
        </ToolbarGroup>

        <ToolbarDivider />
        
        <ToolbarGroup>
          <ToolbarButton 
            label="왼쪽 정렬"
            onClick={() => editor.chain().focus().setTextAlign('left').run()} 
            active={editor.isActive({ textAlign: 'left' })} 
            icon={<AlignLeft size={18} />} 
          />
          <ToolbarButton 
            label="가운데 정렬"
            onClick={() => editor.chain().focus().setTextAlign('center').run()} 
            active={editor.isActive({ textAlign: 'center' })} 
            icon={<AlignCenter size={18} />} 
          />
          <ToolbarButton 
            label="오른쪽 정렬"
            onClick={() => editor.chain().focus().setTextAlign('right').run()} 
            active={editor.isActive({ textAlign: 'right' })} 
            icon={<AlignRight size={18} />} 
          />
          <ToolbarButton 
            label="양쪽 정렬"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()} 
            active={editor.isActive({ textAlign: 'justify' })} 
            icon={<AlignJustify size={18} />} 
          />
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton label="링크 삽입 (현재 사용할 수 없음)" disabled icon={<LinkIcon size={18} />} />
          <ToolbarButton label="이미지 삽입 (현재 사용할 수 없음)" disabled icon={<ImageIcon size={18} />} />
        </ToolbarGroup>
      </div>

      {/* --- Scrollable Content Area --- */}
      <div className="relative overflow-y-auto max-h-[600px] bg-gradient-to-b from-transparent to-muted/30">
        <EditorContent editor={editor} />
      </div>

      {/* --- Footer Status --- */}
      <div className="px-8 py-4 bg-muted/50 dark:bg-muted/30 border-t border-border/50 flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">서식 있는 텍스트 편집기</span>
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
          {editor.storage.characterCount?.words?.() || 0}단어
        </div>
      </div>
    </div>
  );
}

// --- Internal Helper Components ---

interface ToolbarButtonProps {
  label: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  icon: React.ReactNode;
  className?: string;
}

function ToolbarButton({ label, onClick, active, disabled = false, icon, className }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      title={label}
      className={cn(
        "w-10 h-10 p-0 rounded-lg transition-all duration-300",
        active 
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110"
          : "hover:bg-primary/10 hover:text-primary text-muted-foreground",
        className
      )}
    >
      {icon}
    </Button>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1.5 p-1 bg-card dark:bg-muted/40 rounded-lg border border-border/40 shadow-sm">{children}</div>;
}

function ToolbarDivider() {
  return <div className="w-[1px] h-6 bg-border/60 mx-1 hidden sm:block" />;
}
