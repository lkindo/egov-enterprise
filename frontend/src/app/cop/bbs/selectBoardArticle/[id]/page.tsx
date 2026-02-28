import React, { Suspense } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { Metadata } from 'next';
import BBSDetailContent, { BoardDetail } from './BBSDetailClient';

export async function generateMetadata({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }): Promise<Metadata> {
    const { id } = await params;
    const resolvedSearchParams = await searchParams;
    const bbsId = (resolvedSearchParams.bbsId as string) || '';

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    try {
        const response: any = await client.get(`/bbs/${id}`, { ...axiosConfig, params: { bbsId } });
        const post = response.board;
        return {
            title: `${post.nttSj} - 전자정부 프레임워크 현대화`,
            description: post.nttCn?.substring(0, 150),
        };
    } catch {
        return {
            title: '게시글 상세 - 전자정부 프레임워크 현대화',
        };
    }
}

const BoardDetailPage = async ({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) => {
    const { id } = await params;
    const resolvedSearchParams = await searchParams;
    const bbsId = (resolvedSearchParams.bbsId as string) || '';

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    let initialDetail: BoardDetail | null = null;
    try {
        const response: any = await client.get(`/bbs/${id}`, { ...axiosConfig, params: { bbsId } });
        initialDetail = response.board;
    } catch (error) {
        console.error('Server-side fetch detail failed', error);
    }

    if (!initialDetail) {
        return (
            <div className="p-20 text-center space-y-4">
                <div className="p-10 bg-rose-50 rounded-full w-fit mx-auto">
                    <Trash2 className="w-16 h-16 text-rose-300" />
                </div>
                <p className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">Article Not Found</p>
                <Link href={`/cop/bbs/selectBoardList?bbsId=${bbsId}`}>
                    <Button variant="outline" className="h-12 border-2 rounded-xl px-10 font-bold">Go Back to List</Button>
                </Link>
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div className="p-6 space-y-6 max-w-5xl mx-auto w-full">
                <Skeleton className="h-10 w-[300px] rounded-xl" />
                <Card className="border-none shadow-xl rounded-[2rem]">
                    <CardHeader className="p-10 border-b space-y-4">
                        <Skeleton className="h-12 w-3/4 rounded-2xl" />
                        <div className="flex gap-4"><Skeleton className="h-6 w-32 rounded-full" /><Skeleton className="h-6 w-32 rounded-full" /></div>
                    </CardHeader>
                    <CardContent className="p-10 space-y-4"><Skeleton className="h-40 w-full rounded-2xl" /></CardContent>
                </Card>
            </div>
        }>
            <BBSDetailContent initialDetail={initialDetail as any} nttId={id} bbsId={bbsId} />
        </Suspense>
    );
};

export default BoardDetailPage;
