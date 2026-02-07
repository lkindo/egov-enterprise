'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Send } from "lucide-react";
import { getPollDetail, getPollItemList, participatePoll } from '@/services/poll/pollService';
import { OnlinePollManageVO, OnlinePollItemVO } from '@/types/poll';

export default function SurveyParticipatePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const pollId = params.id;
    const [poll, setPoll] = useState<OnlinePollManageVO | null>(null);
    const [items, setItems] = useState<OnlinePollItemVO[]>([]);
    const [selectedItem, setSelectedItem] = useState<string>('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const pollData = await getPollDetail(pollId);
            setPoll(pollData);
            const itemsData = await getPollItemList(pollId);
            setItems(Array.isArray(itemsData) ? itemsData : []);
        } catch (error) {
            console.error(error);
            alert('설문 정보를 불러오는데 실패했습니다.');
            router.back();
        }
    }, [pollId, router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmit = async () => {
        if (!selectedItem) {
            alert('항목을 선택해주세요.');
            return;
        }

        try {
            await participatePoll({
                pollId,
                pollIemId: selectedItem,
            });
            setIsSubmitted(true);
            alert('참여해주셔서 감사합니다.');
            router.push('/survey');
        } catch (error) {
            console.error(error);
            // Some backends return error if already participated
            alert('참여 중 오류가 발생했거나 이미 참여하셨습니다.');
        }
    };

    if (!poll) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="container max-w-2xl mx-auto py-10">
            <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> 목록으로
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">{poll.pollNm}</CardTitle>
                    <CardDescription>
                        기간: {poll.pollBeginDe} ~ {poll.pollEndDe}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <Label className="text-lg font-semibold">다음 중 하나를 선택해주세요:</Label>

                        {items.length === 0 ? (
                            <p className="text-muted-foreground">선택 가능한 항목이 없습니다.</p>
                        ) : (
                            <RadioGroup value={selectedItem} onValueChange={setSelectedItem}>
                                {items.map((item) => (
                                    <div key={item.pollIemId} className="flex items-center space-x-2 border p-4 rounded-lg hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedItem(item.pollIemId!)}>
                                        <RadioGroupItem value={item.pollIemId!} id={item.pollIemId} />
                                        <Label htmlFor={item.pollIemId} className="flex-1 cursor-pointer font-medium">
                                            {item.pollIemNm}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" size="lg" onClick={handleSubmit} disabled={isSubmitted || items.length === 0}>
                        <Send className="mr-2 h-4 w-4" />
                        투표하기
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
