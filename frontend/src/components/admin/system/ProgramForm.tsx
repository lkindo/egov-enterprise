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
  Save,
  Loader2,
  Trash2
} from 'lucide-react';
import { ProgrmManage } from '@/types/foundation/system';
import { programAdminService } from '@/services/foundation/system/ProgramAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { failureMessage } from '@/lib/safe-error-log';
import { ProgramDtoSchema } from '@/types/generated-zod';

export const programFormSchema = ProgramDtoSchema.extend({
  prgrmFileNm: ProgramDtoSchema.shape.prgrmFileNm.min(1),
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
  /** 삭제 권한(PROGRAM_DELETE)이 없으면 수정 폼에 삭제 버튼을 두지 않는다 — 여는 화면이 권한을 판정해 넘긴다. */
  deletable?: boolean;
  /**
   * 삭제 확인에 붙일 연결 메뉴 안내. 여는 화면이 연결 메뉴를 알면 메뉴 수·이름을 넘긴다
   * (서버가 409 로 거부할 것을 화면이 이미 아는데 일반 문구만 보이지 않게). 없으면 일반 안내다.
   */
  deleteNotice?: string;
}

/*
 * [2026-10-02 D3] 화면에 없는 길을 권하지 않는다 — 메뉴는 화면 경로로 연결하고, 메뉴 관리의 구조 편집은 메뉴의 연결
 * 프로그램을 바꾸지 않는다(종전 '먼저 메뉴 관리에서 연결을 해제해 주세요' 는 그 길이 사라지며 사실이 아니게 됐다).
 * 화면 관리의 연결 안내(programDeleteLinkNotice)의 일반 문장과 같다.
 */
const DEFAULT_DELETE_NOTICE = '이 프로그램을 연결한 메뉴가 있으면 삭제되지 않습니다.';

export function ProgramForm({ onOpenChange, data, onSuccess, onWritePendingChange, deletable = true, deleteNotice }: ProgramFormProps) {
  const isEdit = !!data;
  const toast = useToast();
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
        toast.error(failureMessage(error, '프로그램을 저장하지 못했습니다.'));
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
        title: '프로그램 삭제',
        // 서버는 이 프로그램을 연결한 메뉴(사용 안 함 포함)가 있으면 삭제를 거부한다(409). 거부 사유는 실패 안내가 그대로 보인다.
        message: `프로그램을 삭제합니다. ${deleteNotice ?? DEFAULT_DELETE_NOTICE}`,
        variant: 'destructive',
        confirmText: '프로그램 삭제'
      });

      if (!ok) return;

      await programAdminService.deleteProgram(programId);
      toast.success('프로그램이 삭제되었습니다.');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(failureMessage(error, '프로그램을 삭제하지 못했습니다.'));
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
      <div className="rounded-lg border border-border bg-muted px-4 py-3 text-left">
        <h4 className="text-sm font-semibold text-foreground">{isEdit ? '프로그램 수정' : '프로그램 등록'}</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          {isEdit
            ? '프로그램 파일명은 바꿀 수 없습니다. 이름·URL·저장 경로·설명을 고칩니다.'
            : '프로그램 파일명은 등록한 뒤 바꿀 수 없습니다.'}
        </p>
      </div>

      <Form {...form}>
        <form noValidate onSubmit={submitProgramForm} className="space-y-6">
          <FormErrorSummary
            labels={{
              prgrmFileNm: '프로그램 파일명',
              prgrmKornNm: '프로그램 이름',
              url: 'URL 또는 API 경로',
              prgrmStrgPath: '저장 경로',
              prgrmExpln: '설명',
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
                    placeholder="예: ProgramList"
                    {...field} 
                    readOnly={isEdit} 
                    maxLength={300}
                    className="px-8 rounded-lg border-2 border-border bg-muted/50 font-bold focus:bg-card focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
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
                    <Type size={12} className="text-primary" /> 프로그램 이름
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="예: 프로그램 목록"
                      {...field} 
                      maxLength={100}
                      className="px-6 rounded-lg border-2 border-border bg-muted/50 font-bold text-sm focus:bg-card transition-all shadow-inner"
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
                    <LinkIcon size={12} className="text-primary" /> URL 또는 API 경로
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="/로 시작하는 경로"
                      {...field} 
                      maxLength={1000}
                      className="px-6 rounded-lg border-2 border-border bg-muted/50 font-mono text-sm font-bold focus:bg-card transition-all shadow-inner"
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
                  <FolderOpen size={12} className="text-primary" /> 저장 경로
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="예: /"
                    {...field}
                    maxLength={1000}
                    className="px-6 rounded-lg border-2 border-border bg-muted/50 font-mono text-sm font-bold focus:bg-card transition-all shadow-inner"
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
                  <Settings2 size={12} className="text-primary" /> 설명
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="이 프로그램이 하는 일을 적습니다"
                    {...field}
                    maxLength={4000}
                    className="px-6 rounded-lg border-2 border-border bg-muted/50 font-bold text-sm focus:bg-card transition-all shadow-inner"
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
              className="rounded-lg font-semibold text-sm flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isWritePending}
              aria-busy={isSaving || isSubmitting || undefined}
              className="rounded-lg font-semibold text-sm flex items-center gap-2 flex-[2]"
            >
              <Save size={18} aria-hidden="true" />
              {isSaving || isSubmitting ? '저장 중…' : '프로그램 저장'}
            </Button>
            {/* 아이콘 전용 버튼의 전경은 전경 전용 토큰(-emphasis)이다. 배경용 destructive 를 글자·아이콘에 쓰면 다크에서 대비가 1.8:1 이다. ghost 변형의 hover 글자색(text-foreground)도 같은 토큰으로 덮는다. */}
            {isEdit && deletable && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                aria-label={isDeleting ? '프로그램 삭제 중…' : '프로그램 삭제'}
                aria-busy={isDeleting || undefined}
                disabled={isWritePending}
                size="icon"
                className="rounded-lg text-destructive-emphasis hover:text-destructive-emphasis hover:bg-destructive/10 transition-colors flex items-center justify-center"
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
