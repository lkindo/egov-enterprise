'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';
import { SurveyRespondent, Survey } from '@/types/business/survey';
import { PageResponse } from '@/types/foundation/system';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { ShieldAlert, User, Cake, Phone } from 'lucide-react';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

/** 전화번호 3분할 컬럼을 사람이 읽는 형태로 합친다. 하나라도 비면 '-' 로 둔다. */
const formatTelno = (item: SurveyRespondent) => {
  const parts = [item.rgnTelno, item.midTelno, item.endTelno].filter(Boolean);
  return parts.length === 3 ? parts.join('-') : '-';
};

/** yyyyMMdd → yyyy.MM.dd */
const formatBrdt = (brdt?: string) =>
  brdt && brdt.length === 8 ? `${brdt.slice(0, 4)}.${brdt.slice(4, 6)}.${brdt.slice(6)}` : '-';

/**
 * 설문 응답자 관리 화면.
 *
 * <p>응답자는 <b>설문 하위</b>로만 조회한다 — 백엔드 경로가
 * {@code /surveys/{srvySn}/respondents} 이고, 서비스도 설문 범위로 한정해 조회한다.
 * 종전에는 범위 한정이 빠져 다른 설문의 참여자가 섞여 나왔다(D-4 1단계에서 수정).
 */
export default function SurveyRespondentsClient({ embedded = false }: { embedded?: boolean }) {
  const [srvySn, setSrvySn] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 설문 선택기 — 응답자 조회에 srvySn 이 필수라 목록을 먼저 띄운다.
  const { data: surveys } = useQuery<PageResponse<Survey>>({
    queryKey: ['admin-surveys-for-respondents'],
    queryFn: () => surveyAdminService.getSurveyList({ pageIndex: 1, size: 100 }),
  });

  const { data, isLoading, error, refetch } = useQuery<PageResponse<SurveyRespondent>>({
    queryKey: ['admin-survey-respondents', srvySn, page, pageSize, searchKeyword],
    queryFn: () => surveyAdminService.getRespondents(srvySn!, { pageIndex: page, size: pageSize, searchKeyword }),
    enabled: srvySn !== null,
  });

  const respondents = data?.list ?? [];

  const columns: Column<SurveyRespondent>[] = [
    {
      header: '응답자',
      accessor: (item) => (
        <div className="flex items-center gap-2">
          <User size={14} className="text-primary/40" />
          <span className="font-bold text-foreground">{item.rspdntNm || '-'}</span>
        </div>
      ),
    },
    {
      header: '성별',
      accessor: (item) => <span className="text-sm text-muted-foreground">{item.gndrCd || '-'}</span>,
      className: 'w-20',
    },
    {
      header: '생년월일',
      accessor: (item) => (
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground tabular-nums">
          <Cake size={12} className="opacity-30" />
          {formatBrdt(item.brdt)}
        </div>
      ),
      className: 'w-36',
    },
    {
      header: '연락처',
      accessor: (item) => (
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground tabular-nums">
          <Phone size={12} className="opacity-30" />
          {formatTelno(item)}
        </div>
      ),
      className: 'w-40',
    },
    {
      header: '직업 유형',
      accessor: (item) => <span className="text-sm text-muted-foreground">{item.crTypeCd || '-'}</span>,
      className: 'w-28',
    },
  ];

  const filterNode = (
    <div className="space-y-[var(--form-gap)]">
      <div className="max-w-md space-y-1">
        <label htmlFor="srvy-select" className="text-[length:var(--font-size-body)] font-medium">
          설문 선택
        </label>
        <select
          id="srvy-select"
          value={srvySn ?? ''}
          onChange={(e) => {
            setSrvySn(e.target.value ? Number(e.target.value) : null);
            setPage(1);
          }}
          className="h-[var(--control-h)] w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">— 설문을 선택하세요 —</option>
          {(surveys?.list ?? []).map((s) => (
            <option key={s.srvySn} value={s.srvySn}>
              {s.srvyTtl}
            </option>
          ))}
        </select>
      </div>
      <KeywordFilter
        label="응답자 이름"
        placeholder="응답자 이름 검색"
        value={searchKeyword}
        onSearch={(keyword) => { setSearchKeyword(keyword); setPage(1); }}
      />
    </div>
  );

  const resultNode = srvySn === null ? (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border bg-card p-10 text-center">
      <ShieldAlert size={32} className="text-muted-foreground/40" aria-hidden="true" />
      <p className="text-[length:var(--font-size-body)] text-muted-foreground">
        설문을 선택하면 해당 설문의 응답자 명부가 표시됩니다.
      </p>
    </div>
  ) : (
    <StandardDataTable
      accessibleLabel="설문 응답자 목록"
      columns={columns}
      data={respondents}
      loading={isLoading}
      error={error}
      onRetry={() => refetch()}
      emptyMessage={emptyResultMessage(searchKeyword, '이 설문의 응답자가 없습니다.')}
      keyField="srvyRspdntId"
      pagination={{
        currentPage: page,
        totalPages: data?.totalPage || 1,
        onPageChange: setPage,
        // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
        pageSize,
        onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
        pageSizeOptions: PAGE_SIZE_OPTIONS,
      }}
    />
  );

  // 설문 허브의 탭으로 끼워 넣을 때는 셸(제목·브레드크럼)을 중첩하지 않는다 —
  // 허브가 이미 페이지의 h1 과 현재 위치를 소유하고 있다.
  if (embedded) {
    return (
      <div className="space-y-4">
        {filterNode}
        {resultNode}
      </div>
    );
  }

  return (
    <WorkListPage
      title="설문 응답자 관리"
      description="설문별 참여자 정보를 조회합니다. 개인정보가 포함되어 관리자만 열람할 수 있습니다."
      breadcrumbItems={[{ label: '설문조사' }, { label: '응답자 관리' }]}
      filterStateKey="survey-respondents"
      totalCount={srvySn === null || error ? undefined : Number(data?.total || 0)}
      filter={filterNode}
    >
      {resultNode}
    </WorkListPage>
  );
}
