'use client';

import { useId, type MutableRefObject } from 'react';
import { Keyboard, RefreshCcw, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tab, TabList } from '@/app/components/ui/standard-tabs';
import { cn } from '@/lib/utils';
import type { InformalSanctionDto } from '@/services/business/user/approval/ApprovalUserService';
import type { ApprovalTab } from '@/queries/approval-query-options';
import { APPROVAL_UNDO_MS, queuedApprovalLabel } from './approval-undo-queue';
import { documentLabel, isAgreementStage, withObjectParticle } from './approval-decision';
import { APPROVAL_QUEUE_PANEL_ID, approvalTabId, type QueuedApproval } from './approval-hub-model';

/*
 * 결재 허브의 머리 단추(새로고침·집중 모드)와 대기열 머리 — 탭, 대기 건수 설명, 집중 모드 안내, 읽기 전용 알림 영역, 처리 예정(되돌리기 대기열)
 * (2026-10-18 허브 분해 때 ApprovalHubClient 에서 옮겼다 — 마크업·문구·포커스 대상 그대로). 탭 전환·되돌리기·지금 처리는
 * 허브가 받는다(작성 중 의견 확인과 포커스 이동은 허브 몫이다).
 */

/** 머리의 새로고침과 집중 모드 단추. 새 결재 기안 단추는 허브에 남는다(작성 중 의견 확인을 거친다). */
export function ApprovalHubToolbar({ isFetching, onRefresh, showFocusMode, focusMode, onToggleFocusMode }: {
  isFetching: boolean;
  onRefresh: () => void;
  /** 대기함이고 승인 권한이 있다 — 집중 모드는 대기함의 도구다. */
  showFocusMode: boolean;
  focusMode: boolean;
  onToggleFocusMode: () => void;
}) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        aria-label="결재함 목록 새로고침"
        disabled={isFetching}
        onClick={onRefresh}
      >
        <RefreshCcw aria-hidden="true" className={cn(isFetching && 'animate-spin')} />
        새로고침
      </Button>
      {showFocusMode && (
        <Button type="button" variant={focusMode ? 'default' : 'outline'} aria-pressed={focusMode} onClick={onToggleFocusMode}>
          <Keyboard aria-hidden="true" /> 집중 모드
        </Button>
      )}
    </>
  );
}

export function ApprovalHubNavigation({
  tabLabels,
  activeTab,
  pendingTotal,
  isActionPending,
  onTabChange,
  focusMode,
  announcement,
  queueNotice,
  onDismissNotice,
  queued,
  queuedDocs,
  list,
  queueButtonRefs,
  onUndo,
  onCommitNow,
}: {
  tabLabels: Record<ApprovalTab, string>;
  activeTab: ApprovalTab;
  /** 조건과 무관한 전체 대기 건수. */
  pendingTotal: number | undefined;
  isActionPending: boolean;
  onTabChange: (tab: ApprovalTab) => void;
  focusMode: boolean;
  announcement: string;
  /** 처리 예정 영역 밖에서 끝난 승인의 실패 안내. */
  queueNotice: string;
  onDismissNotice: () => void;
  queued: number[];
  queuedDocs: Record<number, QueuedApproval>;
  list: InformalSanctionDto[];
  queueButtonRefs: MutableRefObject<Map<number, HTMLButtonElement>>;
  onUndo: (id: number) => void;
  onCommitNow: (id: number) => void;
}) {
  const pendingCountId = useId();
  return (
    <div className="space-y-2">
    <TabList aria-label="결재 대기열 전환" className="flex flex-wrap items-center gap-2">
      {(Object.keys(tabLabels) as ApprovalTab[]).map((tab) => (
        <Tab key={tab} asChild selected={activeTab === tab}>
        <Button
          type="button"
          id={approvalTabId(tab)}
          aria-controls={APPROVAL_QUEUE_PANEL_ID}
          size="sm"
          variant={activeTab === tab ? 'default' : 'outline'}
          aria-describedby={tab === 'PENDING' && pendingTotal ? pendingCountId : undefined}
          disabled={isActionPending}
          onClick={() => onTabChange(tab)}
        >
          {tabLabels[tab]}
          {tab === 'PENDING' && pendingTotal ? (
            <span aria-hidden="true" className="ml-1 rounded-full bg-primary/15 px-1.5 text-xs font-semibold tabular-nums">
              {pendingTotal.toLocaleString()}
            </span>
          ) : null}
        </Button>
        </Tab>
      ))}
      {/*
        종전의 비활성 보관함 버튼은 걷었다. 그것이 가리키던 "처리한 문서를 다시 보는 곳" 은
        이제 세 번째 탭이 실제 API(/approvals/processed)로 제공한다(G10 — 죽은 컨트롤 금지).
      */}
    </TabList>
    {/* 대기 건수 설명은 탭 목록 밖에 둔다 — tablist 에는 탭만 둔다. */}
    {pendingTotal ? <span id={pendingCountId} className="sr-only">대기 중인 결재 {pendingTotal.toLocaleString()}건</span> : null}
    {focusMode && (
      <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        집중 모드 · J 다음 문서 · K 이전 문서 · A 승인(10초 안에 되돌리기) · R 반려 · Q 보완 요청(의견을 적고 Ctrl+Enter, 의견 칸의 Esc 는 목록으로) · Esc 끝내기
      </p>
    )}
    <p role="status" aria-live="polite" className="sr-only">{announcement}</p>
    {queueNotice && (
      <div role="alert" className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
        <p>{queueNotice}</p>
        <Button type="button" size="sm" variant="ghost" onClick={onDismissNotice}>안내 닫기</Button>
      </div>
    )}
    {queued.length > 0 && (
      <section className="space-y-2 rounded-md border border-primary/40 bg-primary/10 p-3" aria-label="처리 예정">
        {queued.map((id) => {
          // 이름은 대기열에 올릴 때 기억해 둔다 — 페이지·탭을 옮겨 목록에 없어도 '#번호' 로 바뀌지 않는다. 알림 카드에서 올린
          // 승인은 이 화면의 기록이 없어 대기열이 받은 이름(합의 단계면 '동의')을 쓴다.
          const entry = queuedDocs[id];
          const label = queuedApprovalLabel(id);
          const listed = list.find(item => item.ifmlAtrzSn === id);
          const title = entry?.title ?? label?.title ?? (listed ? documentLabel(listed) : `#${id}`);
          const actionNm = entry?.actionNm ?? label?.actionNm ?? (listed && isAgreementStage(listed) ? '동의' : '승인');
          return (
            <div key={id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>‘{title}’ {withObjectParticle(actionNm)} {APPROVAL_UNDO_MS / 1000}초 뒤 처리합니다.</span>
              <span className="flex gap-2">
                <Button
                  ref={(node) => {
                    if (node) queueButtonRefs.current.set(id, node);
                    else queueButtonRefs.current.delete(id);
                  }}
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label={`‘${title}’ ${actionNm} 되돌리기`}
                  onClick={() => onUndo(id)}
                >
                  <Undo2 aria-hidden="true" /> 되돌리기
                </Button>
                <Button type="button" size="sm" aria-label={`‘${title}’ ${actionNm} 지금 처리`} onClick={() => onCommitNow(id)}>지금 처리</Button>
              </span>
            </div>
          );
        })}
      </section>
    )}
    </div>
  );
}
