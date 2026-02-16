'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { absenceService, UserAbsence } from '@/services/absenceService';
import { useToast } from '@/app/components/ui/toast';
import { UserX, UserCheck, ShieldOff, Search, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UserAbsencePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserAbsence[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await absenceService.getAbsences({ page: 0, size: 20 });
      if (res.success) setData(res.data.content || []);
    } catch (error) {
      toast('부재 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleAbsence = async (item: UserAbsence) => {
    try {
      const newStatus = item.userAbsnceAt === 'N'; // toggle
      const res = await absenceService.updateAbsence(item.userId, newStatus);
      if (res.success) {
        toast('부재 상태가 업데이트되었습니다.', 'success');
        loadData();
      }
    } catch (error) {
      toast('상태 변경 중 오류가 발생했습니다.', 'error');
    }
  };

  const columns = [
    { header: '사용자 ID', accessor: 'userId', className: 'font-mono' },
    { header: '성명', accessor: 'userNm', className: 'font-bold text-foreground' },
    {
      header: '부재 여부',
      accessor: (item: UserAbsence) => (
        <div className="flex items-center gap-2">
          {item.userAbsnceAt === 'Y' ? (
            <span className="flex items-center gap-1 text-red-600 font-bold text-xs bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
              <UserX size={12} /> 부재중
            </span>
          ) : (
            <span className="flex items-center gap-1 text-green-600 font-bold text-xs bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
              <UserCheck size={12} /> 정상
            </span>
          )}
        </div>
      )
    },
    { header: '최종 수정', accessor: 'lastUpdusrPnttm', className: 'text-[10px] text-muted-foreground' },
    {
      header: '상태 변경',
      className: 'text-right',
      accessor: (item: UserAbsence) => (
        <button
          onClick={() => handleToggleAbsence(item)}
          className="p-2 hover:bg-accent rounded-lg text-primary transition-all"
          title={item.userAbsnceAt === 'Y' ? '정상으로 변경' : '부재로 변경'}
        >
          <Save size={16} />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="사용자 부재 현황 관리"
        breadcrumbs={[{ label: '부가서비스' }, { label: '부재관리' }]}
      />

      <div className="p-6 bg-muted/20 border border-dashed rounded-3xl flex items-center gap-4 mb-6">
        <div className="p-3 bg-card rounded-2xl shadow-sm text-primary"><ShieldOff size={20} /></div>
        <div>
          <h4 className="text-sm font-black text-foreground">부재 관리 정책</h4>
          <p className="text-xs text-muted-foreground mt-0.5">업무 대행자 설정 및 시스템 접근 제한을 위해 부재 여부를 관리합니다.</p>
        </div>
      </div>

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <StandardDataTable
          columns={columns}
          data={data}
          loading={loading}
          emptyMessage="등록된 사용자 정보가 없습니다."
          className="border-none rounded-none"
        />
      </div>
    </div>
  );
}
