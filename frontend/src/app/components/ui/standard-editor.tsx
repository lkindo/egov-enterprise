
import React, { useRef } from 'react';
import {
  Bold, Italic, List, ListOrdered, Link,
  Image as ImageIcon, AlignLeft, AlignCenter, AlignRight
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
    // ㅼ젣 ?먮뵒님?쇱씠釉뚮윭由TipTap 님 ?곕룞 님 ?쒓컖님?쇨님깆쓣 ?꾪븳 Placeholder 濡쒖쭅
    console.log(`Applying style: ${tag}`);
  };

  return (
    <div className="border rounded-[0.1rem] overflow-hidden bg-card focus-within:ring-2 focus-within:ring-primary/20 transition shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/20">
        <button type="button" onClick={() => applyStyle('bold')} className="p-2 hover:bg-accent rounded-md"><Bold size={18} /></button>
        <button type="button" onClick={() => applyStyle('italic')} className="p-2 hover:bg-accent rounded-md"><Italic size={18} /></button>
 <div className="w-px h-6 bg-border mx-1" />
 <button type="button" onClick={() => applyStyle('bullet')} className="p-2 hover:bg-accent rounded-md"><List size={18} /></button>
 <button type="button" onClick={() => applyStyle('number')} className="p-2 hover:bg-accent rounded-md"><ListOrdered size={18} /></button>
 <div className="w-px h-6 bg-border mx-1" />
 <button type="button" onClick={() => applyStyle('link')} className="p-2 hover:bg-accent rounded-md"><Link size={18} /></button>
 <button type="button" onClick={() => applyStyle('image')} className="p-2 hover:bg-accent rounded-md"><ImageIcon size={18} /></button>
 <div className="flex-1" />
 <button type="button" onClick={() => applyStyle('left')} className="p-2 hover:bg-accent rounded-md"><AlignLeft size={18} /></button>
 <button type="button" onClick={() => applyStyle('center')} className="p-2 hover:bg-accent rounded-md"><AlignCenter size={18} /></button>
 <button type="button" onClick={() => applyStyle('right')} className="p-2 hover:bg-accent rounded-md"><AlignRight size={18} /></button>
 </div>

 {/* Content Area */}
 <textarea
 ref={textareaRef}
 value={value}
 onChange={(e) => onChange(e.target.value)}
 placeholder={placeholder || "이용님입력하세요.."}
 style={{ minHeight }}
 className="w-full p-4 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 bg-transparent text-sm leading-relaxed"
 />

 {/* Word Count / Info */}
 <div className="px-4 py-2 border-t bg-muted/5 text-[10px] text-muted-foreground flex justify-end">
 {value.length} 님?낅젰님 </div>
 </div>
 );
}
