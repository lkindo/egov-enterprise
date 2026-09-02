'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import dynamic from 'next/dynamic';
const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });
import { FormField } from '@/app/components/ui/standard-form';
import { UserPicker } from '@/app/components/ui/user-picker';
import { StatusBadge } from '@/components/ui/status-badge';
import { noteService, Note } from '@/services/business/user/NoteService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Inbox, Send, MailOpen, Mail, Trash2, UserPlus, SendHorizonal, Search, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { UserSearchResult } from '@/services/business/user/UserSearchService';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { noteComposeSchema } from './note-form-validation';

const NOTE_FORM_LABELS = {
  rcverId: '수신자',
  noteSj: '제목',
  noteCn: '내용',
};

type NoteTab = 'received' | 'sent';

interface NoteDetailTarget {
  note: Note;
  type: NoteTab;
  relationSn: number;
}

export default function NotePage() {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState<NoteTab>('received');
  const tabRef = useRef<NoteTab>('received');
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [listError, setListError] = useState<Error | null>(null);
  const listRequestRef = useRef(0);

  const [isWriteModalOpen, setWriteOpen] = useState(false);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isDetailModalOpen, setDetailOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [detailTarget, setDetailTarget] = useState<NoteDetailTarget | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<Error | null>(null);
  const detailRequestRef = useRef(0);
  const [formData, setFormData] = useState({ rcverId: '', rcverNm: '', noteSj: '', noteCn: '' });
  const [isSending, setIsSending] = useState(false);
  const sendingRef = useRef(false);
  const [deletingRelationSn, setDeletingRelationSn] = useState<number | null>(null);
  const deletePendingRef = useRef(false);
  const validation = useManualFormValidation(noteComposeSchema, {
    labels: NOTE_FORM_LABELS,
    focusTargets: {
      rcverId: () => document.getElementById('note-recipient-picker-button'),
    },
  });

  const loadNotes = useCallback(async (requestedTab: NoteTab = tabRef.current) => {
    if (requestedTab !== tabRef.current) return;
    const requestId = ++listRequestRef.current;
    setLoading(true);
    setListError(null);
    setNotes([]);
    try {
      const res = await (requestedTab === 'received'
        ? noteService.getReceivedNotes({ page: 0, size: 20 })
        : noteService.getSentNotes({ page: 0, size: 20 }));

      if (requestId !== listRequestRef.current || requestedTab !== tabRef.current) return;
      setNotes(res.list || []);
    } catch {
      if (requestId !== listRequestRef.current || requestedTab !== tabRef.current) return;
      setListError(new Error('쪽지 목록을 불러오지 못했습니다.'));
      setNotes([]);
      toast('쪽지 목록을 불러오지 못했습니다.', 'error');
    } finally {
      if (requestId === listRequestRef.current && requestedTab === tabRef.current) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadNotes(tab);
    return () => {
      listRequestRef.current += 1;
    };
  }, [loadNotes, tab]);

  const closeDetailModal = () => {
    detailRequestRef.current += 1;
    setDetailOpen(false);
    setSelectedNote(null);
    setDetailTarget(null);
    setDetailLoading(false);
    setDetailError(null);
  };

  const handleTabChange = (nextTab: NoteTab) => {
    if (nextTab === tab) return;
    tabRef.current = nextTab;
    listRequestRef.current += 1;
    setNotes([]);
    setListError(null);
    setLoading(true);
    closeDetailModal();
    setTab(nextTab);
  };

  const handleSend = async () => {
    if (sendingRef.current) return;
    const validated = validation.validate({
      rcverId: formData.rcverId,
      noteSj: formData.noteSj,
      noteCn: formData.noteCn,
    });
    if (!validated) return;

    sendingRef.current = true;
    setIsSending(true);
    try {
      await noteService.sendNote(validated);
      toast('쪽지가 성공적으로 전송되었습니다.', 'success');
      setWriteOpen(false);
      setFormData({ rcverId: '', rcverNm: '', noteSj: '', noteCn: '' });
      validation.setFormErrors({}, false);
      if (tab === 'sent' && tabRef.current === 'sent') void loadNotes('sent');
    } catch (error) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast('전송 중 오류가 발생했습니다.', 'error');
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  const handleUserSelect = (user: UserSearchResult) => {
    setFormData((current) => ({ ...current, rcverId: user.esntlId ?? '', rcverNm: user.userNm ?? '' }));
    validation.clearError('rcverId');
  };

  const closeWriteModal = () => {
    if (sendingRef.current) return;
    setWriteOpen(false);
    validation.setFormErrors({}, false);
  };

  const loadNoteDetail = useCallback(async (target: NoteDetailTarget) => {
    const requestId = ++detailRequestRef.current;
    setSelectedNote(null);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const detail = await noteService.getNote(target.note.noteSn, {
        type: target.type,
        relationSn: target.relationSn,
      });
      if (requestId !== detailRequestRef.current) return;

      const resolvedDetail: Note = {
        ...target.note,
        ...detail,
        ...(target.type === 'received' ? { openYn: 'Y' } : {}),
      };
      setSelectedNote(resolvedDetail);

      if (target.type === 'received') {
        setNotes((current) => current.map((item) => (
          item.noteRcptnSn === target.relationSn
            ? { ...item, ...detail, noteRcptnSn: target.relationSn, openYn: 'Y' }
            : item
        )));
      }
    } catch {
      if (requestId !== detailRequestRef.current) return;
      setDetailError(new Error('쪽지 상세 정보를 불러오지 못했습니다.'));
    } finally {
      if (requestId === detailRequestRef.current) setDetailLoading(false);
    }
  }, []);

  const handleDetail = (note: Note) => {
    const relationSn = tab === 'received' ? note.noteRcptnSn : note.noteSndngSn;
    if (relationSn == null) {
      toast('상세 조회 대상 식별자를 찾을 수 없습니다.', 'error');
      return;
    }

    const target = { note, type: tab, relationSn };
    setDetailTarget(target);
    setDetailOpen(true);
    void loadNoteDetail(target);
  };

  const handleDelete = async (note: Note) => {
    const deleteTab = tab;
    // 관계 일련번호 소스는 탭별로 다르다 — 수신함=noteRcptnSn, 발신함=noteSndngSn
    const relationSn = deleteTab === 'received' ? note.noteRcptnSn : note.noteSndngSn;
    if (!relationSn) {
      toast('삭제 대상 식별자를 찾을 수 없습니다.', 'error');
      return;
    }
    if (deletePendingRef.current) return;
    deletePendingRef.current = true;
    setDeletingRelationSn(relationSn);
    try {
      const ok = await confirm({
        title: '쪽지 삭제',
        message: deleteTab === 'received'
          ? '이 쪽지를 받은 편지함에서 삭제하시겠습니까? (보낸 사람의 사본은 유지됩니다)'
          : '이 쪽지를 보낸 편지함에서 삭제하시겠습니까? (받은 사람의 사본은 유지됩니다)',
        confirmText: '삭제',
        variant: 'destructive',
      });
      if (!ok) return;
      await noteService.deleteNote(relationSn, { type: deleteTab });
      toast('삭제되었습니다.', 'success');
      if (tabRef.current === deleteTab) await loadNotes(deleteTab);
    } catch {
      toast('삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      deletePendingRef.current = false;
      setDeletingRelationSn(null);
    }
  };

  const columns = [
    /*
      [2026-08-29] '상태'(읽음/안읽음) 열은 **받은 쪽지함에만** 둔다.

      보낸 쪽지함의 DTO 는 openYn 을 담지 않는다 — NoteService.convertToDto(NoteTrnsmit) 이
      그 필드를 설정하지 않는다(수신 목록용 convertToDto(NoteRecptn) 만 채운다). 그래서
      `item.openYn === 'Y'` 가 언제나 거짓이 되어 **보낸 쪽지 전부가 맥동하는 '안 읽음'
      아이콘**으로 보였다. 발신자는 그것을 "수신자가 아직 안 읽었다" 로 읽는다 — 남의 행동에
      대한 거짓 상태다.
      게다가 한 쪽지에 수신자가 여럿일 수 있어(NoteRecptn 다건) 발신함에서는 읽음 여부를
      플래그 하나로 표현하는 것 자체가 성립하지 않는다. 집계해서 보여 주려면 서버가
      findByNoteDsptchNoteSndngSn 으로 모아 내려야 하고, 목록에서는 N+1 이라 별도 설계가 필요하다.
    */
    ...(tab === 'received' ? [{
      header: '상태',
      accessor: (item: Note) => (
        <span className="inline-flex items-center">
          {item.openYn === 'Y'
            ? <MailOpen size={18} className="text-slate-300" aria-hidden="true" />
            : <Mail size={18} className="text-primary animate-pulse shadow-glow shadow-primary" aria-hidden="true" />}
          <span className="sr-only">{item.openYn === 'Y' ? '읽음' : '읽지 않음'}</span>
        </span>
      ),
      className: 'w-16'
    }] : []),
    {
      header: '제목',
      accessor: (item: Note) => <span className="font-bold text-foreground tracking-tight">{item.noteSj}</span>,
    },
    {
      header: tab === 'received' ? '발신자' : '수신자',
      accessor: (item: Note) => (
        <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                <User size={14} />
            </div>
            {/*
              [2026-08-29] 보낸 쪽지함의 '수신자' 열이 비어 있던 것을 채운다.
              발신 DTO 변환이 rcverId 를 설정하지 않아 모든 행이 빈 칸이었다 — 발신자가
              누구에게 보냈는지 목록에서 알 수 없었다. 한 쪽지에 수신자가 여럿일 수 있으므로
              (NoteRecptn 다건) 이름 하나가 아니라 인원수로 말한다. 서버는 페이지 단위 배치
              조회로 recipients 를 채운다(행마다 조회하면 N+1).
            */}
            <span className="text-sm font-bold text-muted-foreground">
              {tab === 'received'
                ? (item.trnsmiterNm || item.dsptchUserId)
                : (item.recipients?.length ? `${item.recipients.length}명` : '-')}
            </span>
        </div>
      )
    },
    {
      header: '일시',
      accessor: (item: Note) => <span className="text-xs font-bold text-muted-foreground font-mono tracking-tighter">{item.crtDt}</span>,
    },
    {
      header: '관리',
      accessor: (item: Note) => {
        const relationSn = tab === 'received' ? item.noteRcptnSn : item.noteSndngSn;
        const isDeleting = deletingRelationSn === relationSn;
        return (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); void handleDelete(item); }}
          disabled={deletingRelationSn !== null}
          aria-busy={isDeleting}
          aria-label={isDeleting ? `${item.noteSj || '쪽지'} 삭제 중` : `${item.noteSj || '쪽지'} 삭제`}
          className="p-2 hover:bg-rose-50 text-rose-400 rounded-lg transition-colors group"
        >
          {isDeleting
            ? <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            : <Trash2 size={18} className="group-hover:scale-110 transition-transform" aria-hidden="true" />}
        </button>
        );
      }
    }
  ];

  return (
    <WorkListPage
      title="쪽지함"
      description="받은 쪽지와 보낸 쪽지를 조회하고 새 쪽지를 보냅니다."
      breadcrumbItems={[{ label: '협업지원' }, { label: '쪽지관리' }]}
      totalCount={notes.length}
      actions={
        <>
          {/* 종전 좌측의 '쪽지 커뮤니케이션 아키텍처' 장식 카드(120px 배경 아이콘)는 제거했다 —
              어떤 데이터도 담지 않으면서 표 폭의 1/3을 차지했다. */}
          <div role="tablist" aria-label="쪽지함 구분" className="flex rounded-md border border-border p-0.5">
            <TabButton
              active={tab === 'received'}
              onClick={() => handleTabChange('received')}
              icon={<Inbox size={16} aria-hidden="true" />}
              label="받은 쪽지함"
              count={tab === 'received' ? notes.length : undefined}
            />
            <TabButton
              active={tab === 'sent'}
              onClick={() => handleTabChange('sent')}
              icon={<Send size={16} aria-hidden="true" />}
              label="보낸 쪽지함"
              count={tab === 'sent' ? notes.length : undefined}
            />
          </div>
          <Button
            size="sm"
            onClick={() => {
              validation.setFormErrors({}, false);
              setWriteOpen(true);
            }}
            className="gap-2"
          >
            <SendHorizonal size={16} aria-hidden="true" /> 새 쪽지 쓰기
          </Button>
        </>
      }
    >
      <StandardDataTable
        accessibleLabel={tab === 'received' ? '받은 쪽지 목록' : '보낸 쪽지 목록'}
        columns={columns}
        data={notes}
        loading={loading}
        error={listError}
        onRetry={() => { void loadNotes(); }}
        onRowClick={handleDetail}
        rowActionLabel={(item) => `${item.noteSj || `${item.noteSn}번`} 쪽지 열기`}
        emptyMessage={tab === 'received' ? "받은 쪽지가 없습니다." : "보낸 쪽지가 없습니다."}
      />

      <StandardModal
        isOpen={isWriteModalOpen}
        onClose={closeWriteModal}
        title="새 쪽지 기안"
        footer={
          <div className="flex gap-4 w-full">
            <Button variant="ghost" disabled={isSending} onClick={closeWriteModal} className="h-11 flex-1 rounded-lg font-bold text-muted-foreground">취소</Button>
            <Button disabled={isSending} aria-busy={isSending} onClick={handleSend} className="h-11 flex-[2] bg-surface-inverse text-surface-inverse-foreground rounded-lg font-bold text-sm tracking-widest shadow-2xl hover:bg-primary transition-all">
              {isSending ? '메시지 전송 중…' : '메시지 전송'}
            </Button>
          </div>
        }
      >
        <div className="space-y-8 p-4">
          <FormErrorSummary
            data-testid="note-form-error-summary"
            errors={validation.errors}
            labels={NOTE_FORM_LABELS}
            onNavigate={validation.focusError}
          />
          <FormField htmlFor="rcverId" label="대상자 식별 (수신자)" required error={validation.errors.rcverId}>
            <div className="flex gap-3">
              <div className="relative flex-1 group">
                <UserPlus size={18} className="absolute left-6 top-5 text-slate-300 group-hover:text-primary transition-colors" />
                <input
                  type="text"
                  id="rcverId"
                  aria-label="수신 대상자"
                  aria-required="true"
                  {...validation.fieldProps('rcverId')}
                  value={formData.rcverId
                    ? (formData.rcverNm ? `${formData.rcverNm} (${formData.rcverId})` : formData.rcverId)
                    : ''}
                  placeholder="대상자를 식별하십시오..."
                  readOnly
                  className="w-full h-11 pl-16 pr-6 rounded-lg bg-muted border-none text-sm font-bold tracking-tight outline-none cursor-not-allowed group-hover:bg-muted transition-all font-mono"
                />
              </div>
              <Button
                id="note-recipient-picker-button"
                onClick={() => setPickerOpen(true)}
                aria-invalid={validation.errors.rcverId ? 'true' : undefined}
                aria-describedby={validation.errors.rcverId ? 'rcverId-error' : undefined}
                className="h-11 px-8 bg-card border-2 border-border text-foreground rounded-lg font-bold text-xs tracking-widest hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all shadow-xl active:scale-95"
              >
                <Search size={16} className="mr-2" /> 타겟 검색
              </Button>
            </div>
          </FormField>
          <FormField htmlFor="noteSj" label="시스템 제목" required error={validation.errors.noteSj}>
            <input
              id="noteSj"
              type="text"
              aria-label="시스템 제목"
              aria-required="true"
              maxLength={100}
              {...validation.fieldProps('noteSj')}
              value={formData.noteSj}
              onChange={(e) => {
                setFormData((current) => ({ ...current, noteSj: e.target.value }));
                validation.clearError('noteSj');
              }}
              placeholder="쪽지 아키텍처 제목을 입력하세요."
              className="w-full h-11 px-8 rounded-lg bg-muted border-none text-sm font-bold tracking-tight outline-none focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </FormField>
          <FormField htmlFor="noteCn" label="데이터 바디 (내용)" error={validation.errors.noteCn}>
            <textarea
              id="noteCn"
              aria-label="데이터 바디 (내용)"
              maxLength={4000}
              {...validation.fieldProps('noteCn')}
              value={formData.noteCn}
              onChange={(e) => {
                setFormData((current) => ({ ...current, noteCn: e.target.value }));
                validation.clearError('noteCn');
              }}
              className="w-full min-h-[200px] p-8 rounded-lg bg-muted border-none text-base font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none leading-relaxed"
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
        onClose={closeDetailModal}
        title="쪽지 데이터 상세 정보"
        maxWidth="md"
      >
        {detailLoading ? (
          <div role="status" className="flex min-h-[240px] items-center justify-center gap-3 text-sm font-bold text-muted-foreground">
            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            쪽지 상세 정보를 불러오는 중입니다.
          </div>
        ) : detailError ? (
          <div role="alert" className="flex min-h-[240px] flex-col items-center justify-center gap-6 px-6 text-center">
            <p className="font-bold text-destructive">쪽지 상세 정보를 불러오지 못했습니다.</p>
            <p className="text-sm text-muted-foreground">네트워크 상태를 확인한 뒤 다시 시도해 주세요.</p>
            <Button
              type="button"
              variant="outline"
              aria-label="쪽지 상세 다시 시도"
              onClick={() => { if (detailTarget) void loadNoteDetail(detailTarget); }}
            >
              다시 시도
            </Button>
          </div>
        ) : selectedNote ? (
          <div className="space-y-10 py-6 px-4">
            <div className="flex justify-between items-start border-b border-border pb-10">
              <div className="space-y-4">
                    <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                         <span className="text-xs font-bold tracking-[0.4em] text-slate-300 uppercase font-mono">쪽지 상세 데이터</span>
                    </div>
                    <h3 className="text-3xl font-bold text-foreground tracking-tight leading-tight">{selectedNote.noteSj}</h3>
                    <div className="flex items-center gap-4 pt-2">
                         <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg border border-border text-xs font-bold text-muted-foreground uppercase tracking-widest">
                             {tab === 'received'
                               ? `발신: ${selectedNote.trnsmiterNm || selectedNote.dsptchUserId || '-'}`
                               : `수신: ${selectedNote.rcverNm || selectedNote.rcverId || '-'}`}
                         </div>
                         <div className="text-xs font-bold text-slate-300 font-mono tracking-tighter uppercase">{selectedNote.crtDt}</div>
                    </div>
              </div>
              {tab === 'received' && (
                <StatusBadge
                  status={selectedNote.openYn === 'Y' ? 'C' : 'R'}
                  labels={{ C: '읽음', R: '읽지 않음' }}
                />
              )}
            </div>
            <div className="text-xl font-bold leading-[1.8] text-foreground bg-muted/50 p-12 rounded-lg border-2 border-border min-h-[300px] whitespace-pre-wrap shadow-inner ring-1 ring-white">
              {selectedNote.noteCn}
            </div>
            <div className="flex gap-4 justify-end pt-4">
              <Button variant="ghost" onClick={closeDetailModal} className="h-11 px-10 rounded-lg font-bold text-muted-foreground">데이터 닫기</Button>
              {tab === 'received' && (
                <Button
                  aria-label="실시간 답장 전송"
                  onClick={() => {
                    const recipientId = selectedNote.dsptchUserId?.trim() ?? '';
                    const recipientName = selectedNote.trnsmiterNm?.trim() ?? '';
                    closeDetailModal();
                    setFormData({
                      rcverId: recipientId,
                      rcverNm: recipientName,
                      noteSj: `Re: ${selectedNote.noteSj ?? ''}`,
                      noteCn: '',
                    });
                    validation.setFormErrors({}, false);
                    setWriteOpen(true);
                  }}
                  className="h-11 px-10 bg-surface-inverse text-surface-inverse-foreground rounded-lg font-bold text-sm tracking-widest shadow-2xl hover:bg-primary transition-all gap-2"
                >
                  <SendHorizonal size={18} /> 실시간 답장 전송
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </StandardModal>
    </WorkListPage>
  );
}

function TabButton({ active, onClick, icon, label, count }: any) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex h-[var(--control-h-sm)] items-center gap-2 rounded px-4 text-xs font-bold transition-colors",
        active ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className={cn(
          "ml-3 text-xs px-2.5 py-1 rounded-lg font-bold shadow-inner",
          active ? "bg-surface-inverse text-surface-inverse-foreground" : "bg-muted text-muted-foreground text-xs"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
