'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, User, Calendar, Eye, ArrowLeft, Trash2, Home, ChevronRight, FileText, Share2, Printer } from "lucide-react";

interface BoardDetail {
    nttId: string;
    nttSj: string;
    nttCn: string;
    frstRegisterNm: string;
    frstRegisterPnttm: string;
    inqireCo: number;
    bbsId: string;
}

const BBSDetailContent = () => {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const nttId = params.id as string;
    const bbsId = searchParams.get('bbsId');

    const [detail, setDetail] = useState<BoardDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/bbs/${nttId}`, { params: { bbsId } });
            setDetail(response.data.board);
        } catch (error) {
            console.error('Failed to fetch board article detail', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (nttId) fetchDetail();
    }, [nttId, bbsId]);

    const handleDelete = async () => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        setActionLoading(true);
        try {
            const response = await axios.delete(`/bbs/${nttId}`, { params: { bbsId } });
            if (response.data.success) {
                alert(response.data.message);
                router.push(`/cop/bbs/selectBoardList?bbsId=${bbsId}`);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || '삭제에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
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
        );
    }

    if (!detail) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest">Article Not Found</div>;

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
                                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={actionLoading} className="h-10 px-6 gap-2 shadow-xl font-black rounded-2xl transition-all active:scale-95">
                                    <Trash2 className="w-4 h-4" /> DELETE
                                </Button>
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
        </div>
    );
};

const BoardDetailPage = () => {
    return (
        <Suspense fallback={<div className="p-10 text-center font-bold">로딩 중...</div>}>
            <BBSDetailContent />
        </Suspense>
    );
};

export default BoardDetailPage;
