'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { pollUserService } from '@/services/business/user/poll/PollUserService';
import { OnlinePollManageVO, OnlinePollItemVO } from '@/types/business/poll';
import { 
 Vote, 
 Calendar, 
 ChevronRight, 
 CheckCircle2, 
 BarChart3, 
 Clock, 
 AlertCircle,
 UserCheck,
 Zap,
 Trophy,
 Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function OnlinePollParticipateClient() {
 const [polls, setPolls] = useState<OnlinePollManageVO[]>([]);
 const [selectedPoll, setSelectedPoll] = useState<OnlinePollManageVO | null>(null);
 const [pollItems, setPollItems] = useState<OnlinePollItemVO[]>([]);
 const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const [isVoting, setIsVoting] = useState(false);
 const [viewMode, setViewMode] = useState<'list' | 'vote' | 'result'>('list');
 const [todayStr, setTodayStr] = useState<string>('');


 useEffect(() => {
 setTodayStr(format(new Date(), 'yyyy-MM-dd'));
 fetchPolls();
 }, []);

 const fetchPolls = async () => {
 setLoading(true);
 try {
 const res = await pollUserService.getPollList({ page: 0, size: 100 });
 console.log('>>> [DEBUG] fetchPolls res:', JSON.stringify(res, null, 2));
 // Support both Spring Data JPA Page (content) and legacy list format
 setPolls(res.list || []);
 } catch (error) {
 toast.error('설문 목록을 불러오지 못했습니다.');
 } finally {
 setLoading(false);
 }
 };

 const handleSelectPoll = async (poll: OnlinePollManageVO) => {
 console.log(`>>> [DEBUG] handleSelectPoll: pollId=${poll.pollId}, today=${todayStr}, begin=${poll.pollBeginDe}, end=${poll.pollEndDe}`);
 setLoading(true);
 try {
 const items = await pollUserService.getPollItemList(poll.pollId!);
 console.log(`>>> [DEBUG] fetched items: count=${items?.length || 0}`);
 setPollItems(items || []);
 setSelectedPoll(poll);
 setSelectedItemId(null);
 
 if (todayStr > (poll.pollEndDe || '9999-12-31')) {
 console.log('>>> [DEBUG] setting viewMode: result');
 setViewMode('result');
 } else {
 console.log('>>> [DEBUG] setting viewMode: vote');
 setViewMode('vote');
 }
 } catch (error) {
 console.error('>>> [ERROR] handleSelectPoll failed:', error);
 toast.error('설문 상세 정보를 불러오지 못했습니다.');
 } finally {
 setLoading(false);
 }
 };

 const handleVote = async () => {
 // if (!poll.pollItems || poll.pollItems.length === 0) return null;

 if (!selectedPoll || !selectedItemId) return;

 setIsVoting(true);
 try {
 await pollUserService.participatePoll({
 pollId: selectedPoll.pollId!,
 pollIemId: selectedItemId
 });
 toast.success('투표가 성공적으로 반영되었습니다.');
 // Refresh items to show new counts
 const updatedItems = await pollUserService.getPollItemList(selectedPoll.pollId!);
 setPollItems(updatedItems);
 setViewMode('result');
 } catch (error: unknown) {
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
 <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-lg animate-spin" />
 <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Syncing Matrix Data...</p>
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
 <div className="col-span-full p-20 text-center bg-white rounded-lg border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
 <div className="w-20 h-11 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300">
 <Target size={40} />
 </div>
 <div className="space-y-2">
 <h3 className="text-xl font-bold tracking-tight text-slate-900">활성 설문이 없습니다</h3>
 <p className="text-slate-400 font-medium">새로운 설문이 등록되면 여기에 표시됩니다.</p>
 </div>
 </div>
 ) : (
 (polls || []).map((poll) => (
 <PollCard key={poll.pollId} poll={poll} todayStr={todayStr} onSelect={() => handleSelectPoll(poll)} />
 ))
 )}
 </div>
 )}

 {(viewMode === 'vote' || viewMode === 'result') && selectedPoll && (
 <div className="max-w-3xl mx-auto">
 <div className="bg-white rounded-lg overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-100">
 <div className="bg-slate-900 p-12 text-white relative overflow-hidden">
 <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12">
 <Vote size={160} />
 </div>
 <div className="relative z-10 space-y-4">
 <div className="flex items-center gap-3">
 <div className="px-4 py-1 bg-white/10 rounded-lg border border-white/10 flex items-center gap-2">
 <Zap size={14} className="text-primary" />
 <span className="text-xs font-bold tracking-[0.2em] uppercase">Protocol Online</span>
 </div>
 <div className="px-4 py-1 bg-primary/20 rounded-lg border border-primary/20 flex items-center gap-2">
 <Calendar size={14} className="text-primary" />
 <span className="text-xs font-bold tracking-tighter uppercase font-mono ">{selectedPoll.pollBeginDe} - {selectedPoll.pollEndDe}</span>
 </div>
 </div>
 <h2 className="text-4xl font-bold tracking-tighter leading-none">{selectedPoll.pollNm}</h2>
 <p className="text-slate-400 font-medium text-lg leading-relaxed">전사 의견 수렴을 위한 실시간 투표 세션입니다.</p>
 </div>
 </div>

 <div className="p-12 space-y-10">
 <div className="space-y-4">
 <label className="text-xs font-bold text-slate-400 tracking-[0.3em] uppercase ml-1 block mb-6">
 {viewMode === 'vote' ? 'SELECT YOUR OPTION' : 'AGGREGATED METRICS'}
 </label>
 
 <div className="space-y-4">
 {pollItems.map((item, idx) => (
 <PollItem 
 key={item.pollIemId} 
 item={item} 
 totalVotes={pollItems.reduce((sum, i) => sum + (i.pollIemCo || 0), 0)}
 isSelected={selectedItemId === item.pollIemId}
 onSelect={() => viewMode === 'vote' && setSelectedItemId(item.pollIemId!)}
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
 className="h-11 px-10 rounded-lg font-bold text-xs tracking-widest uppercase hover:bg-slate-50 border-2 border-slate-50"
 >
 뒤로가기
 </Button>
 {viewMode === 'vote' && (
 <Button 
 disabled={!selectedItemId || isVoting}
 onClick={handleVote}
 className="h-11 flex-1 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-[0.3em] uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 gap-3"
 >
 {isVoting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-lg animate-spin" /> : <UserCheck size={20} />}
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
 const isClosed = todayStr > (poll.pollEndDe || '9999-12-31');

 
 return (
 <div 
 onClick={onSelect}
 className="group cursor-pointer bg-white rounded-lg p-10 border border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-all relative overflow-hidden"
 >
 <div className="flex justify-between items-start mb-10">
 <div className="w-16 h-11 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xl transition-transform group-hover:rotate-6">
 <Vote size={28} />
 </div>
 <div className={cn(
 "px-4 py-1.5 rounded-lg border text-xs font-bold tracking-widest uppercase shadow-sm",
 isClosed ? "bg-slate-50 text-slate-400 border-slate-100" : "bg-emerald-50 text-emerald-500 border-emerald-100"
 )}>
 {isClosed ? 'Closed' : 'Live Now'}
 </div>
 </div>

 <div className="space-y-4">
 <h3 className="text-2xl font-bold tracking-tighter leading-none group-hover:text-primary transition-colors uppercase">{poll.pollNm}</h3>
 <div className="flex items-center gap-3 font-mono text-xs font-bold text-slate-400 tracking-tighter ">
 <Calendar size={14} className="opacity-40" />
 {poll.pollBeginDe} <span className="opacity-20">/</span> {poll.pollEndDe}
 </div>
 </div>

 <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-lg bg-primary animate-pulse" />
 <span className="text-xs font-bold text-slate-500 tracking-widest uppercase opacity-60">Ready for Interaction</span>
 </div>
 <ChevronRight size={18} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
 </div>

 <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.02] group-hover:scale-110 transition-all duration-700 grayscale">
 <Vote size={200} />
 </div>
 </div>
 );
}

function PollItem({ item, totalVotes, isSelected, onSelect, mode, index, testId }: any) {
 const percentage = totalVotes > 0 ? Math.round((item.pollIemCo || 0) / totalVotes * 100) : 0;
 
 return (
 <div 
 onClick={onSelect}
 data-testid={testId}
 className={cn(
 "relative p-8 rounded-lg border-2 transition-all group overflow-hidden cursor-pointer",
 isSelected ? "border-primary bg-primary/5 shadow-lg" : "border-slate-50 bg-slate-50/50 hover:border-slate-200",
 mode === 'result' && "cursor-default border-slate-50 bg-white"
 )}
 >
 <div className="flex items-center justify-between relative z-10">
 <div className="flex items-center gap-6">
 <div className={cn(
 "w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm transition-all",
 isSelected ? "bg-primary text-white" : "bg-white text-slate-400 group-hover:text-primary"
 )}>
 {isSelected ? <CheckCircle2 size={20} /> : String(index + 1).padStart(2, '0')}
 </div>
 <span className={cn(
 "text-lg font-bold tracking-tight uppercase",
 isSelected ? "text-primary" : "text-slate-900"
 )}>{item.pollIemNm}</span>
 </div>
 {mode === 'result' && (
 <div className="text-right">
 <span className="text-2xl font-bold tracking-tighter text-slate-900 tabular-nums leading-none block">{percentage}%</span>
 <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">{item.pollIemCo || 0} Votes</span>
 </div>
 )}
 </div>

 {mode === 'result' && (
 <div className="mt-6 h-2 bg-slate-50 rounded-lg overflow-hidden">
 <div 
 style={{ width: `${percentage}%` }}
 className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-lg transition-all duration-1000"
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

