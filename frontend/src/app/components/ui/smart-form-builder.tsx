'use client';

import React, { useState, useMemo } from 'react';
import {
 Plus,
 GripVertical,
 Trash2,
 Settings,
 Eye,
 Save,
 Type,
 Hash,
 Calendar as CalendarIcon,
 CheckSquare,
 List,
 Sparkles,
 ChevronRight,
 Monitor,
 Smartphone,
 Info
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea';

export interface FormField {
 id: string;
 type: FieldType;
 label: string;
 placeholder?: string;
 required?: boolean;
 options?: string[];
 width: 'full' | 'half';
}

export interface FormSchema {
 title: string;
 description: string;
 fields: FormField[];
}

export function SmartFormBuilder() {
 const [schema, setSchema] = useState<FormSchema>({
 title: "신규 행정 서식",
 description: "업무 지시 및 보고를 위한 표준 서식입니다.",
 fields: [
 { id: 'f1', type: 'text', label: '제목', placeholder: '안건 제목을 입력하세요', required: true, width: 'full' },
 { id: 'f2', type: 'date', label: '기한', required: true, width: 'half' },
 { id: 'f3', type: 'select', label: '중요도', options: ['긴급', '보통', '참조'], width: 'half' }
 ]
 });

 const [selectedField, setSelectedField] = useState<string | null>(null);
 const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

 const addField = (type: FieldType) => {
 const newField: FormField = {
 id: `f-${Date.now()}`,
 type,
 label: `새로운 ${type} 필드`,
 placeholder: '내용을 입력해주세요',
 width: 'full'
 };
 setSchema(prev => ({ ...prev, fields: [...prev.fields, newField] }));
 setSelectedField(newField.id);
 };

 const removeField = (id: string) => {
 setSchema(prev => ({ ...prev, fields: prev.fields.filter(f => f.id !== id) }));
 if (selectedField === id) setSelectedField(null);
 };

 const updateField = (id: string, updates: Partial<FormField>) => {
 setSchema(prev => ({
 ...prev,
 fields: prev.fields.map(f => f.id === id ? { ...f, ...updates } : f)
 }));
 };

 const activeField = useMemo(() =>
 schema.fields.find(f => f.id === selectedField),
 [schema.fields, selectedField]
 );

 return (
 <div className="flex flex-col gap-8 h-[calc(100vh-12rem)] animate-in fade-in duration-700">
 {/* Top Controller */}
 <div className="flex items-center justify-between bg-white dark:bg-slate-900 border-2 border-primary/5 p-6 rounded-[2.5rem] shadow-xl">
 <div className="flex items-center gap-5">
 <div className="p-3 bg-primary/10 rounded-2xl text-primary animate-pulse">
 <Sparkles size={24} />
 </div>
 <div>
 <h2 className="text-xl font-black tracking-tight text-foreground ">{schema.title}</h2>
 <p className="text-[10px] font-black text-muted-foreground tracking-tight opacity-50">비주얼 폼 엔진 v1.0</p>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <div className="bg-muted/50 p-1 rounded-xl flex gap-1 border border-primary/5">
 <Button
 variant={previewMode === 'desktop' ? "secondary" : "ghost"}
 size="sm"
 onClick={() => setPreviewMode('desktop')}
 className="rounded-lg h-9 w-9 p-0"
 >
 <Monitor size={16} />
 </Button>
 <Button
 variant={previewMode === 'mobile' ? "secondary" : "ghost"}
 size="sm"
 onClick={() => setPreviewMode('mobile')}
 className="rounded-lg h-9 w-9 p-0"
 >
 <Smartphone size={16} />
 </Button>
 </div>
 <div className="h-6 w-px bg-muted mx-2" />
 <Button variant="outline" className="rounded-xl font-bold h-11 px-6 border-2 hover:bg-primary/5 gap-2">
 <Eye size={18} /> 프리뷰
 </Button>
 <Button className="rounded-xl font-black h-11 px-8 shadow-xl shadow-primary/20 gap-2">
 <Save size={18} /> 서식 저장
 </Button>
 </div>
 </div>

 <div className="flex gap-8 flex-1 min-h-0">
 {/* Left Toolbar: Elements */}
 <div className="w-72 bg-white dark:bg-slate-900 border border-primary/5 rounded-[3rem] p-8 flex flex-col gap-8">
 <div className="space-y-4">
 <h3 className="text-[10px] font-black text-muted-foreground tracking-[0.2em] px-2 flex items-center gap-2">
 <Plus size={12} /> UI Components
 </h3>
 <div className="grid grid-cols-1 gap-2">
 {[
 { type: 'text', icon: <Type size={16} />, label: '텍스트 입력' },
 { type: 'textarea', icon: <List size={16} />, label: '긴 문장 입력' },
 { type: 'number', icon: <Hash size={16} />, label: '숫자 입력' },
 { type: 'date', icon: <CalendarIcon size={16} />, label: '날짜 선택' },
 { type: 'select', icon: <ChevronRight size={16} />, label: '드롭다운' },
 { type: 'checkbox', icon: <CheckSquare size={16} />, label: '체크박스' },
 ].map((tool) => (
 <button
 key={tool.type}
 onClick={() => addField(tool.type as FieldType)}
 className="flex items-center gap-3 p-4 bg-muted/30 hover:bg-primary/10 hover:text-primary rounded-2xl transition-all font-bold text-sm border border-transparent hover:border-primary/20 group"
 >
 <div className="p-2 bg-background rounded-xl shadow-sm group-hover:scale-110 transition-transform">{tool.icon}</div>
 {tool.label}
 </button>
 ))}
 </div>
 </div>

 <div className="mt-auto p-5 bg-primary/5 rounded-[2rem] border border-primary/10">
 <div className="flex items-center gap-2 mb-2 text-primary">
 <Info size={14} />
 <span className="text-[10px] font-black ">프로 팁</span>
 </div>
 <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
 필드를 클릭하여 속성을 편집하고, 드래그하여 순서를 변경할 수 있습니다.
 </p>
 </div>
 </div>

 {/* Center: Canvas */}
 <div className="flex-1 flex flex-col items-center overflow-y-auto custom-scrollbar bg-slate-100 dark:bg-slate-800 rounded-[3rem] border-2 border-dashed border-primary/10 p-10">
 <div className={cn(
 "bg-background shadow-2xl transition-all duration-700 overflow-hidden relative",
 previewMode === 'desktop' ? "w-full max-w-3xl rounded-[3rem] p-12" : "w-[375px] rounded-[3.5rem] border-[8px] border-slate-900 p-8 pt-16 min-h-[667px]"
 )}>
 {previewMode === 'mobile' ? <div className="absolute top-6 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-900 rounded-full" /> : null}

 <div className="space-y-2 mb-10 text-center">
 <h1 className="text-3xl font-black tracking-tight">{schema.title}</h1>
 <p className="text-sm text-muted-foreground font-medium">{schema.description}</p>
 <div className="w-12 h-1 bg-primary/30 mx-auto mt-4 rounded-full" />
 </div>

 <div className="grid grid-cols-2 gap-x-6 gap-y-8">
 {schema.fields.map((field) => (
 <div
 key={field.id}
 onClick={() => setSelectedField(field.id)}
 className={cn(
 "group relative p-6 rounded-3xl border-2 transition-all cursor-pointer",
 field.width === 'full' ? "col-span-2" : "col-span-1",
 selectedField === field.id ? "border-primary bg-primary/[0.02] shadow-lg shadow-primary/5" : "border-transparent hover:border-primary/20 hover:bg-muted/30"
 )}
 >
 <div className="flex items-center justify-between mb-3">
 <label className="text-[11px] font-black text-muted-foreground tracking-tight">
 {field.label} {field.required ? <span className="text-destructive">*</span> : null}
 </label>
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <div className="p-1.5 bg-background border rounded-lg text-muted-foreground hover:text-primary"><GripVertical size={12} /></div>
 <div
 onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
 className="p-1.5 bg-background border rounded-lg text-muted-foreground hover:text-destructive"
 ><Trash2 size={12} /></div>
 </div>
 </div>

 <div className="h-12 bg-muted/50 rounded-xl border border-primary/5 px-4 flex items-center text-sm text-muted-foreground/40 font-medium">
 {field.placeholder || `${field.label} 내용을 입력하세요`}
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Right Panel: Properties */}
 <div className="w-80 bg-white dark:bg-slate-900 border border-primary/5 rounded-[3.5rem] p-8 flex flex-col gap-6 shadow-2xl">
 <div className="flex items-center gap-3 mb-4">
 <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><Settings size={18} /></div>
 <h3 className="text-sm font-black tracking-tight">속성</h3>
 </div>

 {activeField ? (
 <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-muted-foreground px-1">라벨 이름</label>
 <Input
 value={activeField.label}
 onChange={(e) => updateField(activeField.id, { label: e.target.value })}
 className="rounded-2xl h-12 font-bold border-2 border-primary/5"
 />
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-muted-foreground px-1">플레이스홀더</label>
 <Input
 value={activeField.placeholder || ''}
 onChange={(e) => updateField(activeField.id, { placeholder: e.target.value })}
 className="rounded-2xl h-11 text-sm border-2 border-primary/5"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-muted-foreground px-1">너비</label>
 <div className="bg-muted/50 p-1 rounded-xl flex gap-1 border border-primary/5">
 <button
 onClick={() => updateField(activeField.id, { width: 'half' })}
 className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all", activeField.width === 'half' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
 >절반</button>
 <button
 onClick={() => updateField(activeField.id, { width: 'full' })}
 className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all", activeField.width === 'full' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
 >전체</button>
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-muted-foreground px-1">필수</label>
 <div
 onClick={() => updateField(activeField.id, { required: !activeField.required })}
 className={cn(
 "h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all border-2",
 activeField.required ? "bg-primary border-primary text-white" : "bg-muted/30 border-transparent text-muted-foreground font-black text-[10px]"
 )}
 >
 {activeField.required ? <CheckSquare size={16} /> : "OPTIONAL"}
 </div>
 </div>
 </div>

 {activeField.type === 'select' && (
 <div className="space-y-3 pt-4 border-t border-primary/5">
 <label className="text-[10px] font-black text-muted-foreground px-1">옵션</label>
 {(activeField.options || []).map((opt, idx) => (
 <div key={`opt-${idx}`} className="flex gap-2">
 <Input
 value={opt}
 onChange={(e) => {
 const newOpts = [...(activeField.options || [])];
 newOpts[idx] = e.target.value;
 updateField(activeField.id, { options: newOpts });
 }}
 className="rounded-xl h-10 text-sm font-bold"
 />
 <Button
 variant="ghost" size="icon" className="h-10 w-10 text-destructive"
 onClick={() => {
 const newOpts = (activeField.options || []).filter((_, i) => i !== idx);
 updateField(activeField.id, { options: newOpts });
 }}
 ><Trash2 size={14} /></Button>
 </div>
 ))}
 <Button
 variant="outline" size="sm" className="w-full rounded-xl border-dashed py-5 border-2"
 onClick={() => updateField(activeField.id, { options: [...(activeField.options || []), 'New Option'] })}
 >+ 속성 추가</Button>
 </div>
 )}
 </div>
 ) : (
 <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
 <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center text-muted-foreground mb-4">
 <Info size={24} />
 </div>
 <h4 className="text-sm font-black tracking-tight text-muted-foreground/60 mb-2">선택된 필드 없음</h4>
 <p className="text-[10px] font-medium text-muted-foreground/40 leading-relaxed">
 캔버스의 필드를 선택하여 상세 속성을 편집하세요.
 </p>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
