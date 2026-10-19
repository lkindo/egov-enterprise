'use client';

import { useMemo } from 'react';
import { Calendar, Info, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SANCTION_STATUS, type InformalSanctionDto } from '@/services/business/user/approval/ApprovalUserService';
import { ApprovalStepper } from './ApprovalStepper';
import { ApprovalCollaborationPanel } from './ApprovalCollaborationPanel';
import { ApprovalReferencePanel } from './ApprovalReferencePanel';
import { formatYmd } from './approval-hub-model';

/*
 * 결재 허브 상세의 처리 영역 밖 — 위쪽 안내(불러오기·실패·목록에 없는 의견·참조 문서·처리 실패)와, 처리 단추 아래의 협업 패널·
 * 문서 내용·결재 진행 상태·참조자 패널·기안 정보·처리 의견·이전 차수 이력(2026-10-18 허브 분해 때 ApprovalHubClient 에서 옮겼다 —
 * 마크업·문구·순서·패널의 다시 그리기 키 그대로). 결재 의견 칸과 처리·회수 단추는 허브에 남는다.
 */

/** 상세 위쪽의 안내 — 상세를 불러오는 중·실패, 목록에 없는 문서에 남은 의견, 참조 문서, 처리 실패. */
export function ApprovalDetailNotices({
  isPending,
  isError,
  onRetryDetail,
  showUnlistedOpinion,
  readOnlyReference,
  actionError,
  reviewDisabled,
  onReview,
}: {
  isPending: boolean;
  isError: boolean;
  onRetryDetail: () => void;
  /** 작성한 의견이 있는 문서가 지금 목록에 없다. */
  showUnlistedOpinion: boolean;
  /** 참조로 받은 읽기 전용 문서다(서버 판정). */
  readOnlyReference: boolean;
  actionError: string;
  reviewDisabled: boolean;
  /** 최신 문서를 다시 읽는다. */
  onReview: () => void;
}) {
  return (
    <>
      {isPending && <p role="status" className="text-sm text-muted-foreground">문서 상세를 불러오는 중입니다.</p>}
      {isError && <div role="alert" className="space-y-2 rounded-md border border-destructive/30 p-3"><p>문서 상세를 불러오지 못했습니다. 목록은 유지됩니다.</p><Button type="button" variant="outline" onClick={onRetryDetail}>상세 다시 시도</Button></div>}
      {showUnlistedOpinion && <p role="status" className="rounded-md bg-warning/10 p-3 text-sm">작성한 의견이 있는 문서가 현재 목록에 없습니다. 입력은 이 문서에 보존했습니다. 최신 상태를 확인하거나 다른 문서를 선택해 주세요.</p>}
      {/* [2026-10-04 D4] 참조자는 읽기만 한다. 처리 버튼은 서버 힌트가 모두 거짓이라 생기지 않고, 이 안내도 서버 판정으로만 보인다.
          이전 차수 참조자가 이 차수 결재자가 됐으면 처리할 수 있으므로 '읽기만' 이라고 말하지 않는다. */}
      {readOnlyReference && (
        <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
          참조로 받은 문서입니다. 읽기만 할 수 있으며, 문서가 승인·반려·회수되어도 계속 읽을 수 있습니다.
        </p>
      )}
      {actionError && <div role="alert" className="space-y-2 rounded-md border border-destructive/30 p-3"><p>{actionError}</p><Button type="button" variant="outline" disabled={reviewDisabled} onClick={onReview}>최신 문서 확인</Button></div>}
    </>
  );
}

/**
 * 처리 단추 아래의 문서 영역. 협업·참조자 패널은 상세를 받은 뒤에만 그리고, 문서와 차수가 바뀔 때만 새로 그린다 — 버전으로 다시
 * 그리면 결재자를 바꾸거나 다른 결재자가 처리할 때마다 작성 중인 보완 답변·고친 본문·고르던 참조자가 사라졌다. 패널은 매번 최신
 * 버전을 읽는다.
 */
export function ApprovalDocumentView({
  document,
  detail,
  selectedKey,
  canWrite,
  collaborationDisabled,
  referenceDisabled,
  currentUserId,
}: {
  /** 보이는 문서 — 상세가 오면 상세, 아니면 목록 행. */
  document: InformalSanctionDto;
  /** 받은 상세(없으면 아직 받지 못했다). */
  detail: InformalSanctionDto | undefined;
  selectedKey: string;
  canWrite: boolean;
  collaborationDisabled: boolean;
  referenceDisabled: boolean;
  currentUserId: string | undefined;
}) {
  /** 이전 단일 결재 문서의 표시. stages가 있으면 서버의 실제 결재선을 우선한다. */
  const workflowSteps = useMemo(() => [
    {
      label: '기안',
      user: document.aplcntNm || document.aplcntId,
      status: 'completed' as const,
      date: formatYmd(document.reqYmd),
    },
    {
      label: '결재',
      user: document.aprvrNm || document.aprvrId || '결재자 미지정',
      status: document.aprvYn === SANCTION_STATUS.APPROVED ? 'completed' as const :
        document.aprvYn === SANCTION_STATUS.REJECTED ? 'rejected' as const : 'current' as const,
      date: document.atrzDt
    }
  ], [document]);
  const previousRevisions = (detail?.history ?? []).filter(
    revision => revision.atrzCycl !== undefined && revision.atrzCycl < (document.atrzCycl ?? 1),
  );

  return (
    <>
      {detail && (
        <ApprovalCollaborationPanel
          key={`${selectedKey}-${detail.atrzCycl ?? ''}`}
          document={detail}
          canWrite={canWrite}
          disabled={collaborationDisabled}
        />
      )}
      <section aria-label="문서 내용" className="space-y-2 rounded-md border border-border p-4">
        <h3 className="font-semibold">{document.docTtl || '문서 내용'} · {document.atrzCycl ?? 1}차</h3>
        <p className="whitespace-pre-wrap break-words text-sm text-foreground">{document.docCn || '작성한 본문이 없습니다.'}</p>
      </section>
      <section aria-label="결재 진행 상태" className="rounded-md border border-border p-4">
        <h3 className="mb-3 text-[length:var(--font-size-body)] font-semibold text-foreground">결재 진행 상태</h3>
        <ApprovalStepper steps={workflowSteps} stages={document.stages} currentUserId={currentUserId} />
      </section>
      {detail && (
        <ApprovalReferencePanel
          key={`${selectedKey}-${detail.atrzCycl ?? ''}`}
          document={detail}
          disabled={referenceDisabled}
        />
      )}

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-border p-4">
          <dt className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <User size={14} aria-hidden="true" /> 기안자
          </dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">
            {document.aplcntNm || document.aplcntId || '-'}
          </dd>
        </div>
        <div className="rounded-md border border-border p-4">
          <dt className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Calendar size={14} aria-hidden="true" /> 기안일
          </dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
            {formatYmd(document.reqYmd)}
          </dd>
        </div>
      </dl>

      <section aria-label="처리 의견" className="rounded-md border border-border p-4">
        <h3 className="mb-2 flex items-center gap-2 text-[length:var(--font-size-body)] font-semibold text-foreground">
          <Info size={14} aria-hidden="true" /> 처리 의견
        </h3>
        {/* 서버가 내려준 의견만 보여준다 — 종전에는 의견이 없으면 '표준 프로세스에 따라
            상신되었습니다' 라는 창작 본문을 실제 문서 내용처럼 노출했다. */}
        {document.rjctRsnCn ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {document.rjctRsnCn}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">등록된 처리 의견이 없습니다.</p>
        )}
      </section>
      {previousRevisions.length ? <section aria-label="이전 차수 이력" className="space-y-3">
        <h3 className="font-semibold">이전 차수 이력</h3>
        {previousRevisions.map(revision => <details key={revision.atrzCycl} className="rounded-md border border-border p-4">
          <summary className="cursor-pointer font-semibold">{revision.atrzCycl}차 · {revision.docTtl || '제목 없음'} · {revision.aprvYn === SANCTION_STATUS.REJECTED ? '반려' : revision.aprvYn === SANCTION_STATUS.WITHDRAWN ? '회수' : revision.aprvYn === SANCTION_STATUS.APPROVED ? '승인 완료' : '대기'}</summary>
          <p className="my-3 whitespace-pre-wrap break-words text-sm">{revision.docCn || '작성한 본문이 없습니다.'}</p>
          <ApprovalStepper stages={revision.stages} currentUserId={currentUserId} accessibleLabel={`${revision.atrzCycl}차 결재선 진행`} />
        </details>)}
      </section> : null}
    </>
  );
}
