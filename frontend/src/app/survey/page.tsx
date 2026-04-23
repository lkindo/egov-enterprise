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
import { cn } from '@/lib/utils';

export default function SurveyListPage() {
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
      } catch (error) {
        toast('?ㅻЦ 紐⑸줉??遺덈윭?ㅼ? 紐삵뻽?듬땲??', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const columns = [

    {
      header: '?ㅻЦ ?쒕ぉ',
      accessor: (item: Survey) => (
        <div className="font-bold text-foreground group-hover:text-primary transition-colors">
          {item.qestnrSj}
        </div>
      )
    },
    {
      header: '李몄뿬 湲곌컙',
      accessor: (item: Survey) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar size={12} />
          {item.qestnrBeginDe} ~ {item.qestnrEndDe}
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
            router.push(`/survey/${item.qestnrId}`);
          }}
          className="p-2 hover:bg-primary/10 text-primary rounded-full transition"
        >
          <ArrowRight size={18} />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="?⑤씪???ㅻЦ 議곗궗"
        breadcrumbs={[{ label: '?낅Т吏?? }, { label: '?ㅻЦ議곗궗' }]}
      />

      <StandardSearchFilter
        fields={[
          { name: 'searchWrd', label: '?ㅻЦ紐?寃??, type: 'text', placeholder: '?쒕ぉ ?낅젰...' }
        ]}
        onSearch={(v) => console.log('Filtering...', v)}
      />

      <div className="grid grid-cols-1 gap-6">
        <StandardDataTable<Survey>
          columns={columns}
          data={data}
          loading={loading}
          onRowClick={(item) => router.push(`/survey/${item.qestnrId}`)}
          emptyMessage="?깅줉???ㅻЦ 議곗궗媛 ?놁뒿?덈떎."
        />
      </div>
    </div>
  );
}
