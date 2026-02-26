'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSummaryCard } from '@/app/components/ui/standard-summary-card';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { StandardDatePicker } from '@/app/components/ui/standard-date-picker';
import { StandardTabs } from '@/app/components/ui/standard-tabs';
import { FormField } from '@/app/components/ui/standard-form';
import { vacationService } from '@/services/vacationService';
import { Vacation, YearlyLeave } from '@/types/vacation';
import { useToast } from '@/app/components/ui/toast';
import { Calendar as CalendarIcon, Palmtree, Clock, Plus, Trash2, CheckCircle, XCircle, Info, List } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { VacationCalendar } from './VacationCalendar';

export default function VacationPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [vacations, setVacations] = useState<Vacation[]>([]);
    const [yearlyLeave, setYearlyLeave] = useState<YearlyLeave | null>(null);
    const [activeTab, setActiveTab] = useState('list');

    // 모달 상태
    const [isModalOpen, setIsOpen] = useState(false);
    const [startDate, setStartDate] = useState<Date | undefined>(new Date());
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
    const [vcatnSe, setVcatnSe] = useState('01'); // 연차 기본
    const [reason, setReason] = useState('');

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const currentYear = new Date().getFullYear().toString();

            const [vacationResult, leaveResult] = await Promise.all([
                vacationService.getMyVacations({ page: 0, size: 50 }),
                vacationService.getMyYearlyLeave(currentYear)
            ]);

            setVacations(vacationResult.content || []);
            setYearlyLeave(leaveResult);
        } catch (error) {
            toast('휴가 정보를 불러오지 못했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSave = async () => {
        if (!startDate || !endDate || !reason) {
            toast('필수 항목을 모두 입력해 주세요.', 'error');
            return;
        }

        try {
            const payload: Partial<Vacation> = {
                vcatnSe,
                bgnde: format(startDate, 'yyyyMMdd'),
                endde: format(endDate, 'yyyyMMdd'),
                vcatnResn: reason,
                occrrncYear: startDate.getFullYear().toString()
            };

            await vacationService.requestVacation(payload);
            toast('휴가 신청이 완료되었습니다.', 'success');
            setIsOpen(false);
            setReason('');
            loadData();
        } catch (error) {
            toast('저장 중 오류가 발생했습니다.', 'error');
        }
    };

    const handleDelete = async (item: Vacation) => {
        if (!confirm('신청된 휴가를 삭제하시겠습니까?')) return;

        try {
            await vacationService.deleteVacation({
                applcntId: item.applcntId,
                vcatnSe: item.vcatnSe,
                bgnde: item.bgnde
            });
            toast('휴가가 삭제되었습니다.', 'success');
            loadData();
        } catch (error) {
            toast('삭제 중 오류가 발생했습니다.', 'error');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Y': return <span className="flex items-center gap-1 text-green-600 font-bold text-xs bg-green-50 px-2 py-0.5 rounded-full border border-green-100"><CheckCircle size={12} /> 승인</span>;
            case 'N': return <span className="flex items-center gap-1 text-red-600 font-bold text-xs bg-red-50 px-2 py-0.5 rounded-full border border-red-100"><XCircle size={12} /> 반려</span>;
            default: return <span className="flex items-center gap-1 text-blue-600 font-bold text-xs bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100"><Clock size={12} /> 대기</span>;
        }
    };

    const columns = [
        {
            header: '구분',
            accessor: (item: Vacation) => (
                <span className="font-bold text-primary">
                    {item.vcatnSeNm || (item.vcatnSe === '01' ? '연차' : item.vcatnSe === '02' ? '반차' : '기타')}
                </span>
            )
        },
        {
            header: '기간',
            accessor: (item: Vacation) => (
                <div className="flex flex-col text-xs">
                    <span className="font-mono">{item.bgnde.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}</span>
                    <span className="text-muted-foreground">~ {item.endde.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}</span>
                </div>
            )
        },
        { 
            header: '사유', 
            accessor: (item: Vacation) => item.vcatnResn, 
            className: 'max-w-[200px] truncate' 
        },
        { header: '상태', accessor: (item: Vacation) => getStatusBadge(item.confmAt) },
        {
            header: '관리',
            className: 'text-right',
            accessor: (item: Vacation) => (
                <div className="flex justify-end gap-1">
                    {item.confmAt === 'R' && (
                        <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    const tabs = [
        { id: 'list', label: '목록 조회', icon: <List size={16} /> },
        { id: 'calendar', label: '캘린더 현황', icon: <CalendarIcon size={16} /> }
    ];

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="휴가 및 연차 관리"
                breadcrumbs={[{ label: '부가서비스' }, { label: '휴가관리' }]}
                actions={
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
                    >
                        <Plus size={18} /> 휴가 신청
                    </button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <StandardSummaryCard
                    title="총 발생 연차"
                    value={yearlyLeave?.yrycOccrrncCo || 0}
                    unit="일"
                    icon={<CalendarIcon size={20} />}
                    variant="blue"
                />
                <StandardSummaryCard
                    title="사용 연차"
                    value={yearlyLeave?.useYrycCo || 0}
                    unit="일"
                    icon={<Clock size={20} />}
                    variant="orange"
                />
                <StandardSummaryCard
                    title="잔여 연차"
                    value={yearlyLeave?.remndrYrycCo || 0}
                    unit="일"
                    icon={<Palmtree size={20} />}
                    variant="green"
                />
            </div>

            <StandardTabs
                items={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
                className="mb-6"
            />

            {activeTab === 'list' ? (
                <div className="bg-card border-2 border-primary/5 rounded-[2rem] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                    <div className="p-8 border-b bg-muted/5 flex items-center justify-between">
                        <h3 className="text-lg font-black flex items-center gap-2.5">
                            <Info size={20} className="text-primary" />
                            나의 휴가 신청 내역
                        </h3>
                    </div>
                    <StandardDataTable
                        columns={columns}
                        data={vacations}
                        loading={loading}
                        emptyMessage="신청된 휴가 내역이 없습니다."
                    />
                </div>
            ) : (
                <VacationCalendar vacations={vacations} />
            )}

            {/* 신청 모달 */}
            <StandardModal isOpen={isModalOpen} onClose={() => setIsOpen(false)} title="신규 휴가 신청">
                <div className="space-y-6 p-4">
                    <FormField label="휴가 구분" required>
                        <select
                            value={vcatnSe}
                            onChange={(e) => setVcatnSe(e.target.value)}
                            className="w-full h-12 px-4 rounded-xl border-2 border-primary/5 text-sm outline-none bg-background focus:border-primary/20 transition-all"
                        >
                            <option value="01">연차</option>
                            <option value="02">반차</option>
                            <option value="03">병가</option>
                            <option value="04">특별휴가</option>
                        </select>
                    </FormField>

                    <div className="grid grid-cols-2 gap-6">
                        <FormField label="시작 일자" required>
                            <StandardDatePicker date={startDate} onDateChange={setStartDate} />
                        </FormField>
                        <FormField label="종료 일자" required>
                            <StandardDatePicker date={endDate} onDateChange={setEndDate} />
                        </FormField>
                    </div>

                    <FormField label="휴가 사유" required>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            className="w-full p-4 rounded-xl border-2 border-primary/5 text-sm outline-none resize-none focus:border-primary/20 transition-all"
                            placeholder="구체적인 사유를 입력하세요."
                        />
                    </FormField>

                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <button onClick={() => setIsOpen(false)} className="px-6 py-3 border-2 rounded-xl font-bold hover:bg-muted transition-all">취소</button>
                        <button onClick={handleSave} className="px-8 py-3 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">신청 완료</button>
                    </div>
                </div>
            </StandardModal>
        </div>
    );
}
