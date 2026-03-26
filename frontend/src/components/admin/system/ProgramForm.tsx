'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import {
 Form,
 FormControl,
 FormField,
 FormItem,
 FormLabel,
 FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
 FileCode, 
 Hash, 
 Type, 
 Link as LinkIcon, 
 FolderOpen, 
 Settings2, 
 Plus, 
 Pencil, 
 Save, 
 Trash2 
} from 'lucide-react';
import { ProgrmManage } from '@/types/foundation/system';
import { programAdminService } from '@/services/foundation/system/ProgramAdminService';
import { cn } from '@/lib/utils';

const formSchema = z.object({
 progrmFileNm: z.string().min(1, { message: "프로그램파일명은 필수입니다." }),
 progrmStrePath: z.string().min(1, { message: "저장경로는 필수입니다." }),
 progrmKoreanNm: z.string().min(1, { message: "프로그램한글명은 필수입니다." }),
 progrmDc: z.string().optional(),
 url: z.string().min(1, { message: "URL은 필수입니다." }),
});

interface ProgramFormProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 data?: ProgrmManage;
 onSuccess: () => void;
}

export function ProgramForm({ open, onOpenChange, data, onSuccess }: ProgramFormProps) {
 const isEdit = !!data;
 const form = useForm<z.infer<typeof formSchema>>({
 resolver: zodResolver(formSchema),
 defaultValues: {
 progrmFileNm: data?.progrmFileNm || '',
 progrmStrePath: data?.progrmStrePath || '/',
 progrmKoreanNm: data?.progrmKoreanNm || '',
 progrmDc: data?.progrmDc || '',
 url: data?.url || '/',
 },
 });

 const onSubmit = async (values: z.infer<typeof formSchema>) => {
 try {
 if (isEdit) {
 await programAdminService.updateProgram(data.progrmFileNm!, values as ProgrmManage);
 } else {
 await programAdminService.createProgram(values as ProgrmManage);
 }
 onSuccess();
 onOpenChange(false);
 } catch (error) {
 console.error(error);
 alert('저장 중 오류가 발생했습니다.');
 }
 };

 const handleDelete = async () => {
 if (!data?.progrmFileNm) return;
 if (confirm('정말로 삭제하시겠습니까?')) {
 try {
 await programAdminService.deleteProgram(data.progrmFileNm);
 onSuccess();
 onOpenChange(false);
 } catch (error) {
 console.error(error);
 alert('삭제 중 오류가 발생했습니다.');
 }
 }
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="sm:max-w-[500px] rounded-[3rem] p-10 border-none shadow-2xl bg-white ring-1 ring-slate-100">
 <DialogHeader className="space-y-4">
 <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 mx-auto">
 {isEdit ? <Pencil size={28} /> : <Plus size={28} />}
 </div>
 <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter text-center">
 {isEdit ? '프로그램 로직 수정' : '신규 프로그램 에셋 등록'}
 </DialogTitle>
 <DialogDescription className="text-center font-bold text-slate-400 text-sm">
 인프라스트럭처의 핵심 프로그램을 {isEdit ? '수정' : '정의'}합니다.
 </DialogDescription>
 </DialogHeader>

 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-6">
 <FormField
 control={form.control}
 name="progrmFileNm"
 render={({ field }) => (
 <FormItem className="space-y-3">
 <FormLabel className="text-[10px] font-black text-slate-400 tracking-tight ml-2 flex items-center gap-2">
 <FileCode size={12} className="text-primary" /> 프로그램 파일명
 </FormLabel>
 <FormControl>
 <Input 
 placeholder="파일명.exe 또는 경로" 
 {...field} 
 readOnly={isEdit} 
 className="h-16 px-8 rounded-3xl border-2 border-slate-100 bg-slate-50/50 text-lg font-black focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <div className="grid grid-cols-2 gap-6">
 <FormField
 control={form.control}
 name="progrmKoreanNm"
 render={({ field }) => (
 <FormItem className="space-y-3">
 <FormLabel className="text-[10px] font-black text-slate-400 tracking-tight ml-2 flex items-center gap-2">
 <Type size={12} className="text-primary" /> 프로그램 실명
 </FormLabel>
 <FormControl>
 <Input 
 placeholder="검색용 명칭" 
 {...field} 
 className="h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50/50 font-bold text-sm focus:bg-white transition-all shadow-inner"
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 <FormField
 control={form.control}
 name="url"
 render={({ field }) => (
 <FormItem className="space-y-3">
 <FormLabel className="text-[10px] font-black text-slate-400 tracking-tight ml-2 flex items-center gap-2">
 <LinkIcon size={12} className="text-primary" /> 액세스 엔드포인트
 </FormLabel>
 <FormControl>
 <Input 
 placeholder="/api/v1/..." 
 {...field} 
 className="h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50/50 font-mono text-sm font-bold focus:bg-white transition-all shadow-inner"
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />
 </div>

 <FormField
 control={form.control}
 name="progrmStrePath"
 render={({ field }) => (
 <FormItem className="space-y-3">
 <FormLabel className="text-[10px] font-black text-slate-400 tracking-tight ml-2 flex items-center gap-2">
 <FolderOpen size={12} className="text-primary" /> 물리적 저장 저장소
 </FormLabel>
 <FormControl>
 <Input 
 placeholder="/src/main/resources/..." 
 {...field} 
 className="h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50/50 font-mono text-sm font-bold focus:bg-white transition-all shadow-inner"
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="progrmDc"
 render={({ field }) => (
 <FormItem className="space-y-3">
 <FormLabel className="text-[10px] font-black text-slate-400 tracking-tight ml-2 flex items-center gap-2">
 <Settings2 size={12} className="text-primary" /> 비즈니스 로직 설명
 </FormLabel>
 <FormControl>
 <Input 
 placeholder="프로그램의 역할과 기능을 기술하세요..." 
 {...field} 
 className="h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50/50 font-bold text-sm focus:bg-white transition-all shadow-inner"
 />
 </FormControl>
 <FormMessage />
 </FormItem>
 )}
 />

 <DialogFooter className="pt-6 gap-3 sm:justify-between">
 <div className="flex gap-3 flex-1">
 <Button
 type="button"
 variant="outline"
 onClick={() => onOpenChange(false)}
 className="h-16 px-10 rounded-2xl border-2 border-slate-100 font-black text-sm tracking-tight hover:bg-slate-50 transition-all flex-1"
 >
 취소
 </Button>
 <Button 
 type="submit"
 className="h-16 px-14 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 flex-[2]"
 >
 <Save size={18} />
 시스템 동기화
 </Button>
 </div>
 {isEdit && (
 <Button 
 type="button" 
 variant="ghost" 
 onClick={handleDelete}
 className="h-16 w-16 rounded-2xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm"
 >
 <Trash2 size={24} />
 </Button>
 )}
 </DialogFooter>
 </form>
 </Form>
 </DialogContent>
 </Dialog>
 );
}
