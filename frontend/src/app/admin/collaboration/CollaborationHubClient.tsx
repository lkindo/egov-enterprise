'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  RefreshCcw,
  Mail, 
  Send, 
  Inbox, 
  Contact2, 
  Bookmark, 
  Search, 
  Plus, 
  MoreVertical, 
  UserPlus, 
  MessageSquare, 
  Calendar, 
  ChevronRight,
  Filter,
  ArrowUpRight,
  Star,
  Hash,
  Paperclip,
  ExternalLink,
  Trash2,
  Users,
  Zap,
  Share2,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { noteService, Note } from '@/services/business/user/NoteService';
import { scrapService } from '@/services/business/user/ScrapService';
import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type CollaborationTab = 'MESSAGES' | 'ADDRESS_BOOK' | 'SCRAPS';

export default function CollaborationHubClient({ defaultTab = 'MESSAGES' }: { defaultTab?: CollaborationTab }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<CollaborationTab>(defaultTab);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // --- Queries ---

  // 1. Notes (Messages)
  const { data: noteData, isLoading: isNoteLoading } = useQuery({
    queryKey: ['collab-notes', activeTab],
    queryFn: () => noteService.getReceivedNotes({ page: 0, size: 50 }),
    enabled: activeTab === 'MESSAGES'
  });
  const notes = noteData?.list || [];

  // 2. Address Book
  const { data: addressData, isLoading: isAddressLoading } = useQuery({
    queryKey: ['collab-addressbook', searchKeyword],
    queryFn: () => addressbookUserService.getAddressBooks({ page번호: 1, pageUnit: 50, searchWrd: searchKeyword }),
    enabled: activeTab === 'ADDRESS_BOOK'
  });
  const addresses = addressData?.list || [];

  // 3. Scraps
  const { data: scrapData, isLoading: isScrapLoading } = useQuery({
    queryKey: ['collab-scraps', searchKeyword],
    queryFn: () => scrapService.getMyScraps({ page: 0, size: 50 }),
    enabled: activeTab === 'SCRAPS'
  });
  const scraps = scrapData?.list || [];

  // --- Selection Logic ---
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    if (activeTab === 'MESSAGES') return notes.find(n => n.noteId === selectedItemId);
    if (activeTab === 'ADDRESS_BOOK') return addresses.find((a: any) => a.adbkId === selectedItemId);
    if (activeTab === 'SCRAPS') return scraps.find((s: any) => s.scrapId === selectedItemId);
    return null;
  }, [selectedItemId, activeTab, notes, addresses, scraps]);

  // --- Renderers ---

  const renderMessageList = () => (
    <div className="space-y-3">
      {notes.map((note) => (
        <div 
          key={note.noteId}
          onClick={() => setSelectedItemId(note.noteId)}
          className={cn(
            "group p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center justify-between",
            selectedItemId === note.noteId 
              ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]" 
              : "bg-white border-transparent hover:border-slate-50 text-slate-600 shadow-sm"
          )}
        >
          <div className="flex items-start gap-6">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
              selectedItemId === note.noteId ? "bg-primary text-white" : "bg-slate-50 text-slate-400"
            )}>
              <Inbox size={20} />
            </div>
            <div className="space-y-1">
              <h4 className={cn("text-sm font-black ", selectedItemId === note.noteId ? "text-white" : "text-slate-900 tracking-tight")}>{note.noteSj}</h4>
              <p className="text-[8px] font-black tracking-tight opacity-40">보낸 사람: {note.trnsmitterNm || note.trnsmitterId}</p>
            </div>
          </div>
          {note.openYn === 'N' && <div className="w-2 h-2 rounded-full bg-primary" />}
        </div>
      ))}
    </div>
  );

  const renderAddressList = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {addresses.map((address) => (
        <Card 
          key={address.adbkId}
          onClick={() => setSelectedItemId(address.adbkId)}
          className={cn(
            "rounded-[2.5rem] border-2 transition-all cursor-pointer p-6 flex items-center gap-6",
            selectedItemId === address.adbkId 
              ? "bg-slate-900 border-slate-900 text-white shadow-xl" 
              : "bg-white border-transparent hover:border-slate-50"
          )}
        >
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black ">
            {address.adbkNm?.charAt(0)}
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black tracking-tight">{address.adbkNm}</h4>
            <p className="text-[10px] opacity-40">{address.email || '이메일 없음'}</p>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-1000">
      {/* --- Header --- */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl skew-x-2">
            <Share2 size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
              협업 통합 허브
            </h2>
            <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] mt-2 ">
              통합 기업용 소셜 및 메시징 센터
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="h-14 px-6 rounded-2xl border-2 font-black tracking-tight gap-2">
            <Mail size={18} /> 쪽지 쓰기
          </Button>
          <Button className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-black tracking-tight shadow-xl shadow-slate-200 hover:-translate-y-1 transition-all gap-2">
            <Plus size={20} /> 연락처 추가
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 px-2 min-h-[700px]">
        
        {/* --- Left Column: Navigation (20%) --- */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <Card className="rounded-[3rem] border-0 bg-white shadow-2xl p-4 ring-1 ring-slate-100 overflow-hidden">
            <NavButton icon={<Inbox size={20} />} label="메신저" active={activeTab === 'MESSAGES'} onClick={() => { setActiveTab('MESSAGES'); setSelectedItemId(null); }} />
            <NavButton icon={<Users size={20} />} label="전체 연락처" active={activeTab === 'ADDRESS_BOOK'} onClick={() => { setActiveTab('ADDRESS_BOOK'); setSelectedItemId(null); }} />
            <NavButton icon={<Bookmark size={20} />} label="스크랩 관리" active={activeTab === 'SCRAPS'} onClick={() => { setActiveTab('SCRAPS'); setSelectedItemId(null); }} />
          </Card>

          <Card className="rounded-[3rem] border-0 bg-primary text-white p-10 space-y-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            <Zap size={48} className="text-white/20 absolute -right-4 -top-4 rotate-12" />
            <div className="space-y-2 relative z-10">
              <h4 className="text-[10px] font-black tracking-tight opacity-60">응답률</h4>
              <p className="text-3xl font-black tracking-tighter">98.2%</p>
            </div>
          </Card>
        </div>

        {/* --- Center Column: Asset List (40%) --- */}
        <div className="col-span-12 lg:col-span-5 h-full flex flex-col gap-6">
          <Card className="flex-1 rounded-[3.5rem] border-0 bg-white shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-100">
            <CardHeader className="bg-slate-50/50 border-b p-10 space-y-8">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.4em] leading-tight">
                  {activeTab === 'MESSAGES' ? '보안 채널' : activeTab === 'ADDRESS_BOOK' ? '전체 주소록' : '스크랩 저장소'}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries()} className="h-8 text-[9px] font-black tracking-tight gap-2">
                  <RefreshCcw size={12} /> 동기화
                </Button>
              </div>
              <div className="flex gap-4">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <Input 
                    className="pl-12 h-14 bg-white border-slate-100 rounded-2xl text-sm font-bold shadow-sm" 
                    placeholder="이름, 부서, 회사명 검색..." 
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['collab-addressbook'] })}
                  className="h-14 px-10 rounded-2xl bg-slate-900 text-white font-black tracking-tighter shadow-xl hover:-translate-y-1 transition-all"
                >
                  검색 실행
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {activeTab === 'MESSAGES' && renderMessageList()}
                  {activeTab === 'ADDRESS_BOOK' && renderAddressList()}
                  {activeTab === 'SCRAPS' && (
                    <div className="p-10 text-center opacity-30 font-black tracking-[0.3em]">
                      스크랩 서비스 노드 연결 중
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

        {/* --- Right Column: Detail/Inspect (40%) --- */}
        <div className="col-span-12 lg:col-span-4 h-full">
          <AnimatePresence mode="wait">
            {selectedItemId ? (
              <motion.div 
                key={selectedItemId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col gap-8"
              >
                <Card className="flex-1 rounded-[3.5rem] border-0 bg-white shadow-2xl flex flex-col ring-1 ring-slate-100 overflow-hidden">
                  <CardHeader className="bg-slate-50/50 p-10 border-b">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight">
                      상세 정보
                    </h2>
                  </CardHeader>
                  <CardContent className="flex-1 p-10 space-y-12">
                    <div className="space-y-6">
                      <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100">
                        <pre className="text-[10px] font-mono whitespace-pre-wrap">
                          {JSON.stringify(selectedItem, null, 2)}
                        </pre>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Button className="flex-1 h-14 rounded-2xl bg-slate-900 text-white font-black tracking-tight text-[9px]">답장 / 열기</Button>
                      <Button variant="outline" className="h-14 w-14 rounded-2xl border-2"><Trash2 size={20} /></Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card className="h-full rounded-[3.5rem] border-2 border-dashed border-slate-200 bg-white/50 flex flex-col items-center justify-center p-20 text-center grayscale opacity-30">
                <Share2 size={64} className="mb-8" />
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight">
                  항목을 선택하세요
                </h3>
                <p className="text-[10px] mt-4 font-black tracking-tight">항목을 선택하여 내용을 확인하세요.</p>
              </Card>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full group p-6 rounded-[2rem] border-2 transition-all flex items-center gap-5",
        active 
          ? "bg-slate-900 border-slate-900 text-white shadow-xl" 
          : "bg-white border-transparent hover:border-slate-50 text-slate-500 hover:text-slate-900"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
        active ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
      )}>
        {icon}
      </div>
      <span className="text-[11px] font-black tracking-tight ">{label}</span>
    </button>
  );
}
