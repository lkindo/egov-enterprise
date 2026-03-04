'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField } from '@/app/components/ui/standard-form';
import { UserPicker } from '@/app/components/ui/user-picker';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { noteService, Note } from '@/services/user/NoteService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Inbox, Send, MailOpen, Mail, Trash2, UserPlus, SendHorizonal, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotePage() {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);

  // 모달 상태
  const [isWriteModalOpen, setWriteOpen] = useState(false);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isDetailModalOpen, setDetailOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [formData, setFormData] = useState({ rcverId: '', rcverNm: '', noteSj: '', noteCn: '' });

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = (tab === 'received'
        ? await noteService.getReceivedNotes({ page: 0, size: 20 })
        : await noteService.getSentNotes({ page: 0, size: 20 })) as any;

      if (res?.success) setNotes(res.data.content || []);
    } catch (error) {
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
    } catch (error) {
      toast('전송 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleUserSelect = (user: any) => {
    setFormData({ ...formData, rcverId: user.ncrdId, rcverNm: user.ncrdNm });
  };

  const handleDetail = (note: Note) => {
    setSelectedNote(note);
    setDetailOpen(true);
    // 실제 읽음 처리 로직
    if (note.openYn === 'N') {
      // noteService.readNote(note.noteId); // API 필요 시 활성화
    }
  };

  const columns = [
    {
      header: '상태',
      accessor: (item: Note) => (
        item.openYn === 'Y' ? <MailOpen size={16} className="text-muted-foreground" /> : <Mail size={16} className="text-primary animate-bounce" />
      ),
      className: 'w-12'
    },
    {
      header: '제목',
      accessor: (item: Note) => item.noteSj,
      className: 'font-bold'
    },
    {
      header: tab === 'received' ? '발신자' : '수신자',
      accessor: (item: Note) => tab === 'received' ? item.trnsmitterId : item.rcverId
    },
    {
      header: '일시',
      accessor: (item: Note) => item.sendDt,
      className: 'text-xs text-muted-foreground'
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: Note) => (
        <button
          onClick={(e) => { e.stopPropagation(); toast('삭제되었습니다(Mock)', 'info'); }}
          className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md"
        >
          <Trash2 size={16} />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="쪽지 센터"
        breadcrumbs={[{ label: '협업지원' }, { label: '쪽지관리' }]}
        actions={
          <button
            onClick={() => setWriteOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
          >
            <SendHorizonal size={18} />
            쪽지 보내기
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setTab('received')}
          className={cn(
            "flex items-center gap-2 px-8 py-4 text-sm font-black border-b-2 transition-all",
            tab === 'received' ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Inbox size={18} /> 받은 쪽지함
        </button>
        <button
          onClick={() => setTab('sent')}
          className={cn(
            "flex items-center gap-2 px-8 py-4 text-sm font-black border-b-2 transition-all",
            tab === 'sent' ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Send size={18} /> 보낸 쪽지함
        </button>
      </div>

      <StandardDataTable
        columns={columns}
        data={notes}
        loading={loading}
        onRowClick={handleDetail}
        emptyMessage={tab === 'received' ? "받은 쪽지가 없습니다." : "보낸 쪽지가 없습니다."}
      />

      {/* 쪽지 작성 모달 */}
      <StandardModal
        isOpen={isWriteModalOpen}
        onClose={() => setWriteOpen(false)}
        title="새 쪽지 작성"
        footer={
          <>
            <button onClick={() => setWriteOpen(false)} className="px-4 py-2 border rounded-lg font-bold">취소</button>
            <button onClick={handleSend} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary/90">보내기</button>
          </>
        }
      >
        <div className="space-y-6">
          <FormField label="수신자 선택" required>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <UserPlus size={16} className="absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  value={formData.rcverNm ? `${formData.rcverNm} (${formData.rcverId})` : ''}
                  placeholder="사용자를 검색해 주세요."
                  readOnly
                  className="w-full h-10 pl-10 pr-3 rounded-md border bg-muted/20 text-sm outline-none cursor-not-allowed"
                />
              </div>
              <button
                onClick={() => setPickerOpen(true)}
                className="px-4 bg-white border border-primary text-primary rounded-md font-bold text-xs hover:bg-primary/5 transition-all flex items-center gap-2"
              >
                <Search size={14} /> 검색
              </button>
            </div>
          </FormField>
          <FormField label="제목" required>
            <input
              type="text"
              value={formData.noteSj}
              onChange={(e) => setFormData({ ...formData, noteSj: e.target.value })}
              placeholder="쪽지 제목을 입력하세요."
              className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
          <FormField label="내용">
            <textarea
              value={formData.noteCn}
              onChange={(e) => setFormData({ ...formData, noteCn: e.target.value })}
              className="w-full min-h-[150px] p-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="내용을 입력하세요."
            />
          </FormField>
        </div>
      </StandardModal>

      <UserPicker
        isOpen={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleUserSelect}
      />

      {/* 쪽지 상세 모달 */}
      <StandardModal
        isOpen={isDetailModalOpen}
        onClose={() => setDetailOpen(false)}
        title="쪽지 상세 내용"
        maxWidth="md"
      >
        {selectedNote && (
          <div className="space-y-6 py-2">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h3 className="text-xl font-black text-foreground">{selectedNote.noteSj}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {tab === 'received' ? `발신: ${selectedNote.trnsmitterId}` : `수신: ${selectedNote.rcverId}`} • {selectedNote.sendDt}
                </p>
              </div>
              <StatusBadge status={selectedNote.openYn === 'Y' ? 'C' : 'R'} />
            </div>
            <div className="text-sm leading-relaxed text-foreground bg-muted/10 p-4 rounded-xl min-h-[200px] whitespace-pre-wrap">
              {selectedNote.noteCn}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDetailOpen(false)} className="px-6 py-2 bg-muted rounded-lg font-bold text-sm">닫기</button>
              {tab === 'received' && (
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    setFormData({ ...formData, rcverId: selectedNote.trnsmitterId, noteSj: `Re: ${selectedNote.noteSj}` });
                    setWriteOpen(true);
                  }}
                  className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-md"
                >
                  답장하기
                </button>
              )}
            </div>
          </div>
        )}
      </StandardModal>
    </div>
  );
}
