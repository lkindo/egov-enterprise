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
import { CalendarIcon } from "lucide-react";
import { createPoll, updatePoll } from '@/services/poll/pollService';
import { OnlinePollManageVO } from '@/types/business/poll';

export default function CreatePollPage() {
 const router = useRouter();
 const [formData, setFormData] = useState<OnlinePollManageVO>({
 pollNm: '',
 pollBeginDe: '',
 pollEndDe: '',
 pollKindCode: '001', // Default 001
 pollDsuseYn: 'N',
 });

 // Date state for Calendar component (Date object)
 const [beginDate, setBeginDate] = useState<Date | undefined>();
 const [endDate, setEndDate] = useState<Date | undefined>();

 const handleSave = async () => {
 if (!formData.pollNm || !beginDate || !endDate) {
 alert('?꾩닔 님ぉ님?낅젰?댁＜?몄슂.');
 return;
 }

 const payload = {
 ...formData,
 pollBeginDe: format(beginDate, 'yyyy-MM-dd'),
 pollEndDe: format(endDate, 'yyyy-MM-dd'),
 };

 try {
 await createPoll(payload);
 alert('설문님등록?섏뿀?듬땲님 ?곸꽭 ?섏씠吏?먯꽌 설문 님ぉ님異붽님댁＜?몄슂.');
 router.push('/admin/survey/manage'); // Or redirect to detail page if we get ID back
 } catch {
 console.error(error);
 alert('설문 등록님?ㅽ뙣?덉뒿?덈떎.');
 }
 };

 return (
 <div className="max-w-2xl mx-auto space-y-8">
 <div>
 <h2 className="text-2xl font-bold tracking-tight">설문 등록</h2>
 <p className="text-muted-foreground">?덈줈님온라인설문님등록?⑸땲님</p>
 </div>

 <div className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="pollNm">설문紐?/Label>
 <Input
 id="pollNm"
 value={formData.pollNm}
 onChange={(e) => setFormData(prev => ({ ...prev, pollNm: e.target.value }))}
 placeholder="설문 二쇱젣瑜님낅젰?섏꽭님
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>?쒖옉님/Label>
 <Popover>
 <PopoverTrigger asChild>
 <Button
 variant={"outline"}
 className={cn(
 "w-full justify-start text-left font-normal",
 !beginDate && "text-muted-foreground"
 )}
 >
 <CalendarIcon className="mr-2 h-4 w-4" />
 {beginDate ? format(beginDate, "yyyy-MM-dd") : <span>?좎쭨 ?좏깮</span>}
 </Button>
 </PopoverTrigger>
 <PopoverContent className="w-auto p-0">
 <Calendar
 mode="single"
 selected={beginDate}
 onSelect={(date) => {
 setBeginDate(date);
 // Update form data immediately or on save
 }}
 initialFocus
 />
 </PopoverContent>
 </Popover>
 </div>

 <div className="space-y-2">
 <Label>醫낅즺님/Label>
 <Popover>
 <PopoverTrigger asChild>
 <Button
 variant={"outline"}
 className={cn(
 "w-full justify-start text-left font-normal",
 !endDate && "text-muted-foreground"
 )}
 >
 <CalendarIcon className="mr-2 h-4 w-4" />
 {endDate ? format(endDate, "yyyy-MM-dd") : <span>?좎쭨 ?좏깮</span>}
 </Button>
 </PopoverTrigger>
 <PopoverContent className="w-auto p-0">
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

 <div className="space-y-2">
 <Label>설문 ?좏삎</Label>
 <Select
 value={formData.pollKindCode}
 onValueChange={(value) => setFormData(prev => ({ ...prev, pollKindCode: value }))}
 >
 <SelectTrigger>
 <SelectValue placeholder="?좏삎 ?좏깮" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="001">?쇰컲 설문</SelectItem>
 <SelectItem value="002">?ы몴</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="flex justify-end gap-2 pt-4">
 <Button variant="outline" onClick={() => router.back()}>痍⑥냼</Button>
 <Button onClick={handleSave}>?님/Button>
 </div>
 </div>
 </div>
 );
}

