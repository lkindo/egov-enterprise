'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { useToast } from '@/app/components/ui/toast';
import { ShieldCheck, Users, ChevronRight, Key, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import { deptAdminService, Department } from '@/services/admin/system/DeptAdminService';
import { roleAdminService, AuthorInfo } from '@/services/admin/system/RoleAdminService';

const DEPTS_KEY = ['admin', 'departments'] as const;
const ROLES_KEY = ['admin', 'roles'] as const;

import { roleService } from '@/services/roleService';

export default function DeptAuthorityPage() {
  const { toast } = useToast();
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  // [async-parallel] 독립 API (부서, 권한 목록) 개별 useQuery
  const { data: deptsData, isLoading: deptsLoading } = useQuery({
    queryKey: DEPTS_KEY,
    queryFn: () => deptAdminService.getDepts(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => roleService.getAuthors(),
    staleTime: 5 * 60 * 1000,
  });

  const depts: Department[] = (deptsData as any)?.data || (deptsData as any)?.list || deptsData || [];
  const roles: AuthorInfo[] = (rolesData as any)?.data || (rolesData as any)?.list || rolesData || [];

  const loading = deptsLoading || rolesLoading;

  const columns = [
    {
      header: '권한 코드',
      accessor: (item: AuthorInfo) => item.authorCode,
      className: 'font-mono text-xs font-bold text-primary'
    },
    {
      header: '권한 명칭',
      accessor: (item: AuthorInfo) => item.authorNm,
      className: 'font-bold'
    },
    {
      header: '부여 여부',
      className: 'text-center',
      accessor: () => (
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
      )
    }
  ];

  const handleSave = () => {
    // TODO: implement save mutation
    toast('권한 변경사항이 저장되었습니다.', 'success');
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="부서별 권한 일괄 관리"
        breadcrumbs={[{ label: '보안관리' }, { label: '부서권한' }]}
        actions={
          <Button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:bg-primary/90 transition-all font-black h-11"
          >
            <Save size={18} /> 설정 저장
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left: Dept List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">부서 목록</h3>
          <div className="flex flex-col gap-2">
            {depts.map((d) => (
              <button
                key={d.orgnztId}
                onClick={() => setSelectedDept(d.orgnztId)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border text-left transition-all",
                  selectedDept === d.orgnztId
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                    : "bg-card hover:bg-accent"
                )}
              >
                <div className="flex items-center gap-3">
                  <Users size={18} />
                  <span className="text-sm font-bold">{d.orgnztNm}</span>
                </div>
                <ChevronRight size={14} className={selectedDept === d.orgnztId ? "opacity-100" : "opacity-30"} />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Role Mapping */}
        <div className="lg:col-span-3 space-y-4">
          {!selectedDept ? (
            <div className="h-full min-h-[400px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-muted-foreground p-12 text-center">
              <Key size={48} className="mb-4 opacity-10" />
              <p className="font-bold">권한을 설정할 부서를 선택해 주세요.</p>
              <p className="text-xs mt-1">좌측 리스트에서 부서를 선택하면 해당 부서 전체에 적용될 권한을 설정할 수 있습니다.</p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-6 bg-muted/20 border border-dashed rounded-3xl flex items-center gap-4 mb-2">
                <div className="p-3 bg-card rounded-2xl shadow-sm text-primary"><ShieldCheck size={20} /></div>
                <div>
                  <h4 className="text-sm font-black text-foreground">부서 권한 정책 안내</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">선택된 부서의 모든 소속원에게 아래 체크된 권한이 공통으로 부여됩니다.</p>
                </div>
              </div>

              <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
                <StandardDataTable
                  columns={columns}
                  data={roles}
                  loading={loading}
                  className="border-none rounded-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
