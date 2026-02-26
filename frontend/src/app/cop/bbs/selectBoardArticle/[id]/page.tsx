'use client';

import React, { useEffect, useState, Suspense, useActionState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, User, Calendar, Eye, ArrowLeft, Trash2, Home, ChevronRight, FileText, Share2, Printer } from "lucide-react";
import CommentSection from "@/components/features/comment/CommentSection";
import { deleteBoardArticle } from '@/app/actions/boardActions';
import { useToast } from '@/app/components/ui/toast';

interface BoardDetail {
    nttId: string;
    nttSj: string;
    nttCn: string;
    frstRegisterNm: string;
    frstRegisterPnttm: string;
    inqireCo: number;
    bbsId: string;
}

const BBSDetailContent = ({ initialDetail, nttId, bbsId }: { initialDetail: BoardDetail; nttId: string; bbsId: string | null }) => {
    const router = useRouter();
    const { toast } = useToast();
    
    const [detail, setDetail] = useState<BoardDetail>(initialDetail);
    const [actionLoading, setActionLoading] = useState(false);
    const [state, formAction, isPending] = useActionState(deleteBoardArticle, null);

    useEffect(() => {
        if (state?.success) {
            toast(state.message, "success");
            router.push(`/cop/bbs/selectBoardList?bbsId=${bbsId}`);
        } else if (state && !state.success) {
            toast(state.message, "error");
        }
    }, [state, router, toast, bbsId]);

    // The loading state and fetchDetail are removed as data is passed via props
    // The initial loading skeleton is now handled by the parent Suspense boundary

    // The `if (!detail)` check is also removed as `initialDetail` guarantees `detail` exists
    // or the parent `BoardDetailPage` handles the "not found" case.

    return (
        <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-2xl w-fit border border-slate-100">
                <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
                    <Home className="w-4 h-4" /> Home
                </Link>
                <ChevronRight className="w-4 h-4" />
                <Link href={`/cop/bbs/selectBoardList?bbsId=${bbsId}`} className="hover:text-foreground transition-colors font-bold">커뮤니티</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-black">상세 게시글</span>
            </div>

            <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-white ring-1 ring-slate-100">
                <CardHeader className="border-b bg-slate-50/50 pb-12 pt-12 px-10">
                    <div className="flex flex-col gap-8">
                        {/* Header Actions */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                                <MessageSquare className="w-3 h-3 text-primary-foreground" /> Article Insight
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="sm" className="h-10 w-10 p-0 rounded-2xl shadow-sm border bg-white hover:bg-slate-50"><Share2 className="w-4 h-4" /></Button>
                                <Button variant="secondary" size="sm" className="h-10 w-10 p-0 rounded-2xl shadow-sm border bg-white hover:bg-slate-50"><Printer className="w-4 h-4" /></Button>
                                <form action={formAction}>
                                    <input type="hidden" name="nttId" value={nttId} />
                                    <input type="hidden" name="bbsId" value={bbsId || ''} />
                                    <Button type="submit" variant="destructive" size="sm" disabled={isPending} className="h-10 px-6 gap-2 shadow-xl font-black rounded-2xl transition-all active:scale-95">
                                        <Trash2 className="w-4 h-4" /> {isPending ? 'DELETING...' : 'DELETE'}
                                    </Button>
                                </form>
                            </div>
                        </div>

                        {/* Title & Metadata */}
                        <div className="space-y-6">
                            <CardTitle className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 leading-tight">
                                {detail.nttSj}
                            </CardTitle>

                            <div className="flex flex-wrap items-center gap-4 pt-2">
                                <div className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-inner">
                                        <User className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Author</span>
                                        <span className="text-sm font-black text-slate-900 leading-none">{detail.frstRegisterNm}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-inner">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Posted On</span>
                                        <span className="text-sm font-black text-slate-900 leading-none">{detail.frstRegisterPnttm}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700">
                                        <Eye className="w-4 h-4 text-white/40" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest leading-none mb-0.5">Views</span>
                                        <span className="text-sm font-black leading-none">{detail.inqireCo}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-16 pb-20 px-10 md:px-16">
                    <div className="max-w-none prose prose-slate prose-xl prose-headings:font-black prose-p:font-medium prose-p:leading-relaxed text-slate-700 leading-loose text-xl whitespace-pre-wrap font-medium font-sans">
                        {detail.nttCn || '내용이 등록되지 않았습니다.'}
                    </div>

                    {/* Bottom Indicator */}
                    <div className="mt-24 pt-10 border-t border-slate-50 flex items-center justify-center gap-3 opacity-20 group hover:opacity-100 transition-opacity">
                        <div className="h-px w-20 bg-slate-300 group-hover:bg-primary transition-colors" />
                        <MessageSquare className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                        <div className="h-px w-20 bg-slate-300 group-hover:bg-primary transition-colors" />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center py-14 border-t-2 border-slate-50 bg-slate-50/30 px-10 rounded-b-[2.5rem]">
                    <Link href={`/cop/bbs/selectBoardList?bbsId=${bbsId}`}>
                        <Button variant="ghost" className="h-16 px-16 gap-4 font-black uppercase tracking-[0.2em] text-sm text-slate-500 hover:bg-white hover:shadow-2xl hover:-translate-y-1 bg-transparent border-2 border-transparent hover:border-slate-100 transition-all rounded-[1.25rem] active:scale-95">
                            <ArrowLeft className="w-6 h-6" /> Go Back to List
                        </Button>
                    </Link>
                </CardFooter>
            </Card>

            {/* Comment Section */}
            {detail && (
                <CommentSection
                    nttId={parseInt(nttId)}
                    bbsId={bbsId || ''}
                />
            )}
        </div>
    );
};

import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { Metadata } from 'next';

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
            <BBSDetailContent initialDetail={initialDetail} nttId={id} bbsId={bbsId} />
        </Suspense>
    );
};

export default BoardDetailPage;
