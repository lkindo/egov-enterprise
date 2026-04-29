'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  RefreshCcw,
  Mail,
  Inbox,
  Bookmark,
  Search,
  Plus,
  Trash2,
  Users,
  Zap,
  Share2,
  ChevronRight,
  ArrowUpRight,
  User,
  Clock,
  Phone,
  Globe,
  Star,
  Sparkles,
  Layers,
  Send,
  MessageSquare,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { noteService } from '@/services/business/user/NoteService';
import { scrapService } from '@/services/business/user/ScrapService';
import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService';
import { motion, AnimatePresence } from 'framer-motion';
import { hubContainerVariants, hubItemVariants } from '@/lib/hub-animations';
import { Badge } from '@/components/ui/badge';
import { HubListSkeleton, HubDetailSkeleton } from '@/components/ui/hub/HubSkeleton';

type CollaborationTab = 'MESSAGES' | 'ADDRESS_BOOK' | 'SCRAPS';

interface CollaborationHubClientProps {
  defaultTab?: CollaborationTab;
}

export default function CollaborationHubClient({ defaultTab = 'MESSAGES' }: CollaborationHubClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<CollaborationTab>(defaultTab);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // --- Data Fetching ---
  const { data: noteData, isLoading: notesLoading } = useQuery({
    queryKey: ['collab-notes', activeTab],
    queryFn: () => noteService.getReceivedNotes({ page: 0, size: 50 }),
    enabled: activeTab === 'MESSAGES'
  });
  const notes = (noteData as any)?.list || [];

  const { data: addressData, isLoading: addressLoading } = useQuery({
    queryKey: ['collab-addressbook', searchKeyword],
    queryFn: () => addressbookUserService.getAddressBooks({ size: 50, searchWrd: searchKeyword }),
    enabled: activeTab === 'ADDRESS_BOOK'
  });
  const addresses = (addressData as any)?.list || [];

  const { data: scrapData, isLoading: scrapsLoading } = useQuery({
    queryKey: ['collab-scraps', searchKeyword],
    queryFn: () => scrapService.getMyScraps({ page: 0, size: 50 }),
    enabled: activeTab === 'SCRAPS'
  });
  const scraps = (scrapData as any)?.list || [];

  const isLoading = notesLoading || addressLoading || scrapsLoading;
  
  // --- Mutations ---
  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => noteService.deleteNote(noteId, { type: 'RECV' }), // Assuming RECV for now
    onSuccess: () => {
      toast('쪽지가 성공적으로 삭제되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['collab-notes'] });
      setSelectedItemId(null);
    },
    onError: () => {
      toast('쪽지 삭제에 실패했습니다.', 'error');
    }
  });

  const handleDelete = () => {
    if (!selectedItemId) return;
    if (activeTab === 'MESSAGES') {
      if (confirm('정말 이 쪽지를 삭제하시겠습니까?')) {
        deleteNoteMutation.mutate(selectedItemId);
      }
    } else {
        toast('현재 탭의 삭제 기능은 준비 중입니다.', 'info');
    }
  };

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    if (activeTab === 'MESSAGES') return notes.find((n: any) => n.noteId === selectedItemId);
    if (activeTab === 'ADDRESS_BOOK') return addresses.find((a: any) => a.adbkId === selectedItemId);
    if (activeTab === 'SCRAPS') return scraps.find((s: any) => s.scrapId === selectedItemId);
    return null;
  }, [selectedItemId, activeTab, notes, addresses, scraps]);

  // --- Renderers ---
  const renderMessageList = () => (
    <div className="space-y-4">
      {notes.map((note: any) => (
        <motion.div
          key={note.noteId}
          layout
          onClick={() => setSelectedItemId(note.noteId)}
          className={cn(
            "group p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between relative overflow-hidden",
            selectedItemId === note.noteId
              ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02]"
              : "bg-white border-slate-50 hover:border-primary/20 text-slate-600 shadow-sm"
          )}
          role="button"
          aria-pressed={selectedItemId === note.noteId}
          aria-label={`${note.trnsmitterNm || note.trnsmitterId}님의 쪽지`}
        >
          <div className="flex items-start gap-6 relative z-10">
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-lg border transition-all",
              selectedItemId === note.noteId 
                ? "bg-primary text-white border-primary/20 rotate-6" 
                : "bg-slate-50 text-slate-400 border-slate-100 group-hover:rotate-6"
            )}>
              <Inbox size={24} />
            </div>
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <span className={cn(
                        "text-[8px] font-black tracking-widest uppercase italic font-mono",
                        selectedItemId === note.noteId ? "text-primary" : "text-slate-400"
                    )}>
                        SECURE_CHANNEL
                    </span>
                    <span className="text-[10px] font-black opacity-30 tabular-nums">
                        {note.sendDt?.substring(0, 10)}
                    </span>
                </div>
              <h4 className={cn("text-lg font-black tracking-tighter leading-none", selectedItemId === note.noteId ? "text-white" : "text-slate-900")}>
                {note.noteSj}
              </h4>
              <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">From: {note.trnsmitterNm || note.trnsmitterId}</p>
            </div>
          </div>
          <div className="relative z-10">
            {note.openYn === 'N' ? (
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
            ) : (
                <CheckBadge />
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderAddressList = () => (
    <div className="grid grid-cols-1 gap-4">
      {addresses.map((address: any) => (
        <motion.div
          key={address.adbkId}
          layout
          onClick={() => setSelectedItemId(address.adbkId)}
          className={cn(
            "group rounded-2xl border-2 transition-all cursor-pointer p-6 flex items-center justify-between relative overflow-hidden",
            selectedItemId === address.adbkId
              ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02]"
              : "bg-white border-slate-50 hover:border-primary/20 shadow-sm"
          )}
        >
          <div className="flex items-center gap-6 relative z-10">
            <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center font-black italic text-2xl border-2 transition-all shadow-inner",
                selectedItemId === address.adbkId 
                    ? "bg-primary border-primary/20 text-white rotate-6" 
                    : "bg-slate-50 border-slate-100 text-slate-300 group-hover:rotate-6 group-hover:text-primary"
            )}>
                {address.adbkNm?.charAt(0)}
            </div>
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-[8px] font-black tracking-widest uppercase italic px-2 py-0.5 rounded bg-primary/10",
                        selectedItemId === address.adbkId ? "text-white bg-white/10" : "text-primary"
                    )}>
                        IDENTITY_NODE
                    </span>
                </div>
                <h4 className="text-xl font-black italic tracking-tighter leading-none">{address.adbkNm}</h4>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{address.email || 'NO_EMAIL_RECORD'}</p>
            </div>
          </div>
          <ArrowUpRight className={cn(
              "w-6 h-6 transition-all",
              selectedItemId === address.adbkId ? "text-white translate-x-1 -translate-y-1" : "text-slate-200 group-hover:text-primary"
          )} />
        </motion.div>
      ))}
    </div>
  );

  const renderScrapList = () => (
    <div className="space-y-4">
      {scraps.length === 0 ? (
        <div className="p-32 flex flex-col items-center justify-center text-center opacity-30 grayscale grayscale-100">
           <Bookmark size={64} className="mb-6" />
           <p className="text-[10px] font-black tracking-[0.5em] uppercase">No Scraps Located in Database</p>
        </div>
      ) : (
        scraps.map((scrap: any) => (
          <motion.div
            key={scrap.scrapId}
            layout
            onClick={() => setSelectedItemId(scrap.scrapId)}
            className={cn(
              "group p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between relative overflow-hidden",
              selectedItemId === scrap.scrapId
                ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02]"
                : "bg-white border-slate-50 hover:border-primary/20 text-slate-600 shadow-sm"
            )}
          >
            <div className="flex items-start gap-6 relative z-10">
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-lg border transition-all",
                selectedItemId === scrap.scrapId 
                    ? "bg-primary text-white border-primary/20 rotate-6" 
                    : "bg-slate-50 text-slate-400 border-slate-100 group-hover:rotate-6"
              )}>
                <Bookmark size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <span className={cn(
                        "text-[8px] font-black tracking-widest uppercase italic font-mono px-2 py-0.5 rounded",
                        selectedItemId === scrap.scrapId ? "bg-white/10 text-white" : "bg-primary/10 text-primary"
                    )}>
                        KNOWLEDGE_SCRAP
                    </span>
                </div>
                <h4 className={cn("text-lg font-black tracking-tighter leading-none", selectedItemId === scrap.scrapId ? "text-white" : "text-slate-900")}>
                    {scrap.scrapNm}
                </h4>
                <p className="text-[8px] font-black tracking-tight opacity-40 uppercase">Saved: {scrap.createdDate?.substring(0, 10) || 'N/A'}</p>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );

  return (
    <motion.div 
        initial="hidden"
        animate="visible"
        variants={hubContainerVariants}
        className="space-y-12 pb-24"
    >
      {/* 1. Global Navigation Header */}
      <motion.div variants={hubItemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-[10px] font-black tracking-[0.5em] text-primary uppercase leading-none px-3 py-1 bg-primary/5 rounded-full border border-primary/10">Collaboration Hub</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none transition-colors">
            Connect <span className="text-primary">Matrix</span>
          </h1>
          <p className="text-sm font-bold text-slate-400 max-w-lg leading-relaxed uppercase tracking-widest italic">
            Unified communication terminal and organizational network index.
          </p>
        </div>
        <div className="flex items-center gap-4">
            <Button 
                variant="outline" 
                onClick={() => router.push('/admin/collaboration/mail-send')}
                className="h-16 px-8 rounded-xl border-2 border-slate-200 bg-white text-slate-900 font-black tracking-widest text-[11px] uppercase hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all shadow-xl gap-3 group"
            >
                <Send className="w-5 h-5 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" /> Send Note
            </Button>
            <Button 
                onClick={() => router.push('/admin/collaboration/address-book/insertAddressBook')}
                className="h-16 px-10 rounded-xl bg-slate-900 text-white font-black tracking-widest text-[11px] uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3 group"
            >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> New Identity
            </Button>
        </div>
      </motion.div>

      {/* 2. Central Operations Grid */}
      <motion.div variants={hubItemVariants} className="grid grid-cols-12 gap-8 px-2">
        
        {/* Sidebar Navigation */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="hub-glass-premium p-4 rounded-2xl border-2 border-slate-100/50 shadow-2xl space-y-2">
            <NavButton icon={<MessageSquare size={20} />} label="Messenger Hub" active={activeTab === 'MESSAGES'} count={notes.length} onClick={() => { setActiveTab('MESSAGES'); setSelectedItemId(null); }} />
            <NavButton icon={<Users size={20} />} label="Network Index" active={activeTab === 'ADDRESS_BOOK'} count={addresses.length} onClick={() => { setActiveTab('ADDRESS_BOOK'); setSelectedItemId(null); }} />
            <NavButton icon={<Bookmark size={20} />} label="Knowledge Scraps" active={activeTab === 'SCRAPS'} count={scraps.length} onClick={() => { setActiveTab('SCRAPS'); setSelectedItemId(null); }} />
          </div>

          <div className="hub-card-premium p-10 bg-gradient-to-br from-primary/20 to-transparent border-primary/20 relative overflow-hidden group">
            <Zap size={64} className="text-primary absolute -right-4 -bottom-4 rotate-12 opacity-10 group-hover:opacity-30 group-hover:scale-125 transition-all" />
            <div className="space-y-2 relative z-10">
              <h4 className="text-[10px] font-black tracking-[0.2em] text-primary uppercase opacity-60">Sync Score</h4>
              <p className="text-5xl font-black italic tracking-tighter text-slate-900">99.9%</p>
              <div className="w-full h-1 bg-white/30 rounded-full mt-4 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '99%' }} transition={{ duration: 2 }} className="h-full bg-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Data Stream Column */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full min-h-[600px]">
          <div className="hub-glass-premium flex-1 rounded-2xl border-2 border-slate-100/50 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-100 space-y-6 bg-white/30 backdrop-blur-3xl">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase italic">
                  {activeTab === 'MESSAGES' ? 'Secure Stream' : activeTab === 'ADDRESS_BOOK' ? 'Directory Nodes' : 'Scrap Inventory'}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries()} className="h-10 px-4 text-[9px] font-black tracking-widest gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg">
                  <RefreshCcw size={12} className="text-primary" /> RELOAD
                </Button>
              </div>
              <div className="relative group/search">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={18} />
                <Input
                  className="pl-14 h-14 bg-white border-2 border-slate-100 rounded-xl text-sm font-black shadow-inner placeholder:text-slate-200 focus:ring-0 focus:border-primary/20 transition-all"
                  placeholder="데이터 노드 검색..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  aria-label="데이터 노드 검색"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  {isLoading ? <HubListSkeleton /> : (
                    <>
                        {activeTab === 'MESSAGES' && renderMessageList()}
                        {activeTab === 'ADDRESS_BOOK' && renderAddressList()}
                        {activeTab === 'SCRAPS' && renderScrapList()}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Detail Intelligence Column */}
        <div className="col-span-12 lg:col-span-5 h-full">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <HubDetailSkeleton />
            ) : selectedItemId ? (
              <motion.div
                key={selectedItemId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full"
              >
                <div className="hub-glass-premium h-full rounded-2xl border-2 border-primary/20 shadow-[0_50px_100px_-20px_rgba(var(--primary),0.1)] overflow-hidden flex flex-col bg-white">
                  <div className="p-10 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-2xl">
                           <Sparkles size={24} />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Intelligence Detail</h2>
                            <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase italic">Node_ID: {selectedItemId}</p>
                        </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20 font-black text-[9px] px-3 py-1.5 rounded-full uppercase tracking-widest italic">Verified Node</Badge>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-12 space-y-10 scrollbar-hide">
                    {activeTab === 'MESSAGES' && <NoteDetail note={selectedItem} />}
                    {activeTab === 'ADDRESS_BOOK' && <AddressDetail address={selectedItem} />}
                    {activeTab === 'SCRAPS' && <ScrapDetail scrap={selectedItem} />}
                  </div>

                  <div className="p-8 border-t border-slate-100 bg-slate-50/50 backdrop-blur-xl flex gap-4">
                    <Button className="flex-1 h-16 rounded-xl bg-slate-900 text-white font-black tracking-widest text-[11px] uppercase shadow-2xl hover:scale-[1.02] active:scale-95 transition-all gap-3">
                        <ArrowUpRight size={18} /> Execute Action
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleDelete}
                        disabled={deleteNoteMutation.isPending}
                        className="h-16 w-16 rounded-xl border-2 border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-500/20 hover:bg-rose-50 transition-all shadow-xl"
                    >
                        {deleteNoteMutation.isPending ? <Loader2 className="animate-spin" /> : <Trash2 size={24} />}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="hub-glass-premium h-full rounded-2xl border-4 border-dashed border-slate-100 bg-white/30 flex flex-col items-center justify-center p-32 text-center group">
                <div className="w-32 h-32 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 group-hover:text-primary/20 transition-all duration-1000 rotate-12 group-hover:rotate-45 mb-10 border-2 border-slate-100 shadow-inner">
                    <Layers size={64} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none uppercase opacity-30">
                  Select Data Node
                </h3>
                <p className="text-[10px] mt-6 font-black tracking-[0.3em] uppercase opacity-20 max-w-xs mx-auto leading-relaxed">
                    데이터 스트림에서 인텔리전스 노드를 선택하여 상세 프로토콜을 확인하십시오.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Sub-Components ---

function NavButton({ icon, label, active, count, onClick }: { icon: any, label: string, active: boolean, count: number, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full group p-5 rounded-xl border-2 transition-all flex items-center justify-between",
        active
          ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-105"
          : "bg-white border-transparent hover:border-primary/20 text-slate-500 hover:text-slate-900 shadow-sm"
      )}
    >
      <div className="flex items-center gap-5">
        <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-inner border",
            active ? "bg-primary border-primary/20 text-white" : "bg-slate-50 border-slate-100 text-slate-400 group-hover:bg-slate-100 group-hover:text-primary"
        )}>
            {icon}
        </div>
        <span className="text-xs font-black tracking-tighter italic uppercase">{label}</span>
      </div>
      <Badge className={cn(
          "font-black tabular-nums border-none",
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
      )}>
          {count}
      </Badge>
    </button>
  );
}

function NoteDetail({ note }: { note: any }) {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 italic">
                        {note.trnsmitterNm?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-slate-900 italic leading-none">{note.trnsmitterNm || note.trnsmitterId}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sender_Identity</p>
                    </div>
                </div>
                <div className="h-px w-full bg-slate-100" />
            </div>
            
            <div className="space-y-4">
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight italic underline decoration-primary/20 underline-offset-8">
                    {note.noteSj}
                </h3>
                <div className="flex items-center gap-6 py-2">
                    <DetailBadge icon={Clock} label={note.sendDt || 'Pending'} />
                    <DetailBadge icon={ShieldCheck} label="Encrypted" />
                </div>
            </div>

            <div className="p-10 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner relative group/content">
                <div className="absolute top-6 right-8 opacity-[0.02] group-hover/content:opacity-5 transition-opacity pointer-events-none">
                    <QuoteIcon className="w-24 h-24" />
                </div>
                <p className="text-slate-600 text-lg font-medium leading-relaxed italic relative z-10">
                    {note.noteCn || 'No content transmitted.'}
                </p>
            </div>
        </div>
    );
}

function AddressDetail({ address }: { address: any }) {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-32 h-32 rounded-3xl bg-slate-900 text-white flex items-center justify-center text-5xl font-black italic shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] rotate-6 border-4 border-white">
                    {address.adbkNm?.charAt(0)}
                </div>
                <div className="space-y-2">
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">{address.adbkNm}</h3>
                    <p className="text-[11px] font-black text-primary uppercase tracking-[0.4em] italic">{address.othbcScope === 'P' ? 'GLOBAL_PUBLIC' : 'INTERNAL_ONLY'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <InfoRow icon={Mail} label="ELECTRONIC_MAIL" value={address.email || 'N/A'} />
                <InfoRow icon={Phone} label="COMM_LINK" value={address.telNo || 'N/A'} />
                <InfoRow icon={Globe} label="ADDRESS_NODE" value={address.adres || 'UNMAPPED_LOCATION'} />
            </div>

            <div className="hub-card-premium p-8 bg-slate-50 border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-xl flex items-center justify-center text-amber-500">
                        <Star size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-900 italic leading-none">VIP Network</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status Protocol</p>
                    </div>
                </div>
                <Badge className="bg-emerald-500 text-white border-none font-black text-[9px] px-3 uppercase tracking-widest italic">ACTIVE</Badge>
            </div>
        </div>
    );
}

function ScrapDetail({ scrap }: { scrap: any }) {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest italic">Persistent Knowledge Node</span>
                </div>
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight italic">
                    {scrap.scrapNm}
                </h3>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Capture_Date</span>
                    <p className="text-xl font-black text-slate-900 italic tabular-nums">{scrap.createdDate?.substring(0, 10)}</p>
                </div>
                <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reference_ID</span>
                    <p className="text-xl font-black text-slate-900 italic tabular-nums">SCR-{scrap.scrapId?.substring(0, 4)}</p>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic px-2">Data_Protocol_View</h4>
                <div className="p-8 rounded-2xl bg-slate-900 text-white/90 font-mono text-[11px] leading-relaxed shadow-2xl relative overflow-hidden group/code">
                    <div className="absolute top-4 right-4 opacity-10 group-hover/code:opacity-30 transition-opacity">
                        <Layers size={48} />
                    </div>
                    <code className="relative z-10 block">
                        RESOURCE: {scrap.scrapId}<br/>
                        TYPE: KNOWLEDGE_ASSET<br/>
                        STATUS: COMMITTED<br/>
                        TAGS: [INTERNAL, REUSABLE, CORE]
                    </code>
                </div>
            </div>
        </div>
    );
}

// --- Icons & UI Elements ---

function QuoteIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 7.55228 14.017 7V5C14.017 4.44772 14.4647 4 15.017 4H19.017C20.6739 4 22.017 5.34315 22.017 7V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM3 21L3 18C3 16.8954 3.89543 16 5 16H8C8.55228 16 9 15.5523 9 15V9C9 8.44772 8.55228 8 8 8H4C3.44772 8 3 7.55228 3 7V5C3 4.44772 3.44772 4 4 4H8C9.65685 4 11 5.34315 11 7V15C11 18.3137 8.31371 21 5 21H3Z" />
        </svg>
    );
}

function CheckBadge() {
    return (
        <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-1">Status</span>
            <div className="h-6 px-3 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black text-[9px] flex items-center gap-1.5 uppercase italic">
                <ShieldCheck size={10} /> Read
            </div>
        </div>
    );
}

function DetailBadge({ icon: Icon, label }: { icon: any, label: string }) {
    return (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-100">
            <Icon size={14} className="text-primary" />
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight italic tabular-nums">{label}</span>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="p-6 rounded-2xl bg-white border-2 border-slate-50 shadow-sm flex items-center justify-between group/row hover:border-primary/20 transition-all">
            <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/row:text-primary transition-colors">
                    <Icon size={20} />
                </div>
                <div className="space-y-0.5">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                    <p className="text-sm font-black text-slate-900 italic tracking-tight">{value}</p>
                </div>
            </div>
        </div>
    );
}
