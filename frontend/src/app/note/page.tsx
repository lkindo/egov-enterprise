'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import dynamic from 'next/dynamic';
const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });
import { FormField } from '@/app/components/ui/standard-form';
import { UserPicker } from '@/app/components/ui/user-picker';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { noteService, Note } from '@/services/business/user/NoteService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Inbox, Send, MailOpen, Mail, Trash2, UserPlus, SendHorizonal, Search, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function NotePage() {
  const { toast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const confirm = useConfirm();

  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);

  const [isWriteModalOpen, setWriteOpen] = useState(false);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isDetailModalOpen, setDetailOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({ rcverId: '', rcverNm: '', noteSj: '', noteCn: '' });

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await (tab === 'received'
        ? noteService.getReceivedNotes({ page: 0, size: 20 })
        : noteService.getSentNotes({ page: 0, size: 20 }));

      setNotes(res.list || []);
    } catch {
      toast('쪽지 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleSend = async () => {
    if (!formData.rcverId || !formData.noteSj) {
      toast('수신자와 제목을 입력하세요.', 'error');
      return;
    }

    try {
      await noteService.sendNote(formData);
      toast('쪽지가 성공적으로 전송되었습니다.', 'success');
      setWriteOpen(false);
      setFormData({ rcverId: '', rcverNm: '', noteSj: '', noteCn: '' });
      if (tab === 'sent') loadNotes();
    } catch {
      toast('전송 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleUserSelect = (user: any) => {
    setFormData({ ...formData, rcverId: user.ncrdId, rcverNm: user.ncrdNm });
  };

  const handleDetail = (note: Note) => {
    setSelectedNote(note);
    setDetailOpen(true);
  };

  const columns = [
    {
      header: '상태',
      accessor: (item: Note) => (
        item.openYn === 'Y' ? <MailOpen size={18} className="text-slate-300" /> : <Mail size={18} className="text-primary animate-pulse shadow-glow shadow-primary" />
      ),
      className: 'w-16'
    },
    {
      header: '제목',
      accessor: (item: Note) => <span className="font-bold text-slate-800 tracking-tight">{item.noteSj}</span>,
    },
    {
      header: tab === 'received' ? '발신자' : '수신자',
      accessor: (item: Note) => (
        <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                <User size={14} />
            </div>
            <span className="text-sm font-bold text-slate-600">{tab === 'received' ? item.trnsmitterId : item.rcverId}</span>
        </div>
      )
    },
    {
      header: '일시',
      accessor: (item: Note) => <span className="text-xs font-bold text-slate-400 font-mono tracking-tighter">{item.sendDt}</span>,
    },
    {
      header: '관리',
      accessor: (item: Note) => (
        <button
          onClick={(e) => { e.stopPropagation(); toast('삭제되었습니다(Mock)', 'info'); }}
          className="p-2 hover:bg-rose-50 text-rose-400 rounded-[0.1rem] transition-colors group"
        >
          <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 p-8 animate-in fade-in duration-1000 max-w-6xl mx-auto">
      <PageHeader
        title="쪽지 인텔리전스 센터"
        breadcrumbs={[{ label: '협업지원' }, { label: '쪽지관리' }]}
        actions={
          <Button
            onClick={() => setWriteOpen(true)}
            className="h-11 px-10 rounded-[0.1rem] bg-slate-950 border-none text-white font-bold text-sm shadow-2xl hover:bg-primary transition-all gap-3 overflow-hidden group"
          >
            <SendHorizonal size={20} className="group-hover:translate-x-1 transition-transform" /> 쪽지 상세 기안
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 rounded-[0.1rem] p-10 text-white relative overflow-hidden group border-none shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
                    <Sparkles size={120} className="text-primary" />
                </div>
                <div className="relative z-10 space-y-4">
                    <h4 className="text-xs font-bold text-primary uppercase tracking-[0.4em]">Personal Messaging</h4>
                    <h3 className="text-3xl font-bold tracking-tighter leading-tight capitalize">쪽지 커뮤니케이션<br />아키텍처</h3>
                </div>
          </div>
          <div className="col-span-2 flex p-2 bg-slate-100 rounded-[0.1rem] w-full items-center justify-center">
                <TabButton
                    active={tab === 'received'}
                    onClick={() => setTab('received')}
                    icon={<Inbox size={22} />}
                    label="받은 쪽지함"
                    count={tab === 'received' ? notes.length : undefined}
                />
                <TabButton
                    active={tab === 'sent'}
                    onClick={() => setTab('sent')}
                    icon={<Send size={22} />}
                    label="보낸 쪽지함"
                    count={tab === 'sent' ? notes.length : undefined}
                />
          </div>
      </div>

      <div className="bg-white rounded-[0.1rem] border-2 border-slate-50 shadow-2xl overflow-hidden p-6">
        <StandardDataTable
          columns={columns}
          data={notes}
          loading={loading}
          onRowClick={handleDetail}
          emptyMessage={tab === 'received' ? "받은 메시지가 없습니다." : "작성된 메시지가 없습니다."}
          className="border-none shadow-none rounded-none"
        />
      </div>

      <StandardModal
        isOpen={isWriteModalOpen}
        onClose={() => setWriteOpen(false)}
        title="새 쪽지 기안"
        footer={
          <div className="flex gap-4 w-full">
            <Button variant="ghost" onClick={() => setWriteOpen(false)} className="h-11 flex-1 rounded-[0.1rem] font-bold text-slate-400">취소</Button>
            <Button onClick={handleSend} className="h-11 flex-[2] bg-slate-900 text-white rounded-[0.1rem] font-bold text-sm tracking-widest shadow-2xl hover:bg-primary transition-all">메시지 전송</Button>
          </div>
        }
      >
        <div className="space-y-8 p-4">
          <FormField label="대상자 식별 (수신자)" required>
            <div className="flex gap-3">
              <div className="relative flex-1 group">
                <UserPlus size={18} className="absolute left-6 top-5 text-slate-300 group-hover:text-primary transition-colors" />
                <input
                  type="text"
                  value={formData.rcverNm ? `${formData.rcverNm} (${formData.rcverId})` : ''}
                  placeholder="대상자를 식별하십시오..."
                  readOnly
                  className="w-full h-11 pl-16 pr-6 rounded-[0.1rem] bg-slate-50 border-none text-sm font-bold tracking-tight outline-none cursor-not-allowed group-hover:bg-slate-100 transition-all font-mono"
                />
              </div>
              <Button
                onClick={() => setPickerOpen(true)}
                className="h-11 px-8 bg-white border-2 border-slate-100 text-slate-900 rounded-[0.1rem] font-bold text-xs tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-xl active:scale-95"
              >
                <Search size={16} className="mr-2" /> 타겟 검색
              </Button>
            </div>
          </FormField>
          <FormField label="시스템 제목" required>
            <input
              type="text"
              value={formData.noteSj}
              onChange={(e) => setFormData({ ...formData, noteSj: e.target.value })}
              placeholder="쪽지 아키텍처 제목을 입력하세요."
              className="w-full h-11 px-8 rounded-[0.1rem] bg-slate-50 border-none text-sm font-bold tracking-tight outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </FormField>
          <FormField label="데이터 바디 (내용)">
            <textarea
              value={formData.noteCn}
              onChange={(e) => setFormData({ ...formData, noteCn: e.target.value })}
              className="w-full min-h-[200px] p-8 rounded-[0.1rem] bg-slate-50 border-none text-base font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none leading-relaxed"
              placeholder="전달할 메시지 데이터를 상세히 기입하세요..."
            />
          </FormField>
        </div>
      </StandardModal>

      <UserPicker
        isOpen={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleUserSelect}
      />

      <StandardModal
        isOpen={isDetailModalOpen}
        onClose={() => setDetailOpen(false)}
        title="쪽지 데이터 상세 정보"
        maxWidth="md"
      >
        {selectedNote && (
          <div className="space-y-10 py-6 px-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-10">
              <div className="space-y-4">
                    <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-lg bg-primary animate-ping" />
                         <span className="text-xs font-bold tracking-[0.4em] text-slate-300 uppercase font-mono">Message_Body_Node</span>
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">{selectedNote.noteSj}</h3>
                    <div className="flex items-center gap-4 pt-2">
                         <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-widest">
                             {tab === 'received' ? `FR: ${selectedNote.trnsmitterId}` : `TO: ${selectedNote.rcverId}`}
                         </div>
                         <div className="text-xs font-bold text-slate-300 font-mono tracking-tighter uppercase">{selectedNote.sendDt}</div>
                    </div>
              </div>
              <StatusBadge status={selectedNote.openYn === 'Y' ? 'C' : 'R'} />
            </div>
            <div className="text-xl font-bold leading-[1.8] text-slate-700 bg-slate-50/50 p-12 rounded-[0.1rem] border-2 border-slate-50 min-h-[300px] whitespace-pre-wrap shadow-inner ring-1 ring-white">
              {selectedNote.noteCn}
            </div>
            <div className="flex gap-4 justify-end pt-4">
              <Button variant="ghost" onClick={() => setDetailOpen(false)} className="h-11 px-10 rounded-[0.1rem] font-bold text-slate-400">데이터 닫기</Button>
              {tab === 'received' && (
                <Button
                  onClick={() => {
                    setDetailOpen(false);
                    setFormData({ ...formData, rcverId: selectedNote.trnsmitterId, noteSj: `Re: ${selectedNote.noteSj}` });
                    setWriteOpen(true);
                  }}
                  className="h-11 px-10 bg-slate-900 text-white rounded-[0.1rem] font-bold text-sm tracking-widest shadow-2xl hover:bg-primary transition-all gap-2"
                >
                  <SendHorizonal size={18} /> 실시간 답장 전송
                </Button>
              )}
            </div>
          </div>
        )}
      </StandardModal>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-10 py-5 rounded-[0.1rem] font-bold text-xs transition-all duration-500 uppercase tracking-widest flex-1 justify-center",
        active
          ? "bg-white text-slate-950 shadow-2xl shadow-slate-200 scale-[1.03] z-10"
          : "text-slate-400 hover:text-slate-600"
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className={cn(
          "ml-3 text-xs px-2.5 py-1 rounded-lg font-bold shadow-inner",
          active ? "bg-slate-950 text-white" : "bg-slate-200 text-slate-400 text-xs"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
