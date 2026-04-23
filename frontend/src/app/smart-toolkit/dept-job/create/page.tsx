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

export default function CreateDeptJobPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<DeptJobVO>>({
    deptJobNm: '',
    deptJobCn: '',
    priort: '2', // Default: 蹂댄넻
    chargerNm: '',
  });

  const handleSave = async () => {
    if (!formData.deptJobNm || !formData.deptJobCn) {
      alert('?낅Т紐낃낵 ?댁슜? ?꾩닔?낅땲??');
      return;
    }

    try {
      await deptJobUserService.createDeptJob(formData as DeptJobVO);
      alert('?낅Т媛 ?깃났?곸쑝濡??깅줉?섏뿀?듬땲??');
      router.push('/smart-toolkit/dept-job/selectDeptJobList');
    } catch (error) {
      console.error(error);
      alert('?낅Т ?깅줉???ㅽ뙣?덉뒿?덈떎.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="rounded-[0.1rem] font-bold gap-2">
            <ArrowLeft className="w-4 h-4" /> ?ㅻ줈媛湲?        </Button>
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
                <CardTitle className="text-3xl font-black tracking-tighter">遺???낅Т ?깅줉</CardTitle>
                <p className="text-slate-400 font-medium">?덈줈??遺???낅Т瑜??뺤쓽?섍퀬 ?깅줉?⑸땲??</p>
            </div>
        </CardHeader>
        <CardContent className="p-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label htmlFor="deptJobNm" className="text-sm font-black text-slate-500 ml-1">?낅Т紐?(?꾩닔)</Label>
              <Input
                id="deptJobNm"
                value={formData.deptJobNm}
                onChange={(e) => setFormData((prev: Partial<DeptJobVO>) => ({ ...prev, deptJobNm: e.target.value }))}
                placeholder="怨쇱뾽???듭떖 紐낆묶???낅젰?섏꽭??
                className="h-14 rounded-[0.1rem] border-2 bg-slate-50/50 focus:bg-white transition font-bold px-6"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="priort" className="text-sm font-black text-slate-500 ml-1">?곗꽑 ?쒖쐞</Label>
              <Select
                value={formData.priort}
                onValueChange={(value: string) => setFormData((prev: Partial<DeptJobVO>) => ({ ...prev, priort: value }))}
              >
                <SelectTrigger className="h-14 rounded-[0.1rem] border-2 bg-slate-50/50 font-bold px-6">
                  <SelectValue placeholder="?쒖쐞 ?좏깮" />
                </SelectTrigger>
                <SelectContent className="rounded-[0.1rem] border-none shadow-2xl">
                  <SelectItem value="1" className="font-bold py-3">?뵶 ?믪쓬 (High)</SelectItem>
                  <SelectItem value="2" className="font-bold py-3">?윞 蹂댄넻 (Medium)</SelectItem>
                  <SelectItem value="3" className="font-bold py-3">?윟 ??쓬 (Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="chargerNm" className="text-sm font-black text-slate-500 ml-1">?대떦??(?좏깮)</Label>
            <Input
              id="chargerNm"
              value={formData.chargerNm}
              onChange={(e) => setFormData((prev: Partial<DeptJobVO>) => ({ ...prev, chargerNm: e.target.value }))}
              placeholder="?대떦???깊븿???낅젰?섏꽭??
              className="h-14 rounded-[0.1rem] border-2 bg-slate-50/50 focus:bg-white transition font-bold px-6"
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="deptJobCn" className="text-sm font-black text-slate-500 ml-1">?낅Т ?곸꽭 ?댁슜 (?꾩닔)</Label>
            <Textarea
              id="deptJobCn"
              value={formData.deptJobCn}
              onChange={(e) => setFormData((prev: Partial<DeptJobVO>) => ({ ...prev, deptJobCn: e.target.value }))}
              className="min-h-[250px] p-8 rounded-[0.1rem] border-2 bg-slate-50/50 focus:bg-white text-lg font-medium leading-relaxed transition resize-none"
              placeholder="?낅Т??援ъ껜?곸씤 ?섑뻾 諛⑸쾿怨?紐⑺몴瑜??쒖닠?섏꽭??.."
            />
          </div>

          <div className="flex pt-6">
            <Button onClick={handleSave} className="w-full h-16 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-lg tracking-widest uppercase shadow-2xl hover:bg-slate-800 transition active:scale-95 gap-3">
              <Send className="w-5 h-5" /> ?낅Т ?깅줉 ?꾨즺
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
