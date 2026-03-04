'use client';

import React, { useState, useCallback, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getPollDetail, getPollItemList, createPollItem, deletePollItem, deletePoll } from '@/services/poll/pollService';
import { OnlinePollManageVO, OnlinePollItemVO } from '@/types/poll';

export default function PollDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: pollId } = use(params);
    const router = useRouter();
    const [poll, setPoll] = useState<OnlinePollManageVO | null>(null);
    const [items, setItems] = useState<OnlinePollItemVO[]>([]);
    const [newItemName, setNewItemName] = useState('');

    const fetchData = useCallback(async () => {
        try {
            const pollData = await getPollDetail(pollId);
            setPoll(pollData);
            const itemsData = await getPollItemList(pollId);
            // Items might be wrapped or array
            setItems(Array.isArray(itemsData) ? itemsData : []);
        } catch (error) {
            console.error(error);
        }
    }, [pollId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddItem = async () => {
        if (!newItemName) return;
        try {
            await createPollItem({
                pollId,
                pollIemNm: newItemName,
                sortOrdr: items.length + 1,
            });
            setNewItemName('');
            fetchData(); // Refresh items
        } catch (error) {
            alert('항목 추가 실패');
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm('설문 항목을 삭제하시겠습니까?')) return;
        try {
            await deletePollItem(pollId, itemId);
            fetchData();
        } catch (error) {
            alert('삭제 실패');
        }
    };

    const handleDeletePoll = async () => {
        if (!confirm('설문 자체를 삭제하시겠습니까?')) return;
        try {
            await deletePoll(pollId);
            router.push('/admin/survey/manage');
        } catch (error) {
            alert('삭제 실패');
        }
    };

    if (!poll) return <div>Loading...</div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-2xl font-bold tracking-tight">설문 상세 및 관리</h2>
            </div>

            <div className="grid gap-6 border p-6 rounded-lg bg-white">
                <div className="space-y-1">
                    <Label className="text-muted-foreground">설문명</Label>
                    <div className="text-lg font-medium">{poll.pollNm}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-muted-foreground">기간</Label>
                        <div>{poll.pollBeginDe} ~ {poll.pollEndDe}</div>
                    </div>
                    <div>
                        <Label className="text-muted-foreground">등록자</Label>
                        <div>{poll.frstRegisterNm}</div>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button variant="destructive" onClick={handleDeletePoll}>설문 삭제</Button>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">설문 항목 관리</h3>
                <div className="flex gap-2">
                    <Input
                        placeholder="새로운 설문 항목 입력 (예: 매우 만족)"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                    />
                    <Button onClick={handleAddItem}>추가</Button>
                </div>

                <div className="rounded-md border bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60px]">순서</TableHead>
                                <TableHead>항목명</TableHead>
                                <TableHead className="w-[100px]">관리</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        등록된 항목이 없습니다. 항목을 추가해주세요.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item, index) => (
                                    <TableRow key={item.pollIemId || index}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{item.pollIemNm}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.pollIemId!)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}