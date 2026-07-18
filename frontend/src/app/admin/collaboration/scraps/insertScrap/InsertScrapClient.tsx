'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
;
import axios from '@/lib/api/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark,  Send,  ArrowLeft,  FileText,  Globe,  Info } from "lucide-react";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';

const InsertScrapClient = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    scrapNm: '',
    scrapUrl: '',
    scrapExpln: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic Validation
    if (!formData.scrapNm.trim()) {
      toast.error('스크랩명을 입력해주세요.');
      return;
    }
    if (!formData.scrapUrl.trim()) {
      toast.error('URL을 입력해주세요.');
      return;
    }
    if (!formData.scrapUrl.startsWith('http')) {
      toast.error('올바른 URL 형식이 아닙니다. (http:// 또는 https:// 로 시작해야 합니다)');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/scraps', formData);
      toast.success('등록되었습니다.');
      router.push('/admin/collaboration/scraps/selectScrapList');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <DynamicBreadcrumb />

      <Card className="shadow-2xl border-none overflow-hidden rounded-lg bg-white ring-1 ring-border">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b bg-gradient-to-tr from-hub-indigo/5 via-slate-50 to-white pb-12 pt-12 px-10">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-hub-indigo rounded-lg shadow-xl shadow-hub-indigo/20 animate-bounce-slow">
                <Bookmark className="w-8 h-8 text-white fill-white/20" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-3xl font-bold tracking-tighter text-foreground ">
                  New Scrap Archive
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="h-1 w-12 bg-hub-indigo rounded-lg" />
                  <p className="text-sm font-bold text-muted-foreground tracking-tight">새로운 지식 조각을 아카이빙합니다</p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-10 space-y-10">
            <div className="grid gap-8">
              {/* Scrap Name */}
              <div className="group space-y-3">
                <Label htmlFor="scrapNm" className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1 group-focus-within:text-hub-indigo transition-colors">
                  Scrap Name
                </Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-muted-foreground transition-colors group-focus-within:text-hub-indigo">
                    <FileText size={16} />
                  </div>
                  <Input
                    id="scrapNm"
                    placeholder="스크랩 명을 입력하세요"
                    value={formData.scrapNm}
                    onChange={(e) => setFormData({ ...formData, scrapNm: e.target.value })}
                    className="h-11 pl-16 rounded-lg border-2 border-border bg-muted/30 focus:bg-white focus:ring-4 focus:ring-hub-indigo/10 focus:border-hub-indigo transition-all font-bold"
                  />
                </div>
              </div>

              {/* Scrap URL */}
              <div className="group space-y-3">
                <Label htmlFor="scrapUrl" className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1 group-focus-within:text-hub-indigo transition-colors">
                  Reference URL
                </Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-muted-foreground transition-colors group-focus-within:text-hub-indigo">
                    <Globe size={16} />
                  </div>
                  <Input
                    id="scrapUrl"
                    placeholder="https://example.com"
                    value={formData.scrapUrl}
                    onChange={(e) => setFormData({ ...formData, scrapUrl: e.target.value })}
                    className="h-11 pl-16 rounded-lg border-2 border-border bg-muted/30 focus:bg-white focus:ring-4 focus:ring-hub-indigo/10 focus:border-hub-indigo transition-all font-bold"
                  />
                </div>
              </div>

              {/* Scrap Description */}
              <div className="group space-y-3">
                <Label htmlFor="scrapExpln" className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1 group-focus-within:text-hub-indigo transition-colors">
                  Knowledge Description
                </Label>
                <Textarea
                  id="scrapExpln"
                  placeholder="이 지식에 대한 상세한 기록을 남겨주세요..."
                  value={formData.scrapExpln}
                  onChange={(e) => setFormData({ ...formData, scrapExpln: e.target.value })}
                  className="min-h-[180px] p-6 rounded-lg border-2 border-border bg-muted/30 focus:bg-white focus:ring-4 focus:ring-hub-indigo/10 focus:border-hub-indigo transition-all font-medium leading-relaxed resize-none shadow-inner"
                />
              </div>
            </div>

            <div className="p-6 bg-muted rounded-lg flex items-start gap-4 border border-border">
              <div className="p-2 bg-hub-indigo/10 text-hub-indigo rounded-lg shrink-0">
                <Info size={16} />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                스크랩된 정보는 전사적으로 공유되며, 나중에 <span className="text-hub-indigo font-bold">마이페이지 &gt; 스크랩 관리</span> 섹션에서 언제든지 다시 확인하고 분류할 수 있습니다.
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
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 취소 및 돌아가기
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
                  <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 스크랩 아카이빙 완료
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
