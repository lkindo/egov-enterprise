'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
;
import axios from '@/lib/api/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark,  Globe,  FileText,  ArrowLeft,  Send,  Trash2 } from "lucide-react";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';

/** 폼이 다루는 필드(서버 응답의 파생 필드 scrapId/userId/crtDt 는 폼 상태로 끌어오지 않는다). */
interface ScrapForm {
  scrapNm: string;
  scrapUrl: string;
  scrapExpln: string;
  useYn: string;
}

const SelectScrapDetailClient = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const [formData, setFormData] = useState<ScrapForm>({
    scrapNm: '',
    scrapUrl: '',
    scrapExpln: '',
    useYn: 'Y'
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (id) {
      const fetchDetail = async () => {
        try {
          const response = (await axios.get(`/scraps/${id}`)) as Partial<ScrapForm> | null;
          // [방어] 응답 전면 교체(setFormData(response))는 응답에 없는 키를 undefined 로 만들어
          // 이후 formData.scrapUrl.trim() 에서 TypeError 를 유발했다 → 기존 상태에 병합한다.
          setFormData((prev) => ({
            ...prev,
            scrapNm: response?.scrapNm ?? prev.scrapNm,
            scrapUrl: response?.scrapUrl ?? prev.scrapUrl,
            scrapExpln: response?.scrapExpln ?? prev.scrapExpln,
            useYn: response?.useYn ?? prev.useYn
          }));
        } catch (error) {
          console.error('Failed to fetch scrap detail', error);
          toast.error('스크랩 정보를 불러오지 못했습니다.');
        } finally {
          setFetching(false);
        }
      };
      fetchDetail();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.scrapNm?.trim()) {
      toast.error('스크랩명을 입력해주세요.');
      return;
    }
    if (!formData.scrapUrl?.trim()) {
      toast.error('URL을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      // useYn 은 서버 DTO 필수값(@NotBlank) — 상태에 항상 보유하고 그대로 전송한다.
      await axios.put(`/scraps/${id}`, { ...formData, useYn: formData.useYn || 'Y' });
      toast.success('수정되었습니다.');
      router.push('/admin/collaboration/scraps/selectScrapList');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말로 삭제하시겠습니까?')) return;

    setLoading(true);
    try {
      await axios.delete(`/scraps/${id}`);
      toast.success('삭제되었습니다.');
      router.push('/admin/collaboration/scraps/selectScrapList');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-hub-indigo border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <DynamicBreadcrumb />

      <Card className="shadow-2xl border-none overflow-hidden rounded-lg bg-white ring-1 ring-border">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b bg-gradient-to-tr from-hub-indigo/5 via-slate-50 to-white pb-12 pt-12 px-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-hub-indigo rounded-lg shadow-xl shadow-hub-indigo/20">
                  <Bookmark className="w-8 h-8 text-white fill-white/20" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-3xl font-bold tracking-tighter text-foreground ">
                    Scrap Archive Detail
                  </CardTitle>
                  <p className="text-sm font-bold text-muted-foreground leading-relaxed tracking-tight">
                    저장된 지식 조각을 확인하고 수정할 수 있습니다
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="rounded-lg h-12 gap-2 shadow-lg shadow-rose-100"
              >
                <Trash2 size={16} /> 삭제
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-10 space-y-10">
            <div className="grid gap-8">
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
          </CardContent>

          <CardFooter className="p-10 border-t bg-muted/50 flex flex-col md:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="w-full md:w-auto h-11 px-10 rounded-lg border-2 font-bold text-muted-foreground hover:bg-muted transition-all flex items-center gap-2 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 목록으로 돌아가기
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
                  <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 스크랩 수정 완료
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
