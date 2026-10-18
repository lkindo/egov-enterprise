'use client';

import type { MutableRefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AbsenceBadge } from '@/app/components/ui/absence-badge';
import { PagePagination } from '@/components/common/PagePagination';
import { SANCTION_STATUS, type InformalSanctionDto } from '@/services/business/user/approval/ApprovalUserService';
import { documentLabel } from './approval-decision';
import { PAGE_SIZE, currentTurn, formatYmd, isReadOnlyReference, sanctionKey } from './approval-hub-model';

/*
 * 결재 허브의 마스터 목록 — 불러오는 중·실패·빈 상태, 문서 행, 페이저(2026-10-18 허브 분해 때 ApprovalHubClient 에서 옮겼다 —
 * 마크업·문구·선택 시맨틱 그대로). 조회 조건과 빈 상태 문구(검색어·조건 구분)는 허브가 정해 넘긴다. 행을 고르거나 여러 건 승인에
 * 고르는 일은 허브가 받는다(작성 중 의견 확인·처리 중 차단은 허브 몫이다).
 */

/**
 * 상태 코드를 배지로. 색만으로 상태를 전달하지 않도록 라벨을 함께 낸다(카탈로그 A4 금지 항목).
 *
 * ⚠ 코드는 서버 열거형 그대로다 — 승인 'C', 반려 'R', 신청(대기) 'A'. 종전에는 'Y'/'N' 과 비교해
 *   모든 건이 '대기 중'으로 보였고, 하필 'R' 은 서버에서 **반려**인데 화면은 그것을 대기로 읽었다.
 */
function ApprovalStatusBadge({ aprvYn }: { aprvYn?: string }) {
  if (aprvYn === SANCTION_STATUS.APPROVED) {
    return <Badge variant="success" className="shrink-0 text-xs font-bold">승인 완료</Badge>;
  }
  if (aprvYn === SANCTION_STATUS.REJECTED) {
    return <Badge variant="destructive" className="shrink-0 text-xs font-bold">반려됨</Badge>;
  }
  if (aprvYn === SANCTION_STATUS.WITHDRAWN) return <Badge variant="secondary" className="shrink-0 text-xs font-bold">회수됨</Badge>;
  return <Badge variant="secondary" className="shrink-0 text-xs font-bold">대기 중</Badge>;
}

export function ApprovalQueueList({
  listLabel,
  showTurn,
  isLoading,
  hasError,
  onRetry,
  emptyText,
  list,
  selectedKey,
  hasVisibleSelection,
  turnReference,
  queued,
  bulkEligible,
  visibleBulkSelected,
  isActionPending,
  viewerId,
  itemButtonRefs,
  onSelect,
  onToggleBulk,
  total,
  page,
  totalPages,
  onPageChange,
}: {
  /** 목록 이름 — 탭 이름. */
  listLabel: string;
  /** 지금 차례인 사람을 보인다(대기함 밖의 탭). */
  showTurn: boolean;
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  /** 빈 목록의 문구 — 검색어·조건이 있으면 결과 없음, 아니면 데이터 없음(G15). */
  emptyText: string;
  list: InformalSanctionDto[];
  selectedKey: string;
  hasVisibleSelection: boolean;
  /** 단계가 시작된 뒤 지난 날을 셀 기준 시각(목록을 읽은 시각). */
  turnReference: number;
  queued: number[];
  bulkEligible: InformalSanctionDto[];
  visibleBulkSelected: string[];
  isActionPending: boolean;
  viewerId: string | undefined;
  itemButtonRefs: MutableRefObject<Map<string, HTMLButtonElement>>;
  onSelect: (key: string) => void;
  onToggleBulk: (key: string, checked: boolean) => void;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <>
      {isLoading ? (
        <div role="status" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          결재함을 불러오는 중입니다.
        </div>
      ) : hasError ? (
        <div role="alert" className="space-y-3 rounded-md border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm font-semibold text-destructive-emphasis">결재함을 불러오지 못했습니다.</p>
          <p className="text-xs text-muted-foreground">네트워크 상태를 확인한 뒤 다시 시도해 주세요.</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      ) : list.length === 0 ? (
        <div role="status" className="rounded-md border border-dashed border-border p-6 text-center">
          <p className="text-sm font-semibold text-foreground">
            {emptyText}
          </p>
        </div>
      ) : (
        <ul aria-label={`${listLabel} 목록`} className="space-y-2">
          {list.map((item, index) => {
            const key = sanctionKey(item);
            // ⚠ 종전에는 undefined === undefined 라 **전 행이 동시에 선택 상태**로 렌더됐다.
            const isSelected = Boolean(key) && selectedKey === key;
            const turn = currentTurn(item, turnReference);
            const isQueued = item.ifmlAtrzSn !== undefined && queued.includes(item.ifmlAtrzSn);
            const bulkable = bulkEligible.some(entry => sanctionKey(entry) === key);
            return (
              <li key={key || `approval-${index}`} data-testid="approval-item" className="flex items-start gap-2">
                {bulkable && (
                  <input
                    type="checkbox"
                    className="mt-4 size-4 shrink-0"
                    aria-label={`${documentLabel(item)} 여러 건 승인에 고르기`}
                    checked={visibleBulkSelected.includes(key)}
                    disabled={isActionPending}
                    onChange={(event) => onToggleBulk(key, event.target.checked)}
                  />
                )}
                <button
                  ref={(node) => {
                    if (node) itemButtonRefs.current.set(key, node);
                    else itemButtonRefs.current.delete(key);
                  }}
                  type="button"
                  data-a2-master-item
                  aria-current={isSelected ? 'true' : undefined}
                  aria-label={`${item.docTtl || item.taskSeNm || item.taskSeCd || '결재'} ${key ? `#${key}` : ''} 상세 열기`.replace(/\s+/g, ' ').trim()}
                  tabIndex={isSelected || (!hasVisibleSelection && index === 0) ? 0 : -1}
                  disabled={isActionPending}
                  onClick={() => onSelect(key)}
                  className={cn(
                    'w-full min-w-0 rounded-md border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/50 hover:bg-muted/40',
                  )}
                >
                  <span className="flex min-w-0 items-start justify-between gap-3">
                    <span className="min-w-0 break-words text-sm font-semibold text-foreground">
                      {item.docTtl || item.taskSeNm || item.taskSeCd || '일반 결재'}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {/* 참조로 받은 문서다 — 서버 판정(referenceViewer)으로만 표시한다. 이전 차수 참조자가 이 차수 결재자가 되면
                          처리할 차례가 있는 문서이므로 '참조' 로 부르지 않는다(처리 힌트가 있으면 결재 문서다). */}
                      {isReadOnlyReference(item, viewerId) && <Badge variant="outline" className="shrink-0 text-xs font-bold">참조</Badge>}
                      {isQueued ? <Badge variant="secondary" className="shrink-0 text-xs font-bold">처리 예정</Badge> : <ApprovalStatusBadge aprvYn={item.aprvYn} />}
                    </span>
                  </span>
                  {item.stages?.length ? (() => {
                    const current = item.stages.find(stage => stage.status === 'ACTIVE' || stage.status === 'REJECTED') ?? item.stages[item.stages.length - 1];
                    const completed = current.approvers?.filter(person => person.status === 'APPROVED').length ?? 0;
                    return <span className="mt-1 block text-xs text-muted-foreground">{current.order}/{item.stages.length}단계 · 전원 {current.kind === 'AGREEMENT' ? '동의' : '승인'} {completed}/{current.approvers?.length ?? 0}</span>;
                  })() : null}
                  {turn && showTurn && turn.waiting.length > 0 ? (
                    <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-foreground">
                      지금 차례: {turn.waiting.map(person => person.userNm || person.userId).join(', ')}
                      {turn.waiting.some(person => person.absent) && <AbsenceBadge absent />}
                      {turn.days !== null && <span className="text-muted-foreground">· {turn.days === 0 ? '오늘 차례가 됨' : `${turn.days}일째 대기`}</span>}
                    </span>
                  ) : turn && turn.days !== null && turn.days > 0 ? (
                    <span className="mt-1 block text-xs text-muted-foreground">{turn.days}일째 대기</span>
                  ) : null}
                  {item.openSupplement && <span className="mt-1 block text-xs font-semibold text-warning-emphasis">보완 요청 중</span>}
                  <span className="mt-2 flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {/* 알림이 '결재(번호 N)' 으로 문서를 가리킨다 — 목록에서 같은 번호로 찾을 수 있어야 한다. */}
                      {item.ifmlAtrzSn !== undefined && <span className="tabular-nums">번호 {item.ifmlAtrzSn} · </span>}
                      {item.aplcntNm || item.aplcntId || '기안자 미상'}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatYmd(item.reqYmd)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!isLoading && !hasError && totalPages > 1 && (
        <PagePagination
          total={total}
          page={page}
          size={PAGE_SIZE}
          onPageChange={onPageChange}
        />
      )}
    </>
  );
}
