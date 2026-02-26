'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark, Globe, FileText, Calendar, ArrowLeft, Trash2, Home, ChevronRight, User, ExternalLink } from "lucide-react";

interface ScrapDetail {
    scrapId: string;
    scrapNm: string;
    scrapUrl: string;
    scrapDc: string;
    frstRegisterId: string;
    frstRegisterPnttm: string;
}

const ScrapDetailPage = () => {
    const params = useParams();
    const router = useRouter();
    const scrapId = params.id as string;

    const [detail, setDetail] = useState<ScrapDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const response = (await axios.get(`/scrap/${scrapId}`)) as any;
            setDetail(response.data.scrap);
        } catch (error) {
            console.error('Failed to fetch scrap detail', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (scrapId) fetchDetail();
    }, [scrapId]);

    const handleDelete = async () => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        setActionLoading(true);
        try {
            const response = (await axios.delete(`/scrap/${scrapId}`)) as any;
            if (response.data.success) {
                alert(response.data.message);
                router.push('/cop/scp/selectScrapList');
            }
        } catch (error: any) {
            alert(error.response?.data?.message || '삭제에 실패했습니다.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
                <Skeleton className="h-10 w-[300px]" />
                <Card className="border-none shadow-md"><CardContent className="p-10 space-y-8"><Skeleton className="h-10 w-full" /><Skeleton className="h-24 w-full" /></CardContent></Card>
            </div>
        );
    }

    if (!detail) return <div className="p-10 text-center font-medium">스크랩 정보를 찾을 수 없습니다.</div>;

    return (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg w-fit">
                <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
                    <Home className="w-4 h-4" /> Home
                </Link>
                <ChevronRight className="w-4 h-4" />
                <Link href="/cop/scp/selectScrapList" className="hover:text-foreground transition-colors font-medium">스크랩관리</Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-semibold">스크랩 상세보기</span>
            </div>

            <Card className="shadow-2xl border-none overflow-hidden rounded-3xl">
                <CardHeader className="border-b bg-gradient-to-br from-indigo-500/10 to-purple-500/5 pb-10 pt-10 px-10">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                            <CardTitle className="text-3xl font-black tracking-tighter text-indigo-900 leading-tight">
                                {detail.scrapNm}
                            </CardTitle>
                            <div className="flex items-center gap-2 text-sm font-bold text-indigo-600/70">
                                <Bookmark className="w-4 h-4 fill-indigo-600/20" /> 아카이브된 웹 스크랩
                            </div>
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                            disabled={actionLoading}
                            className="gap-2 shadow-lg font-bold bg-rose-500 hover:bg-rose-600 transition-all active:scale-95"
                        >
                            <Trash2 className="w-4 h-4" /> 삭제
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pt-12 px-10 space-y-12">
                    {/* URL Section */}
                    <div className="space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">
                            <Globe className="w-3 h-3 text-indigo-500" /> 원본 링크 (Source URL)
                        </div>
                        <div className="bg-indigo-50/50 p-6 rounded-3xl border-2 border-indigo-100/50 group hover:border-indigo-200 transition-all shadow-sm">
                            <a
                                href={detail.scrapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-lg font-bold text-indigo-700 break-all flex items-center gap-3 hover:text-indigo-900 transition-colors"
                            >
                                {detail.scrapUrl}
                                <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                                    <ExternalLink className="w-4 h-4" />
                                </div>
                            </a>
                            <p className="mt-4 text-xs font-semibold text-indigo-400 italic">
                                * 위 링크를 클릭하면 해당 웹 페이지로 새 탭에서 연결됩니다.
                            </p>
                        </div>
                    </div>

                    {/* Description Section */}
                    <div className="space-y-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <FileText className="w-3 h-3 text-primary" /> 스크랩 설명 (Description)
                        </div>
                        <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 min-h-[120px] shadow-inner font-medium text-slate-700 leading-relaxed text-lg">
                            {detail.scrapDc || '별도의 설명이 등록되지 않았습니다.'}
                        </div>
                    </div>

                    {/* Metadata Section */}
                    <div className="pt-10 border-t-2 border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                        <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100/50">
                            <div className="p-3 bg-white rounded-xl shadow-sm"><User className="w-5 h-5 text-indigo-500" /></div>
                            <div>
                                <div className="text-[9px] font-black text-slate-400 tracking-widest uppercase">등록자</div>
                                <div className="text-sm font-black text-slate-900">{detail.frstRegisterId}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100/50">
                            <div className="p-3 bg-white rounded-xl shadow-sm"><Calendar className="w-5 h-5 text-purple-500" /></div>
                            <div>
                                <div className="text-[9px] font-black text-slate-400 tracking-widest uppercase">등록일시</div>
                                <div className="text-sm font-black text-slate-900">{detail.frstRegisterPnttm}</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center gap-6 py-12 border-t bg-slate-50/50 px-10 rounded-b-3xl">
                    <Link href="/cop/scp/selectScrapList">
                        <Button variant="ghost" className="h-14 px-12 gap-3 font-black uppercase tracking-widest text-slate-500 hover:bg-white hover:shadow-lg transition-all active:scale-95 border-2 border-transparent hover:border-indigo-100">
                            <ArrowLeft className="w-5 h-5" /> 목록으로 돌아가기
                        </Button>
                    </Link>
                    <a href={detail.scrapUrl} target="_blank" rel="noopener noreferrer">
                        <Button className="h-14 px-16 gap-3 font-black uppercase tracking-widest shadow-2xl bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 ring-8 ring-indigo-50">
                            <Globe className="w-5 h-5" /> 원본 페이지 방문
                        </Button>
                    </a>
                </CardFooter>
            </Card>
        </div>
    );
};

export default ScrapDetailPage;
