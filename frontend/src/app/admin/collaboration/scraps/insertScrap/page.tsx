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
      alert('?�크?�명???�력?�주?�요.');
      return;
    }
    if (!formData.scrapUrl.trim()) {
      alert('URL???�력?�주?�요.');
      return;
    }
    if (!formData.scrapUrl.startsWith('http')) {
      alert('?�바�?URL ?�식???�닙?�다. (http:// ?�는 https:// �??�작?�야 ?�니??');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/scraps', formData);
      alert('?�록?�었?�니??');
      router.push('/admin/collaboration/scraps/selectScrapList');
    } catch (error: any) {
      alert(error.response?.data?.message || '?�록???�패?�습?�다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <DynamicBreadcrumb />

      <Card className="shadow-2xl border-none overflow-hidden rounded-lg bg-white ring-1 ring-slate-100">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b bg-gradient-to-tr from-indigo-50 via-slate-50 to-white pb-12 pt-12 px-10">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-indigo-600 rounded-lg shadow-xl shadow-indigo-200 animate-bounce-slow">
                <Bookmark className="w-8 h-8 text-white fill-white/20" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 ">
                  New Scrap Archive
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="h-1 w-12 bg-indigo-600 rounded-full" />
                  <p className="text-sm font-bold text-slate-400 tracking-tight">?�로??지??조각???�카?�빙?�니??/p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-10 space-y-10">
            <div className="grid gap-8">
              {/* Scrap Name */}
              <div className="group space-y-3">
                <Label htmlFor="scrapNm" className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-indigo-600 transition-colors">
                  Scrap Name
                </Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 transition-colors group-focus-within:text-indigo-600">
                    <FileText size={16} />
                  </div>
                  <Input
                    id="scrapNm"
                    placeholder="?�크??명을 ?�력?�세??
                    value={formData.scrapNm}
                    onChange={(e) => setFormData({ ...formData, scrapNm: e.target.value })}
                    className="h-11 pl-16 rounded-lg border-2 border-slate-100 bg-slate-50/30 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-bold"
                  />
                </div>
              </div>

              {/* Scrap URL */}
              <div className="group space-y-3">
                <Label htmlFor="scrapUrl" className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-indigo-600 transition-colors">
                  Reference URL
                </Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 transition-colors group-focus-within:text-indigo-600">
                    <Globe size={16} />
                  </div>
                  <Input
                    id="scrapUrl"
                    placeholder="https://example.com"
                    value={formData.scrapUrl}
                    onChange={(e) => setFormData({ ...formData, scrapUrl: e.target.value })}
                    className="h-11 pl-16 rounded-lg border-2 border-slate-100 bg-slate-50/30 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-bold"
                  />
                </div>
              </div>

              {/* Scrap Description */}
              <div className="group space-y-3">
                <Label htmlFor="scrapDc" className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-indigo-600 transition-colors">
                  Knowledge Description
                </Label>
                <Textarea
                  id="scrapDc"
                  placeholder="??지?�에 ?�???�세??기록???�겨주세??.."
                  value={formData.scrapDc}
                  onChange={(e) => setFormData({ ...formData, scrapDc: e.target.value })}
                  className="min-h-[180px] p-6 rounded-lg border-2 border-slate-100 bg-slate-50/30 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium leading-relaxed resize-none shadow-inner"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-lg flex items-start gap-4 border border-slate-100">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                <Info size={16} />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                ?�크?�된 ?�보???�사?�으�?공유?�며, ?�중??<span className="text-indigo-600 font-bold">마이?�이지 &gt; ?�크??관�?/span> ?�션?�서 ?�제?��? ?�시 ?�인?�고 분류?????�습?�다.
              </p>
            </div>
          </CardContent>

          <CardFooter className="p-10 border-t bg-slate-50/50 flex flex-col md:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="w-full md:w-auto h-12 px-10 rounded-lg border-2 font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 취소 �??�아가�?            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full md:flex-1 h-12 rounded-lg font-bold text-lg shadow-xl shadow-indigo-100 bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center gap-3 group"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 처리 �?..
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> ?�크???�카?�빙 ?�료
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
