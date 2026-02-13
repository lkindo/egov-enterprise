'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { StandardDatePicker } from '@/app/components/ui/standard-date-picker';
import { FormField } from '@/app/components/ui/standard-form';
import { vacationService } from '@/services/vacationService';
import { Vacation, YearlyLeave } from '@/types/vacation';
import { Plus, Calendar, Info, Send } from 'lucide-react';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { format } from 'date-fns';

export default function VacationListPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  
  const [loading, setLoading] = useState(true);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [myLeave, setMyLeave] = useState<YearlyLeave | null>(null);
  
  // 모달 및 폼 상태
  const [isModalOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Vacation>>({
    vcatnSe: '01',
    vcatnResn: '',
    occrrncYear: new Date().getFullYear().toString()
  });
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const currentYear = new Date().getFullYear().toString();
      const [vacationRes, leaveRes] = await Promise.all([
        vacationService.getMyVacations({ page: 0, size: 10 }),
        vacationService.getMyYearlyLeave(currentYear)
      ]);

      if (vacationRes.success) setVacations(vacationRes.data.content);
      if (leaveRes.success) setMyLeave(leaveRes.data);
    } catch (error) {
      toast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRequest = async () => {
    if (!startDate || !endDate) {
      toast('휴가 기간을 선택해 주세요.', 'error');
      return;
    }

    const isConfirmed = await confirm({
      title: '휴가 신청 확인',
      message: `${format(startDate, 'yyyy-MM-dd')} 부터 ${format(endDate, 'yyyy-MM-dd')} 까지 휴가를 신청하시겠습니까?`,
      confirmText: '신청하기'
    });

    if (!isConfirmed) return;

    try {
      const payload = {
        ...formData,
        bgnde: format(startDate, 'yyyyMMdd'),
        endde: format(endDate, 'yyyyMMdd'),
      };

      const res = await vacationService.requestVacation(payload);
      if (res.success) {
        toast('휴가 신청이 완료되었습니다.', 'success');
        setIsOpen(false);
        // 리셋
        setStartDate(undefined);
        setEndDate(undefined);
        setFormData({ ...formData, vcatnResn: '' });
        loadData(); // 목록 새로고침
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '신청 중 오류가 발생했습니다.';
      toast(errorMsg, 'error');
    }
  };

  const columns = [
    { 
      header: '구분', 
      accessor: (item: Vacation) => (
        <span className="font-semibold text-primary">
          {item.vcatnSe === '01' ? '연차' : item.vcatnSe === '02' ? '반차' : '병가'}
        </span>
      )
    },
    { 
      header: '휴가 기간', 
      accessor: (item: Vacation) => (
        <div className="flex items-center gap-2 text-sm">
          <Calendar size={14} className="text-muted-foreground" />
          {item.bgnde} ~ {item.endde}
        </div>
      )
    },
    { header: '사유', accessor: 'vcatnResn', className: 'max-w-[200px] truncate' },
    { header: '신청일', accessor: 'reqstDe' },
    { 
      header: '상태', 
      accessor: (item: Vacation) => <StatusBadge status={item.confmAt} /> 
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        title="휴가/연차 현황" 
        breadcrumbs={[{ label: '협업지원' }, { label: '업무지원' }, { label: '휴가관리' }]}
        actions={
          <button 
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={18} />
            휴가 신청
          </button>
        }
      />

      {/* 요약 카드 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="전체 연차" value={myLeave?.yrycOccrrncCo} icon={<Calendar size={24} />} color="blue" />
        <StatCard title="사용한 연차" value={myLeave?.useYrycCo} icon={<CheckIcon size={24} />} color="red" />
        <StatCard title="잔여 연차" value={myLeave?.remndrYrycCo} icon={<Info size={24} />} color="primary" highlight />
      </div>

      <StandardSearchFilter 
        fields={[
          { name: 'searchWrd', label: '검색어', type: 'text', placeholder: '사유 검색...' },
          { name: 'vcatnSe', label: '구분', type: 'select', options: [
            { label: '전체', value: '' },
            { label: '연차', value: '01' },
            { label: '반차', value: '02' },
            { label: '병가', value: '03' }
          ]}
        ]}
        onSearch={(values) => console.log('Filtering...', values)}
      />

      <StandardDataTable 
        columns={columns} 
        data={vacations} 
        loading={loading}
        emptyMessage="신청된 휴가 내역이 없습니다."
      />

      {/* 신청 모달 */}
      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title="새 휴가 신청"
        maxWidth="md"
        footer={
          <>
            <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-semibold border rounded-lg hover:bg-accent transition-colors">취소</button>
            <button 
              onClick={handleRequest}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-all"
            >
              <Send size={16} />
              신청
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="휴가 구분" required>
              <select 
                value={formData.vcatnSe}
                onChange={(e) => setFormData({...formData, vcatnSe: e.target.value})}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="01">연차</option>
                <option value="02">반차</option>
                <option value="03">병가</option>
              </select>
            </FormField>
            <FormField label="발생 연도" required>
              <input 
                type="text" 
                value={formData.occrrncYear}
                readOnly
                className="w-full h-10 px-3 rounded-md border bg-muted/30 text-sm outline-none cursor-not-allowed"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="시작일" required>
              <StandardDatePicker date={startDate} onDateChange={setStartDate} placeholder="시작일 선택" />
            </FormField>
            <FormField label="종료일" required>
              <StandardDatePicker date={endDate} onDateChange={setEndDate} placeholder="종료일 선택" />
            </FormField>
          </div>

          <FormField label="신청 사유">
            <textarea 
              value={formData.vcatnResn}
              onChange={(e) => setFormData({...formData, vcatnResn: e.target.value})}
              placeholder="휴가 신청 사유를 입력해 주세요."
              className="w-full min-h-[100px] p-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </FormField>

          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex gap-3">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              <p className="font-bold mb-1">안내사항</p>
              <li>연차 신청 시 승인 전까지 잔여 연차는 차감되지 않습니다.</li>
              <li>반차는 시작일과 종료일을 동일하게 선택해 주세요.</li>
            </div>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}

// Helpers
function StatCard({ title, value, icon, color, highlight }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20",
    primary: "bg-white/20 text-white"
  };
  
  return (
    <div className={cn(
      "p-6 rounded-2xl border shadow-sm flex items-center justify-between",
      highlight ? "bg-primary text-primary-foreground shadow-lg border-primary" : "bg-card"
    )}>
      <div>
        <p className={cn("text-[10px] font-black uppercase tracking-widest", highlight ? "opacity-80" : "text-muted-foreground")}>{title}</p>
        <h4 className={cn("text-2xl font-black mt-1", highlight ? "text-3xl" : "")}>{value ?? 0} <span className="text-sm font-normal">일</span></h4>
      </div>
      <div className={cn("p-3 rounded-xl", colorMap[color])}>
        {icon}
      </div>
    </div>
  );
}

function CheckIcon({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>; }
