'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { surveyAdminService } from '@/services/foundation/survey/SurveyAdminService';
import { Survey } from '@/types/business/survey';
import { useToast } from '@/app/components/ui/toast';
import { Calendar, ArrowRight } from 'lucide-react';
;

export default function SurveyClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Survey[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await surveyAdminService.getSurveys({ page: 0, size: 10 });
        setData(res.list || []);
      } catch {
        toast('설문 목록을 불러오지 못했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const columns = [

    {
      header: '설문 제목',
      accessor: (item: Survey) => (
        <div className="font-bold text-foreground group-hover:text-primary transition-colors">
          {item.srvyTtl}
        </div>
      )
    },
    {
      header: '참여 기간',
      accessor: (item: Survey) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar size={12} />
          {item.srvyBgngYmd} ~ {item.srvyEndYmd}
        </div>
      )
    },
    {
      header: '',
      className: 'text-right',
      accessor: (item: Survey) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/survey/${item.srvyId}`);
          }}
          aria-label={`${item.srvyTtl || '설문'} 상세 이동`}
          className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-all"
        >
          <ArrowRight size={18} />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="온라인 설문 조사"
        breadcrumbs={[{ label: '업무지원' }, { label: '설문조사' }]}
      />

      <StandardSearchFilter
        fields={[
          { name: 'searchWrd', label: '설문명 검색', type: 'text', placeholder: '제목 입력...' }
        ]}
        onSearch={(v) => console.log('Filtering...', v)}
      />

      <div className="grid grid-cols-1 gap-6">
        <StandardDataTable<Survey>
          columns={columns}
          data={data}
          loading={loading}
          onRowClick={(item) => router.push(`/survey/${item.srvyId}`)}
          emptyMessage="등록된 설문 조사가 없습니다."
        />
      </div>
    </div>
  );
}
