'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import axios from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark, Globe, FileText, ArrowLeft, Send, Home, ChevronRight, Info, Trash2 } from "lucide-react";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';

const SelectScrapDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  
  const [formData, setFormData] = useState({
    scrapNm: '',
    scrapUrl: '',
    scrapDc: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (id) {
      const fetchDetail = async () => {
        try {
          const response = (await axios.get(`/scrap/${id}`)) as any;
          if (response.data.success) {
            setFormData(response.data.result);
          }
        } catch (error) {
          console.error('Failed to fetch scrap detail', error);
        } finally {
          setFetching(false);
        }
      };
      fetchDetail();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.scrapNm.trim()) {
      alert('스크랩명을 입력해주세요.');
      return;
    }
    if (!formData.scrapUrl.trim()) {
      alert('URL을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = (await axios.put(`/scrap/${id}`, formData)) as any;
      if (response.data.success) {
        alert(response.data.message || '수정되었습니다.');
        router.push('/admin/collaboration/scraps/selectScrapList');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '수정에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말로 삭제하시겠습니까?')) return;
    
    setLoading(true);
    try {
      const response = (await axios.delete(`/scrap/${id}`)) as any;
      if (response.data.success) {
        alert(response.data.message || '삭제되었습니다.');
        router.push('/admin/collaboration/scraps/selectScrapList');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <DynamicBreadcrumb />

      <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-white ring-1 ring-slate-100">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b bg-gradient-to-tr from-indigo-50 via-slate-50 to-white pb-12 pt-12 px-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-xl shadow-indigo-200">
                  <Bookmark className="w-8 h-8 text-white fill-white/20" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-3xl font-black tracking-tighter text-slate-900 ">
                    Scrap Archive Detail
                  </CardTitle>
                  <p className="text-sm font-bold text-slate-500 leading-relaxed tracking-tight">
                    저장된 지식 조각을 확인하고 수정할 수 있습니다
                  </p>
                </div>
              </div>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                className="rounded-xl h-12 gap-2 shadow-lg shadow-rose-100"
              >
                <Trash2 size={16} /> 삭제
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-10 space-y-10">
            <div className="grid gap-8">
              <div className="group space-y-3">
                <Label htmlFor="scrapNm" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-indigo-600 transition-colors">
                  Scrap Name
                </Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 transition-colors group-focus-within:text-indigo-600">
                    <FileText size={16} />
                  </div>
                  <Input
                    id="scrapNm"
                    placeholder="스크랩 명을 입력하세요"
                    value={formData.scrapNm}
                    onChange={(e) => setFormData({ ...formData, scrapNm: e.target.value })}
                    className="h-14 pl-16 rounded-2xl border-2 border-slate-100 bg-slate-50/30 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-bold"
                  />
                </div>
              </div>

              <div className="group space-y-3">
                <Label htmlFor="scrapUrl" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-indigo-600 transition-colors">
                  Reference URL
                </Label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 transition-colors group-focus-within:text-indigo-600">
                    <Globe size={16} />
                  </div>
                  <Input
                    id="scrapUrl"
                    placeholder="https://example.com"
                    value={formData.scrapUrl}
                    onChange={(e) => setFormData({ ...formData, scrapUrl: e.target.value })}
                    className="h-14 pl-16 rounded-2xl border-2 border-slate-100 bg-slate-50/30 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-bold"
                  />
                </div>
              </div>

              <div className="group space-y-3">
                <Label htmlFor="scrapDc" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-indigo-600 transition-colors">
                  Knowledge Description
                </Label>
                <Textarea
                  id="scrapDc"
                  placeholder="이 지식에 대한 상세한 기록을 남겨주세요..."
                  value={formData.scrapDc}
                  onChange={(e) => setFormData({ ...formData, scrapDc: e.target.value })}
                  className="min-h-[180px] p-6 rounded-3xl border-2 border-slate-100 bg-slate-50/30 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium leading-relaxed resize-none shadow-inner"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-10 border-t bg-slate-50/50 flex flex-col md:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="w-full md:w-auto h-16 px-10 rounded-2xl border-2 font-black text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> 목록으로 돌아가기
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full md:flex-1 h-16 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center gap-3 group"
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

export default SelectScrapDetailPage;
