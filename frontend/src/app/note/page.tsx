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
import { Inbox, Send, MailOpen, Mail, Trash2, UserPlus, SendHorizonal, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotePage() {
 const { toast } = useToast();
 const confirm = useConfirm();

 const [tab, setTab] = useState<'received' | 'sent'>('received');
 const [loading, setLoading] = useState(true);
 const [notes, setNotes] = useState<Note[]>([]);

 // ëª¨ë‹¬ ?íƒœ
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
 toast('ìª½ì? ëª©ë¡??ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??', 'error');
 } finally {
 setLoading(false);
 }
 }, [tab, toast]);

 useEffect(() => {
 loadNotes();
 }, [loadNotes]);

 const handleSend = async () => {
 if (!formData.rcverId || !formData.noteSj) {
 toast('?˜ì‹ ?ì? ?œëª©???…ë ¥?˜ì„¸??', 'error');
 return;
 }

 try {
 await noteService.sendNote(formData);
 toast('ìª½ì?ê°€ ?±ê³µ?ìœ¼ë¡??„ì†¡?˜ì—ˆ?µë‹ˆ??', 'success');
 setWriteOpen(false);
 setFormData({ rcverId: '', rcverNm: '', noteSj: '', noteCn: '' });
 if (tab === 'sent') loadNotes();
 } catch {
 toast('?„ì†¡ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.', 'error');
 }
 };

 const handleUserSelect = (user: any) => {
 setFormData({ ...formData, rcverId: user.ncrdId, rcverNm: user.ncrdNm });
 };

 const handleDetail = (note: Note) => {
 setSelectedNote(note);
 setDetailOpen(true);
 // ?¤ì œ ?½ìŒ ì²˜ë¦¬ ë¡œì§
 if (note.openYn === 'N') {
 // noteService.readNote(note.noteId); // API ?„ìš” ???œì„±?? }
 };

 const columns = [
 {
 header: '?íƒœ',
 accessor: (item: Note) => (
 item.openYn === 'Y' ? <MailOpen size={16} className="text-muted-foreground" /> : <Mail size={16} className="text-primary animate-bounce" />
 ),
 className: 'w-12'
 },
 {
 header: '?œëª©',
 accessor: (item: Note) => item.noteSj,
 className: 'font-bold'
 },
 {
 header: tab === 'received' ? 'ë°œì‹ ?? : '?˜ì‹ ??,
 accessor: (item: Note) => tab === 'received' ? item.trnsmitterId : item.rcverId
 },
 {
 header: '?¼ì‹œ',
 accessor: (item: Note) => item.sendDt,
 className: 'text-sm text-muted-foreground'
 },
 {
 header: 'ê´€ë¦?,
 className: 'text-right',
 accessor: (item: Note) => (
 <button
 onClick={(e) => { e.stopPropagation(); toast('?? œ?˜ì—ˆ?µë‹ˆ??Mock)', 'info'); }}
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
 title="ìª½ì? ?¼í„°"
 breadcrumbs={[{ label: '?‘ì—…ì§€?? }, { label: 'ìª½ì?ê´€ë¦? }]}
 actions={
 <button
 onClick={() => setWriteOpen(true)}
 className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
 >
 <SendHorizonal size={18} />
 ìª½ì? ë³´ë‚´ê¸? </button>
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
 <Inbox size={18} /> ë°›ì? ìª½ì??? </button>
 <button
 onClick={() => setTab('sent')}
 className={cn(
 "flex items-center gap-2 px-8 py-4 text-sm font-black border-b-2 transition-all",
 tab === 'sent' ? "border-primary text-primary bg-primary/5" : "border-transparent text-muted-foreground hover:text-foreground"
 )}
 >
 <Send size={18} /> ë³´ë‚¸ ìª½ì??? </button>
 </div>

 <StandardDataTable
 columns={columns}
 data={notes}
 loading={loading}
 onRowClick={handleDetail}
 emptyMessage={tab === 'received' ? "ë°›ì? ìª½ì?ê°€ ?†ìŠµ?ˆë‹¤." : "ë³´ë‚¸ ìª½ì?ê°€ ?†ìŠµ?ˆë‹¤."}
 />

 {/* ìª½ì? ?‘ì„± ëª¨ë‹¬ */}
 <StandardModal
 isOpen={isWriteModalOpen}
 onClose={() => setWriteOpen(false)}
 title="??ìª½ì? ?‘ì„±"
 footer={
 <>
 <button onClick={() => setWriteOpen(false)} className="px-4 py-2 border rounded-lg font-bold">ì·¨ì†Œ</button>
 <button onClick={handleSend} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary/90">ë³´ë‚´ê¸?/button>
 </>
 }
 >
 <div className="space-y-6">
 <FormField label="?˜ì‹ ??? íƒ" required>
 <div className="flex gap-2">
 <div className="relative flex-1">
 <UserPlus size={16} className="absolute left-3 top-3 text-muted-foreground" />
 <input
 type="text"
 value={formData.rcverNm ? `${formData.rcverNm} (${formData.rcverId})` : ''}
 placeholder="?¬ìš©?ë? ê²€?‰í•´ ì£¼ì„¸??"
 readOnly
 className="w-full h-10 pl-10 pr-3 rounded-md border bg-muted/20 text-sm outline-none cursor-not-allowed"
 />
 </div>
 <button
 onClick={() => setPickerOpen(true)}
 className="px-4 bg-white border border-primary text-primary rounded-md font-bold text-sm hover:bg-primary/5 transition-all flex items-center gap-2"
 >
 <Search size={14} /> ê²€?? </button>
 </div>
 </FormField>
 <FormField label="?œëª©" required>
 <input
 type="text"
 value={formData.noteSj}
 onChange={(e) => setFormData({ ...formData, noteSj: e.target.value })}
 placeholder="ìª½ì? ?œëª©???…ë ¥?˜ì„¸??"
 className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
 />
 </FormField>
 <FormField label="?´ìš©">
 <textarea
 value={formData.noteCn}
 onChange={(e) => setFormData({ ...formData, noteCn: e.target.value })}
 className="w-full min-h-[150px] p-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
 placeholder="?´ìš©???…ë ¥?˜ì„¸??"
 />
 </FormField>
 </div>
 </StandardModal>

 <UserPicker
 isOpen={isPickerOpen}
 onClose={() => setPickerOpen(false)}
 onSelect={handleUserSelect}
 />

 {/* ìª½ì? ?ì„¸ ëª¨ë‹¬ */}
 <StandardModal
 isOpen={isDetailModalOpen}
 onClose={() => setDetailOpen(false)}
 title="ìª½ì? ?ì„¸ ?´ìš©"
 maxWidth="md"
 >
 {selectedNote && (
 <div className="space-y-6 py-2">
 <div className="flex justify-between items-start border-b pb-4">
 <div>
 <h3 className="text-xl font-black text-foreground">{selectedNote.noteSj}</h3>
 <p className="text-sm text-muted-foreground mt-1">
 {tab === 'received' ? `ë°œì‹ : ${selectedNote.trnsmitterId}` : `?˜ì‹ : ${selectedNote.rcverId}`} ??{selectedNote.sendDt}
 </p>
 </div>
 <StatusBadge status={selectedNote.openYn === 'Y' ? 'C' : 'R'} />
 </div>
 <div className="text-sm leading-relaxed text-foreground bg-muted/10 p-4 rounded-xl min-h-[200px] whitespace-pre-wrap">
 {selectedNote.noteCn}
 </div>
 <div className="flex gap-2 justify-end">
 <button onClick={() => setDetailOpen(false)} className="px-6 py-2 bg-muted rounded-lg font-bold text-sm">?«ê¸°</button>
 {tab === 'received' && (
 <button
 onClick={() => {
 setDetailOpen(false);
 setFormData({ ...formData, rcverId: selectedNote.trnsmitterId, noteSj: `Re: ${selectedNote.noteSj}` });
 setWriteOpen(true);
 }}
 className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-md"
 >
 ?µì¥?˜ê¸°
 </button>
 )}
 </div>
 </div>
 )}
 </StandardModal>
 </div>
 );
}
