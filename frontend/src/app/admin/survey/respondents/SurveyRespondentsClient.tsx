'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';
import { SurveyRespondent, Survey } from '@/types/business/survey';
import { PageResponse } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Users2, ShieldAlert, User, Cake, Phone } from 'lucide-react';

const PAGE_SIZE = 10;

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
 * {@code /surveys/{srvyId}/respondents} 이고, 서비스도 설문 범위로 한정해 조회한다.
 * 종전에는 범위 한정이 빠져 다른 설문의 참여자가 섞여 나왔다(D-4 1단계에서 수정).
 */
export default function SurveyRespondentsClient() {
  const [srvyId, setSrvyId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 설문 선택기 — 응답자 조회에 srvyId 가 필수라 목록을 먼저 띄운다.
  const { data: surveys } = useQuery<PageResponse<Survey>>({
    queryKey: ['admin-surveys-for-respondents'],
    queryFn: () => surveyAdminService.getSurveyList({ pageIndex: 1, size: 100 }),
  });

  const { data, isLoading, error, refetch } = useQuery<PageResponse<SurveyRespondent>>({
    queryKey: ['admin-survey-respondents', srvyId, page, searchKeyword],
    queryFn: () => surveyAdminService.getRespondents(srvyId, { pageIndex: page, size: PAGE_SIZE, searchKeyword }),
    enabled: !!srvyId,
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

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="설문 응답자 관리"
        breadcrumbs={[{ label: '설문조사' }, { label: '응답자 관리' }]}
      />

      <HubHeader
        title="참여자 명부"
        highlight="설문 응답자"
        subtitle="설문별 참여자 신상 정보를 조회합니다. 개인정보가 포함되어 관리자만 열람할 수 있습니다."
        icon={Users2}
      />

      <div className="flex items-center gap-3">
        <label htmlFor="srvy-select" className="text-sm font-bold text-foreground shrink-0">
          설문 선택
        </label>
        <select
          id="srvy-select"
          value={srvyId}
          onChange={(e) => {
            setSrvyId(e.target.value);
            setPage(1);
          }}
          className="border rounded-lg px-3 py-2 text-sm bg-card max-w-md w-full"
        >
          <option value="">— 설문을 선택하세요 —</option>
          {(surveys?.list ?? []).map((s) => (
            <option key={s.srvyId} value={s.srvyId}>
              {s.srvyTtl}
            </option>
          ))}
        </select>
      </div>

      {!srvyId ? (
        <div className="p-20 text-center bg-card rounded-lg border-2 border-dashed border-border flex flex-col items-center gap-4">
          <ShieldAlert size={40} className="text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">
            설문을 선택하면 해당 설문의 응답자 명부가 표시됩니다.
          </p>
        </div>
      ) : (
        <StandardDataTable
          columns={columns}
          data={respondents}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          keyField="srvyRspdntId"
          pagination={{
            currentPage: page,
            totalPages: data?.totalPage || 1,
            onPageChange: setPage,
            totalCount: Number(data?.total || 0),
            pageSize: PAGE_SIZE,
          }}
          search={{
            placeholder: '응답자 이름 검색..',
            value: searchKeyword,
            onSearch: (keyword: string) => {
              setSearchKeyword(keyword);
              setPage(1);
            },
            onClear: () => {
              setSearchKeyword('');
              setPage(1);
            },
          }}
        />
      )}
    </div>
  );
}
