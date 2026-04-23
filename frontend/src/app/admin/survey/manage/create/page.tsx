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
      alert('?꾩닔 ??ぉ???낅젰?댁＜?몄슂.');
      return;
    }

    const payload = {
      ...formData,
      pollBeginDe: format(beginDate, 'yyyy-MM-dd'),
      pollEndDe: format(endDate, 'yyyy-MM-dd'),
    };

    try {
      await createPoll(payload);
      alert('?ㅻЦ???깅줉?섏뿀?듬땲?? ?곸꽭 ?섏씠吏?먯꽌 ?ㅻЦ ??ぉ??異붽??댁＜?몄슂.');
      router.push('/admin/survey/manage');
    } catch (error) {
      console.error(error);
      alert('?ㅻЦ ?깅줉???ㅽ뙣?덉뒿?덈떎.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="rounded-[0.1rem] font-bold gap-2 hover:bg-slate-100 transition">
            <ArrowLeft className="w-4 h-4" /> ?ㅻ줈媛湲?        </Button>
      </div>

      <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] overflow-hidden rounded-[0.1rem] bg-white ring-1 ring-slate-100">
        <CardHeader className="bg-slate-900 pb-12 pt-12 px-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12">
                <Sparkles size={120} />
            </div>
            <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/10 w-fit rounded-full border border-white/10 mb-4">
                    <Plus className="w-3.5 h-3.5 text-primary-foreground" />
                    <span className="text-[10px] font-black tracking-widest uppercase">Survey System</span>
                </div>
                <CardTitle className="text-3xl font-black tracking-tighter capitalize ">?ㅻЦ ?깅줉</CardTitle>
                <p className="text-slate-400 font-medium lowercase">?덈줈???⑤씪???ㅻЦ???깃꺽??留욊쾶 ?깅줉?⑸땲??</p>
            </div>
        </CardHeader>
        <CardContent className="p-10 space-y-10">
          <div className="space-y-3">
            <Label htmlFor="pollNm" className="text-sm font-black text-slate-500 ml-1">?ㅻЦ紐?(?꾩닔)</Label>
            <Input
              id="pollNm"
              value={formData.pollNm}
              onChange={(e) => setFormData(prev => ({ ...prev, pollNm: e.target.value }))}
              placeholder="?ㅻЦ 二쇱젣瑜??낅젰?섏꽭??
              className="h-14 rounded-[0.1rem] border-2 bg-slate-50/50 focus:bg-white transition font-bold px-6"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-sm font-black text-slate-500 ml-1">?쒖옉??/Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "h-14 w-full justify-start text-left font-bold rounded-[0.1rem] border-2 bg-slate-50/50 px-6",
                      !beginDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-5 w-5 opacity-40" />
                    {beginDate ? format(beginDate, "yyyy-MM-dd") : <span>?좎쭨 ?좏깮</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-[0.1rem] border-none shadow-2xl overflow-hidden">
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
              <Label className="text-sm font-black text-slate-500 ml-1">醫낅즺??/Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "h-14 w-full justify-start text-left font-bold rounded-[0.1rem] border-2 bg-slate-50/50 px-6",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-3 h-5 w-5 opacity-40" />
                    {endDate ? format(endDate, "yyyy-MM-dd") : <span>?좎쭨 ?좏깮</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-[0.1rem] border-none shadow-2xl overflow-hidden">
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
            <Label className="text-sm font-black text-slate-500 ml-1">?ㅻЦ ?좏삎</Label>
            <Select
              value={formData.pollKindCode}
              onValueChange={(value) => setFormData(prev => ({ ...prev, pollKindCode: value }))}
            >
              <SelectTrigger className="h-14 rounded-[0.1rem] border-2 bg-slate-50/50 font-bold px-6">
                <SelectValue placeholder="?좏삎 ?좏깮" />
              </SelectTrigger>
              <SelectContent className="rounded-[0.1rem] border-none shadow-2xl">
                <SelectItem value="001" className="font-bold py-3 text-slate-700">?뱥 ?쇰컲 ?ㅻЦ</SelectItem>
                <SelectItem value="002" className="font-bold py-3 text-slate-700">?뿳截??ы몴</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex pt-6">
            <Button onClick={handleSave} className="w-full h-16 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-lg tracking-widest uppercase shadow-2xl hover:bg-slate-800 transition active:scale-95 gap-3">
                <Send className="w-5 h-5" /> ?ㅻЦ ?깅줉 ?꾨즺
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
