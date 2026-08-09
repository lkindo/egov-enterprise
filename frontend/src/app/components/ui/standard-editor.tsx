import { useRef } from 'react';
import {
  Bold, Italic, List, ListOrdered, Link,
  Image as ImageIcon, AlignLeft, AlignCenter, AlignRight,
  Zap, Code, Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StandardEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function StandardEditor({ value, onChange, placeholder, minHeight = "300px" }: StandardEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyStyle = (tag: string) => {
    console.log(`Applying style: ${tag}`);
  };

  return (
    <div className="hub-glass-premium rounded-[var(--radius-hub-section)] overflow-hidden bg-card/50 focus-within:ring-4 focus-within:ring-primary/5 transition-all shadow-2xl border-2 border-border/40">
      {/* Premium Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-4 border-b bg-muted/50 backdrop-blur-md">
        <div className="flex items-center gap-1 bg-white/50 dark:bg-black/20 p-1 rounded-lg border border-border/40">
            <EditorButton onClick={() => applyStyle('bold')} icon={<Bold size={16} />} label="Bold" />
            <EditorButton onClick={() => applyStyle('italic')} icon={<Italic size={16} />} label="Italic" />
            <EditorButton onClick={() => applyStyle('code')} icon={<Code size={16} />} label="Code" />
        </div>
        
        <div className="w-px h-6 bg-border/60 mx-2" />
        
        <div className="flex items-center gap-1">
            <EditorButton onClick={() => applyStyle('bullet')} icon={<List size={16} />} label="글머리 기호" />
            <EditorButton onClick={() => applyStyle('number')} icon={<ListOrdered size={16} />} label="번호 매기기" />
        </div>
        
        <div className="w-px h-6 bg-border/60 mx-2" />
        
        <div className="flex items-center gap-1">
            <EditorButton onClick={() => applyStyle('link')} icon={<Link size={16} />} label="링크 추가" />
            <EditorButton onClick={() => applyStyle('image')} icon={<ImageIcon size={16} />} label="이미지 추가" />
        </div>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-1 bg-white/50 dark:bg-black/20 p-1 rounded-lg border border-border/40">
            <EditorButton onClick={() => applyStyle('left')} icon={<AlignLeft size={16} />} label="왼쪽 정렬" />
            <EditorButton onClick={() => applyStyle('center')} icon={<AlignCenter size={16} />} label="중앙 정렬" />
            <EditorButton onClick={() => applyStyle('right')} icon={<AlignRight size={16} />} label="오른쪽 정렬" />
        </div>
        
        <div className="w-px h-6 bg-border/60 mx-2" />
        <EditorButton onClick={() => applyStyle('full')} icon={<Maximize2 size={16} />} label="전체 화면" className="text-primary" />
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

      {/* Status Footer */}
      <div className="px-6 py-3 border-t bg-muted/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">
                Ready for Production
              </span>
          </div>
          <div className="text-xs font-bold text-muted-foreground tracking-widest uppercase">
            {value.length} _ CHARACTERS_LOGGED
          </div>
      </div>
    </div>
  );
}

function EditorButton({ onClick, icon, label, className }: any) {
    return (
        <button 
            type="button" 
            onClick={onClick} 
            title={label}
            aria-label={label || "에디터 도구"}
            className={cn(
                "p-2.5 hover:bg-card rounded-lg transition-all hover:shadow-md hover:scale-110 active:scale-95 text-muted-foreground hover:text-primary border border-transparent hover:border-border/40",
                className
            )}
        >
            {icon}
        </button>
    );
}
