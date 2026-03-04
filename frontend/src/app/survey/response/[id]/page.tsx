'use client';

import { useQuery } from '@tanstack/react-query';
import { getQustnrRespondInfoDetail } from '@/lib/api/survey';
import { useParams, useRouter } from 'next/navigation';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Calendar, User, FileText, Hash } from 'lucide-react';

export default function SurveyResponseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['survey-response', id],
        queryFn: () => getQustnrRespondInfoDetail(id),
        retry: false,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="container mx-auto py-10 text-center">
                <p className="text-destructive mb-4">에러: {error instanceof Error ? error.message : '데이터를 불러올 수 없습니다.'}</p>
                <Button onClick={() => router.back()}>뒤로 가기</Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-6">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">응답 상세 정보</h1>
                    <p className="text-muted-foreground mt-1">
                        설문 응답의 세부 내용을 확인합니다.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center">
                            <FileText className="mr-2 h-5 w-5 text-primary" />
                            응답 내용
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-muted/30 p-4 rounded-lg border">
                            <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                                {data?.respondAnswerCn || '응답 내용이 없습니다.'}
                            </p>
                        </div>

                        {data?.etcAnswerCn && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">기타 의견</h3>
                                <div className="bg-yellow-50/50 p-4 rounded-lg border border-yellow-100">
                                    <p className="text-sm">{data.etcAnswerCn}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center">
                            <User className="mr-2 h-5 w-5 text-primary" />
                            메타 정보
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">응답자</p>
                            <p className="font-medium">{data?.respondNm || '익명'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground text-foreground">등록 일시</p>
                            <div className="flex items-center text-sm">
                                <Calendar className="mr-2 h-3 w-3" />
                                <span className="font-mono">{data?.frstRegisterPnttm}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">설문 ID</p>
                            <div className="flex items-center text-sm">
                                <Hash className="mr-2 h-3 w-3" />
                                <span className="font-mono text-xs">{data?.qestnrId}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">문항 ID</p>
                            <div className="flex items-center text-sm">
                                <Hash className="mr-2 h-3 w-3" />
                                <span className="font-mono text-xs">{data?.qestnrQesitmId}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
