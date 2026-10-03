'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AbsenceBadge } from '@/app/components/ui/absence-badge';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { userSearchService, type UserSearchResult } from '@/services/business/user/UserSearchService';
import { approvalUserService, type ApproverProfile } from '@/services/business/user/approval/ApprovalUserService';
import { cn } from '@/lib/utils';
import { logErrorSafely } from '@/lib/safe-error-log';

/** 결재자가 될 수 없는 사유. 상신 때 서버 검사와 같은 판정이다(ApprovalLineAssistService). */
export const INELIGIBLE_REASONS: Record<string, string> = {
  SELF: '본인',
  INACTIVE: '사용 중이 아닌 계정',
  NO_PERMISSION: '결재 권한 없음',
  NOT_FOUND: '찾을 수 없는 사용자',
};

interface ApproverInlinePickerProps {
  /** 예: "1단계". 보조기술이 어느 단계를 고르는지 알게 한다. */
  stageLabel: string;
  /** 이 단계에 이미 들어 있는 사람. 누르면 뺀다. */
  selectedIds: readonly string[];
  /** 다른 단계에 들어 있는 사람. 같은 사람을 두 번 지정할 수 없다. */
  otherStageIds: readonly string[];
  selfId?: string;
  /** 이 단계에 더 넣을 수 있는 사람 수(단계 10명·전체 50명 한도 중 작은 쪽). */
  remaining: number;
  onToggle: (person: UserSearchResult, selected: boolean) => void;
  onClose: () => void;
}

/**
 * 기안 대화상자 안에 펼치는 결재자 고르기(2026-10-03 결재 동선 개선).
 *
 * <p>종전 피커는 한 명을 고르면 닫히는 대화상자를 기안 대화상자 위에 겹쳐 띄워, 한 단계에 세 명을 넣으려면 세 번 열어야 했다.
 * 이 피커는 단계 안에 펼쳐진 채로 남고, 누르는 대로 결재선에 넣고 빼며, 결재자가 될 수 없는 사람은 고르기 전에 사유와 함께 막는다.
 * 사유 판정은 상신 때 서버 검사와 같은 API 를 쓴다. 판정을 받지 못하면 막지 않는다 — 상신할 때 서버가 같은 규칙으로 다시 본다.
 */
export function ApproverInlinePicker({ stageLabel, selectedIds, otherStageIds, selfId, remaining, onToggle, onClose }: ApproverInlinePickerProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [eligibility, setEligibility] = useState<Map<string, ApproverProfile>>(new Map());
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [searched, setSearched] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = async () => {
    const term = keyword.trim();
    if (term.length < 2) {
      setSearched(null);
      setFailed(false);
      setResults([]);
      return;
    }
    // 늦게 도착한 앞 검색이 뒤 검색 결과를 덮지 않게 한다.
    const request = ++requestRef.current;
    setLoading(true);
    setFailed(false);
    try {
      const found = await userSearchService.searchAssignableUsers(term);
      if (request !== requestRef.current) return;
      setResults(found);
      setSearched(term);
      const ids = found.map(person => person.esntlId).filter((id): id is string => Boolean(id)).slice(0, 50);
      if (ids.length === 0) { setEligibility(new Map()); return; }
      try {
        const profiles = await approvalUserService.checkApprovers(ids);
        if (request !== requestRef.current) return;
        setEligibility(new Map((Array.isArray(profiles) ? profiles : []).map(profile => [profile.esntlId ?? '', profile])));
      } catch (error) {
        logErrorSafely('Approver eligibility check failed', error);
        if (request === requestRef.current) setEligibility(new Map());
      }
    } catch (error) {
      logErrorSafely('Approver search failed', error);
      if (request === requestRef.current) { setResults([]); setFailed(true); setSearched(term); }
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  };

  const reasonOf = (person: UserSearchResult, selected: boolean): string | null => {
    const id = person.esntlId;
    if (!id) return '식별자를 확인할 수 없습니다';
    if (selected) return null;
    if (id === selfId) return INELIGIBLE_REASONS.SELF;
    if (otherStageIds.includes(id)) return '이미 다른 단계에 있습니다';
    const profile = eligibility.get(id);
    if (profile && !profile.eligible) return INELIGIBLE_REASONS[profile.ineligibleReason ?? ''] ?? '결재자로 지정할 수 없습니다';
    if (remaining <= 0) return '지정 한도에 도달했습니다';
    return null;
  };

  const status = loading ? '찾는 중입니다.'
    : failed ? '사용자를 찾지 못했습니다. 잠시 후 다시 시도해 주세요.'
      : searched === null ? '이름을 두 글자 이상 넣고 찾기를 누르세요.'
        : results.length === 0 ? emptyResultMessage(searched, '찾는 사람이 없습니다.')
          : `${results.length}명을 찾았습니다. 누르면 ${stageLabel}에 넣고, 다시 누르면 뺍니다.`;

  return (
    <div role="group" aria-label={`${stageLabel} 결재자 고르기`} className="space-y-2 rounded-md border border-primary/40 bg-background p-3">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          aria-label="결재자 이름 검색"
          value={keyword}
          placeholder="이름으로 찾기 · Enter"
          onChange={event => setKeyword(event.target.value)}
          onKeyDown={event => {
            // 기안 폼 안이라 Enter 가 폼 제출로 번지지 않게 막는다.
            if (event.key === 'Enter') { event.preventDefault(); void search(); }
          }}
        />
        <Button type="button" variant="outline" disabled={loading} aria-busy={loading || undefined} onClick={() => { void search(); }}>
          <Search aria-hidden="true" /> 찾기
        </Button>
      </div>
      <p role="status" aria-live="polite" className={cn('text-xs', failed ? 'text-destructive-emphasis' : 'text-muted-foreground')}>{status}</p>
      {results.length > 0 && (
        <ul aria-label={`${stageLabel} 결재자 후보`} className="max-h-60 space-y-1 overflow-y-auto">
          {results.map(person => {
            const selected = Boolean(person.esntlId) && selectedIds.includes(person.esntlId as string);
            const reason = reasonOf(person, selected);
            return (
              <li key={person.esntlId ?? person.userNm}>
                <button
                  type="button"
                  aria-pressed={selected}
                  disabled={reason !== null}
                  onClick={() => onToggle(person, !selected)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60',
                    selected ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-muted/40',
                  )}
                >
                  <span className="font-semibold text-foreground">{person.userNm || '이름 없음'}</span>
                  <span className="text-xs text-muted-foreground">{person.deptNm || '소속 부서 없음'}</span>
                  <AbsenceBadge absent={person.absent} />
                  {reason && <span className="text-xs text-muted-foreground">· {reason}</span>}
                  {selected && <Check aria-hidden="true" className="ml-auto size-4 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">결재 권한이 있는 사용 중인 사람만 고를 수 있습니다. 고른 사람은 바로 결재선에 들어가고 이 목록은 열려 있습니다.</p>
        <Button type="button" size="sm" onClick={onClose}>다 골랐어요</Button>
      </div>
    </div>
  );
}
