'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { pollUserService } from '@/services/business/user/poll/PollUserService';
import { OnlinePollManageVO, OnlinePollItemVO } from '@/types/business/poll';
import { Vote,  
 Calendar,  
 ChevronRight,  
 CheckCircle2, 
 UserCheck, 
 Zap, 
 Trophy, 
 Target } from 'lucide-react';
;
import { Button } from '@/components/ui/button';
;
import { cn } from '@/lib/utils';
import { toDisplayYmd, todayStorageYmd } from '@/lib/format-date';
import { getPollStatus, POLL_STATUS_LABEL, isPollActive } from '@/lib/poll-status';
import { toast } from 'sonner';

export default function OnlinePollParticipateClient() {
 const [polls, setPolls] = useState<OnlinePollManageVO[]>([]);
 const [selectedPoll, setSelectedPoll] = useState<OnlinePollManageVO | null>(null);
 const [pollItems, setPollItems] = useState<OnlinePollItemVO[]>([]);
 const [selectedItemSn, setSelectedItemSn] = useState<number | null>(null);
 const [loading, setLoading] = useState(true);
 const [isVoting, setIsVoting] = useState(false);
 const [viewMode, setViewMode] = useState<'list' | 'vote' | 'result'>('list');
 const [todayStr, setTodayStr] = useState<string>('');

 useEffect(() => {
 // 저장 포맷과 같은 'yyyyMMdd' 8자 기준일. 10자로 두면 8자 저장값과의 비교가 무너진다.
 setTodayStr(todayStorageYmd());
 fetchPolls();
 }, []);

 const fetchPolls = async () => {
 setLoading(true);
 try {
 const res = await pollUserService.getPollList({ page: 0, size: 100 });
 // Support both Spring Data JPA Page (content) and legacy list format
 setPolls(res.list || []);
 } catch {
 toast.error('설문 목록을 불러오지 못했습니다.');
 } finally {
 setLoading(false);
 }
 };

 const handleSelectPoll = async (poll: OnlinePollManageVO) => {
 setLoading(true);
 try {
 const items = await pollUserService.getPollItemList(poll.pollSn!);
 setPollItems(items || []);
 setSelectedPoll(poll);
 setSelectedItemSn(null);

 // 기간 밖이거나 판정 불가(손상 값)면 투표를 열지 않고 결과만 보여준다.
 if (isPollActive(poll.pollBgngYmd, poll.pollEndYmd, todayStr, poll.pollDsuseYn)) {
 setViewMode('vote');
 } else {
 setViewMode('result');
 }
 } catch {
 toast.error('설문 상세 정보를 불러오지 못했습니다.');
 } finally {
 setLoading(false);
 }
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
 // Refresh items to show new counts
 const updatedItems = await pollUserService.getPollItemList(selectedPoll.pollSn!);
 setPollItems(updatedItems);
 setViewMode('result');
 } catch (error: any) {
 const msg = error.response?.data?.message || '투표 처리 중 오류가 발생했습니다.';
 toast.error(msg);
 if (msg.includes('이미 참여')) {
 setViewMode('result');
 }
 } finally {
 setIsVoting(false);
 }
 };

 if (loading && viewMode === 'list') {
 return (
 <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
 <h1 className="sr-only">여론조사 목록을 불러오는 중</h1>
 <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
 <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">Syncing Matrix Data...</p>
 </div>
 );
 }

 return (
 <div className="space-y-12 pb-24">
 <PageHeader
 title="여론조사 센터"
 breadcrumbs={[{ label: '커뮤니티' }, { label: '여론조사 참여' }]}
 />

 <div className="space-y-8">
 {viewMode === 'list' && (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {(polls || []).length === 0 ? (
 <div className="col-span-full p-20 text-center bg-card rounded-lg border-2 border-dashed border-border flex flex-col items-center gap-6">
 <div className="w-20 h-11 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
 <Target size={40} />
 </div>
 <div className="space-y-2">
 <h3 className="text-xl font-bold tracking-tight text-foreground">활성 설문이 없습니다</h3>
 <p className="text-muted-foreground font-medium">새로운 설문이 등록되면 여기에 표시됩니다.</p>
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
 <div className="bg-card rounded-lg overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-border">
 <div className="bg-surface-inverse p-12 text-surface-inverse-foreground relative overflow-hidden">
 <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12">
 <Vote size={160} />
 </div>
 <div className="relative z-10 space-y-4">
 <div className="flex items-center gap-3">
 <div className="px-4 py-1 bg-white/10 rounded-lg border border-white/10 flex items-center gap-2">
 <Zap size={14} className="text-primary" />
 <span className="text-xs font-bold tracking-[0.2em]">{POLL_STATUS_LABEL[getPollStatus(selectedPoll, todayStr)]}</span>
 </div>
 <div className="px-4 py-1 bg-primary/20 rounded-lg border border-primary/20 flex items-center gap-2">
 <Calendar size={14} className="text-primary" />
 <span className="text-xs font-bold tracking-tighter uppercase font-mono ">{toDisplayYmd(selectedPoll.pollBgngYmd)} - {toDisplayYmd(selectedPoll.pollEndYmd)}</span>
 </div>
 </div>
 <h2 className="text-4xl font-bold tracking-tighter leading-none">{selectedPoll.pollNm}</h2>
 <p className="text-muted-foreground font-medium text-lg leading-relaxed">전사 의견 수렴을 위한 실시간 투표 세션입니다.</p>
 </div>
 </div>

 <div className="p-12 space-y-10">
 <div className="space-y-4">
 <label className="text-xs font-bold text-muted-foreground tracking-[0.3em] uppercase ml-1 block mb-6">
 {viewMode === 'vote' ? 'SELECT YOUR OPTION' : 'AGGREGATED METRICS'}
 </label>
 
 <div className="space-y-4">
 {pollItems.map((item, idx) => (
 <PollItem 
 key={item.pollArtclSn || `poll-item-${idx}`}
 item={item} 
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

 <div className="flex gap-4 pt-6">
 <Button 
 variant="ghost" 
 onClick={() => setViewMode('list')}
 className="h-11 px-10 rounded-lg font-bold text-xs tracking-widest uppercase hover:bg-muted border-2 border-border"
 >
 뒤로가기
 </Button>
 {viewMode === 'vote' && (
 <Button 
 disabled={!selectedItemSn || isVoting}
 onClick={handleVote}
 className="h-11 flex-1 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-xs tracking-[0.3em] uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 gap-3"
 >
 {isVoting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserCheck size={20} />}
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

function PollCard({ poll, todayStr, onSelect }: { poll: OnlinePollManageVO, todayStr: string, onSelect: () => void }) {
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
      className="group cursor-pointer bg-card rounded-lg p-10 border border-border shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-all relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-10">
        <div className="w-16 h-11 rounded-lg bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-xl transition-transform group-hover:rotate-6">
          <Vote size={28} />
        </div>
        <div className={cn(
          "px-4 py-1.5 rounded-lg border text-xs font-bold tracking-widest uppercase shadow-sm",
          isLive
            ? "bg-emerald-50 text-emerald-500 border-emerald-100"
            : status === 'scheduled'
            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
            : "bg-muted text-muted-foreground border-border"
        )}>
          {label}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold tracking-tighter leading-none group-hover:text-primary transition-colors uppercase">{poll.pollNm}</h3>
        <div className="flex items-center gap-3 font-mono text-xs font-bold text-muted-foreground tracking-tighter ">
          <Calendar size={14} className="opacity-40" />
          {toDisplayYmd(poll.pollBgngYmd)} <span className="opacity-20">/</span> {toDisplayYmd(poll.pollEndYmd)}
        </div>
      </div>

      <div className="mt-10 pt-8 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase opacity-60">Ready for Interaction</span>
        </div>
        <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>

      <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.02] group-hover:scale-110 transition-all duration-700 grayscale">
        <Vote size={200} />
      </div>
    </div>
  );
}

function PollItem({ item, totalVotes, isSelected, onSelect, mode, index, testId }: any) {
  const percentage = totalVotes > 0 ? Math.round(((item.pollIemCo || 0) / totalVotes) * 100) : 0;
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
        "relative p-8 rounded-lg border-2 transition-all group overflow-hidden cursor-pointer",
        isSelected ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-muted/50 hover:border-border",
        mode === 'result' && "cursor-default border-border bg-card"
      )}
    >
 <div className="flex items-center justify-between relative z-10">
 <div className="flex items-center gap-6">
 <div className={cn(
 "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-all",
 isSelected ? "bg-primary text-white" : "bg-card text-muted-foreground group-hover:text-primary"
 )}>
 {isSelected ? <CheckCircle2 size={20} /> : String(index + 1).padStart(2, '0')}
 </div>
 <span className={cn(
 "text-lg font-bold tracking-tight uppercase",
 isSelected ? "text-primary" : "text-foreground"
 )}>{item.pollArtclNm}</span>
 </div>
 {mode === 'result' && (
 <div className="text-right">
 <span className="text-2xl font-bold tracking-tighter text-foreground tabular-nums leading-none block">{percentage}%</span>
 <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">{item.pollIemCo || 0} Votes</span>
 </div>
 )}
 </div>

 {mode === 'result' && (
 <div className="mt-6 h-2 bg-muted rounded-lg overflow-hidden">
 <div 
 style={{ width: `${percentage}%` }}
 className="h-full bg-gradient-to-r from-primary to-hub-indigo rounded-lg transition-all duration-1000"
 />
 </div>
 )}
 
 {isSelected && (
 <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10">
 <Trophy size={48} className="text-primary" />
 </div>
 )}
 </div>
 );
}
