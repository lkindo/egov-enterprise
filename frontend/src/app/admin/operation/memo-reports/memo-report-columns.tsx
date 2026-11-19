'use client';

import { cn } from '@/lib/utils';
import { MemoReportInfo } from '@/services/business/memoreport/memoReportService';
import { Column } from '@/app/components/ui/standard-data-table';

export function buildMemoReportColumns(page: number, pageSize: number): Column<MemoReportInfo>[] {
  return [
    {
      header: '번호',
      accessor: (_, index) => (
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {index !== undefined ? (index + 1 + (page - 1) * pageSize).toString().padStart(2, '0') : '-'}
        </span>
      ),
      className: 'w-20 text-center'
    },
    {
      header: '보고 제목',
      accessor: (report) => (
        <div className="flex flex-col gap-1 py-1">
          <div className="flex items-center gap-2">
            {!report.rptrInqDt && <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />}
            <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
              {report.rptTtl}
            </span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            {report.memoRptYmd}
          </span>
        </div>
      )
    },
    {
      header: '작성자',
      accessor: (report) => (
        <span className="text-xs font-bold text-muted-foreground tracking-tight">
          {report.wrterNm || report.userId || '-'}
        </span>
      ),
      className: 'w-32'
    },
    {
      header: '수신자',
      accessor: (report) => (
        <span className="text-xs font-bold text-muted-foreground tracking-tight">
          {report.rptrNm || report.rptrId || '-'}
        </span>
      ),
      className: 'w-32'
    },
    {
      header: '상태',
      accessor: (report) => (
        <div className={cn(
          "inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black tracking-widest transition-all",
          // palette-frozen: bg-emerald-500/10 text-emerald-600 border-emerald-500/20 -- 동결 부채: 시맨틱 토큰 이행 전(종전 색 동결표 승계, DEC-OPS-420)
          report.rptrInqDt ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"
        )}>
          {/*
            [2026-08-28] '수신확인' → '열람됨'. 당시 서버는 열람 주체를 구분하지 않아 작성자가
            자기 보고를 다시 열기만 해도 열람됨이 됐다.
            [2026-09-25 DIP I7] 서버가 수신자의 첫 열람만 rptrInqDt 로 남기므로 이제 열람됨은
            "받은 사람이 열어 봤다" 를 뜻한다(MemoReportService.readMemoReport).
          */}
          {report.rptrInqDt ? '열람됨' : '미열람'}
        </div>
      ),
      className: 'w-36 text-center'
    },
    {
      // [2026-10-01] 지시가 달린 보고를 목록에서 구분한다 — 응답에 이미 실려 오는데 상세를 열어야만 보였다.
      header: '지시',
      accessor: (report) => (report.drctnMttr?.trim()
        ? <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-medium text-foreground">지시 있음</span>
        : <span className="text-xs text-muted-foreground">없음</span>),
      className: 'w-28 text-center'
    }
  ];
}
