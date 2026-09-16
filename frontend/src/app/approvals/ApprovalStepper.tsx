'use client';

import { Check, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toDisplayDateTime } from '@/lib/format-date';
import type { InformalSanctionDto } from '@/services/business/user/approval/ApprovalUserService';

interface Step {
  label: string;
  user: string;
  status: 'pending' | 'completed' | 'rejected' | 'current';
  date?: string;
}

interface ApprovalStepperProps {
  steps?: Step[];
  stages?: InformalSanctionDto['stages'];
  currentUserId?: string;
  accessibleLabel?: string;
}

export function ApprovalStepper({ steps = [], stages, currentUserId, accessibleLabel = '결재선 진행' }: ApprovalStepperProps) {
  if (!stages?.length) return (
    <ol aria-label={accessibleLabel} className="space-y-3">
      {steps.map((step, index) => <li key={`${step.label}-${index}`} className="rounded-md border border-border p-3 text-sm">
        <p className="font-semibold">{step.label} · {step.user || '담당자 미지정'}</p>
        <p className="mt-1 text-muted-foreground">{step.status === 'completed' ? '완료' : step.status === 'rejected' ? '반려' : step.status === 'current' ? '승인 대기' : '앞 단계 대기'}{step.date ? ` · ${step.date}` : ''}</p>
      </li>)}
    </ol>
  );

  return <ol aria-label={accessibleLabel} className="space-y-4">
    {stages.map(stage => {
      const active = stage.status === 'ACTIVE';
      const approved = stage.status === 'APPROVED';
      const rejected = stage.status === 'REJECTED';
      const agreed = stage.kind === 'AGREEMENT';
      const people = stage.approvers ?? [];
      const completed = people.filter(person => person.status === 'APPROVED').length;
      const status = approved ? '완료' : rejected ? '반려' : stage.status === 'CANCELLED' ? '중단' : active ? '진행 중' : '앞 단계 대기';
      return <li key={stage.order} aria-current={active ? 'step' : undefined}
        className={cn('rounded-md border-l-4 p-4', active ? 'border-primary bg-primary/10' : approved ? 'border-success bg-success/10' : rejected ? 'border-destructive bg-destructive/10' : 'border-border bg-muted/30')}>
        <h4 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
          {approved ? <Check size={16} aria-hidden="true" /> : rejected ? <X size={16} aria-hidden="true" /> : <Clock size={16} aria-hidden="true" />}
          {stage.order}단계 · {agreed ? '합의' : '결재'} · {status}
        </h4>
        <p className="mt-1 text-sm text-muted-foreground">전원 {agreed ? '동의' : '승인'} · {completed}/{people.length}명 완료</p>
        <ul className="mt-3 space-y-3" aria-label={`${stage.order}단계 결재자 상태`}>
          {people.map(person => {
            const isWaiting = person.status === 'WAITING' || person.status === 'ACTIVE';
            const ownTurn = active && isWaiting && person.userId === currentUserId;
            const personStatus = person.status === 'APPROVED' ? agreed ? '동의 완료' : '승인 완료'
              : person.status === 'REJECTED' ? '반려' : person.status === 'CANCELLED' ? '중단'
              : ownTurn ? '내 차례' : active ? agreed ? '동의 대기' : '승인 대기' : '앞 단계 대기';
            return <li key={person.userId} className="space-y-1 text-sm">
              <p className={ownTurn ? 'font-semibold text-primary' : 'text-foreground'}>{person.userNm || person.userId} · {personStatus}</p>
              {person.decidedAt && <p className="text-xs text-muted-foreground"><time dateTime={person.decidedAt}>{toDisplayDateTime(new Date(person.decidedAt))}</time></p>}
              {person.opinion && <p className="whitespace-pre-wrap break-words text-foreground">{person.opinion}</p>}
            </li>;
          })}
        </ul>
      </li>;
    })}
  </ol>;
}
