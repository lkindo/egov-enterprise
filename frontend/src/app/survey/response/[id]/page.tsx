'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { reportService, WorkReport } from '@/services/user/ReportService';
import { useToast } from '@/app/components/ui/toast';
import { FileText, Plus, Calendar, ArrowRight, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WorkReportListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = (await reportService.getReports({ page: 0, size: 20 })) as any;
        if (res?.success) setReports(res.data.content || []);
      } catch (error) {
        toast('보고서 목록을 불러오지 못했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const columns = [
    {
      header: '유형',
      accessor: (item: WorkReport) => (
        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-muted rounded">
          {item.reprtSe === '1' ? 'WEEKLY' : 'MONTHLY'}
        </span>
      ),
      className: 'w-24'
    },
    {
      header: '제목',
      accessor: (item: WorkReport) => item.reprtSj,
      className: 'font-bold'
    },
    {
      header: '보고일',
      accessor: (item: WorkReport) => item.reprtDe,
      className: 'text-xs text-muted-foreground'
    },
    {
      header: '작성자',
      accessor: (item: WorkReport) => item.wrterId
    },
    {
      header: '상태',
      accessor: (item: WorkReport) => <StatusBadge status={item.confmDt ? 'Y' : 'R'} />
    },
    {
      header: '',
      className: 'text-right',
      accessor: (item: WorkReport) => (
        <button
          onClick={() => router.push(`/smart-toolkit/work-report/${item.reprtId}`)}
          className="p-2 hover:bg-accent rounded-full transition-all text-primary"
        >
          <ArrowRight size={18} />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="업무 보고 센터"
        breadcrumbs={[{ label: '작업지원' }, { label: '주간/월간보고' }]}
        actions={
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all">
            <Plus size={18} /> 새 보고서 작성
          </button>
        }
      />

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <StandardDataTable
          columns={columns}
          data={reports}
          loading={loading}
          emptyMessage="등록된 보고서가 없습니다."
          className="border-none rounded-none"
        />
      </div>
    </div>
  );
}
