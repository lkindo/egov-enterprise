'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark, Send, ArrowLeft, Home, ChevronRight, Activity, FileText, CheckCircle, Globe, Layout, Info } from "lucide-react";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';

const InsertScrapPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    scrapNm: '',
    scrapUrl: '',
    scrapDc: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic Validation
    if (!formData.scrapNm.trim()) {
      alert('스크랩명을 입력해주세요.');
      return;
    }
    if (!formData.scrapUrl.trim()) {
      alert('URL을 입력해주세요.');
      return;
    }
    if (!formData.scrapUrl.startsWith('http')) {
      alert('올바른 URL 형식이 아닙니다. (http:// 또는 https:// 로 시작해야 합니다)');
      return;
    }

    setLoading(true);
    try {
      const response = (await axios.post('/scrap', formData)) as any;
      if (response.data.success) {
        alert(response.data.message || '등록되었습니다.');
        router.push('/admin/collaboration/scraps/selectScrapList');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <DynamicBreadcrumb />

      <Card className="shadow-2xl border-none overflow-hidden rounded-[0.1rem] bg-white ring-1 ring-slate-100">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b bg-gradient-to-tr from-indigo-50 via-slate-50 to-white pb-12 pt-12 px-10">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-indigo-600 rounded-[0.1rem] shadow-xl shadow-indigo-200 animate-bounce-slow">
                <Bookmark className="w-8 h-8 text-white fill-white/20" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-3xl font-black tracking-tighter text-slate-900 ">
                  New Scrap Archive
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="h-1 w-12 bg-indigo-600 rounded-full" />
                  <p className="text-sm font-bold text-slate-400 tracking-tight">새로운 지식 조각을 아카이빙합니다</p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-10 space-y-10">
            <div className="grid gap-8">
              {/* Scrap Name */}
              <div className="group space-y-3">
                <Label htmlFor="scrapNm" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-indigo-600 transition-colors">
                  Scrap Name
                </Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 rounded-[0.1rem] flex items-center justify-center text-slate-400 transition-colors group-focus-within:text-indigo-600">
                    <FileText size={16} />
                  </div>
                  <Input
                    id="scrapNm"
                    placeholder="스크랩 명을 입력하세요"
                    value={formData.scrapNm}
                    onChange={(e) => setFormData({ ...formData, scrapNm: e.target.value })}
                    className="h-14 pl-16 rounded-[0.1rem] border-2 border-slate-100 bg-slate-50/30 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition font-bold"
                  />
                </div>
              </div>

              {/* Scrap URL */}
              <div className="group space-y-3">
                <Label htmlFor="scrapUrl" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-indigo-600 transition-colors">
                  Reference URL
                </Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 rounded-[0.1rem] flex items-center justify-center text-slate-400 transition-colors group-focus-within:text-indigo-600">
                    <Globe size={16} />
                  </div>
                  <Input
                    id="scrapUrl"
                    placeholder="https://example.com"
                    value={formData.scrapUrl}
                    onChange={(e) => setFormData({ ...formData, scrapUrl: e.target.value })}
                    className="h-14 pl-16 rounded-[0.1rem] border-2 border-slate-100 bg-slate-50/30 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition font-bold"
                  />
                </div>
              </div>

              {/* Scrap Description */}
              <div className="group space-y-3">
                <Label htmlFor="scrapDc" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-indigo-600 transition-colors">
                  Knowledge Description
                </Label>
                <Textarea
                  id="scrapDc"
                  placeholder="이 지식에 대한 상세한 기록을 남겨주세요..."
                  value={formData.scrapDc}
                  onChange={(e) => setFormData({ ...formData, scrapDc: e.target.value })}
                  className="min-h-[180px] p-6 rounded-[0.1rem] border-2 border-slate-100 bg-slate-50/30 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition font-medium leading-relaxed resize-none shadow-inner"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-[0.1rem] flex items-start gap-4 border border-slate-100">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                <Info size={16} />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                스크랩된 정보는 전사적으로 공유되며, 나중에 <span className="text-indigo-600 font-bold">마이페이지 &gt; 스크랩 관리</span> 섹션에서 언제든지 다시 확인하고 분류할 수 있습니다.
              </p>
            </div>
          </CardContent>

          <CardFooter className="p-10 border-t bg-slate-50/50 flex flex-col md:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="w-full md:w-auto h-16 px-10 rounded-[0.1rem] border-2 font-black text-slate-600 hover:bg-slate-100 transition flex items-center gap-2 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 취소 및 돌아가기
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full md:flex-1 h-16 rounded-[0.1rem] font-black text-lg shadow-xl shadow-indigo-100 bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-1 transition flex items-center gap-3 group"
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

export default InsertScrapPage;
