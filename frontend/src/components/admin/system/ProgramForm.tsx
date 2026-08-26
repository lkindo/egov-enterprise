'use client';

import { useRef, useState } from 'react';
import { useAppForm } from '@/hooks/useAppForm';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormErrorSummary,
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
  Loader2,
  Trash2 
} from 'lucide-react';
import { ProgrmManage } from '@/types/foundation/system';
import { programAdminService } from '@/services/foundation/system/ProgramAdminService';
import { toast } from 'sonner';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { ProgramDtoSchema } from '@/types/generated-zod';

export const programFormSchema = ProgramDtoSchema.extend({
  prgrmFileNm: ProgramDtoSchema.shape.prgrmFileNm.unwrap().min(1),
  prgrmStrgPath: ProgramDtoSchema.shape.prgrmStrgPath.unwrap().min(1),
  prgrmKornNm: ProgramDtoSchema.shape.prgrmKornNm.unwrap().min(1),
  url: ProgramDtoSchema.shape.url.unwrap().min(1),
});

type ProgramFormValues = z.infer<typeof programFormSchema>;

interface ProgramFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: ProgrmManage;
  onSuccess: () => void;
  onWritePendingChange?: (pending: boolean) => void;
}

export function ProgramForm({ onOpenChange, data, onSuccess, onWritePendingChange }: ProgramFormProps) {
  const isEdit = !!data;
  const confirm = useConfirm();
  const writePendingRef = useRef(false);
  const submitAttemptRef = useRef(false);
  const submitLock = useRef(false);
  const deletePendingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useAppForm(programFormSchema, {
    defaultValues: {
      prgrmFileNm: data?.prgrmFileNm || '',
      prgrmStrgPath: data?.prgrmStrgPath || '/',
      prgrmKornNm: data?.prgrmKornNm || '',
      prgrmExpln: data?.prgrmExpln || '',
      url: data?.url || '/',
    },
  });
  const { isSubmitting } = form.formState;
  const isWritePending = isSubmitting || isSaving || isDeleting;
  const setWritePending = (pending: boolean) => {
    writePendingRef.current = pending;
    onWritePendingChange?.(pending);
  };

  const onSubmit = async (values: ProgramFormValues) => {
    if (submitLock.current || deletePendingRef.current) return;
    submitLock.current = true;
    setIsSaving(true);
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
      if (!form.applyServerErrors(error)) {
        toast.error('저장 중 오류가 발생했습니다.');
      }
    } finally {
      submitLock.current = false;
      submitAttemptRef.current = false;
      setWritePending(false);
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!data?.prgrmFileNm || submitAttemptRef.current || submitLock.current
      || deletePendingRef.current || writePendingRef.current) return;
    deletePendingRef.current = true;
    setWritePending(true);
    const programId = data.prgrmFileNm;
    setIsDeleting(true);

    try {
      const ok = await confirm({
        title: '프로그램 영구 삭제',
        message: '해당 프로그램 명세가 시스템에서 영구적으로 제거됩니다. 정말로 진행하시겠습니까?',
        variant: 'destructive'
      });

      if (!ok) return;

      await programAdminService.deleteProgram(programId);
      toast.success('프로그램이 삭제되었습니다.');
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.');
    } finally {
      deletePendingRef.current = false;
      setWritePending(false);
      setIsDeleting(false);
    }
  };

  const requestClose = () => {
    if (submitAttemptRef.current || submitLock.current
      || deletePendingRef.current || writePendingRef.current) return;
    onOpenChange(false);
  };

  const submitProgramForm = (event?: React.BaseSyntheticEvent) => {
    if (submitAttemptRef.current || submitLock.current
      || deletePendingRef.current || writePendingRef.current) {
      event?.preventDefault();
      return;
    }
    submitAttemptRef.current = true;
    setWritePending(true);
    const submit = form.handleSubmit(onSubmit, () => {
      submitAttemptRef.current = false;
      setWritePending(false);
    });
    void submit(event).catch(() => {
      submitAttemptRef.current = false;
      submitLock.current = false;
      setWritePending(false);
      setIsSaving(false);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-4 bg-muted border border-border rounded-xl">
        <div className="w-10 h-10 bg-surface-inverse text-surface-inverse-foreground rounded-lg flex items-center justify-center shadow-lg">
          {isEdit ? <Pencil size={18} /> : <Plus size={18} />}
        </div>
        <div className="text-left">
          <h4 className="text-sm font-bold text-foreground leading-none">{isEdit ? '프로그램 로직 수정' : '신규 프로그램 에셋 등록'}</h4>
          <p className="text-xs font-bold text-muted-foreground mt-1.5">인프라스트럭처의 핵심 프로그램 기능을 {isEdit ? '수정' : '정의'}합니다</p>
        </div>
      </div>

      <Form {...form}>
        <form noValidate onSubmit={submitProgramForm} className="space-y-6">
          <FormErrorSummary
            labels={{
              prgrmFileNm: '프로그램 파일명',
              prgrmKornNm: '프로그램 설명',
              url: '접근 엔드포인트',
              prgrmStrgPath: '물리 저장소 위치',
              prgrmExpln: '비즈니스 로직 설명',
            }}
            onNavigate={form.focusError}
          />
          <FormField
            control={form.control}
            name="prgrmFileNm"
            required
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
                    maxLength={100}
                    className="h-11 px-8 rounded-lg border-2 border-border bg-muted/50 text-lg font-bold focus:bg-card focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
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
              required
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-tight ml-2 flex items-center gap-2">
                    <Type size={12} className="text-primary" /> 프로그램 설명
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="프로그램명" 
                      {...field} 
                      maxLength={100}
                      className="h-11 px-6 rounded-lg border-2 border-border bg-muted/50 font-bold text-sm focus:bg-card transition-all shadow-inner"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              required
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-xs font-bold text-muted-foreground tracking-tight ml-2 flex items-center gap-2">
                    <LinkIcon size={12} className="text-primary" /> 접근 엔드포인트
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="URL" 
                      {...field} 
                      maxLength={1000}
                      className="h-11 px-6 rounded-lg border-2 border-border bg-muted/50 font-mono text-sm font-bold focus:bg-card transition-all shadow-inner"
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
            required
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-xs font-bold text-muted-foreground tracking-tight ml-2 flex items-center gap-2">
                  <FolderOpen size={12} className="text-primary" /> 물리 저장소 위치
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="저장경로"
                    {...field}
                    maxLength={1000}
                    className="h-11 px-6 rounded-lg border-2 border-border bg-muted/50 font-mono text-sm font-bold focus:bg-card transition-all shadow-inner"
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
                    maxLength={4000}
                    className="h-11 px-6 rounded-lg border-2 border-border bg-muted/50 font-bold text-sm focus:bg-card transition-all shadow-inner"
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
              onClick={requestClose}
              disabled={isWritePending}
              className="h-11 px-10 rounded-lg border border-border text-muted-foreground font-bold text-sm tracking-tight hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all flex-1"
            >
              취소
            </Button>
            <Button 
              type="submit"
              disabled={isWritePending}
              aria-busy={isSaving || isSubmitting || undefined}
              className="h-11 px-14 bg-surface-inverse text-surface-inverse-foreground rounded-lg font-bold text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 flex-[2]"
            >
              <Save size={18} />
              {isSaving || isSubmitting ? '동기화 중…' : '시스템 동기화'}
            </Button>
            {isEdit && (
              <Button 
                type="button" 
                variant="ghost" 
                onClick={handleDelete}
                aria-label={isDeleting ? '프로그램 삭제 중…' : '프로그램 삭제'}
                aria-busy={isDeleting || undefined}
                disabled={isWritePending}
                className="h-11 w-12 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center p-0"
              >
                {isDeleting
                  ? <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                  : <Trash2 size={20} aria-hidden="true" />}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
