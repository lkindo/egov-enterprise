'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ChevronRight, Home, Pencil, Trash2, User, Flag, Inbox } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { deptJobUserService } from '@/services/business/user/deptJob/DeptJobUserService';
import { DeptJobForm, DeptJobFormValues, PRIORITY_LABEL } from '@/components/business/deptJob/DeptJobForm';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { useDirtyCloseGuard } from '@/hooks/useDirtyCloseGuard';

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
export default function DeptJobDetailClient({ deptTaskSn }: { deptTaskSn: number }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const [isEditing, setEditing] = React.useState(false);
    const actionPendingRef = React.useRef(false);
    const [activeAction, setActiveAction] = React.useState<'update' | 'delete' | null>(null);

    /*
      [미저장 보호] 종전에는 이 화면에 가드가 없었다. 같은 DeptJobForm 을 쓰는 등록 화면
      (DeptJobCreateClient)은 useUnsavedChanges 를 등록하는데 수정 경로만 비어 있어서,
      수정 토글을 켜고 입력하다 '목록으로'·브레드크럼을 누르면 경고 없이 사라졌다.
      보호는 화면 형태가 아니라 '편집 중인가'에 걸려야 한다.
    */
    const [editState, setEditState] = React.useState({ dirty: false, pending: false });
    const exitEdit = React.useCallback(() => {
        setEditing(false);
        setEditState({ dirty: false, pending: false });
    }, []);
    /*
      ⚠ 작업이 **성공으로 끝난 뒤의 이동**은 가드가 막으면 안 된다.

      UnsavedChangesProvider 의 navigate() 는 pending 인 guard 가 하나라도 있으면
      '저장 중입니다…' 토스트만 띄우고 이동을 **취소**한다. 그런데 삭제 성공 콜백이
      router.push 를 부르는 시점에는 activeAction 이 아직 'delete' 다(해제는 handleDelete
      의 finally 에서 일어난다). 그래서 가드를 처음 달았을 때 삭제 후 목록 복귀가
      조용히 막혔다 — e2e 25 'UI 삭제가 실제 삭제로 이어져야 한다' 가 이것을 잡았다.

      등록 화면(DeptJobCreateClient)이 쓰는 completedRef 패턴을 그대로 따른다.
    */
    const completedRef = React.useRef(false);
    // 라우터 이탈용 가드(다른 화면으로 나갈 때).
    useUnsavedChanges(() => ({
        dirty: isEditing && editState.dirty && !completedRef.current,
        pending: activeAction !== null && !completedRef.current,
    }));
    // 같은 화면에 머문 채 편집만 끄는 '취소'는 라우터 전이가 아니라 가드가 보지 못한다 —
    // 같은 문구의 확인을 직접 건다.
    const requestExitEdit = useDirtyCloseGuard(isEditing && editState.dirty, exitEdit);

    const { data: job, isLoading, isError } = useQuery({
        queryKey: ['dept-job', deptTaskSn],
        queryFn: () => deptJobUserService.getDeptJob(deptTaskSn),
        enabled: Number.isSafeInteger(deptTaskSn) && deptTaskSn > 0,
    });

    const updateMutation = useMutation({
        mutationFn: (values: DeptJobFormValues) => deptJobUserService.updateDeptJob(deptTaskSn, values),
        onSuccess: () => {
            toast.success('업무가 수정되었습니다.');
            // 저장했으므로 확인 없이 편집을 끄고 dirty 를 함께 내린다.
            exitEdit();
            queryClient.invalidateQueries({ queryKey: ['dept-job', deptTaskSn] });
            // 업무 워크플로우 탭의 목록도 갱신 대상이다.
            queryClient.invalidateQueries({ queryKey: ['work-jobs'] });
        },
        onError: (error) => {
            if (!extractFieldErrors(error)) {
                toast.error('수정에 실패했습니다. 권한이 없거나 이미 삭제된 업무일 수 있습니다.');
            }
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => deptJobUserService.deleteDeptJob(deptTaskSn),
        onSuccess: () => {
            toast.success('업무가 삭제되었습니다.');
            queryClient.invalidateQueries({ queryKey: ['work-jobs'] });
            // 이 이동은 '작업 완료 후 복귀'다 — 미저장 가드가 막으면 화면이 삭제된 업무에 머문다.
            completedRef.current = true;
            router.push('/smart-toolkit/dept-job');
        },
        onError: () => toast.error('삭제에 실패했습니다. 권한이 없거나 이미 삭제된 업무일 수 있습니다.'),
    });

    const handleDelete = async () => {
        if (actionPendingRef.current) return;
        actionPendingRef.current = true;
        setActiveAction('delete');
        try {
            const ok = await confirm({
                title: '업무 삭제',
                message: `'${job?.deptTaskNm || '제목 없음'}' 업무를 삭제하시겠습니까? 삭제한 업무는 되돌릴 수 없습니다.`,
                variant: 'destructive',
                confirmText: '삭제',
            });
            if (!ok) return;
            try {
                await deleteMutation.mutateAsync();
            } catch {
                // mutation onError가 사용자 안내를 소유하며 상세 화면은 그대로 유지한다.
            }
        } finally {
            actionPendingRef.current = false;
            setActiveAction(null);
        }
    };

    const handleUpdate = async (values: DeptJobFormValues) => {
        if (actionPendingRef.current) return;
        actionPendingRef.current = true;
        setActiveAction('update');
        try {
            await updateMutation.mutateAsync(values);
        } catch (error) {
            // 필드 오류만 공용 폼이 귀속·focus하도록 되돌린다.
            // 일반 오류는 mutation onError가 이미 안내했으므로 submit을 예외로 끝내지 않는다.
            if (extractFieldErrors(error)) throw error;
        } finally {
            actionPendingRef.current = false;
            setActiveAction(null);
        }
    };

    if (isLoading) {
        return (
            <div className="p-10 space-y-6">
                <h1 className="sr-only">부서 업무 상세를 불러오는 중</h1>
                <div className="h-8 w-64 bg-muted rounded animate-pulse" />
                <div className="h-64 bg-muted rounded animate-pulse" />
            </div>
        );
    }

    if (isError || !job) {
        return (
            <div className="p-10 text-center space-y-4">
                <h1 className="text-sm font-bold text-muted-foreground">
                    업무를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.
                </h1>
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
                        <h1 className="text-xl font-black tracking-tight break-words">
                            {job.deptTaskNm}
                        </h1>
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
                            <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={activeAction !== null} className="font-bold gap-1">
                                <Pencil size={14} />
                                수정
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDelete}
                                disabled={activeAction !== null}
                                aria-busy={activeAction === 'delete' || undefined}
                                aria-label={activeAction === 'delete' ? '업무 삭제 중' : '업무 삭제'}
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
                            initialData={job}
                            onSubmit={handleUpdate}
                            onCancel={requestExitEdit}
                            onEditStateChange={setEditState}
                            isPending={activeAction === 'update'}
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
                                    <p className="text-sm font-mono break-all">{job.deptTaskSn}</p>
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
