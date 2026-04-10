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
import { deptJobUserService, DeptJob } from '@/services/business/user/deptJob/DeptJobUserService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, ArrowLeft, Send, Sparkles } from "lucide-react";

export default function CreateDeptJobPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<DeptJob>>({
    deptJobNm: '',
    deptJobCn: '',
    priort: '2', // Default: 보통
    chargerNm: '',
  });

  const handleSave = async () => {
    if (!formData.deptJobNm || !formData.deptJobCn) {
      alert('업무명과 내용은 필수입니다.');
      return;
    }

    try {
      await deptJobUserService.saveDeptJob(formData);
      alert('업무가 성공적으로 등록되었습니다.');
      router.push('/smart-toolkit/dept-job/selectDeptJobList');
    } catch (error) {
      console.error(error);
      alert('업무 등록에 실패했습니다.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="rounded-[0.1rem] font-bold gap-2">
            <ArrowLeft className="w-4 h-4" /> 뒤로가기
        </Button>
      </div>

      <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] overflow-hidden rounded-[0.1rem] bg-white">
        <CardHeader className="bg-slate-900 pb-12 pt-12 px-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12">
                <Briefcase size={120} />
            </div>
            <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/10 w-fit rounded-full border border-white/10 mb-4">
                    <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                    <span className="text-[10px] font-black tracking-widest uppercase">Dept Job System</span>
                </div>
                <CardTitle className="text-3xl font-black tracking-tighter">부서 업무 등록</CardTitle>
                <p className="text-slate-400 font-medium">새로운 부서 업무를 정의하고 등록합니다.</p>
            </div>
        </CardHeader>
        <CardContent className="p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label htmlFor="deptJobNm" className="text-sm font-black text-slate-500 ml-1">업무명 (필수)</Label>
              <Input
                id="deptJobNm"
                value={formData.deptJobNm}
                onChange={(e) => setFormData(prev => ({ ...prev, deptJobNm: e.target.value }))}
                placeholder="과업의 핵심 명칭을 입력하세요"
                className="h-14 rounded-[0.1rem] border-2 bg-slate-50/50 focus:bg-white transition-all font-bold px-6"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="priort" className="text-sm font-black text-slate-500 ml-1">우선 순위</Label>
              <Select
                value={formData.priort}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priort: value }))}
              >
                <SelectTrigger className="h-14 rounded-[0.1rem] border-2 bg-slate-50/50 font-bold px-6">
                  <SelectValue placeholder="순위 선택" />
                </SelectTrigger>
                <SelectContent className="rounded-[0.1rem] border-none shadow-2xl">
                  <SelectItem value="1" className="font-bold py-3">🔴 높음 (High)</SelectItem>
                  <SelectItem value="2" className="font-bold py-3">🟡 보통 (Medium)</SelectItem>
                  <SelectItem value="3" className="font-bold py-3">🟢 낮음 (Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="chargerNm" className="text-sm font-black text-slate-500 ml-1">담당자 (선택)</Label>
            <Input
              id="chargerNm"
              value={formData.chargerNm}
              onChange={(e) => setFormData(prev => ({ ...prev, chargerNm: e.target.value }))}
              placeholder="담당자 성함을 입력하세요"
              className="h-14 rounded-[0.1rem] border-2 bg-slate-50/50 focus:bg-white transition-all font-bold px-6"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="deptJobCn" className="text-sm font-black text-slate-500 ml-1">업무 상세 내용 (필수)</Label>
            <Textarea
              id="deptJobCn"
              value={formData.deptJobCn}
              onChange={(e) => setFormData(prev => ({ ...prev, deptJobCn: e.target.value }))}
              className="min-h-[250px] p-8 rounded-[0.1rem] border-2 bg-slate-50/50 focus:bg-white text-lg font-medium leading-relaxed transition-all resize-none"
              placeholder="업무의 구체적인 수행 방법과 목표를 서술하세요..."
            />
          </div>

          <div className="flex pt-6">
            <Button onClick={handleSave} className="w-full h-16 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-lg tracking-widest uppercase shadow-2xl hover:bg-slate-800 transition-all active:scale-95 gap-3">
              <Send className="w-5 h-5" /> 업무 등록 완료
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
