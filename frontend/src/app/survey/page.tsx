'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { getPollList } from '@/services/poll/pollService';
import { OnlinePollManageVO } from '@/types/poll';

export default function SurveyListPage() {
    const router = useRouter();
    const [polls, setPolls] = useState<OnlinePollManageVO[]>([]);

    const fetchList = useCallback(async () => {
        try {
            const response = await getPollList({ pageIndex: 1 });
            if (response && response.resultList) {
                // Filter only active polls
                const today = new Date().toISOString().slice(0, 10);
                const activePolls = response.resultList.filter(poll =>
                    poll.pollBeginDe <= today && poll.pollEndDe >= today
                );
                setPolls(activePolls);
            }
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">진행 중인 설문조사</h1>
                <p className="text-muted-foreground">여러분의 소중한 의견을 들려주세요.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {polls.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        현재 진행 중인 설문조사가 없습니다.
                    </div>
                ) : (
                    polls.map((poll) => (
                        <Card key={poll.pollId} className="flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <Badge variant="secondary" className="mb-2">진행중</Badge>
                                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <CardTitle className="line-clamp-2">{poll.pollNm}</CardTitle>
                                <CardDescription>
                                    {poll.pollBeginDe} ~ {poll.pollEndDe}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-sm text-muted-foreground">
                                    참여하여 의견을 남겨주세요.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" onClick={() => router.push(`/survey/${poll.pollId}`)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    참여하기
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
