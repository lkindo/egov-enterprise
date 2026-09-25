'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { pollUserService } from '@/services/business/user/poll/PollUserService';
import { OnlinePollManageDetailVO, OnlinePollItemVO } from '@/types/business/poll';
import { Vote,  
 Calendar,  
 ChevronRight,  
 CheckCircle2, 
 UserCheck, 
 Target } from 'lucide-react';
;
import { Button } from '@/components/ui/button';
;
import { cn } from '@/lib/utils';
import { toDisplayYmd } from '@/lib/format-date';
import { useTodayStorageYmd } from '@/lib/hooks/use-today-ymd';
import { getPollStatus, POLL_STATUS_LABEL, isPollActive } from '@/lib/poll-status';
import { toast } from 'sonner';

export default function OnlinePollParticipateClient() {
 const [polls, setPolls] = useState<OnlinePollManageDetailVO[]>([]);
 /** 조회 실패 사유. null 이면 정상 — 실패와 '없음' 을 같은 화면으로 그리지 않는다. */
 const [loadError, setLoadError] = useState<string | null>(null);
 const [selectedPoll, setSelectedPoll] = useState<OnlinePollManageDetailVO | null>(null);
 const [pollItems, setPollItems] = useState<OnlinePollItemVO[]>([]);
 const [selectedItemSn, setSelectedItemSn] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'vote' | 'result'>('list');
  // 저장 포맷과 같은 'yyyyMMdd' 8자 기준일.
  const todayStr = useTodayStorageYmd();

 const fetchPolls = useCallback(async () => {
   setLoading(true);
 // [2026-08-29] 조회 실패를 '없음'으로 그리지 않는다.
 //   종전 catch 는 토스트만 띄우고 polls 를 [] 로 둔 채 로딩을 내렸다. 실패 상태를 남기는
 //   state 도 재시도 경로도 없어, 토스트가 사라지면 화면에는 '활성 설문이 없습니다' 라는
 //   단정만 남았다 — 사용자는 조회가 실패한 줄 모른다.
 setLoadError(null);
 try {
 const res = await pollUserService.getPollList({ page: 0, size: 100 });
 // Support both Spring Data JPA Page (content) and legacy list format
 setPolls(res.list || []);
  } catch {
  setLoadError('투표 목록을 불러오지 못했습니다.');
  toast.error('투표 목록을 불러오지 못했습니다.');
  } finally {
  setLoading(false);
  }
  }, []);

  useEffect(() => {
    void fetchPolls();
  }, [fetchPolls]);

 const handleSelectPoll = async (poll: OnlinePollManageDetailVO) => {
 setLoading(true);
 try {
 const items = await pollUserService.getPollItemList(poll.pollSn!);
 setPollItems(items || []);
 setSelectedPoll(poll);
 setSelectedItemSn(null);

 // 기간 밖이거나 판정 불가(손상 값)면 투표를 열지 않고 결과만 보여준다.
 // [2026-09-26 DIP V7] 이미 참여했으면 결과로 연다 — 종전에는 다시 투표 화면을 열었다가 제출 때 거부됐다.
 if (!poll.hasVoted && isPollActive(poll.pollBgngYmd, poll.pollEndYmd, todayStr, poll.pollDsuseYn)) {
 setViewMode('vote');
 } else {
 setViewMode('result');
 }
 } catch {
 toast.error('투표 상세 정보를 불러오지 못했습니다.');
 } finally {
 setLoading(false);
 }
 };

 /** 목록 카드와 열린 투표에 참여 완료를 반영한다. 다시 목록으로 돌아가도 같은 투표를 또 열지 않게 한다. */
 const markVoted = (pollSn: number | undefined) => {
 setPolls((current) => current.map((poll) => (poll.pollSn === pollSn ? { ...poll, hasVoted: true } : poll)));
 setSelectedPoll((current) => (current && current.pollSn === pollSn ? { ...current, hasVoted: true } : current));
 };

 const handleVote = async () => {
 if (!selectedPoll || !selectedItemSn) return;

 setIsVoting(true);
 try {
 await pollUserService.participatePoll({
 pollSn: selectedPoll.pollSn!,
 pollArtclSn: selectedItemSn
 });
 toast.success('투표가 성공적으로 반영되었습니다.');
 markVoted(selectedPoll.pollSn);
 // Refresh items to show new counts
 const updatedItems = await pollUserService.getPollItemList(selectedPoll.pollSn!);
 setPollItems(updatedItems);
 setViewMode('result');
  } catch (error: unknown) {
    const msg = (error && typeof error === 'object' && 'response' in error)
      ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || '투표 처리 중 오류가 발생했습니다.'
      : '투표 처리 중 오류가 발생했습니다.';
    toast.error(msg);
    if (msg.includes('이미 참여')) {
      markVoted(selectedPoll.pollSn);
      setViewMode('result');
    }
  } finally {
 setIsVoting(false);
 }
 };

 if (loading && viewMode === 'list') {
 return (
 <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
 <h1 className="sr-only">여론조사 목록을 불러오는 중</h1>
 <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
 <p className="text-muted-foreground text-[length:var(--font-size-body)]">투표를 불러오는 중입니다…</p>
 </div>
 );
 }

 return (
 <div className="space-y-4 pb-8">
 <PageHeader
 title="투표 참여"
 breadcrumbs={[{ label: '커뮤니티' }, { label: '여론조사 참여' }]}
 />

 <div className="space-y-4">
 {viewMode === 'list' && (
 <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
 {/* 오류를 빈 상태보다 **먼저** 판정한다 — 실패 시 목록이 비는 것이 보통이라 순서를
     뒤집으면 오류 화면에 영영 도달하지 못한다. */}
 {loadError ? (
 <div className="col-span-full p-8 text-center bg-card rounded-lg border border-dashed border-border flex flex-col items-center gap-3">
 <div className="space-y-2">
 <h3 className="text-xl font-bold tracking-tight text-foreground">{loadError}</h3>
 <p className="text-muted-foreground font-medium">
 투표가 없는 것이 아니라 <strong>조회에 실패</strong>했습니다. 진행 중인 투표가 있을 수 있습니다.
 </p>
 </div>
 <button
 type="button"
 onClick={() => { void fetchPolls(); }}
 className="h-[var(--control-h)] px-3 rounded-lg border border-border bg-card text-[length:var(--font-size-body)] font-medium hover:bg-muted transition-colors"
 >
 다시 시도
 </button>
 </div>
 ) : (polls || []).length === 0 ? (
 <div className="col-span-full p-8 text-center bg-card rounded-lg border border-dashed border-border flex flex-col items-center gap-3">
 <div className="h-8 w-8 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
 <Target size={18} />
 </div>
 <div className="space-y-2">
 <h3 className="text-xl font-bold tracking-tight text-foreground">진행 중인 투표가 없습니다</h3>
 <p className="text-muted-foreground font-medium">새 투표가 등록되면 여기에 표시됩니다.</p>
 </div>
 </div>
 ) : (
 (polls || []).map((poll) => (
 <PollCard key={poll.pollSn} poll={poll} todayStr={todayStr} onSelect={() => handleSelectPoll(poll)} />
 ))
 )}
 </div>
 )}

 {(viewMode === 'vote' || viewMode === 'result') && selectedPoll && (
 <div className="max-w-3xl mx-auto">
 <div className="bg-card rounded-lg overflow-hidden border border-border">
 <div className="bg-surface-inverse p-4 text-surface-inverse-foreground">
 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <div className="px-2 py-0.5 rounded-lg border border-surface-inverse-border flex items-center">
 <span className="text-xs font-semibold">{POLL_STATUS_LABEL[getPollStatus(selectedPoll, todayStr)]}</span>
 </div>
 {selectedPoll.hasVoted && (
 <div className="px-2 py-0.5 rounded-lg border border-surface-inverse-border flex items-center">
 <span className="text-xs font-semibold">참여 완료</span>
 </div>
 )}
 <div className="px-2 py-0.5 rounded-lg border border-surface-inverse-border flex items-center gap-1.5">
 <Calendar size={14} className="text-surface-inverse-muted" />
 <span className="text-xs font-semibold tabular-nums">{toDisplayYmd(selectedPoll.pollBgngYmd)} - {toDisplayYmd(selectedPoll.pollEndYmd)}</span>
 </div>
 </div>
 <h2 className="text-lg font-bold leading-tight">{selectedPoll.pollNm}</h2>
 <p className="text-surface-inverse-muted text-[length:var(--font-size-body)] leading-relaxed">전사 의견 수렴을 위한 실시간 투표 세션입니다.</p>
 </div>
 </div>

 <div className="p-4 space-y-4">
 <div className="space-y-2">
 <label className="text-[length:var(--font-size-body)] font-semibold text-muted-foreground ml-1 block mb-2">
 {viewMode === 'vote' ? '항목을 선택하세요' : '집계 결과'}
 </label>
 
 <div className="space-y-2">
 {pollItems.map((item, idx) => (
 <PollItem 
 key={item.pollArtclSn || `poll-item-${idx}`}
 item={item} 
 /* [DEC-OPS-046] 진행 중 투표의 득표는 비관리자·미참여자에게 null 로 내려온다.
    null 을 0 으로 접으면 "말하지 않았다" 가 "아무도 고르지 않았다" 라는 사실 주장이 된다 —
    하나라도 null 이면 집계 자체를 말하지 않는다(DEC-OPS-080 의 표기와 같은 어휘). */
 countsHidden={pollItems.some((i) => i.pollIemCo == null)}
 totalVotes={pollItems.reduce((sum, i) => sum + (i.pollIemCo || 0), 0)}
 isSelected={selectedItemSn === item.pollArtclSn}
 onSelect={() => viewMode === 'vote' && setSelectedItemSn(item.pollArtclSn!)}
 mode={viewMode}
 index={idx}
 testId={`poll-item-${idx}`}
 />
 ))}
 </div>
 </div>

 <div className="flex gap-2 pt-2">
 <Button 
 variant="ghost" 
 onClick={() => setViewMode('list')}
 className="h-[var(--control-h)] px-4 rounded-lg text-[length:var(--font-size-body)] font-medium border border-border"
 >
 뒤로가기
 </Button>
 {viewMode === 'vote' && (
 <Button 
 disabled={!selectedItemSn || isVoting}
 onClick={handleVote}
 className="h-[var(--control-h)] flex-1 rounded-lg text-[length:var(--font-size-body)] font-semibold gap-2"
 >
 {isVoting ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <UserCheck size={16} />}
 투표 제출하기
 </Button>
 )}
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 );
}

function PollCard({ poll, todayStr, onSelect }: { poll: OnlinePollManageDetailVO, todayStr: string, onSelect: () => void }) {
  const status = getPollStatus(poll, todayStr);
  const isLive = status === 'active';
  /*
    [2026-08-29] 'Live Now'·'Closed' 하드코딩 제거. 같은 상태를 화면마다 다른 어휘로 부르면
    사용자는 다른 것으로 읽는다. 판정도 표기도 poll-status SSOT 한 곳에서 온다.
  */
  const label = POLL_STATUS_LABEL[status];

  return (
    <div 
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className="group cursor-pointer bg-card rounded-lg p-4 border border-border hover:border-primary/40 hover:bg-accent/40 transition-colors"
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="h-8 w-8 shrink-0 rounded-lg bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground">
          <Vote size={16} />
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded-lg border text-xs font-semibold",
          isLive
            ? "bg-success text-success-foreground border-transparent"
            : status === 'scheduled'
            ? "bg-warning text-warning-foreground border-transparent"
            : "bg-muted text-muted-foreground border-border"
        )}>
          {label}
        </div>
      </div>
      {poll.hasVoted && (
        <p className="mb-1 text-xs font-semibold text-muted-foreground">참여 완료 · 결과 보기</p>
      )}

      <div className="space-y-1">
        <h3 className="text-[length:var(--font-size-body)] font-semibold leading-snug group-hover:text-primary transition-colors">{poll.pollNm}</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
          <Calendar size={14} className="shrink-0" />
          {toDisplayYmd(poll.pollBgngYmd)} <span>/</span> {toDisplayYmd(poll.pollEndYmd)}
        </div>
      </div>

      {/*
        [2026-08-29] 'Ready for Interaction' 배지를 걷었다. 어떤 조건도 보지 않는 상수였고
        (이 카드는 status 를 상단 배지에만 쓴다) 초록 점의 animate-pulse 까지 붙어 지금
        참여할 수 있다는 뜻으로 읽혔다 — 같은 카드 상단이 '종료'·'중지' 를 표시하는 순간에도
        그대로 떴다. 실제로 종료된 설문을 누르면 참여가 아니라 결과 보기로 넘어간다.
        상태는 상단 배지 하나가 말한다.
      */}
      <div className="mt-2 pt-2 border-t border-border flex items-center justify-end">
        <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}

interface PollItemProps {
  item: OnlinePollItemVO;
  totalVotes: number;
  countsHidden: boolean;
  isSelected: boolean;
  onSelect: () => void;
  mode: 'vote' | 'result';
  index: number;
  testId?: string;
}

function PollItem({ item, totalVotes, countsHidden, isSelected, onSelect, mode, index, testId }: PollItemProps) {
  const percentage = !countsHidden && totalVotes > 0 ? Math.round(((item.pollIemCo || 0) / totalVotes) * 100) : 0;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={item.pollArtclNm}
      data-testid={testId}
      onClick={mode === 'vote' ? onSelect : undefined}
      onKeyDown={(e) => {
        if (mode !== 'vote') return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "relative p-3 rounded-lg border transition-colors group cursor-pointer",
        isSelected ? "border-primary bg-primary/5" : "border-border bg-muted/50 hover:border-primary/50 hover:bg-accent/40",
        mode === 'result' && "cursor-default border-border bg-card hover:border-border hover:bg-card"
      )}
    >
 <div className="flex items-center justify-between gap-3">
 <div className="flex items-center gap-3">
 <div className={cn(
 "h-8 w-8 shrink-0 rounded-lg flex items-center justify-center font-semibold text-xs tabular-nums border transition-colors",
 isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border group-hover:text-primary"
 )}>
 {isSelected ? <CheckCircle2 size={16} /> : String(index + 1).padStart(2, '0')}
 </div>
 <span className={cn(
 "text-[length:var(--font-size-body)] font-semibold",
 isSelected ? "text-primary" : "text-foreground"
 )}>{item.pollArtclNm}</span>
 </div>
 {mode === 'result' && (
 <div className="shrink-0 text-right">
 {countsHidden ? (
 <span className="text-[length:var(--font-size-body)] text-muted-foreground">집계 비공개</span>
 ) : (
 <>
 <span className="block text-[length:var(--font-size-body)] font-semibold tabular-nums leading-none text-foreground">{percentage}%</span>
 <span className="text-xs tabular-nums text-muted-foreground">{item.pollIemCo}표</span>
 </>
 )}
 </div>
 )}
 </div>

 {mode === 'result' && !countsHidden && (
 <div className="mt-2 h-1.5 overflow-hidden rounded bg-muted">
 <div 
 style={{ width: `${percentage}%` }}
 className="h-full bg-primary rounded-lg transition-[width] duration-300"
 />
 </div>
 )}
 
 </div>
 );
}
