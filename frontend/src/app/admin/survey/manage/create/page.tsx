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
 alert('?„ìˆ˜ ??ª©???…ë ¥?´ì£¼?¸ìš”.');
 return;
 }

 const payload = {
 ...formData,
 pollBeginDe: format(beginDate, 'yyyy-MM-dd'),
 pollEndDe: format(endDate, 'yyyy-MM-dd'),
 };

 try {
 await createPoll(payload);
 alert('?¤ë¬¸???±ë¡?˜ì—ˆ?µë‹ˆ?? ?ì„¸ ?˜ì´ì§€?ì„œ ?¤ë¬¸ ??ª©??ì¶”ê??´ì£¼?¸ìš”.');
 router.push('/admin/survey/manage'); // Or redirect to detail page if we get ID back
 } catch {
 console.error(error);
 alert('?¤ë¬¸ ?±ë¡???¤íŒ¨?ˆìŠµ?ˆë‹¤.');
 }
 };

 return (
 <div className="max-w-2xl mx-auto space-y-8">
 <div>
 <h2 className="text-2xl font-bold tracking-tight">?¤ë¬¸ ?±ë¡</h2>
 <p className="text-muted-foreground">?ˆë¡œ???¨ë¼???¤ë¬¸???±ë¡?©ë‹ˆ??</p>
 </div>

 <div className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="pollNm">?¤ë¬¸ëª?/Label>
 <Input
 id="pollNm"
 value={formData.pollNm}
 onChange={(e) => setFormData(prev => ({ ...prev, pollNm: e.target.value }))}
 placeholder="?¤ë¬¸ ì£¼ì œë¥??…ë ¥?˜ì„¸??
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>?œì‘??/Label>
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
 {beginDate ? format(beginDate, "yyyy-MM-dd") : <span>? ì§œ ? íƒ</span>}
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
 <Label>ì¢…ë£Œ??/Label>
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
 {endDate ? format(endDate, "yyyy-MM-dd") : <span>? ì§œ ? íƒ</span>}
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
 <Label>?¤ë¬¸ ? í˜•</Label>
 <Select
 value={formData.pollKindCode}
 onValueChange={(value) => setFormData(prev => ({ ...prev, pollKindCode: value }))}
 >
 <SelectTrigger>
 <SelectValue placeholder="? í˜• ? íƒ" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="001">?¼ë°˜ ?¤ë¬¸</SelectItem>
 <SelectItem value="002">?¬í‘œ</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="flex justify-end gap-2 pt-4">
 <Button variant="outline" onClick={() => router.back()}>ì·¨ì†Œ</Button>
 <Button onClick={handleSave}>?€??/Button>
 </div>
 </div>
 </div>
 );
}
