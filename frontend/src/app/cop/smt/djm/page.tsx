'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { deptJobService, DeptJob } from '@/services/deptJobService';
import { useToast } from '@/app/components/ui/toast';
import { Briefcase, Plus, CheckCircle2, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DeptJobPage() {
  const { toast } = useToast();
  const [data, setData] = useState<DeptJob[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await deptJobService.getDeptJobs({ page: 0, size: 20 });
      if (res.success) setData(res.data.content || []);
    } catch (error) {
      toast('업무 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const columns = [
    { 
      header: '우선순위', 
      accessor: (item: DeptJob) => (
        <span className={cn(
          "text-[10px] font-black px-2 py-0.5 rounded",
          item.priort === '1' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
        )}>
          {item.priort === '1' ? '긴급' : '보통'}
        </span>
      ),
      className: 'w-24'
    },
    { header: '업무명', accessor: 'deptJobNm', className: 'font-bold text-foreground' },
    { header: '담당자', accessor: 'chargerNm' },
    { 
      header: '상태', 
      accessor: (item: DeptJob) => (
        <div className="flex items-center gap-2">
          {item.sttus === '2' ? <CheckCircle2 size={14} className="text-green-500" /> : <Clock size={14} className="text-orange-500" />}
          <span className="text-xs font-medium">{item.sttus === '2' ? '완료' : '진행중'}</span>
        </div>
      )
    },
    { header: '등록일', accessor: (item: DeptJob) => item.createdDate.substring(0, 10), className: 'text-xs text-muted-foreground' }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        title="부서 업무 협업 센터" 
        breadcrumbs={[{ label: '협업지원' }, { label: '부서업무' }]}
        actions={
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all">
            <Plus size={18} /> 새 업무 배정
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatItem title="전체 업무" count={data.length} icon={<Briefcase size={20} />} color="blue" />
        <StatItem title="진행 중" count={data.filter(j => j.sttus === '1').length} icon={<Clock size={20} />} color="orange" />
        <StatItem title="완료됨" count={data.filter(j => j.sttus === '2').length} icon={<CheckCircle2 size={20} />} color="green" />
      </div>

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <StandardDataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          emptyMessage="등록된 부서 업무가 없습니다."
          className="border-none rounded-none"
        />
      </div>
    </div>
  );
}

function StatItem({ title, count, icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    green: "bg-green-50 text-green-600"
  };
  return (
    <div className="p-6 bg-card border rounded-2xl shadow-sm flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
        <h4 className="text-2xl font-black mt-1">{count} <span className="text-sm font-normal text-muted-foreground">건</span></h4>
      </div>
      <div className={cn("p-3 rounded-xl", colors[color])}>{icon}</div>
    </div>
  );
}
