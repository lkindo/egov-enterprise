'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus, Settings2, ArrowRight, Zap, Lock, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  boardAdminService,
  type BoardMasterSummary,
} from '@/services/foundation/system/BoardAdminService';
import { boardMasterQueryOptions, invalidateBoardCaches } from '@/queries/board-master-query-options';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { canOpenPage } from '@/lib/auth/page-access';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { boardTypeLabel, findBoardType } from '@/lib/board/board-types';
import { findBoardMenuLinks, type BoardMenuLink, type MenuExposure } from '@/lib/board/board-menu-links';
import { toDisplayDateTime } from '@/lib/format-date';
import { boardOperationsHref } from './board-operations-tabs';
import { boardUsageNotes, DESIGNATION_LABELS } from './board-usage';
import { useBoardAccessSources } from './useBoardAccessSources';

type BulkPendingAction = 'activate' | 'deactivate';
type UseFilter = '' | 'Y' | 'N';

const USE_FILTER_OPTIONS: readonly { value: UseFilter; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'Y', label: '사용' },
  { value: 'N', label: '사용 안 함' },
];

function basisShort(link: BoardMenuLink): string {
  if (link.basis.kind === 'board-address') return '게시판 주소';
  if (link.basis.kind === 'hub-tab') return `허브 탭 ?tab=${link.basis.tab}`;
  return '허브 기본 탭(확인 불가)';
}

function exposureShort(exposure: MenuExposure): string {
  switch (exposure.kind) {
    case 'inactive': return '비활성';
    case 'hidden': return '보이는 그룹 없음';
    case 'admin-only': return '관리자 그룹만';
    case 'general': return '일반 그룹 표시';
    case 'no-permission': return '그룹 확인 권한 없음';
    case 'unknown': return '그룹 확인 불가';
  }
}

/**
 * 게시판 관리 목록(ADR-0040 §5.2). 조회 조건은 게시판 이름과 게시판 사용이고 `조회`·Enter 로 적용한다. 메뉴 연결은 서버 조회
 * 조건이 아니라 현재 쪽의 행에 대해 화면이 계산해 보이는 칸이다(메뉴 원장을 볼 권한이 없으면 확인 권한 없음).
 *
 * 설정 편집·영구 삭제는 운영 화면의 설정 탭으로 옮겼다. 행의 단건 비활성화는 일괄 사용 상태 바꾸기로 흡수했다 — 사용 안 함으로
 * 바꾸는 대상에 앱이 ID 로 직접 쓰는 게시판이 있으면 같은 확인에서 사용처를 나열한다.
 */
export function BoardMasterListClient() {
  const router = useRouter();
  const { user } = useAuth();
  const canUpdate = canPermission(user, 'BBS_MST_UPDATE');
  const confirm = useConfirm();
  const { toast } = useToast();
  const [searchWrd, setSearchWrd] = useState('');
  const [useFilter, setUseFilter] = useState<UseFilter>('');
  const [useDraft, setUseDraft] = useState<UseFilter>('');
  // [2026-10-23 ADR-0040 A0] 서버는 1 기반 page·size 로 나눠 준다(ADR-0036).
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [bulkPendingAction, setBulkPendingAction] = useState<BulkPendingAction | null>(null);
  const bulkPendingRef = useRef(false);

  const queryClient = useQueryClient();
  const canReadAllPosts = canPermission(user, 'BOARD_READ_ALL');
  const { data: boardData, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery({
    ...boardMasterQueryOptions.list({ searchKeyword: searchWrd, searchUseYn: useFilter || undefined, page, size }),
  });
  const { menuSource, groupSource } = useBoardAccessSources();
  const boardList = boardData?.list ?? [];
  const totalCount = boardData?.total ?? boardList.length;
  const totalPages = boardData?.totalPage ?? Math.max(1, Math.ceil(totalCount / size));
  const activeCount = boardList.filter((b) => b.useYn === 'Y').length;
  const standbyCount = boardList.filter((b) => b.useYn !== 'Y').length;

  const handleBulkStatusChange = async (items: BoardMasterSummary[], status: 'Y' | 'N', action: BulkPendingAction) => {
    if (!canUpdate || bulkPendingRef.current) return;
    const targets = items.filter((item) => item.bbsId);
    if (targets.length === 0) return;
    bulkPendingRef.current = true;
    setBulkPendingAction(action);
    try {
      const usage = status === 'N'
        ? targets.map((item) => ({ item, notes: boardUsageNotes(item.bbsId, item.designations) })).filter(({ notes }) => notes.length > 0)
        : [];
      const confirmed = await confirm({
        title: status === 'Y' ? '게시판 사용으로 바꾸기' : '게시판 사용 안 함으로 바꾸기',
        message: status === 'Y'
          ? `${targets.length.toLocaleString()}개 게시판을 사용으로 바꿉니다. 메뉴가 일반 그룹에 보이는지 운영 화면에서 확인하세요.`
          : `${targets.length.toLocaleString()}개 게시판을 사용 안 함으로 바꿉니다. 이용자에게 읽기·쓰기 모두 닫힙니다.`,
        confirmText: status === 'Y' ? '사용으로 바꾸기' : '사용 안 함으로 바꾸기',
        variant: status === 'Y' ? 'default' : 'destructive',
        details: (
          <div className="space-y-2 text-[length:var(--font-size-body)]">
            <p className="font-medium">대상: {targets.map((item) => item.bbsTtl).join(', ')}</p>
            {usage.length > 0 && (
              <div>
                <p className="font-medium">앱이 직접 쓰는 게시판이 있습니다. 사용 안 함이면 아래에서 보이지 않습니다.</p>
                <ul className="list-disc pl-5">
                  {usage.flatMap(({ item, notes }) => notes.map((note) => <li key={`${item.bbsId}:${note}`}>[{item.bbsTtl}] {note}</li>))}
                </ul>
              </div>
            )}
          </div>
        ),
        detailsLabel: '대상과 사용처',
      });
      if (!confirmed) return;
      await boardAdminService.batchUpdateBoardMasterStatus(targets.map((item) => item.bbsId), status);
      toast(`${targets.length.toLocaleString()}개 게시판을 ${status === 'Y' ? '사용으로' : '사용 안 함으로'} 바꿨습니다.`, status === 'Y' ? 'success' : 'info');
      // 사용 여부는 목록만의 값이 아니다 — 운영 화면 상세(버전)·이용 화면 메타·선택지·변경 이력·커뮤니티 게시판 목록도 다시 읽는다.
      void invalidateBoardCaches(queryClient);
    } catch (err) {
      toast(extractErrorMessage(err, '게시판 사용 상태를 바꾸지 못했습니다.'), 'error');
    } finally {
      bulkPendingRef.current = false;
      setBulkPendingAction(null);
    }
  };

  const menuLinkCell = (board: BoardMasterSummary) => {
    if (menuSource === null) return <span className="text-muted-foreground">확인하는 중…</span>;
    const links = findBoardMenuLinks(board.bbsId, menuSource, groupSource ?? { status: 'failed' }, board.bbsTtl);
    if (links.status === 'no-permission') return <span className="text-muted-foreground">확인 권한 없음</span>;
    if (links.status === 'unknown') return <span className="text-muted-foreground">확인 불가</span>;
    if (links.links.length === 0) return <span className="text-muted-foreground">연결 없음</span>;
    return (
      <ul className="space-y-0.5 text-left text-xs">
        {links.links.map((link) => (
          <li key={link.menuNo}>
            <span className="font-medium text-foreground">{link.path.join(' › ')}</span>
            {' · '}{basisShort(link)}{' · '}{exposureShort(link.exposure)}
            {link.nameDiffers && <span className="text-muted-foreground"> · 메뉴 이름이 게시판 이름과 다름</span>}
          </li>
        ))}
      </ul>
    );
  };

  const columns: Column<BoardMasterSummary>[] = [
    {
      header: '게시판',
      accessor: (board: BoardMasterSummary) => (
        <div className="min-w-0 space-y-0.5 overflow-hidden text-left">
          <p className="truncate text-[length:var(--font-size-body)] font-medium leading-tight text-foreground">{board.bbsTtl}</p>
          <p className="truncate font-mono text-xs leading-tight text-muted-foreground">{board.bbsId}</p>
          {board.designations.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {board.designations.map((designation) => (
                <Badge key={designation} variant="secondary" className="px-1.5 py-0 text-xs font-normal">{DESIGNATION_LABELS[designation] ?? designation}</Badge>
              ))}
            </div>
          )}
        </div>
      ),
      className: 'max-w-[320px]'
    },
    {
      header: '화면 유형',
      accessor: (board: BoardMasterSummary) => {
        // [2026-10-16 DEC-OPS-332] 유형 이름은 정본(lib/board/board-types)에서 읽는다. 짝이 맞지 않으면 저장값과 그 사실을 보인다.
        const mismatch = findBoardType(board.bbsTypeCd)?.templateId !== board.tmpltId;
        return (
          <div className="min-w-0 text-left">
            <Badge variant="secondary" className="border border-border bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
              {boardTypeLabel(board.bbsTypeCd, board.tmpltId)}
            </Badge>
            {mismatch && <p className="mt-0.5 text-xs text-muted-foreground">템플릿 짝 불일치</p>}
          </div>
        );
      }
    },
    {
      header: '게시판 사용',
      accessor: (board: BoardMasterSummary) => (
        <div className="flex justify-center">
          {/* 색만으로 구분하지 않는다(WCAG 1.4.1) — 점과 글자를 함께 둔다. */}
          <Badge className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs font-normal",
            board.useYn === 'Y'
              ? "border-success/40 bg-success/15 text-foreground"
              : "border-border bg-muted text-muted-foreground"
          )}>
            <span className={cn("size-1.5 rounded-full", board.useYn === 'Y' ? "bg-success" : "bg-muted-foreground")} aria-hidden="true" />
            {board.useYn === 'Y' ? '사용' : '사용 안 함'}
          </Badge>
        </div>
      ),
      className: 'text-center'
    },
    {
      header: '메뉴 연결',
      accessor: (board: BoardMasterSummary) => menuLinkCell(board),
      className: 'max-w-[360px]'
    },
    {
      header: '작업',
      accessor: (board: BoardMasterSummary) => {
        // [2026-09-08] 사용 안 함 게시판은 이용 화면을 열 수 없다는 사실을 누르기 전에 밝힌다.
        // [2026-10-23 ADR-0040 결정 1] 조회 대행 권한자는 사용 안 함 게시판도 연다 — 운영 화면의 같은 단추와 같은 판정이다.
        const isOpenable = board.useYn === 'Y' || canReadAllPosts;
        const openLabel = isOpenable
          ? `${board.bbsTtl} 이용 화면 열기`
          : `${board.bbsTtl} 사용 안 함 게시판이라 이용 화면을 열 수 없습니다`;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              onClick={() => router.push(boardOperationsHref(board.bbsId))}
              size="sm"
              variant="ghost"
              aria-label={`${board.bbsTtl} 운영 화면 열기`}
              className="gap-1.5 rounded-md"
            >
              <Settings2 size={16} aria-hidden="true" />
              운영
            </Button>
            <Button
              onClick={() => router.push(`/admin/community/boards/select-board-list?bbsId=${board.bbsId}`)}
              disabled={!isOpenable}
              size="icon"
              variant="ghost"
              title={openLabel}
              aria-label={openLabel}
              className="rounded-md text-muted-foreground"
            >
              <ArrowRight size={20} aria-hidden="true" />
            </Button>
          </div>
        );
      },
      className: 'text-right'
    }
  ];

  return (
    <WorkListPage
      title="게시판 관리"
      description="게시판의 사용 여부와 메뉴 연결을 조회하고, 운영 화면에서 설정·메뉴·접근을 관리합니다."
      breadcrumbItems={[{ label: '관리 센터' }, { label: '콘텐츠 운영' }, { label: '게시판 관리' }]}
      filterStateKey="community-board-master"
      totalCount={isError ? undefined : totalCount}
      actions={
        // 생성 기능권한과 마법사 라우트 진입을 함께 본다(DIP B4 P1 — 라우트 게이트와 같은 판정).
        canPermission(user, 'BBS_MST_CREATE') && canOpenPage(user, '/admin/community/boards/maker') && (
          <Button size="sm" onClick={() => router.push('/admin/community/boards/maker')} className="gap-2">
            <Plus className="w-4 h-4" aria-hidden="true" />
            게시판 만들기
          </Button>
        )
      }
      filter={
        /*
          [2026-10-16 DEC-OPS-332] 서버의 검색 축은 게시판명(bbsTtl) 하나다 — bbsId 축은 없다.
          [2026-10-23 ADR-0040 §5.2] 게시판 사용 조건(전체·사용·사용 안 함)도 `조회`·Enter 로 함께 적용한다.
        */
        <KeywordFilter
          label="게시판명"
          placeholder="게시판명 검색"
          value={searchWrd}
          onSearch={(keyword) => { setPage(1); setSearchWrd(keyword); setUseFilter(useDraft); }}
          onReset={() => { setPage(1); setSearchWrd(''); setUseDraft(''); setUseFilter(''); }}
        >
          <div className="space-y-1">
            <label htmlFor="board-master-use-filter" className="text-[length:var(--font-size-body)] font-medium">게시판 사용</label>
            <select
              id="board-master-use-filter"
              value={useDraft}
              onChange={(event) => setUseDraft(event.target.value as UseFilter)}
              className="h-[var(--control-h)] rounded-md border border-border bg-card px-3 text-[length:var(--font-size-body)]"
            >
              {USE_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </KeywordFilter>
      }
      toolbarActions={
        /* 값은 모두 서버 응답에서 파생된다. 페이지로 나눠 받으므로 사용·사용 안 함 수는 이 페이지의 행만 센다. */
        <span className="text-[length:var(--font-size-body)] text-muted-foreground">
          이 페이지: 사용 <span className="font-bold text-foreground">{isLoading ? '—' : activeCount.toLocaleString()}</span>건 ·
          사용 안 함 <span className="font-bold text-foreground">{isLoading ? '—' : standbyCount.toLocaleString()}</span>건
          {dataUpdatedAt > 0 && <> · 조회 시각 {toDisplayDateTime(dataUpdatedAt)}</>}
        </span>
      }
    >
        <p className="mb-3 text-[length:var(--font-size-body)] text-muted-foreground">
          메뉴가 보인다고 게시판을 쓸 수 있는 것은 아닙니다. 게시글 권한은 모든 게시판에 함께 적용됩니다.
        </p>
        <StandardDataTable<BoardMasterSummary>
          columns={columns}
          data={boardList}
          loading={isLoading}
          error={isError ? error : null}
          onRetry={() => refetch()}
          enableSelection={canUpdate}
          keyField="bbsId"
          pagination={{
            currentPage: page,
            totalPages,
            onPageChange: setPage,
            // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
            pageSize: size,
            onPageSizeChange: (next) => { setSize(next); setPage(1); },
            pageSizeOptions: [10, 20, 50],
          }}
          bulkActions={canUpdate ? [
            {
              label: '사용으로 바꾸기',
              icon: bulkPendingAction === 'activate'
                ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                : <Zap size={16} aria-hidden="true" />,
              disabled: bulkPendingAction !== null,
              ariaBusy: bulkPendingAction === 'activate',
              pendingLabel: '사용으로 바꾸는 중...',
              onClick: (items: BoardMasterSummary[]) => { void handleBulkStatusChange(items, 'Y', 'activate'); }
            },
            {
              label: '사용 안 함으로 바꾸기',
              icon: bulkPendingAction === 'deactivate'
                ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                : <Lock size={16} aria-hidden="true" />,
              disabled: bulkPendingAction !== null,
              ariaBusy: bulkPendingAction === 'deactivate',
              pendingLabel: '사용 안 함으로 바꾸는 중...',
              onClick: (items: BoardMasterSummary[]) => { void handleBulkStatusChange(items, 'N', 'deactivate'); }
            }] : []}
          accessibleLabel="게시판 관리 목록"
          emptyMessage={emptyResultMessage(searchWrd, '등록된 게시판이 없습니다.')}
        />
    </WorkListPage>
  );
}
