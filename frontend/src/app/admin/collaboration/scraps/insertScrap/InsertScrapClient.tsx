'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/lib/api/client';
import { useToast } from '@/app/components/ui/toast';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark, Send, ArrowLeft, FileText, Globe, Info } from "lucide-react";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import {
  scrapCreateFormSchema,
  scrapValidationLabels,
} from '../scrap-form-validation';

const InsertScrapClient = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    scrapNm: '',
    scrapUrl: '',
    scrapExpln: ''
  });
  const [loading, setLoading] = useState(false);
  const submitPendingRef = useRef(false);
  const validation = useManualFormValidation(scrapCreateFormSchema, {
    labels: scrapValidationLabels,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitPendingRef.current) return;
    const validated = validation.validate({ ...formData, useYn: 'Y' });
    if (!validated) return;

    submitPendingRef.current = true;
    setLoading(true);
    try {
      // useYn 은 서버 DTO 필수값(@NotBlank)이다 — 누락 시 등록이 100% 400 으로 실패한다.
      // 소유자(userId)는 서버가 인증 주체에서 파생하므로 전송하지 않는다.
      await axios.post<number>('/scraps', validated);
      toast('스크랩이 등록되었습니다.', 'success');
      router.push('/admin/collaboration/scraps/selectScrapList');
    } catch (error: unknown) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast(extractErrorMessage(error, '등록에 실패했습니다.'), 'error');
    } finally {
      submitPendingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <DynamicBreadcrumb />

      <Card className="shadow-2xl border-none overflow-hidden rounded-lg bg-card ring-1 ring-border">
        <form onSubmit={handleSubmit} noValidate>
          <CardHeader className="border-b bg-muted/40 pb-12 pt-12 px-10">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-hub-indigo rounded-lg shadow-xl shadow-hub-indigo/20">
                <Bookmark className="w-8 h-8 text-white fill-white/20" />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tighter text-foreground">
                  스크랩 신규 등록
                </h1>
                <div className="flex items-center gap-3">
                  <div className="h-1 w-12 bg-hub-indigo rounded-lg" />
                  <p className="text-sm font-bold text-muted-foreground tracking-tight">자주 보는 링크와 자료를 보관합니다.</p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-10 space-y-10">
            <FormErrorSummary
              errors={validation.errors}
              labels={scrapValidationLabels}
              onNavigate={validation.focusError}
            />
            <div className="grid gap-8">
              {/* Scrap Name */}
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

              {/* Scrap URL */}
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

              {/* Scrap Description */}
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

            <div className="p-6 bg-muted rounded-lg flex items-start gap-4 border border-border">
              <div className="p-2 bg-hub-indigo/10 text-hub-indigo rounded-lg shrink-0">
                <Info size={16} />
              </div>
              {/* 스크랩은 등록자 본인만 조회한다(ScrapService 가 등록자 기준으로 필터링). 과거 문구는 '전사 공유'로 잘못 안내했다. */}
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                등록한 스크랩은 <span className="text-hub-indigo font-bold">본인만</span> 조회할 수 있으며,
                <span className="text-hub-indigo font-bold"> 협업 &gt; 스크랩 목록</span>에서 언제든지 다시 확인할 수 있습니다.
              </p>
            </div>
          </CardContent>

          <CardFooter className="p-10 border-t bg-muted/50 flex flex-col md:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="w-full md:w-auto h-11 px-10 rounded-lg border-2 font-bold text-muted-foreground hover:bg-muted transition-all flex items-center gap-2 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 취소
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full md:flex-1 h-11 rounded-lg font-bold text-lg shadow-xl shadow-hub-indigo/10 bg-hub-indigo hover:bg-hub-indigo/90 hover:-translate-y-1 transition-all flex items-center gap-3 group"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 처리 중...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 스크랩 등록
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default InsertScrapClient;
