'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, ArrowLeft, Save, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import Link from 'next/link';
import { PageHeader } from '@/app/components/layout/page-header';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import {
    addressBookEditFormSchema,
    addressBookEditValidationLabels,
} from '../../address-book-form-validation';

const LIST_PATH = '/admin/collaboration/address-book/select-address-book-list';

/**
 * 주소록 상세/수정 화면.
 *
 * 과거 이 화면은 상세 라우트(`/select-address-book-detail/[id]`)에 있으면서도
 * 빈 "신규 등록" 폼을 렌더하고 POST 를 보내 **목록에서 항목을 열 때마다 중복 주소록이 생성**됐다
 * (게다가 `rlsScopeCd` 미전송으로 400 이 되던 상태). 이제 실제 상세를 조회해 수정/삭제한다.
 *
 * 상세 조회 API 에는 소유자 가드(`AddressBookService.getAddressBook` 의 `assertOwnerOrAdmin`)가
 * 적용되어 있으므로 타인의 주소록은 서버에서 차단된다(감사 F-3 선행 조치 완료 상태).
 */
const SelectAddressBookDetailClient = () => {
    const router = useRouter();
    const params = useParams();
    const rawAdbkSn = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
    const adbkSn = Number(rawAdbkSn);
    const hasValidAdbkSn = Number.isSafeInteger(adbkSn) && adbkSn > 0;
    const { toast } = useToast();
    const confirm = useConfirm();
    const queryClient = useQueryClient();
    const updatePendingRef = useRef(false);
    const deletePendingRef = useRef(false);
    const [isDeletePending, setIsDeletePending] = useState(false);
    const validation = useManualFormValidation(addressBookEditFormSchema, {
        labels: addressBookEditValidationLabels,
    });

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['address-book-detail', adbkSn],
        queryFn: () => addressbookUserService.getAddressBook(adbkSn),
        enabled: hasValidAdbkSn,
    });

    const [adbkNm, setAdbkNm] = useState('');
    useEffect(() => {
        if (data?.adbkNm !== undefined) setAdbkNm(data.adbkNm);
    }, [data?.adbkNm]);

    const updateMutation = useMutation({
        mutationFn: (payload: { adbkNm: string; rlsScopeCd: string }) =>
            // adbkMan 은 전송하지 않는다 — 서버는 adbkMan 이 null 이면 구성원을 건드리지 않고,
            // 빈 배열을 보내면 구성원 전원이 삭제된다.
            addressbookUserService.updateAddressBook(adbkSn, {
                adbkNm: payload.adbkNm,
                rlsScopeCd: payload.rlsScopeCd,
            }),
        onSuccess: () => {
            toast('주소록이 수정되었습니다.', 'success');
            queryClient.invalidateQueries({ queryKey: ['address-book-detail', adbkSn] });
            router.push(LIST_PATH);
        },
        onError: (mutationError: unknown) => {
            const fieldErrors = extractFieldErrors(mutationError);
            if (fieldErrors) validation.setFormErrors(fieldErrors);
            else toast(extractErrorMessage(mutationError, '수정에 실패했습니다.'), 'error');
        },
        onSettled: () => {
            updatePendingRef.current = false;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => addressbookUserService.deleteAddressBook(adbkSn),
        onSuccess: () => {
            toast('주소록이 삭제되었습니다.', 'success');
            router.push(LIST_PATH);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (updatePendingRef.current || deletePendingRef.current) return;
        const validated = validation.validate({
            adbkNm,
            rlsScopeCd: data?.rlsScopeCd ?? '',
        });
        if (!validated) return;
        updatePendingRef.current = true;
        updateMutation.mutate(validated);
    };

    const handleDelete = async () => {
        if (deletePendingRef.current || updatePendingRef.current) return;
        deletePendingRef.current = true;
        setIsDeletePending(true);
        try {
            const ok = await confirm({
                title: '주소록 삭제',
                message: `'${data?.adbkNm ?? adbkNm}' 주소록을 삭제합니다. 삭제 후에는 목록에서 조회할 수 없습니다.`,
                confirmText: '삭제',
                variant: 'destructive',
            });
            if (!ok) return;
            await deleteMutation.mutateAsync();
        } catch {
            toast('삭제에 실패했습니다.', 'error');
        } finally {
            deletePendingRef.current = false;
            setIsDeletePending(false);
        }
    };

    const members = data?.adbkMan ?? [];

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <PageHeader
                title="주소록 상세"
                breadcrumbs={[{ label: '협업관리' }, { label: '주소록', href: LIST_PATH }, { label: '상세' }]}
            />

            {isLoading ? (
                <div className="flex items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-sm font-bold">주소록 정보를 불러오는 중...</span>
                </div>
            ) : isError ? (
                /* [P1-1] 조회 실패를 빈 폼으로 위장하지 않는다. */
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
                    <AlertTriangle className="w-10 h-10 text-rose-500" />
                    <p className="text-sm font-bold text-foreground">주소록 정보를 불러오지 못했습니다.</p>
                    <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => { void refetch(); }}>다시 시도</Button>
                        <Link href={LIST_PATH}><Button variant="ghost">목록으로</Button></Link>
                    </div>
                </div>
            ) : (
                <Card className="shadow-2xl border-none overflow-hidden rounded-lg bg-card ring-1 ring-border">
                    <CardHeader className="border-b bg-muted/50 pb-10 pt-10 px-12">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <CardTitle className="text-3xl font-bold tracking-tighter flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                        <Users className="w-8 h-8" />
                                    </div>
                                    주소록 상세
                                </CardTitle>
                                <p className="text-muted-foreground font-medium mt-2">주소록 명칭을 수정하거나 주소록을 삭제할 수 있습니다.</p>
                            </div>
                            <Button
                                type="button"
                                variant="destructive"
                                aria-label={isDeletePending
                                    ? `${data?.adbkNm ?? ''} 주소록 삭제 중`
                                    : `${data?.adbkNm ?? ''} 주소록 삭제`}
                                aria-busy={isDeletePending}
                                onClick={() => { void handleDelete(); }}
                                disabled={isDeletePending || updateMutation.isPending}
                                className="rounded-lg h-11 gap-2 shrink-0"
                            >
                                {isDeletePending
                                    ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                                    : <Trash2 size={16} aria-hidden="true" />}
                                {isDeletePending ? '삭제 중...' : '삭제'}
                            </Button>
                        </div>
                    </CardHeader>

                    <form onSubmit={handleSubmit} noValidate>
                        <CardContent className="pt-12 px-12 space-y-10">
                            <FormErrorSummary
                                errors={validation.errors}
                                labels={addressBookEditValidationLabels}
                                onNavigate={validation.focusError}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-3">
                                    <Label htmlFor="adbkNm" className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                                        <span className="text-destructive-emphasis">*</span> 주소록 명칭
                                    </Label>
                                    <Input
                                        id="adbkNm"
                                        {...validation.fieldProps('adbkNm')}
                                        placeholder="주소록 명칭을 입력하세요"
                                        className="h-11 text-base border-2 border-border focus:border-primary/20 bg-muted/50 rounded-lg transition-all"
                                        value={adbkNm}
                                        onChange={(e) => {
                                            validation.clearError('adbkNm');
                                            setAdbkNm(e.target.value);
                                        }}
                                        maxLength={100}
                                        required
                                    />
                                    {validation.errors.adbkNm ? (
                                        <p {...validation.messageProps('adbkNm')} className="text-xs font-bold text-destructive-emphasis" />
                                    ) : null}
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="rlsScopeCd" className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                                        공개 범위 (수정 불가)
                                    </Label>
                                    <Input
                                        id="rlsScopeCd"
                                        {...validation.fieldProps('rlsScopeCd')}
                                        className="h-11 text-base border-2 border-border bg-muted rounded-lg"
                                        value={data?.rlsScopeCd ?? ''}
                                        readOnly
                                        aria-required="true"
                                    />
                                    {validation.errors.rlsScopeCd ? (
                                        <p {...validation.messageProps('rlsScopeCd')} className="text-xs font-bold text-destructive-emphasis" />
                                    ) : null}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-sm font-bold text-muted-foreground">구성원 ({members.length}명)</h2>
                                {members.length === 0 ? (
                                    <p className="text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg p-6">
                                        등록된 구성원이 없습니다.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto rounded-lg border border-border">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50">
                                                <tr>
                                                    <th scope="col" className="text-left font-bold px-6 py-3">성명</th>
                                                    <th scope="col" className="text-left font-bold px-6 py-3">이메일</th>
                                                    <th scope="col" className="text-left font-bold px-6 py-3">연락처</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {members.map((member, idx) => (
                                                    <tr key={member.adbkMbrSn || member.userId || `member-${idx}`}>
                                                        <td className="px-6 py-3 font-bold text-foreground">{member.nm || '-'}</td>
                                                        <td className="px-6 py-3 text-muted-foreground">{member.emlAddr || '-'}</td>
                                                        <td className="px-6 py-3 text-muted-foreground tabular-nums">{member.mblTelno || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {/*
                                  [2026-08-28] 문구 정정. 종전에는 '구성원 변경이 필요하면 새 주소록을
                                  등록하세요' 라고 안내했는데, 그건 사용자에게 불필요한 중복 생성을
                                  시키는 안내였다. 서버 PUT /address-books/{adbkSn} 는 adbkMan 으로
                                  구성원 추가·제거·연락 정보 갱신을 모두 지원한다(이번 변경에서 기존
                                  구성원 갱신이 조용한 no-op 이던 것도 함께 고쳤다).
                                  다만 그 편집을 여는 화면은 아직 없으므로, 없는 것은 없다고만 말한다.
                                */}
                                <p className="text-xs text-muted-foreground">
                                    구성원을 이 화면에서 편집하는 기능은 아직 제공되지 않습니다.
                                </p>
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col md:flex-row justify-center gap-6 py-12 border-t bg-muted/30 mt-10">
                            <Link href={LIST_PATH}>
                                <Button type="button" variant="ghost" className="h-11 px-10 gap-2 font-bold text-muted-foreground hover:bg-card transition-all rounded-lg">
                                    <ArrowLeft className="w-5 h-5" /> 목록으로
                                </Button>
                            </Link>
                            <Button
                                type="submit"
                                className="h-11 px-16 gap-3 font-bold bg-surface-inverse text-surface-inverse-foreground shadow-2xl hover:bg-primary transition-all active:scale-95 rounded-lg"
                                disabled={updateMutation.isPending || isDeletePending}
                                aria-busy={updateMutation.isPending || undefined}
                            >
                                {updateMutation.isPending ? (
                                    <span className="flex items-center gap-2 animate-pulse">저장 중...</span>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" /> 저장
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            )}
        </div>
    );
};

export default SelectAddressBookDetailClient;
