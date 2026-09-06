'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { surveyAdminService } from '@/services/foundation/survey/SurveyAdminService';
import { Survey } from '@/types/business/survey';
import { useToast } from '@/app/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { todayStorageYmd } from '@/lib/format-date';
import { SURVEY_STATUS_LABEL, displaySurveyYmd, getSurveyStatus } from '@/lib/survey-status';
import { Calendar, ArrowRight } from 'lucide-react';

export default function SurveyClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Survey[]>([]);
  const [total, setTotal] = useState<number | undefined>(undefined);
  // 목록은 클라이언트에서 불러오므로 기준일이 SSR 마크업에 실리지 않는다.
  const [today] = useState(() => todayStorageYmd());

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await surveyAdminService.getSurveys({ page: 0, size: 10 });
        setData(res.list || []);
        setTotal(typeof res.total === 'number' ? res.total : undefined);
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
          <Calendar size={12} aria-hidden="true" />
          {displaySurveyYmd(item.srvyBgngYmd) || '시작일 없음'} ~ {displaySurveyYmd(item.srvyEndYmd) || '종료일 없음'}
        </div>
      )
    },
    {
      /*
       * [2026-09-05] 기간만 보여 주고 상태를 말하지 않아 종료된 설문도 '참여할 수 있는 설문' 처럼
       * 보였다. 판정은 서버(SurveyResultService.assertWithinPeriod)와 같은 규칙이다.
       */
      header: '상태',
      accessor: (item: Survey) => {
        const status = getSurveyStatus(item, today);
        return (
          <Badge
            variant={status === 'active' ? 'success' : status === 'closed' ? 'secondary' : 'outline'}
            className="text-xs font-bold"
          >
            {SURVEY_STATUS_LABEL[status]}
          </Badge>
        );
      }
    },
    {
      header: '',
      className: 'text-right',
      accessor: (item: Survey) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/survey/${item.srvySn}`);
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
    /*
      종전 이 화면의 검색 필터는 onSearch 가 `console.log` 뿐인 **동작하지 않는 컨트롤**이었다
      (카탈로그 G10 금지). 서버 검색 계약을 새로 만드는 것은 이 이행의 범위가 아니므로
      거짓 어포던스를 제거한다 — 검색이 필요해지면 조회 조건을 서버 파라미터와 함께 되살린다.
    */
    <WorkListPage
      title="온라인 설문 조사"
      description="진행 중인 설문에 응답하고, 종료된 설문은 결과 통계를 확인합니다."
      breadcrumbItems={[{ label: '업무지원' }, { label: '설문조사' }]}
      totalCount={total}
    >
      <StandardDataTable<Survey>
        accessibleLabel="설문 조사 목록"
        columns={columns}
        data={data}
        loading={loading}
        onRowClick={(item) => router.push(`/survey/${item.srvySn}`)}
        rowActionLabel={(item) => (
          getSurveyStatus(item, today) === 'active'
            ? `${item.srvyTtl || `${item.srvySn}번`} 설문 응답 열기`
            : `${item.srvyTtl || `${item.srvySn}번`} 설문 결과 보기`
        )}
        emptyMessage="등록된 설문 조사가 없습니다."
      />
    </WorkListPage>
  );
}
