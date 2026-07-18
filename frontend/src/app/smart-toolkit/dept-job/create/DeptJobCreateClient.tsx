'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deptJobUserService } from '@/services/business/user/deptJob/DeptJobUserService';
import { DeptJobVO } from '@/types/business/deptJob';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, ArrowLeft, Send, Sparkles } from "lucide-react";
import { toast } from 'sonner';

export default function DeptJobCreateClient() {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<DeptJobVO>>({
    deptTaskNm: '',
    deptTaskCn: '',
    prrtyRnk: '2', // Default: 보통
    picNm: '',
  });

  const handleSave = async () => {
    if (!formData.deptTaskNm || !formData.deptTaskCn) {
      toast.error('업무명과 내용은 필수입니다.');
      return;
    }

    try {
      await deptJobUserService.createDeptJob(formData as DeptJobVO);
      toast.success('업무가 성공적으로 등록되었습니다.');
      router.push('/smart-toolkit/dept-job/selectDeptJobList');
    } catch (error) {
      console.error(error);
      toast.error('업무 등록에 실패했습니다.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="rounded-lg font-bold gap-2">
            <ArrowLeft className="w-4 h-4" /> 뒤로가기
        </Button>
      </div>

      <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] overflow-hidden rounded-lg bg-card">
        <CardHeader className="bg-surface-inverse pb-12 pt-12 px-10 text-surface-inverse-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12">
                <Briefcase size={120} />
            </div>
            <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/10 w-fit rounded-lg border border-white/10 mb-4">
                    <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                    <span className="text-xs font-bold tracking-widest uppercase">부서 업무 시스템</span>
                </div>
                <CardTitle className="text-3xl font-bold tracking-tighter">부서 업무 등록</CardTitle>
                <p className="text-muted-foreground font-medium">새로운 부서 업무를 정의하고 등록합니다.</p>
            </div>
        </CardHeader>
        <CardContent className="p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label htmlFor="deptTaskNm" className="text-sm font-bold text-muted-foreground ml-1">업무명 (필수)</Label>
              <Input
                id="deptTaskNm"
                value={formData.deptTaskNm}
                onChange={(e) => setFormData((prev: Partial<DeptJobVO>) => ({ ...prev, deptTaskNm: e.target.value }))}
                placeholder="과업의 핵심 명칭을 입력하세요"
                className="h-11 rounded-lg border-2 bg-muted/50 focus:bg-card transition-all font-bold px-6"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="prrtyRnk" className="text-sm font-bold text-muted-foreground ml-1">우선 순위</Label>
              <Select
                value={formData.prrtyRnk}
                onValueChange={(value: string) => setFormData((prev: Partial<DeptJobVO>) => ({ ...prev, prrtyRnk: value }))}
              >
                <SelectTrigger className="h-11 rounded-lg border-2 bg-muted/50 font-bold px-6">
                  <SelectValue placeholder="순위 선택" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-none shadow-2xl">
                  <SelectItem value="1" className="font-bold py-3">🔴 높음</SelectItem>
                  <SelectItem value="2" className="font-bold py-3">🟡 보통</SelectItem>
                  <SelectItem value="3" className="font-bold py-3">🟢 낮음</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="picNm" className="text-sm font-bold text-muted-foreground ml-1">담당자 (선택)</Label>
            <Input
              id="picNm"
              value={formData.picNm}
              onChange={(e) => setFormData((prev: Partial<DeptJobVO>) => ({ ...prev, picNm: e.target.value }))}
              placeholder="담당자 성함을 입력하세요"
              className="h-11 rounded-lg border-2 bg-muted/50 focus:bg-white transition-all font-bold px-6"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="deptTaskCn" className="text-sm font-bold text-muted-foreground ml-1">업무 상세 내용 (필수)</Label>
            <Textarea
              id="deptTaskCn"
              value={formData.deptTaskCn}
              onChange={(e) => setFormData((prev: Partial<DeptJobVO>) => ({ ...prev, deptTaskCn: e.target.value }))}
              className="min-h-[250px] p-8 rounded-lg border-2 bg-muted/50 focus:bg-card text-lg font-medium leading-relaxed transition-all resize-none"
              placeholder="업무의 구체적인 수행 방법과 목표를 서술하세요..."
            />
          </div>

          <div className="flex pt-6">
            <Button onClick={handleSave} className="w-full h-11 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-lg tracking-widest uppercase shadow-2xl hover:bg-slate-800 transition-all active:scale-95 gap-3">
              <Send className="w-5 h-5" /> 업무 등록 완료
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
