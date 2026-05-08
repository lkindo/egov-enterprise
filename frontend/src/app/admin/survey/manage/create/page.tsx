'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Plus, Send, ArrowLeft, Sparkles } from "lucide-react";
import { createPoll } from '@/services/business/user/poll/PollUserService';
import { OnlinePollManageVO } from '@/types/business/poll';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreatePollPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<OnlinePollManageVO>({
    pollNm: '',
    pollBeginDe: '',
    pollEndDe: '',
    pollKindCode: '001', // Default 001
    pollDsuseYn: 'N',
  });

  const [beginDate, setBeginDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const handleSave = async () => {
    if (!formData.pollNm || !beginDate || !endDate) {
      alert('필수 항목을 입력해주세요.');
      return;
    }

    if (beginDate && endDate && beginDate > endDate) {
      alert('설문 시작일은 종료일보다 빨라야 합니다.');
      return;
    }

    const payload = {
      ...formData,
      pollBeginDe: format(beginDate, 'yyyy-MM-dd'),
      pollEndDe: format(endDate, 'yyyy-MM-dd'),
      pollItems: [
        { pollIemNm: '매우 만족 (Highly Satisfied)' },
        { pollIemNm: '만족 (Satisfied)' },
        { pollIemNm: '보통 (Neutral)' },
        { pollIemNm: '불만족 (Unsatisfied)' }
      ]
    };

    try {
      await createPoll(payload);
      alert('설문이 등록되었습니다. 상세 페이지에서 설문 항목을 추가해주세요.');
      router.push('/admin/survey/manage');
    } catch (error) {
      console.error(error);
      alert('설문 등록에 실패했습니다.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="rounded-lg font-bold gap-2 hover:bg-slate-100 transition-all">
            <ArrowLeft className="w-4 h-4" /> 뒤로가기
        </Button>
      </div>

      <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] overflow-hidden rounded-lg bg-white ring-1 ring-slate-100">
        <CardHeader className="bg-slate-900 pb-12 pt-12 px-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12">
                <Sparkles size={120} />
            </div>
            <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/10 w-fit rounded-lg border border-white/10 mb-4">
                    <Plus className="w-3.5 h-3.5 text-primary-foreground" />
                    <span className="text-xs font-bold tracking-widest uppercase">Survey System</span>
                </div>
                <CardTitle className="text-3xl font-bold tracking-tighter capitalize ">설문 등록</CardTitle>
                <p className="text-slate-400 font-medium lowercase">새로운 온라인 설문을 성격에 맞게 등록합니다.</p>
            </div>
        </CardHeader>
        <CardContent className="p-10 space-y-10">
          <div className="space-y-3">
            <Label htmlFor="pollNm" className="text-sm font-bold text-slate-500 ml-1">설문명 (필수)</Label>
            <Input
              id="pollNm"
              value={formData.pollNm}
              onChange={(e) => setFormData(prev => ({ ...prev, pollNm: e.target.value }))}
              placeholder="설문 주제를 입력하세요"
              className="h-11 rounded-lg border-2 bg-slate-50/50 focus:bg-white transition-all font-bold px-6"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-500 ml-1">시작일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "h-11 w-full justify-start text-left font-bold rounded-lg border-2 bg-slate-50/50 px-6",
                      !beginDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-5 w-5 opacity-40" />
                    {beginDate ? format(beginDate, "yyyy-MM-dd") : <span>날짜 선택</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-lg border-none shadow-2xl overflow-hidden">
                  <Calendar
                    mode="single"
                    selected={beginDate}
                    onSelect={setBeginDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-bold text-slate-500 ml-1">종료일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "h-11 w-full justify-start text-left font-bold rounded-lg border-2 bg-slate-50/50 px-6",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-5 w-5 opacity-40" />
                    {endDate ? format(endDate, "yyyy-MM-dd") : <span>날짜 선택</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-lg border-none shadow-2xl overflow-hidden">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-500 ml-1">설문 유형</Label>
            <Select
              value={formData.pollKindCode}
              onValueChange={(value) => setFormData(prev => ({ ...prev, pollKindCode: value }))}
            >
              <SelectTrigger className="h-11 rounded-lg border-2 bg-slate-50/50 font-bold px-6">
                <SelectValue placeholder="유형 선택" />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-none shadow-2xl">
                <SelectItem value="001" className="font-bold py-3 text-slate-700">📋 일반 설문</SelectItem>
                <SelectItem value="002" className="font-bold py-3 text-slate-700">🗳️ 투표</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex pt-6">
            <Button onClick={handleSave} className="w-full h-11 rounded-lg bg-slate-900 border-none text-white font-bold text-lg tracking-widest uppercase shadow-2xl hover:bg-slate-800 transition-all active:scale-95 gap-3">
                <Send className="w-5 h-5" /> 설문 등록 완료
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
