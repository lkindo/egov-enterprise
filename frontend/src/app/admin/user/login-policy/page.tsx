'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { loginPolicyService, LoginPolicy } from '@/services/loginPolicyService';
import { useToast } from '@/app/components/ui/toast';
import { ShieldCheck, UserCheck, Smartphone, MonitorOff, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPolicyPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<LoginPolicy[]>([]);

  const loadPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await loginPolicyService.getPolicies({ page: 0, size: 20 });
      if (res.success) setPolicies(res.data.content || []);
    } catch (error) {
      toast('로그인 정책을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const columns = [
    { header: '사용자 ID', accessor: 'emplyrId', className: 'font-bold' },
    { header: '성명', accessor: 'userNm' },
    { header: '제한 IP', accessor: 'ipAdres', className: 'font-mono text-xs' },
    { 
      header: '중복 허용', 
      accessor: (item: LoginPolicy) => (
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-black",
          item.dplctPermitAt === 'Y' ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"
        )}>
          {item.dplctPermitAt === 'Y' ? '허용' : '차단'}
        </span>
      )
    },
    { 
      header: '접속 제한', 
      accessor: (item: LoginPolicy) => (
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-black",
          item.lmttAt === 'Y' ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
        )}>
          {item.lmttAt === 'Y' ? '제한중' : '정상'}
        </span>
      )
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: () => (
        <button className="p-2 hover:bg-accent rounded-lg text-primary transition-all"><Save size={16} /></button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="로그인 보안 및 정책 관리" 
        breadcrumbs={[{ label: '사용자관리' }, { label: '로그인정책' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PolicyInfoCard title="IP 기반 보안" description="특정 IP에서만 접근을 허용합니다." icon={<ShieldCheck size={20} />} />
        <PolicyInfoCard title="중복 로그인" description="다중 장치 접속을 제어합니다." icon={<Smartphone size={20} />} />
        <PolicyInfoCard title="계정 잠금" description="실패 횟수에 따른 임시 차단 정책." icon={<MonitorOff size={20} />} />
      </div>

      <StandardSearchFilter 
        fields={[
          { name: 'searchWrd', label: '사용자 검색', type: 'text', placeholder: '이름 또는 ID...' }
        ]}
        onSearch={(v) => console.log('Searching...', v)}
      />

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <StandardDataTable 
          columns={columns} 
          data={policies} 
          loading={loading}
          emptyMessage="등록된 정책이 없습니다."
          className="border-none rounded-none"
        />
      </div>
    </div>
  );
}

function PolicyInfoCard({ title, description, icon }: any) {
  return (
    <div className="p-6 bg-muted/20 border border-dashed rounded-3xl flex items-center gap-4">
      <div className="p-3 bg-card rounded-2xl shadow-sm text-primary">{icon}</div>
      <div>
        <h4 className="text-sm font-black text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
