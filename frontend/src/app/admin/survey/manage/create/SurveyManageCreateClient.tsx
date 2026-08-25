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
import { toDisplayYmd, toStorageYmd } from "@/lib/format-date";
import { CalendarIcon, Plus, Send, ArrowLeft, Sparkles } from "lucide-react";
import { createPoll } from '@/services/business/user/poll/PollUserService';
import { OnlinePollManageVO } from '@/types/business/poll';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
// sonner 직접 호출 대신 useToast 로 수렴한다 — 문자열 정규화 페일세이프가 없으면
// 에러 객체가 그대로 넘어가 '[object Object]' 가 노출된다(P2).
import { useToast } from '@/app/components/ui/toast';

export default function SurveyManageCreateClient() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<OnlinePollManageVO>({
    pollNm: '',
    pollBgngYmd: '',
    pollEndYmd: '',
    pollKndCd: '001', // Default 001
    pollDsuseYn: 'N',
  });

  const [beginDate, setBeginDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const handleSave = async () => {
    if (isSaving) return; // 연타 시 같은 설문이 두 건 등록되는 것을 막는다
    if (!formData.pollNm || !beginDate || !endDate) {
      toastError('필수 항목을 입력해 주세요.');
      return;
    }

    if (beginDate && endDate && beginDate > endDate) {
      toastError('설문 시작일은 종료일보다 빨라야 합니다.');
      return;
    }

    // 저장 포맷은 'yyyyMMdd' 8자다. 컬럼이 varchar(8)/DTO 가 @Size(max = 8) 이라
    // 'yyyy-MM-dd'(10자)를 보내면 등록이 100% 400 으로 실패한다.
    const payload = {
      ...formData,
      pollBgngYmd: toStorageYmd(beginDate),
      pollEndYmd: toStorageYmd(endDate),
      pollArticles: [
        { pollArtclNm: '매우 만족' },
        { pollArtclNm: '만족' },
        { pollArtclNm: '보통' },
        { pollArtclNm: '불만족' }
      ]
    };

    setIsSaving(true);
    try {
      await createPoll(payload);
      success('설문이 등록되었습니다.');
      router.push('/admin/survey/manage');
    } catch {
      toastError('설문을 등록하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // 루트 admin 레이아웃이 이미 여백을 준다 — 화면별 p-6 은 이중 여백이라 제거(P2).
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="rounded-lg font-bold gap-2 hover:bg-muted transition-all">
            <ArrowLeft className="w-4 h-4" /> 뒤로가기
        </Button>
      </div>

      <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] overflow-hidden rounded-lg bg-card ring-1 ring-border">
        <CardHeader className="bg-surface-inverse pb-12 pt-12 px-10 text-surface-inverse-foreground relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12">
                <Sparkles size={120} />
            </div>
            <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/10 w-fit rounded-lg border border-white/10 mb-4">
                    <Plus className="w-3.5 h-3.5 text-primary-foreground" />
                    <span className="text-xs font-bold tracking-widest">온라인 설문</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tighter">만족도 설문 등록</h1>
                <p className="font-medium opacity-70">응답 선택지가 매우 만족·만족·보통·불만족으로 고정된 설문을 등록합니다.</p>
            </div>
        </CardHeader>
        <CardContent className="p-10 space-y-10">
          <div className="space-y-3">
            <Label htmlFor="pollNm" className="text-sm font-bold text-muted-foreground ml-1">설문명 (필수)</Label>
            <Input
              id="pollNm"
              value={formData.pollNm}
              onChange={(e) => setFormData(prev => ({ ...prev, pollNm: e.target.value }))}
              placeholder="설문 주제를 입력하세요"
              className="h-11 rounded-lg border-2 bg-muted/50 focus:bg-card transition-all font-bold px-6"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label htmlFor="poll-begin-date" className="text-sm font-bold text-muted-foreground ml-1">시작일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="poll-begin-date"
                    variant={"outline"}
                    className={cn(
                      "h-11 w-full justify-start text-left font-bold rounded-lg border-2 bg-muted/50 px-6",
                      !beginDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-5 w-5 opacity-40" />
                    {beginDate ? toDisplayYmd(toStorageYmd(beginDate)) : <span>날짜 선택</span>}
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
              <Label htmlFor="poll-end-date" className="text-sm font-bold text-muted-foreground ml-1">종료일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="poll-end-date"
                    variant={"outline"}
                    className={cn(
                      "h-11 w-full justify-start text-left font-bold rounded-lg border-2 bg-muted/50 px-6",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-5 w-5 opacity-40" />
                    {endDate ? toDisplayYmd(toStorageYmd(endDate)) : <span>날짜 선택</span>}
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
            <Label htmlFor="poll-knd-cd" className="text-sm font-bold text-muted-foreground ml-1">설문 유형</Label>
            <Select
              value={formData.pollKndCd}
              onValueChange={(value) => setFormData(prev => ({ ...prev, pollKndCd: value }))}
            >
              <SelectTrigger id="poll-knd-cd" className="h-11 rounded-lg border-2 bg-muted/50 font-bold px-6">
                <SelectValue placeholder="유형 선택" />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-none shadow-2xl">
                <SelectItem value="001" className="font-bold py-3 text-foreground">📋 일반 설문</SelectItem>
                <SelectItem value="002" className="font-bold py-3 text-foreground">🗳️ 투표</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex pt-6">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-11 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-lg tracking-widest shadow-2xl hover:bg-primary transition-all active:scale-95 gap-3"
            >
                <Send className="w-5 h-5" /> {isSaving ? '등록 중…' : '설문 등록'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
