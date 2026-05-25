'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getQustnrRespondInfoDetail } from '@/lib/api/survey';
import { PageHeader } from '@/app/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, User, Calendar, ClipboardCheck, MessageSquare } from 'lucide-react';

export default function SurveyResponseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: response, isLoading, isError, error } = useQuery({
        queryKey: ['survey-response-detail', id],
        queryFn: () => getQustnrRespondInfoDetail(id),
        enabled: !!id,
        retry: 1
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">응답 상세 정보를 불러오는 중입니다...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-8 text-center space-y-4">
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg inline-block">
                    {error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.'}
                </div>
                <Button onClick={() => router.back()}>뒤로 가기</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-lg">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-3xl font-bold tracking-tight">설문 응답 상세</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1 border-none shadow-lg bg-slate-900 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                        <User size={120} />
                    </div>
                    <CardHeader>
                        <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] opacity-50">응답자 정보</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                        <div className="space-y-1">
                            <p className="text-3xl font-bold tracking-tighter">{response?.rspnsNm}</p>
                            <p className="text-xs font-bold text-slate-400">응답자 프로필</p>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">{response?.createdDate}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm font-bold underline underline-offset-4 decoration-emerald-500/30">검증된 응답</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 border-none shadow-xl">
                    <CardHeader className="border-b bg-muted/20">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-primary" /> 설문 제목: {response?.srvyTtl || '설문 정보 없음'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-8">
                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">설문 답변 내용</Label>
                            <div className="p-6 rounded-lg bg-slate-50 border-2 border-slate-100 min-h-[150px] leading-relaxed font-medium text-slate-800 shadow-inner">
                                {response?.rspdntAnsCn || '응답 내용이 등록되지 않았습니다.'}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-dashed">
                            <Button variant="outline" className="rounded-lg px-8" onClick={() => router.back()}>
                                목록으로
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function Label({ children, className }: any) {
    return (
        <span className={cn("block mb-2 font-semibold", className)}>
            {children}
        </span>
    );
}

const cn = (...inputs: any) => inputs.filter(Boolean).join(' ');
