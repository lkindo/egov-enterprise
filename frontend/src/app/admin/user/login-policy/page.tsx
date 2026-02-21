'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { loginPolicyService, LoginPolicy } from '@/services/loginPolicyService';
import { useToast } from '@/app/components/ui/toast';
import { ShieldCheck, Smartphone, MonitorOff, Save, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPolicyPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<LoginPolicy[]>([]);
  const [searchWrd, setSearchWrd] = useState('');

  const loadPolicies = useCallback(async (keyword = searchWrd) => {
    try {
      setLoading(true);
      const res = await loginPolicyService.getPolicies({ page: 0, size: 20, searchWrd: keyword });
      if (res.success) setPolicies(res.data.content || []);
    } catch (error) {
      toast('로그인 정책을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast, searchWrd]);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const handleToggle = async (policy: LoginPolicy, field: 'dplctPermAt' | 'lmttAt') => {
    try {
      const newValue = policy[field] === 'Y' ? 'N' : 'Y';
      const updatedData = { ...policy, [field]: newValue };
      
      const res = await loginPolicyService.updatePolicy(policy.emplyrId, updatedData);
      if (res.success) {
        toast(`${field === 'dplctPermAt' ? '중복 허용' : '접속 제한'} 설정이 변경되었습니다.`, 'success');
        loadPolicies();
      }
    } catch (error) {
      toast('정책 수정 중 오류가 발생했습니다.', 'error');
    }
  };

  const columns = [
    { 
      header: '사용자 ID', 
      accessor: (item: LoginPolicy) => item.emplyrId, 
      className: 'font-bold' 
    },
    { 
      header: '성명', 
      accessor: (item: LoginPolicy) => item.emplyrNm 
    },
    { 
      header: '제한 IP', 
      accessor: (item: LoginPolicy) => item.ipInfo, 
      className: 'font-mono text-xs' 
    },
    { 
      header: '중복 허용', 
      accessor: (item: LoginPolicy) => (
        <button 
          onClick={() => handleToggle(item, 'dplctPermAt')}
          className={cn(
            "px-3 py-1 rounded-full text-[11px] font-black flex items-center gap-1 transition-all",
            item.dplctPermAt === 'Y' 
              ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          )}
        >
          {item.dplctPermAt === 'Y' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {item.dplctPermAt === 'Y' ? '허용' : '차단'}
        </button>
      )
    },
    { 
      header: '접속 제한', 
      accessor: (item: LoginPolicy) => (
        <button 
          onClick={() => handleToggle(item, 'lmttAt')}
          className={cn(
            "px-3 py-1 rounded-full text-[11px] font-black flex items-center gap-1 transition-all",
            item.lmttAt === 'Y' 
              ? "bg-red-100 text-red-700 hover:bg-red-200" 
              : "bg-green-100 text-green-700 hover:bg-green-200"
          )}
        >
          {item.lmttAt === 'Y' ? <MonitorOff size={12} /> : <ShieldCheck size={12} />}
          {item.lmttAt === 'Y' ? '제한중' : '정상'}
        </button>
      )
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: LoginPolicy) => (
        <div className="flex justify-end gap-2">
           <span className="text-[10px] text-muted-foreground italic">
             {item.regYn === 'Y' ? '설정됨' : '미설정'}
           </span>
        </div>
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
        onSearch={(v) => {
          setSearchWrd(v.searchWrd);
          loadPolicies(v.searchWrd);
        }}
      />

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <StandardDataTable 
          columns={columns} 
          data={policies} 
          loading={loading}
          emptyMessage="등록된 사용자가 없거나 정책 데이터가 없습니다."
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
