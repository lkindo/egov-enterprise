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
            alert('필수 항목을 입력해주세요.');
            return;
        }

        const payload = {
            ...formData,
            pollBeginDe: format(beginDate, 'yyyy-MM-dd'),
            pollEndDe: format(endDate, 'yyyy-MM-dd'),
        };

<<<<<<< HEAD
 try {
 await createPoll(payload);
 alert('설문이 등록되었습니다. 상세 페이지에서 설문 항목을 추가해주세요.');
 router.push('/admin/survey/manage'); // Or redirect to detail page if we get ID back
 } catch {
 console.error(error);
 alert('설문 등록에 실패했습니다.');
 }
 };
=======
        try {
            await createPoll(payload);
            alert('설문이 등록되었습니다. 상세 페이지에서 설문 항목을 추가해주세요.');
            router.push('/admin/survey/manage'); // Or redirect to detail page if we get ID back
        } catch {
            console.error();
            alert('설문 등록에 실패했습니다.');
        }
    };
>>>>>>> 99be2886750c05e99df098d47b5b4fd8f624093f

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">설문 등록</h2>
                <p className="text-muted-foreground">새로운 온라인 설문을 등록합니다.</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="pollNm">설문명</Label>
                    <Input
                        id="pollNm"
                        value={formData.pollNm}
                        onChange={(e) => setFormData(prev => ({ ...prev, pollNm: e.target.value }))}
                        placeholder="설문 주제를 입력하세요"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>시작일</Label>
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
                                    {beginDate ? format(beginDate, "yyyy-MM-dd") : <span>날짜 선택</span>}
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
                        <Label>종료일</Label>
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
                                    {endDate ? format(endDate, "yyyy-MM-dd") : <span>날짜 선택</span>}
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
                    <Label>설문 유형</Label>
                    <Select
                        value={formData.pollKindCode}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, pollKindCode: value }))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="유형 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="001">일반 설문</SelectItem>
                            <SelectItem value="002">투표</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => router.back()}>취소</Button>
                    <Button onClick={handleSave}>저장</Button>
                </div>
            </div>
        </div>
    );
}
