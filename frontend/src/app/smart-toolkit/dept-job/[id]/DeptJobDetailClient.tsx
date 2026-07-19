'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ChevronRight, Home, Pencil, Trash2, User, Flag, Inbox } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { deptJobUserService } from '@/services/business/user/deptJob/DeptJobUserService';
import { DeptJobForm, DeptJobFormValues, PRIORITY_LABEL } from '@/components/business/deptJob/DeptJobForm';

/**
 * 부서 업무 상세·수정 화면.
 *
 * [종전 상태] 이 파일은 경로가 `[id]` 인데도 params 를 아예 받지 않고, 존재하지 않는
 * `/deptjob` 를 호출하는 **목록 화면의 복제본**이었다. 형제 경로인 `selectDeptJobDetail/[id]`
 * 는 이름과 달리 등록 폼의 복제본이었다(파일 주석이 스스로 인정하고 있었다).
 * 그래서 목록에서 행을 눌러도 상세가 아니라 빈 등록 폼이 떴고, 부서 업무의 상세·수정 화면은
 * 사실상 존재하지 않았다. 이 파일을 진짜 상세·수정 화면으로 대체한다.
 *
 * 조회·변경은 TanStack Query 로 다루고, 폼은 등록 화면과 공용인 DeptJobForm
 * (useAppForm + generated-zod 확장, FE 헌법 제7조·제13조 2항)을 쓴다.
 */
export default function DeptJobDetailClient({ deptTaskId }: { deptTaskId: string }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const [isEditing, setEditing] = React.useState(false);

    const { data: job, isLoading, isError } = useQuery({
        queryKey: ['dept-job', deptTaskId],
        queryFn: () => deptJobUserService.getDeptJob(deptTaskId),
        enabled: Boolean(deptTaskId),
    });

    const updateMutation = useMutation({
        mutationFn: (values: DeptJobFormValues) => deptJobUserService.updateDeptJob(deptTaskId, values),
        onSuccess: () => {
            toast.success('업무가 수정되었습니다.');
            setEditing(false);
            queryClient.invalidateQueries({ queryKey: ['dept-job', deptTaskId] });
            // 업무 워크플로우 탭의 목록도 갱신 대상이다.
            queryClient.invalidateQueries({ queryKey: ['work-jobs'] });
        },
        onError: () => toast.error('수정에 실패했습니다. 권한이 없거나 이미 삭제된 업무일 수 있습니다.'),
    });

    const deleteMutation = useMutation({
        mutationFn: () => deptJobUserService.deleteDeptJob(deptTaskId),
        onSuccess: () => {
            toast.success('업무가 삭제되었습니다.');
            queryClient.invalidateQueries({ queryKey: ['work-jobs'] });
            router.push('/smart-toolkit/dept-job');
        },
        onError: () => toast.error('삭제에 실패했습니다. 권한이 없거나 이미 삭제된 업무일 수 있습니다.'),
    });

    const handleDelete = async () => {
        const ok = await confirm({
            title: '업무 삭제',
            message: `'${job?.deptTaskNm || '제목 없음'}' 업무를 삭제하시겠습니까? 삭제한 업무는 되돌릴 수 없습니다.`,
            variant: 'destructive',
            confirmText: '삭제',
        });
        if (ok) deleteMutation.mutate();
    };

    if (isLoading) {
        return (
            <div className="p-10 space-y-6">
                <div className="h-8 w-64 bg-muted rounded animate-pulse" />
                <div className="h-64 bg-muted rounded animate-pulse" />
            </div>
        );
    }

    if (isError || !job) {
        return (
            <div className="p-10 text-center space-y-4">
                <p className="text-sm font-bold text-muted-foreground">
                    업무를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.
                </p>
                <Button variant="outline" onClick={() => router.push('/smart-toolkit/dept-job')} className="font-bold">
                    목록으로
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 space-y-8 max-w-4xl mx-auto">
            <nav className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Home size={14} />
                <ChevronRight size={12} />
                <Link href="/smart-toolkit/dept-job" className="hover:text-primary transition-colors">
                    업무 워크플로우
                </Link>
                <ChevronRight size={12} />
                <span className="text-foreground">{isEditing ? '업무 수정' : '업무 상세'}</span>
            </nav>

            <Card className="border-border shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border pb-6">
                    <div className="space-y-2 min-w-0">
                        <CardTitle className="text-xl font-black tracking-tight break-words">
                            {job.deptTaskNm}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="font-bold gap-1">
                                <Flag size={12} />
                                {PRIORITY_LABEL[job.prrtyRnk ?? ''] ?? '우선순위 미지정'}
                            </Badge>
                            <Badge variant="outline" className="font-bold gap-1">
                                <User size={12} />
                                {job.picNm ?? '담당자 미지정'}
                            </Badge>
                            <Badge variant="outline" className="font-bold gap-1">
                                <Inbox size={12} />
                                {job.deptTaskBoxNm ?? '업무함 미지정'}
                            </Badge>
                        </div>
                    </div>

                    {!isEditing && (
                        <div className="flex gap-2 shrink-0">
                            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="font-bold gap-1">
                                <Pencil size={14} />
                                수정
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDelete}
                                disabled={deleteMutation.isPending}
                                className="font-bold gap-1 text-rose-600 hover:text-rose-700"
                            >
                                <Trash2 size={14} />
                                삭제
                            </Button>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="pt-6">
                    {isEditing ? (
                        <DeptJobForm
                            mode="edit"
                            initialData={job as Partial<DeptJobFormValues>}
                            onSubmit={async (values) => {
                                await updateMutation.mutateAsync(values);
                            }}
                            onCancel={() => setEditing(false)}
                        />
                    ) : (
                        <div className="space-y-6">
                            <section className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">업무 내용</h3>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                                    {job.deptTaskCn?.trim() ? job.deptTaskCn : '작성된 내용이 없습니다.'}
                                </p>
                            </section>

                            <section className="grid gap-4 sm:grid-cols-2 border-t border-border pt-6">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground">등록자</p>
                                    <p className="text-sm font-bold">{job.frstRgtrId ?? '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground">식별자</p>
                                    <p className="text-sm font-mono break-all">{job.deptTaskId}</p>
                                </div>
                            </section>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Button variant="ghost" onClick={() => router.push('/smart-toolkit/dept-job')} className="font-bold gap-2">
                <ArrowLeft size={16} />
                목록으로
            </Button>
        </div>
    );
}
