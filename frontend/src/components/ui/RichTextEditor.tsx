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

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
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
    immediatelyRender: false, // SSR Hydration ㅻ쪟 諛⑹瑜님꾪빐 ?꾩닔 ㅼ젙
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose dark:prose-invert prose-slate max-w-none min-h-[400px] outline-none p-10 font-sans text-lg focus:ring-0',
          'prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase',
          'prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:bg-primary/5 prose-blockquote:px-8 prose-blockquote:py-4 prose-blockquote:rounded-r-2xl'
        ),
      },
    },
  });

  if (!mounted || !editor) return null;

  return (
    <div className={cn("relative group border-2 border-border/50 rounded-[2.5rem] bg-white dark:bg-muted/10 overflow-hidden transition-all focus-within:border-primary/20 focus-within:shadow-2xl focus-within:shadow-primary/5", className)}>
      
      {/* --- Floating Bubble Menu Disabled for Build Stability --- */}
      {/* 
      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <div className="flex items-center gap-1 p-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl">
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBold().run()} 
            active={editor.isActive('bold')} 
            icon={<Bold size={16} />} 
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleItalic().run()} 
            active={editor.isActive('italic')} 
            icon={<Italic size={16} />} 
          />
          <div className="w-[1px] h-4 bg-white/10 mx-1" />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
            active={editor.isActive('heading', { level: 1 })} 
            icon={<Heading1 size={16} />} 
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleCode().run()} 
            active={editor.isActive('code')} 
            icon={<Code size={16} />} 
          />
        </div>
      </BubbleMenu>
      */}

      {/* --- Top Persistent Toolbar --- */}
      <div className="flex items-center flex-wrap gap-2 p-4 bg-slate-50 dark:bg-muted/20 border-b border-border/50 relative z-20">
        <ToolbarGroup>
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} icon={<Undo size={18} />} />
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} icon={<Redo size={18} />} />
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
            active={editor.isActive('heading', { level: 1 })} 
            icon={<Heading1 size={18} />} 
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
            active={editor.isActive('heading', { level: 2 })} 
            icon={<Heading2 size={18} />} 
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().setParagraph().run()} 
            active={editor.isActive('paragraph')} 
            icon={<Type size={18} />} 
          />
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBulletList().run()} 
            active={editor.isActive('bulletList')} 
            icon={<List size={18} />} 
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleOrderedList().run()} 
            active={editor.isActive('orderedList')} 
            icon={<ListOrdered size={18} />} 
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().toggleBlockquote().run()} 
            active={editor.isActive('blockquote')} 
            icon={<Quote size={18} />} 
          />
        </ToolbarGroup>

        <ToolbarDivider />
        
        <ToolbarGroup>
          <ToolbarButton 
            onClick={() => editor.chain().focus().setTextAlign('left').run()} 
            active={editor.isActive({ textAlign: 'left' })} 
            icon={<AlignLeft size={18} />} 
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().setTextAlign('center').run()} 
            active={editor.isActive({ textAlign: 'center' })} 
            icon={<AlignCenter size={18} />} 
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().setTextAlign('right').run()} 
            active={editor.isActive({ textAlign: 'right' })} 
            icon={<AlignRight size={18} />} 
          />
          <ToolbarButton 
            onClick={() => editor.chain().focus().setTextAlign('justify').run()} 
            active={editor.isActive({ textAlign: 'justify' })} 
            icon={<AlignJustify size={18} />} 
          />
        </ToolbarGroup>

        <ToolbarDivider />

        <ToolbarGroup>
          <ToolbarButton onClick={() => {}} icon={<LinkIcon size={18} />} />
          <ToolbarButton onClick={() => {}} icon={<ImageIcon size={18} />} />
        </ToolbarGroup>
      </div>

      {/* --- Scrollable Content Area --- */}
      <div className="relative overflow-y-auto max-h-[600px] bg-gradient-to-b from-transparent to-slate-50/30">
        <EditorContent editor={editor} />
      </div>

      {/* --- Footer Status --- */}
      <div className="px-8 py-4 bg-slate-50/50 dark:bg-muted/30 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase">紐⑤뱶: 由ъ튂 ?띿뒪님?먮뵒님v1.0</span>
          <span className="text-[10px] font-black tracking-widest text-primary uppercase bg-primary/5 px-2 py-0.5 rounded leading-none">?묒꽦 이용 실시간숆린님중..</span>
        </div>
        <div className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest whitespace-nowrap">
          {editor.storage.characterCount?.words?.() || 0} ⑥뼱 님怨좏뭹吏님щ㎎님        </div>
      </div>
    </div>
  );
}

// --- Internal Helper Components ---

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  icon: React.ReactNode;
  className?: string;
}

function ToolbarButton({ onClick, active, icon, className }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "w-10 h-10 p-0 rounded-xl transition-all duration-300",
        active 
          ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" 
          : "hover:bg-primary/10 hover:text-primary text-muted-foreground",
        className
      )}
    >
      {icon}
    </Button>
  );
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-muted/40 rounded-2xl border border-border/40 shadow-sm">{children}</div>;
}

function ToolbarDivider() {
  return <div className="w-[1px] h-6 bg-border/60 mx-1 hidden sm:block" />;
}
