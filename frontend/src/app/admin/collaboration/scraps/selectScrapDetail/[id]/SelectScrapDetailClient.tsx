'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scrapMutationOptions, scrapQueryOptions } from '@/queries/scrap-query-options';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark, Globe, FileText, ArrowLeft, Send, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import {
  scrapEditFormSchema,
  scrapValidationLabels,
} from '../../scrap-form-validation';

/** 폼이 다루는 필드(서버 응답의 파생 필드 scrapSn/userId/crtDt 는 폼 상태로 끌어오지 않는다). */
interface ScrapForm {
  scrapNm: string;
  scrapUrl: string;
  scrapExpln: string;
  useYn: 'Y' | 'N';
}

const LIST_PATH = '/admin/collaboration/scraps/selectScrapList';

const SelectScrapDetailClient = () => {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const scrapSn = Number(id);
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<ScrapForm>({
    scrapNm: '',
    scrapUrl: '',
    scrapExpln: '',
    useYn: 'Y'
  });
  const [loading, setLoading] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const savePendingRef = useRef(false);
  const deletePendingRef = useRef(false);
  const validation = useManualFormValidation(scrapEditFormSchema, {
    labels: scrapValidationLabels,
  });

  const { data, isLoading, isError, error, refetch } = useQuery(
    scrapQueryOptions.detail(scrapSn),
  );
  const updateMutation = useMutation(scrapMutationOptions.update(queryClient));
  const deleteMutation = useMutation(scrapMutationOptions.remove(queryClient));

  // [방어] 응답 전면 교체(setFormData(response))는 응답에 없는 키를 undefined 로 만들어
  // 이후 formData.scrapUrl.trim() 에서 TypeError 를 유발했다 → 기존 상태에 병합한다.
  useEffect(() => {
    if (!data) return;
    setFormData((prev) => ({
      scrapNm: data.scrapNm ?? prev.scrapNm,
      scrapUrl: data.scrapUrl ?? prev.scrapUrl,
      scrapExpln: data.scrapExpln ?? prev.scrapExpln,
      useYn: data.useYn ?? prev.useYn
    }));
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savePendingRef.current || deletePendingRef.current) return;
    const validated = validation.validate(formData);
    if (!validated) return;

    savePendingRef.current = true;
    setLoading(true);
    try {
      // useYn 은 서버 DTO 필수값(@NotBlank) — 상태에 항상 보유하고 그대로 전송한다.
      await updateMutation.mutateAsync({ scrapSn, data: validated });
      toast('스크랩이 수정되었습니다.', 'success');
      router.push(LIST_PATH);
    } catch (err: unknown) {
      const fieldErrors = extractFieldErrors(err);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast(extractErrorMessage(err, '수정에 실패했습니다.'), 'error');
    } finally {
      savePendingRef.current = false;
      setLoading(false);
    }
  };

  /** [P1-9] native confirm → useConfirm. 본문에 대상 스크랩명을 노출한다. */
  const handleDelete = async () => {
    if (deletePendingRef.current || savePendingRef.current) return;
    deletePendingRef.current = true;
    setIsDeletePending(true);
    try {
      const ok = await confirm({
        title: '스크랩 삭제',
        message: `'${formData.scrapNm || '제목 없음'}' 스크랩을 삭제합니다. 삭제한 항목은 복구할 수 없습니다.`,
        confirmText: '삭제',
        variant: 'destructive',
      });
      if (!ok) return;

      await deleteMutation.mutateAsync(scrapSn);
      toast('스크랩이 삭제되었습니다.', 'success');
      router.push(LIST_PATH);
    } catch (err: unknown) {
      toast(extractErrorMessage(err, '삭제에 실패했습니다.'), 'error');
    } finally {
      deletePendingRef.current = false;
      setIsDeletePending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <h1 className="sr-only">스크랩 상세를 불러오는 중</h1>
        <div className="w-10 h-10 border-4 border-hub-indigo border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // [P1-1] 조회 실패를 빈 폼으로 위장하지 않는다 — 빈 폼에서 저장하면 원본이 덮어써진다.
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <AlertTriangle className="w-10 h-10 text-rose-500" />
        <h1 className="text-sm font-bold text-foreground">스크랩 정보를 불러오지 못했습니다.</h1>
        <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { void refetch(); }}>다시 시도</Button>
          <Button variant="ghost" onClick={() => router.push(LIST_PATH)}>목록으로</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <DynamicBreadcrumb />

      <Card className="shadow-2xl border-none overflow-hidden rounded-lg bg-card ring-1 ring-border">
        <form onSubmit={handleSubmit} noValidate>
          <CardHeader className="border-b bg-muted/40 pb-12 pt-12 px-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-hub-indigo rounded-lg shadow-xl shadow-hub-indigo/20">
                  <Bookmark className="w-8 h-8 text-white fill-white/20" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-bold tracking-tighter text-foreground">
                    스크랩 상세
                  </h1>
                  <p className="text-sm font-bold text-muted-foreground leading-relaxed tracking-tight">
                    저장된 스크랩을 확인하고 수정할 수 있습니다.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                aria-label={isDeletePending
                  ? `${formData.scrapNm || '스크랩'} 삭제 중`
                  : `${formData.scrapNm || '스크랩'} 삭제`}
                onClick={() => { void handleDelete(); }}
                disabled={loading || isDeletePending}
                aria-busy={isDeletePending || undefined}
                className="rounded-lg h-12 gap-2 shadow-lg shrink-0"
              >
                {isDeletePending
                  ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  : <Trash2 size={16} aria-hidden="true" />}
                {isDeletePending ? '삭제 중...' : '삭제'}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-10 space-y-10">
            <FormErrorSummary
              errors={validation.errors}
              labels={scrapValidationLabels}
              onNavigate={validation.focusError}
            />
            <div className="grid gap-8">
              <div className="group space-y-3">
                <Label htmlFor="scrapNm" className="text-xs font-bold text-muted-foreground tracking-[0.2em] ml-1 group-focus-within:text-hub-indigo transition-colors">
                  스크랩명 <span className="text-destructive-emphasis">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-muted-foreground transition-colors group-focus-within:text-hub-indigo">
                    <FileText size={16} />
                  </div>
                  <Input
                    id="scrapNm"
                    {...validation.fieldProps('scrapNm')}
                    placeholder="스크랩 명을 입력하세요"
                    value={formData.scrapNm}
                    onChange={(e) => {
                      validation.clearError('scrapNm');
                      setFormData({ ...formData, scrapNm: e.target.value });
                    }}
                    className="h-11 pl-16 rounded-lg border-2 border-border bg-muted/30 focus:bg-card focus:ring-4 focus:ring-hub-indigo/10 focus:border-hub-indigo transition-all font-bold"
                    maxLength={100}
                    required
                  />
                </div>
                {validation.errors.scrapNm ? (
                  <p {...validation.messageProps('scrapNm')} className="text-xs font-bold text-destructive-emphasis" />
                ) : null}
              </div>

              <div className="group space-y-3">
                <Label htmlFor="scrapUrl" className="text-xs font-bold text-muted-foreground tracking-[0.2em] ml-1 group-focus-within:text-hub-indigo transition-colors">
                  참조 URL <span className="text-destructive-emphasis">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-muted-foreground transition-colors group-focus-within:text-hub-indigo">
                    <Globe size={16} />
                  </div>
                  <Input
                    id="scrapUrl"
                    {...validation.fieldProps('scrapUrl')}
                    type="url"
                    placeholder="https://example.com"
                    value={formData.scrapUrl}
                    onChange={(e) => {
                      validation.clearError('scrapUrl');
                      setFormData({ ...formData, scrapUrl: e.target.value });
                    }}
                    className="h-11 pl-16 rounded-lg border-2 border-border bg-muted/30 focus:bg-card focus:ring-4 focus:ring-hub-indigo/10 focus:border-hub-indigo transition-all font-bold"
                    maxLength={1000}
                    required
                  />
                </div>
                {validation.errors.scrapUrl ? (
                  <p {...validation.messageProps('scrapUrl')} className="text-xs font-bold text-destructive-emphasis" />
                ) : null}
              </div>

              <div className="group space-y-3">
                <Label htmlFor="scrapExpln" className="text-xs font-bold text-muted-foreground tracking-[0.2em] ml-1 group-focus-within:text-hub-indigo transition-colors">
                  설명
                </Label>
                <Textarea
                  id="scrapExpln"
                  {...validation.fieldProps('scrapExpln')}
                  placeholder="이 자료에 대한 설명을 입력하세요."
                  value={formData.scrapExpln}
                  onChange={(e) => {
                    validation.clearError('scrapExpln');
                    setFormData({ ...formData, scrapExpln: e.target.value });
                  }}
                  className="min-h-[180px] p-6 rounded-lg border-2 border-border bg-muted/30 focus:bg-card focus:ring-4 focus:ring-hub-indigo/10 focus:border-hub-indigo transition-all font-medium leading-relaxed resize-none shadow-inner"
                />
                {validation.errors.scrapExpln ? (
                  <p {...validation.messageProps('scrapExpln')} className="text-xs font-bold text-destructive-emphasis" />
                ) : null}
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-10 border-t bg-muted/50 flex flex-col md:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="w-full md:w-auto h-11 px-10 rounded-lg border-2 font-bold text-muted-foreground hover:bg-muted transition-all flex items-center gap-2 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 목록으로
            </Button>
            <Button
              type="submit"
              aria-busy={loading || undefined}
              disabled={loading || isDeletePending}
              className="w-full md:flex-1 h-11 rounded-lg font-bold text-lg shadow-xl shadow-hub-indigo/10 bg-hub-indigo hover:bg-hub-indigo/90 hover:-translate-y-1 transition-all flex items-center gap-3 group"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 처리 중...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 수정 완료
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SelectScrapDetailClient;
