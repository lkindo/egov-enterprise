'use client';

import { useMemo, useState } from 'react';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { StandardDataTable, type Column } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * 업무 화면 패턴 갤러리 — A1(조회형 목록) 참조 구현.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A1.
 * 이 화면의 목적은 **시각 판단을 한 곳에 모으는 것**이다. 밀도·간격·문구를 화면마다 눈으로
 * 재발명하지 않도록, 카탈로그가 글로 규정한 문법이 실제로 어떻게 보이는지를 여기서만 확인한다.
 *
 * 데이터는 전부 이 파일 안의 정적 표본이다 — 서버·DB 를 타지 않으므로 실행 순서·시드 상태와
 * 무관하게 항상 같은 화면이 나온다(시각 회귀 기준선 후보 조건, DEC-OPS-017 참조).
 * 죽은 버튼을 두지 않기 위해(G10) 조회·정렬·페이지당 건수는 표본 위에서 실제로 동작하며,
 * 서버 계약이 필요한 내보내기는 이 갤러리의 범위가 아니라 아예 노출하지 않는다.
 */

interface SampleRequest {
  reqNo: string;
  title: string;
  dept: string;
  status: 'Y' | 'N' | 'R' | 'C';
  requestedAt: string;
  amount: number;
}

const SAMPLE_ROWS: SampleRequest[] = [
  { reqNo: 'RQ-2026-0012', title: '민원 처리 기한 연장 요청', dept: '민원지원과', status: 'R', requestedAt: '2026-08-21', amount: 3 },
  { reqNo: 'RQ-2026-0011', title: '공통코드 신규 등록 검토', dept: '정보화담당관', status: 'Y', requestedAt: '2026-08-21', amount: 12 },
  { reqNo: 'RQ-2026-0010', title: '부서 권한 재배정 협조', dept: '총무과', status: 'R', requestedAt: '2026-08-20', amount: 7 },
  { reqNo: 'RQ-2026-0009', title: '게시판 운영 정책 개정', dept: '홍보담당관', status: 'C', requestedAt: '2026-08-20', amount: 1 },
  { reqNo: 'RQ-2026-0008', title: '개인정보 처리방침 반영', dept: '감사담당관', status: 'Y', requestedAt: '2026-08-19', amount: 4 },
  { reqNo: 'RQ-2026-0007', title: '외부 연계 계정 회수', dept: '정보화담당관', status: 'N', requestedAt: '2026-08-19', amount: 22 },
  { reqNo: 'RQ-2026-0006', title: '설문 문항 승인 요청', dept: '기획예산과', status: 'C', requestedAt: '2026-08-18', amount: 9 },
  { reqNo: 'RQ-2026-0005', title: '보존기간 만료 자료 파기', dept: '기록물관리과', status: 'Y', requestedAt: '2026-08-18', amount: 156 },
  { reqNo: 'RQ-2026-0004', title: '야간 배치 작업 시간 조정', dept: '정보화담당관', status: 'R', requestedAt: '2026-08-17', amount: 2 },
  { reqNo: 'RQ-2026-0003', title: '민원 통계 산출 기준 변경', dept: '민원지원과', status: 'N', requestedAt: '2026-08-17', amount: 5 },
  { reqNo: 'RQ-2026-0002', title: '조직 개편 반영 부서 등록', dept: '총무과', status: 'C', requestedAt: '2026-08-16', amount: 18 },
  { reqNo: 'RQ-2026-0001', title: '접속 로그 보관 정책 검토', dept: '감사담당관', status: 'Y', requestedAt: '2026-08-16', amount: 31 },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'R', label: '대기' },
  { value: 'Y', label: '승인' },
  { value: 'N', label: '반려' },
  { value: 'C', label: '완료' },
];

const columns: Column<SampleRequest>[] = [
  // G4 — 첫 열은 상세로 갈 수 있는 식별 정보다. 표본에는 상세 화면이 없으므로 링크 대신
  // 식별자만 두고, 실제 화면에서는 이 자리에 상세 링크가 들어간다는 사실을 문서로 남긴다.
  { header: '요청번호', accessor: 'reqNo', sortKey: 'reqNo', className: 'font-mono' },
  { header: '제목', accessor: 'title', sortKey: 'title' },
  { header: '담당부서', accessor: 'dept', sortKey: 'dept' },
  { header: '상태', accessor: (item) => <StatusBadge status={item.status} /> },
  { header: '요청일', accessor: 'requestedAt', sortKey: 'requestedAt' },
  // G6 — 양적 데이터는 우측 정렬한다.
  {
    header: '건수',
    accessor: (item) => item.amount.toLocaleString(),
    sortKey: 'amount',
    className: 'text-right tabular-nums',
  },
];

export default function PatternGalleryClient() {
  const [keywordDraft, setKeywordDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const needle = keyword.trim();
    return SAMPLE_ROWS.filter((row) => {
      const matchesStatus = status === 'ALL' || row.status === status;
      const matchesKeyword = needle === ''
        || row.title.includes(needle)
        || row.dept.includes(needle)
        || row.reqNo.includes(needle);
      return matchesStatus && matchesKeyword;
    });
  }, [keyword, status]);

  const totalPages = Math.max(Math.ceil(filtered.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const applySearch = () => {
    setKeyword(keywordDraft);
    setPage(1);
  };

  const resetSearch = () => {
    setKeywordDraft('');
    setKeyword('');
    setStatus('ALL');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <p
        role="note"
        className="rounded-md border border-border bg-muted/40 px-[var(--filter-pad)] py-2 text-[length:var(--font-size-body)] text-muted-foreground"
      >
        정적 표본 데이터로 동작하는 <strong className="font-semibold text-foreground">참조 화면</strong>입니다. 실제 업무
        데이터가 아니며, 조회·정렬·페이지당 건수만 표본 위에서 동작합니다. 규칙 정본은 저장소 문서
        <span className="font-mono"> docs/02-architecture/work-screen-grammar-catalog.md </span>
        입니다.
      </p>

      <WorkListPage
        title="업무 요청 목록"
        description="A1 조회형 목록 archetype — 페이지 헤더 → 조회 조건 → 결과 툴바 → 표 순서를 고정합니다."
        filterStateKey="pattern-gallery-work-list"
        showBreadcrumb={false}
        totalCount={filtered.length}
        actions={
          <Button type="button" size="sm" variant="outline" onClick={resetSearch}>
            표본 초기화
          </Button>
        }
        filter={
          // G2 — 조회 조건은 상단 고정 영역이고, Enter 로 조회된다(A1 키보드 계약).
          <form
            className="grid gap-[var(--form-gap)] sm:grid-cols-[1fr_12rem_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              applySearch();
            }}
          >
            <div className="space-y-1">
              <label htmlFor="pattern-gallery-keyword" className="text-[length:var(--font-size-body)] font-medium">
                검색어
              </label>
              <Input
                id="pattern-gallery-keyword"
                value={keywordDraft}
                onChange={(event) => setKeywordDraft(event.target.value)}
                placeholder="제목·부서·요청번호"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="pattern-gallery-status" className="text-[length:var(--font-size-body)] font-medium">
                상태
              </label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="pattern-gallery-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm">조회</Button>
              <Button type="button" size="sm" variant="outline" onClick={resetSearch}>초기화</Button>
            </div>
          </form>
        }
      >
        <StandardDataTable<SampleRequest>
          accessibleLabel="업무 요청 표본 목록"
          columns={columns}
          data={rows}
          keyField="reqNo"
          emptyMessage="조회 조건에 맞는 요청이 없습니다."
          stickyHeader
          rowTestId="pattern-gallery-row"
          pagination={{
            currentPage,
            totalPages,
            onPageChange: setPage,
            pageSize,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
            pageSizeOptions: [10, 20, 50],
          }}
        />
      </WorkListPage>
    </div>
  );
}
