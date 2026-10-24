'use client';

import { useMemo, useState } from 'react';
import { ReportPage } from '@/app/components/patterns/report-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, type Column } from '@/app/components/ui/standard-data-table';

/**
 * A7(현황 + 원본 표) 표본.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A7.
 * 지표·차트·원본 표가 같은 조회 조건 하나를 따르고, 집계 기준(basis)이 숫자 바로 아래에 있다.
 * 차트는 원본 표를 대신하지 않는다 — 막대 옆에 값을 함께 적고, 같은 값을 아래 표에서 다시 볼 수 있다.
 * 데이터는 이 파일 안의 정적 표본이다.
 */

interface SampleDeptCount {
  dept: string;
  received: number;
  done: number;
  overdue: number;
}

const SAMPLE_COUNTS: SampleDeptCount[] = [
  { dept: '민원지원과', received: 48, done: 41, overdue: 2 },
  { dept: '정보화담당관', received: 35, done: 33, overdue: 0 },
  { dept: '총무과', received: 22, done: 18, overdue: 1 },
  { dept: '감사담당관', received: 17, done: 17, overdue: 0 },
  { dept: '기획예산과', received: 12, done: 9, overdue: 1 },
];

const columns: Column<SampleDeptCount>[] = [
  { header: '부서', accessor: 'dept', sortKey: 'dept' },
  { header: '접수', accessor: (row) => row.received.toLocaleString(), sortKey: 'received', className: 'text-right tabular-nums' },
  { header: '처리', accessor: (row) => row.done.toLocaleString(), sortKey: 'done', className: 'text-right tabular-nums' },
  { header: '기한 경과', accessor: (row) => row.overdue.toLocaleString(), sortKey: 'overdue', className: 'text-right tabular-nums' },
];

export default function ReportSample() {
  const [keyword, setKeyword] = useState('');

  const rows = useMemo(() => {
    const needle = keyword.trim();
    return SAMPLE_COUNTS.filter((row) => needle === '' || row.dept.includes(needle));
  }, [keyword]);

  const totals = rows.reduce(
    (sum, row) => ({ received: sum.received + row.received, done: sum.done + row.done, overdue: sum.overdue + row.overdue }),
    { received: 0, done: 0, overdue: 0 },
  );
  const maxReceived = Math.max(1, ...rows.map((row) => row.received));

  return (
    <ReportPage
      title="부서별 요청 처리 현황"
      headingLevel={2}
      showBreadcrumb={false}
      description="A7 현황 + 원본 표 — 지표·차트·표가 같은 조회 조건을 따릅니다."
      filter={(
        <KeywordFilter
          label="부서"
          landmarkLabel="처리 현황 조회 조건"
          value={keyword}
          onSearch={setKeyword}
          onReset={() => setKeyword('')}
        />
      )}
      summary={(
        <dl className="grid gap-[var(--form-gap)] sm:grid-cols-3">
          {[
            { label: '접수', value: totals.received },
            { label: '처리', value: totals.done },
            { label: '기한 경과', value: totals.overdue },
          ].map((metric) => (
            <div key={metric.label} className="rounded-md border border-border bg-card p-3">
              <dt className="text-[length:var(--font-size-body)] text-muted-foreground">{metric.label}</dt>
              <dd className="text-xl font-semibold tabular-nums text-foreground">{metric.value.toLocaleString()}건</dd>
            </div>
          ))}
        </dl>
      )}
      basis="집계 기준: 2026-08-16 ~ 2026-08-21 접수분, 출처: 이 화면의 정적 표본(실제 업무 데이터 아님)."
      chartTitle="부서별 접수·처리"
      chart={rows.length === 0 ? (
        <p role="status" className="text-[length:var(--font-size-body)] text-muted-foreground">
          {emptyResultMessage(keyword, '집계할 표본이 없습니다.')}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.dept} className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-center gap-3 text-[length:var(--font-size-body)]">
              <span className="truncate text-foreground">{row.dept}</span>
              <span aria-hidden="true" className="relative h-3 rounded-sm bg-muted">
                <span className="absolute inset-y-0 left-0 rounded-sm bg-chart-1" style={{ width: `${(row.received / maxReceived) * 100}%` }} />
                <span className="absolute inset-y-0 left-0 rounded-sm bg-chart-2" style={{ width: `${(row.done / maxReceived) * 100}%` }} />
              </span>
              <span className="tabular-nums text-muted-foreground">
                접수 {row.received} · 처리 {row.done}
              </span>
            </li>
          ))}
        </ul>
      )}
      tableTitle="원본 데이터"
    >
      <StandardDataTable<SampleDeptCount>
        accessibleLabel="부서별 요청 처리 표본"
        columns={columns}
        data={rows}
        keyField="dept"
        emptyMessage={emptyResultMessage(keyword, '집계할 표본이 없습니다.')}
        rowTestId="pattern-gallery-report-row"
      />
    </ReportPage>
  );
}
