'use client';

import React from 'react';
import { useAppForm } from '@/hooks/useAppForm';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
;
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
import { toast } from 'sonner';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { ProgramDtoSchema } from '@/types/generated-zod';

const formSchema = ProgramDtoSchema.extend({
  prgrmFileNm: z.string().min(1),
  prgrmStrgPath: z.string().min(1),
  prgrmKornNm: z.string().min(1),
  url: z.string().min(1),
});

type ProgramFormValues = z.infer<typeof formSchema>;

interface ProgramFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: ProgrmManage;
  onSuccess: () => void;
}

export function ProgramForm({ open, onOpenChange, data, onSuccess }: ProgramFormProps) {
  const isEdit = !!data;
  const confirm = useConfirm();

  const form = useAppForm(formSchema, {
    defaultValues: {
      prgrmFileNm: data?.prgrmFileNm || '',
      prgrmStrgPath: data?.prgrmStrgPath || '/',
      prgrmKornNm: data?.prgrmKornNm || '',
      prgrmExpln: data?.prgrmExpln || '',
      url: data?.url || '/',
    },
  });

  const onSubmit = async (values: ProgramFormValues) => {
    try {
      if (isEdit) {
        await programAdminService.updateProgram(data.prgrmFileNm!, values as ProgrmManage);
        toast.success('프로그램 정보가 수정되었습니다.');
      } else {
        await programAdminService.createProgram(values as ProgrmManage);
        toast.success('신규 프로그램이 등록되었습니다.');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!data?.prgrmFileNm) return;
    
    const ok = await confirm({
      title: '프로그램 영구 삭제',
      message: '해당 프로그램 명세가 시스템에서 영구적으로 제거됩니다. 정말로 진행하시겠습니까?',
      variant: 'destructive'
    });

    if (ok) {
      try {
        await programAdminService.deleteProgram(data.prgrmFileNm);
        toast.success('프로그램이 삭제되었습니다.');
        onSuccess();
        onOpenChange(false);
      } catch (error) {
        console.error(error);
        toast.error('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-4 bg-muted border border-border rounded-xl">
        <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg">
          {isEdit ? <Pencil size={18} /> : <Plus size={18} />}
        </div>
        <div className="text-left">
          <h4 className="text-sm font-bold text-foreground leading-none">{isEdit ? '프로그램 로직 수정' : '신규 프로그램 에셋 등록'}</h4>
          <p className="text-xs font-bold text-muted-foreground mt-1.5">인프라스트럭처의 핵심 프로그램 기능을 {isEdit ? '수정' : '정의'}합니다</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="prgrmFileNm"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-xs font-bold text-muted-foreground tracking-tight ml-2 flex items-center gap-2">
                  <FileCode size={12} className="text-primary" /> 프로그램 파일명
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="프로그램파일명" 
                    {...field} 
                    readOnly={isEdit} 
                    className="h-11 px-8 rounded-lg border-2 border-border bg-muted/50 text-lg font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="prgrmKornNm"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-tight ml-2 flex items-center gap-2">
                    <Type size={12} className="text-primary" /> 프로그램 설명
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="프로그램명" 
                      {...field} 
                      className="h-11 px-6 rounded-lg border-2 border-border bg-muted/50 font-bold text-sm focus:bg-white transition-all shadow-inner"
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
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-tight ml-2 flex items-center gap-2">
                    <LinkIcon size={12} className="text-primary" /> 접근 엔드포인트
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="URL" 
                      {...field} 
                      className="h-11 px-6 rounded-lg border-2 border-border bg-muted/50 font-mono text-sm font-bold focus:bg-white transition-all shadow-inner"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="prgrmStrgPath"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-xs font-bold text-muted-foreground tracking-tight ml-2 flex items-center gap-2">
                  <FolderOpen size={12} className="text-primary" /> 물리 저장소 위치
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="저장경로" 
                    {...field} 
                    className="h-11 px-6 rounded-lg border-2 border-border bg-muted/50 font-mono text-sm font-bold focus:bg-white transition-all shadow-inner"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="prgrmExpln"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-xs font-bold text-muted-foreground tracking-tight ml-2 flex items-center gap-2">
                  <Settings2 size={12} className="text-primary" /> 비즈니스 로직 설명
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="프로그램이 제공할 기능의 기술적 명세.." 
                    {...field} 
                    className="h-11 px-6 rounded-lg border-2 border-border bg-muted/50 font-bold text-sm focus:bg-white transition-all shadow-inner"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 px-10 rounded-lg border border-border text-muted-foreground font-bold text-sm tracking-tight hover:bg-slate-900 hover:text-white transition-all flex-1"
            >
              취소
            </Button>
            <Button 
              type="submit"
              className="h-11 px-14 bg-slate-900 text-white rounded-lg font-bold text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 flex-[2]"
            >
              <Save size={18} />
              시스템 동기화
            </Button>
            {isEdit && (
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleDelete}
                className="h-11 w-12 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center p-0"
              >
                <Trash2 size={20} />
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
