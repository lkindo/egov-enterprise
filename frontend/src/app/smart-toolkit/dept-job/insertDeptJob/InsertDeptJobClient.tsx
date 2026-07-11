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
import { Briefcase,  Send,  ArrowLeft,  Activity,  AlertCircle,  FileText,  CheckCircle } from "lucide-react";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';

const InsertDeptJobClient = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    deptTaskNm: '',
    deptTaskCn: '',
    prrtyRnk: '3'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deptTaskNm.trim()) {
      alert('업무 제목을 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = (await axios.post('/deptjob', formData)) as any;
      if (response.data.success) {
        alert(response.data.message || '성공적으로 등록되었습니다.');
        router.push('/smart-toolkit/dept-job/selectDeptJobList');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || '등록에 실패하였습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <DynamicBreadcrumb />

      <Card className="shadow-[0_64px_128px_-32px_rgba(0,0,0,0.15)] border-none overflow-hidden rounded-lg bg-white ring-1 ring-slate-100">
        <CardHeader className="border-b bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 pb-20 pt-20 px-12 text-white text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 bg-white/5 backdrop-blur-2xl border-2 border-white/10 rounded-lg flex items-center justify-center shadow-2xl scale-110 rotate-3 group hover:rotate-0 transition-transform duration-700">
              <Briefcase className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-center md:justify-start gap-3 px-4 py-1.5 bg-white/10 w-fit rounded-lg border border-white/10 mx-auto md:mx-0">
                <Activity className="w-3.5 h-3.5 text-primary-foreground animate-pulse" />
                <span className="text-xs font-bold tracking-[0.25em] text-white/80">워크플로우 시스템 2.0</span>
              </div>
              <CardTitle className="text-3xl font-bold tracking-tighter leading-none ">
                새 업무 기안
              </CardTitle>
              <p className="text-muted-foreground font-medium text-lg max-w-lg leading-relaxed mx-auto md:mx-0">
                부서의 새로운 업무를 정의하고 할당합니다. <br />명확한 목표 설정을 통해 효율적인 작업을 시작하세요.
              </p>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="pt-24 pb-20 px-12 md:px-20 space-y-20">
            {/* Task Title */}
            <div className="space-y-6 group">
              <Label htmlFor="deptTaskNm" className="text-xs font-bold tracking-[0.3em] text-muted-foreground group-focus-within:text-foreground transition-all flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-primary" /> 핵심 업무명 지정
              </Label>
              <Input
                id="deptTaskNm"
                placeholder="수행해야 할 핵심 업무 제목을 입력하세요"
                className="h-11 text-3xl font-bold border-2 border-slate-50 focus:border-slate-900 focus-visible:ring-slate-100 transition-all rounded-lg px-10 bg-muted/50 shadow-inner group-focus-within:bg-white group-focus-within:shadow-2xl"
                value={formData.deptTaskNm}
                onChange={(e) => setFormData({ ...formData, deptTaskNm: e.target.value })}
                required
              />
            </div>

            {/* Priority Selection */}
            <div className="space-y-6 group">
              <Label htmlFor="prrtyRnk" className="text-xs font-bold tracking-[0.3em] text-muted-foreground flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-primary" /> 전략적 우선순위 등급
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { value: '1', label: '긴급', desc: '즉각 조치' },
                  { value: '2', label: '일반', desc: '계획된 일정' },
                  { value: '3', label: '보류', desc: '낮은 시급성' }
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, prrtyRnk: p.value })}
                    className={`p-8 rounded-lg border-2 text-center transition-all active:scale-95 ${formData.prrtyRnk === p.value
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xl ring-8 ring-slate-100'
                      : 'bg-muted text-muted-foreground border-transparent hover:border-border'
                      }`}
                  >
                    <div className={`text-sm font-bold tracking-[0.2em] mb-1 ${formData.prrtyRnk === p.value ? 'text-primary' : ''}`}>{p.label}</div>
                    <div className="text-sm font-bold opacity-60 ">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Task Description */}
            <div className="space-y-6 group">
              <Label htmlFor="deptTaskCn" className="text-xs font-bold tracking-[0.3em] text-muted-foreground group-focus-within:text-foreground transition-all flex items-center gap-3">
                <FileText className="w-4 h-4" /> 상세 업무 내용
              </Label>
              <Textarea
                id="deptTaskCn"
                placeholder="업무의 상세 목표, 수행 방법, 요청 사항 등을 구체적으로 서술하세요.."
                className="min-h-[350px] p-12 text-xl font-medium leading-[1.8] border-2 border-slate-50 focus:border-slate-900 focus-visible:ring-slate-100 transition-all rounded-lg bg-muted/50 shadow-inner group-focus-within:bg-white group-focus-within:shadow-2xl resize-none scrollbar-thin scrollbar-thumb-slate-200"
                value={formData.deptTaskCn}
                onChange={(e) => setFormData({ ...formData, deptTaskCn: e.target.value })}
                required
              />
            </div>

            {/* Confirmation Indicator */}
            <div className="p-10 bg-muted border-2 border-white rounded-lg shadow-xl flex items-center gap-8 relative overflow-hidden">
              <div className="p-6 bg-slate-900 rounded-lg text-white shadow-2xl">
                <CheckCircle className="w-10 h-10 text-primary-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-2xl text-foreground tracking-tight ">유효성 검증 필요</p>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed max-w-[450px]">
                  등록된 업무는 부서 전체 대시보드에 즉시 노출됩니다. 기입된 내용이 가이드라인을 준수하는지 확인해 주세요.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col md:flex-row justify-center gap-8 py-20 border-t border-slate-50 bg-muted/30 px-12 rounded-b-[3.5rem]">
            <Link href="/smart-toolkit/dept-job/selectDeptJobList">
              <Button type="button" variant="ghost" className="h-11 px-16 font-bold tracking-[0.3em] text-sm text-muted-foreground hover:bg-white hover:text-rose-500 hover:shadow-2xl transition-all rounded-lg border-2 border-transparent hover:border-rose-50">
                <ArrowLeft className="w-6 h-6 mr-4" /> 취소 및 돌아가기
              </Button>
            </Link>
            <Button type="submit" className="h-11 px-24 gap-4 font-bold tracking-[0.3em] text-sm shadow-[0_24px_48px_-8px_theme(colors.slate.900/40)] bg-slate-900 hover:bg-black transition-all active:scale-95 ring-[20px] ring-slate-100 rounded-lg" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-3 animate-pulse">
                  <div className="w-3 h-3 bg-white rounded-full" /> 배포 중...
                </span>
              ) : (
                <>
                  <Send className="w-6 h-6" /> 업무 배포하기
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default InsertDeptJobClient;
