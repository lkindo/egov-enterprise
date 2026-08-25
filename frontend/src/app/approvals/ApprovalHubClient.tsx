'use client';

import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Check, X, User, Calendar, Info, Plus, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { approvalUserService, Approval } from '@/services/business/user/approval/ApprovalUserService';
import { Badge } from '@/components/ui/badge';
import { MasterDetailPage } from '@/app/components/patterns/master-detail-page';
import { ApprovalStepper } from './ApprovalStepper';
import Link from 'next/link';

type ApprovalTab = 'PENDING' | 'HISTORY';

const EMPTY_APPROVALS: Approval[] = [];

const TAB_LABELS: Record<ApprovalTab, string> = {
  PENDING: '대기 중인 결재',
  HISTORY: '결재 처리 이력',
};

/** 상태 코드를 배지로. 색만으로 상태를 전달하지 않도록 라벨을 함께 낸다(카탈로그 A4 금지 항목). */
function ApprovalStatusBadge({ status }: { status?: string }) {
  const label = status === 'Y' ? '승인 완료' : status === 'N' ? '반려됨' : '대기 중';
  const variant = status === 'Y' ? 'success' : status === 'N' ? 'destructive' : 'secondary';
  return <Badge variant={variant} className="shrink-0 text-xs font-bold">{label}</Badge>;
}

/**
 * 결재 허브 — A2(마스터-디테일) archetype.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A2.
 *
 * ⚠ archetype 판정 근거 — 이 화면은 카탈로그의 A4(작업 큐)가 아니라 A2다.
 *   A4 는 "선택 → 일괄 처리 → 부분 실패 보고"가 본체인데, 결재 API 는 건별
 *   `confirm(approvalId, status)` 하나뿐이라 일괄 처리 대상이 존재하지 않는다.
 *   실제 이 화면의 과업은 **왼쪽에서 문서를 고르고 오른쪽에서 결재선·의견을 보고 처리**하는
 *   마스터-디테일이다. 없는 기능에 맞춰 셸을 고르지 않는다.
 *
 * 종전에는 3열(대기열 네비 + 목록 카드 + 상세 카드)에 유리질 카드가 겹쳐 있어 상세가
 * 화면 밖으로 밀렸고, 목록은 6열 표라 좁은 폭에서 가로 스크롤이 났다. 마스터를 compact
 * 목록으로 바꾸고 범위 전환을 셸의 navigation 슬롯으로 올린다.
 */
export default function ApprovalHubClient() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ApprovalTab>('PENDING');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const itemButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  const { data: approvalData, isLoading, isFetching, error: approvalsError, refetch: refetchApprovals } = useQuery({
    queryKey: ['approvals', activeTab],
    queryFn: () => {
      if (activeTab === 'PENDING') {
        return approvalUserService.getPending({ page: 0, size: 50 });
      }
      return approvalUserService.getMyHistory({ page: 0, size: 50 });
    }
  });

  const list = approvalData?.list || EMPTY_APPROVALS;
  const selectedItem = useMemo(() =>
    list.find(item => item.approvalId === selectedItemId) || (list.length > 0 ? list[0] : null)
  , [list, selectedItemId]);
  const hasVisibleSelection = list.some(item => item.approvalId === selectedItemId);

  const handleTabChange = (tab: ApprovalTab) => {
    setActiveTab(tab);
    // 다른 대기열의 문서 식별자를 들고 넘어가면 첫 항목이 아니라 빈 상세가 남는다.
    setSelectedItemId(null);
  };

  const handleAction = async (item: Approval, status: 'Y' | 'N') => {
    const actionNm = status === 'Y' ? '승인' : '반려';
    const isConfirmed = await confirm({
      title: `결재 ${actionNm}`,
      message: `[${item.approvalId}] 요청을 ${actionNm}하시겠습니까?`,
      variant: status === 'N' ? 'destructive' : 'default'
    });

    if (!isConfirmed) return;

    try {
      await approvalUserService.confirm(item.approvalId, status);
      toast(`성공적으로 ${actionNm}되었습니다.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    } catch {
      toast(`${actionNm} 처리 중 오류가 발생했습니다.`, 'error');
    }
  };

  /**
   * 결재 단계는 서버가 내려준 필드로만 구성한다.
   * 종전에는 존재하지 않는 중간 결재자('이순신 과장')와 '최종 승인' 단계를 화면에서
   * 창작해 실제 결재선이 아닌 흐름을 사실처럼 보여줬다 — 기안(신청자)과 결재(approverId)
   * 두 단계가 이 API 계약이 실제로 보증하는 전부다.
   */
  const workflowSteps = useMemo(() => {
    if (!selectedItem) return [];
    return [
      { label: '기안', user: selectedItem.applicantId, status: 'completed' as const, date: selectedItem.requestDate },
      {
        label: '결재',
        user: selectedItem.approverId || '결재자 미지정',
        status: selectedItem.status === 'Y' ? 'completed' as const :
          selectedItem.status === 'N' ? 'rejected' as const : 'current' as const,
        date: selectedItem.approvalDate
      }
    ];
  }, [selectedItem]);

  const canDecide = activeTab === 'PENDING' && selectedItem?.status === 'R';

  return (
    <MasterDetailPage
      title="결재 허브"
      description="대기 결재를 승인·반려하고 처리 이력을 조회합니다."
      breadcrumbItems={[{ label: '업무지원' }, { label: '전자결재' }]}
      actions={(
        <>
          <Button
            type="button"
            variant="outline"
            aria-label="결재함 목록 새로고침"
            disabled={isFetching}
            onClick={() => { void refetchApprovals(); }}
          >
            <RefreshCcw aria-hidden="true" className={cn(isFetching && 'animate-spin')} />
            새로고침
          </Button>
          <Button asChild type="button">
            <Link href="/approvals/draft">
              <Plus aria-hidden="true" />
              새 결재 기안
            </Link>
          </Button>
        </>
      )}
      navigation={(
        <div role="tablist" aria-label="결재 대기열 전환" className="flex flex-wrap items-center gap-2">
          {(Object.keys(TAB_LABELS) as ApprovalTab[]).map((tab) => (
            <Button
              key={tab}
              type="button"
              role="tab"
              size="sm"
              variant={activeTab === tab ? 'default' : 'outline'}
              aria-selected={activeTab === tab}
              onClick={() => handleTabChange(tab)}
            >
              {TAB_LABELS[tab]}
            </Button>
          ))}
          {/*
            '결재 문서 보관함'은 종전에 별도 탭으로 있었지만 조회 함수가 처리 이력과 같아
            **같은 데이터를 다른 이름으로** 보여줬다(ApprovalUserService 에 보관함 조회가 없다).
            없는 구분을 있는 것처럼 두지 않고, 사유를 밝혀 비활성으로 남긴다.
          */}
          <Button type="button" size="sm" variant="outline" disabled title="보관함 조회 API가 아직 없어 사용할 수 없습니다">
            결재 문서 보관함
          </Button>
        </div>
      )}
      masterTitle={TAB_LABELS[activeTab]}
      masterDescription={`총 ${list.length}건`}
      master={(
        <div className="space-y-3">
          {isLoading ? (
            <div role="status" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              결재함을 불러오는 중입니다.
            </div>
          ) : approvalsError ? (
            <div role="alert" className="space-y-3 rounded-md border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm font-semibold text-destructive-emphasis">결재함을 불러오지 못했습니다.</p>
              <p className="text-xs text-muted-foreground">네트워크 상태를 확인한 뒤 다시 시도해 주세요.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => { void refetchApprovals(); }}>
                다시 시도
              </Button>
            </div>
          ) : list.length === 0 ? (
            <div role="status" className="rounded-md border border-dashed border-border p-6 text-center">
              <p className="text-sm font-semibold text-foreground">
                {activeTab === 'PENDING' ? '대기 중인 결재가 없습니다.' : '처리한 결재 이력이 없습니다.'}
              </p>
            </div>
          ) : (
            <ul aria-label={`${TAB_LABELS[activeTab]} 목록`} className="space-y-2">
              {list.map((item, index) => {
                const isSelected = selectedItem?.approvalId === item.approvalId;
                return (
                  <li key={item.approvalId} data-testid="approval-item">
                    <button
                      ref={(node) => {
                        if (node) itemButtonRefs.current.set(item.approvalId, node);
                        else itemButtonRefs.current.delete(item.approvalId);
                      }}
                      type="button"
                      data-a2-master-item
                      aria-current={isSelected ? 'true' : undefined}
                      aria-label={`${item.approvalId} 결재 상세 열기`}
                      tabIndex={isSelected || (!hasVisibleSelection && index === 0) ? 0 : -1}
                      onClick={() => setSelectedItemId(item.approvalId)}
                      className={cn(
                        'w-full rounded-md border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background hover:border-primary/50 hover:bg-muted/40',
                      )}
                    >
                      <span className="flex min-w-0 items-start justify-between gap-3">
                        <span className="min-w-0 break-words text-sm font-semibold text-foreground">
                          #{item.approvalId}
                        </span>
                        <ApprovalStatusBadge status={item.status} />
                      </span>
                      <span className="mt-2 flex items-baseline justify-between gap-3">
                        <span className="min-w-0 truncate text-xs text-muted-foreground">
                          {item.jobTypeNm || '일반 결재'}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {item.requestDate?.substring(0, 10) || '-'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      selectedItemLabel={selectedItem ? `#${selectedItem.approvalId}` : undefined}
      detailTitle={selectedItem?.jobTypeNm || '일반 결재 요청'}
      detailDescription={selectedItem ? `기안자 ${selectedItem.applicantId}` : undefined}
      detailActions={canDecide && selectedItem ? (
        <>
          <Button type="button" onClick={() => { void handleAction(selectedItem, 'Y'); }}>
            <Check aria-hidden="true" /> 결재 승인
          </Button>
          <Button type="button" variant="destructive" onClick={() => { void handleAction(selectedItem, 'N'); }}>
            <X aria-hidden="true" /> 결재 반려
          </Button>
        </>
      ) : undefined}
      emptyDetailTitle="결재 문서를 선택하세요"
      emptyDetailDescription="왼쪽 목록에서 문서를 고르면 결재선과 처리 의견이 표시됩니다."
      detail={selectedItem ? (
        <div className="space-y-6">
          <section aria-label="결재 진행 상태" className="rounded-md border border-border p-4">
            <h3 className="mb-3 text-[length:var(--font-size-body)] font-semibold text-foreground">결재 진행 상태</h3>
            <ApprovalStepper steps={workflowSteps} />
          </section>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <User size={14} aria-hidden="true" /> 기안자
              </dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{selectedItem.applicantId}</dd>
            </div>
            <div className="rounded-md border border-border p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Calendar size={14} aria-hidden="true" /> 기안 일시
              </dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">{selectedItem.requestDate}</dd>
            </div>
          </dl>

          <section aria-label="처리 의견" className="rounded-md border border-border p-4">
            <h3 className="mb-2 flex items-center gap-2 text-[length:var(--font-size-body)] font-semibold text-foreground">
              <Info size={14} aria-hidden="true" /> 처리 의견
            </h3>
            {/* 서버가 내려준 의견만 보여준다 — 종전에는 의견이 없으면 '표준 프로세스에 따라
                상신되었습니다' 라는 창작 본문을 실제 문서 내용처럼 노출했다. */}
            {selectedItem.returnReason ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {selectedItem.returnReason}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">등록된 처리 의견이 없습니다.</p>
            )}
          </section>
        </div>
      ) : undefined}
    />
  );
}
