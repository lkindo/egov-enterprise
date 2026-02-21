'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { StandardChartWrapper } from '@/app/components/ui/standard-chart-wrapper';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { vacationService } from '@/services/vacationService';
import { Vacation } from '@/types/vacation';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Check, X, FileSearch } from 'lucide-react';

export default function AdminVacationPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  
  const [loading, setLoading] = useState(true);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [statsData, setStatsData] = useState<any[]>([]);

  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        vacationService.getAllVacations({ page: 0, size: 20 }),
        vacationService.getYearlyLeaveStats(new Date().getFullYear().toString())
      ]);

      if (listRes.success) setVacations(listRes.data.content);
      
      // 차트 데이터 가공 (예: 상태별 건수)
      if (statsRes.success) {
        const mockChartData = [
          { name: '승인', count: listRes.data.content.filter((v: any) => v.confmAt === 'Y').length },
          { name: '대기', count: listRes.data.content.filter((v: any) => v.confmAt === 'R').length },
          { name: '반려', count: listRes.data.content.filter((v: any) => v.confmAt === 'N').length },
        ];
        setStatsData(mockChartData);
      }
    } catch (error) {
      toast('관리자 데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleApprove = async (item: Vacation, confmAt: 'Y' | 'N') => {
    const actionNm = confmAt === 'Y' ? '승인' : '반려';
    const isConfirmed = await confirm({
      title: `휴가 ${actionNm} 확인`,
      message: `[${item.applcntId}] 사용자의 휴가 신청을 ${actionNm}하시겠습니까?`,
      variant: confmAt === 'N' ? 'destructive' : 'default'
    });

    if (!isConfirmed) return;

    try {
      await vacationService.approveVacation({
        applcntId: item.applcntId,
        vcatnSe: item.vcatnSe,
        bgnde: item.bgnde,
        confmAt
      });
      toast(`성공적으로 ${actionNm}되었습니다.`, 'success');
      loadAdminData();
    } catch (error) {
      toast(`${actionNm} 처리 중 오류가 발생했습니다.`, 'error');
    }
  };

  const columns = [
    { 
      header: '신청자 ID', 
      accessor: (item: Vacation) => item.applcntId 
    },
    { 
      header: '구분', 
      accessor: (item: Vacation) => (
        <span className="font-medium text-primary">
          {item.vcatnSe === '01' ? '연차' : item.vcatnSe === '02' ? '반차' : '병가'}
        </span>
      )
    },
    { header: '기간', accessor: (item: Vacation) => `${item.bgnde} ~ ${item.endde}` },
    { header: '상태', accessor: (item: Vacation) => <StatusBadge status={item.confmAt} /> },
    {
      header: '관리 액션',
      className: 'text-right',
      accessor: (item: Vacation) => (
        item.confmAt === 'R' ? (
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => handleApprove(item, 'Y')}
              className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-md transition-colors"
              title="승인"
            >
              <Check size={18} />
            </button>
            <button 
              onClick={() => handleApprove(item, 'N')}
              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md transition-colors"
              title="반려"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">처리 완료</span>
        )
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="전사 휴가 관리 및 승인" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '휴가/연차 관리' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 통계 차트 영역 */}
        <StandardChartWrapper 
          title="휴가 신청 상태별 현황"
          type="bar"
          data={statsData}
          dataKeys={['count']}
          loading={loading}
          className="lg:col-span-1"
        />

        {/* 상세 목록 영역 */}
        <div className="lg:col-span-2 space-y-4">
          <StandardSearchFilter 
            fields={[
              { name: 'searchWrd', label: '사용자 검색', type: 'text', placeholder: 'ID 또는 이름...' },
              { name: 'status', label: '처리 상태', type: 'select', options: [
                { label: '전체', value: '' },
                { label: '대기중', value: 'R' },
                { label: '승인됨', value: 'Y' },
                { label: '반려됨', value: 'N' }
              ]}
            ]}
            onSearch={(v) => console.log('Admin Filtering...', v)}
            className="mb-0"
          />

          <StandardDataTable 
            columns={columns} 
            data={vacations} 
            loading={loading}
            emptyMessage="처리할 휴가 신청 내역이 없습니다."
          />
        </div>
      </div>
    </div>
  );
}
