'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { helpUserService, FAQ, QNA } from '@/services/business/user/help/HelpUserService';
import { useToast } from '@/app/components/ui/toast';
import { HelpCircle, MessageCircle, ChevronDown, ChevronUp, Search, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';

export default function HelpCenterPage() {
 const { toast } = useToast();
 const [tab, setTab] = useState<'faq' | 'qna'>('faq');
 const [faqs, setFaqs] = useState<FAQ[]>([]);
 const [qnas, setQnas] = useState<QNA[]>([]);
 const [loading, setLoading] = useState(true);
 const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

 useEffect(() => {
 async function loadHelpData() {
 try {
 setLoading(true);
 if (tab === 'faq') {
 const res = await helpUserService.getFaqs({});
 setFaqs(res || []);
 } else {
 const res = await helpUserService.getQnas({ page: 0, size: 10 });
 setQnas(res.list || []);
 }
 } catch {
 toast('?°ì´?°ë? ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??', 'error');
 } finally {
 setLoading(false);
 }
 }
 loadHelpData();
 }, [tab, toast]);

 const qnaColumns = [
 {
 header: '?œëª©',
 accessor: (item: QNA) => item.qestnSj,
 className: 'font-bold'
 },
 {
 header: '?‘ì„±??,
 accessor: (item: QNA) => item.wrterNm
 },
 {
 header: '?±ë¡??,
 accessor: (item: QNA) => item.writngDe
 },
 {
 header: '?íƒœ',
 accessor: (item: QNA) => (
 <StatusBadge status={item.qnaProcessSttusCode === '3' ? 'Y' : 'R'} />
 )
 }
 ];

 return (
 <div className="max-w-5xl mx-auto space-y-8 pb-20">
 <PageHeader
 title="?„ì?ë§??¼í„°"
 breadcrumbs={[{ label: 'ì§€?ì„œë¹„ìŠ¤' }, { label: '?„ì?ë§ì„¼?? }]}
 />

 {/* Hero Section */}
 <div className="bg-primary rounded-3xl p-12 text-white text-center shadow-xl space-y-4">
 <h2 className="text-3xl font-black">ë¬´ì—‡???„ì??œë¦´ê¹Œìš”?</h2>
 <p className="opacity-80 text-sm font-medium">?ì£¼ ë¬»ëŠ” ì§ˆë¬¸???•ì¸?˜ê±°??1:1 ë¬¸ì˜ë¥??¨ê²¨ì£¼ì„¸??</p>
 <div className="max-w-xl mx-auto relative mt-8">
 <Search className="absolute left-4 top-3.5 text-primary" size={20} />
 <input
 type="text"
 placeholder="?¤ì›Œ?œë¡œ ê²€?‰í•˜?¸ìš”"
 className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white text-black text-sm outline-none focus:ring-4 focus:ring-white/20"
 />
 </div>
 </div>

 {/* Tabs */}
 <div className="flex justify-center gap-2">
 <TabButton
 active={tab === 'faq'}
 onClick={() => setTab('faq')}
 icon={<HelpCircle size={20} />}
 label="?ì£¼ ë¬»ëŠ” ì§ˆë¬¸ (FAQ)"
 />
 <TabButton
 active={tab === 'qna'}
 onClick={() => setTab('qna')}
 icon={<MessageCircle size={20} />}
 label="1:1 Q&A ë¬¸ì˜"
 />
 </div>

 {/* Content Area */}
 <div className="space-y-4">
 {tab === 'faq' ? (
 faqs.length === 0 ? (
 <div className="text-center py-20 text-muted-foreground ">?ì£¼ ë¬»ëŠ” ì§ˆë¬¸???†ìŠµ?ˆë‹¤.</div>
 ) : (
 faqs.map((faq) => (
 <div key={faq.faqId} className="bg-card border rounded-2xl overflow-hidden transition-all hover:border-primary/20">
 <button
 onClick={() => setExpandedFaq(expandedFaq === faq.faqId ? null : faq.faqId)}
 className="w-full px-8 py-6 flex items-center justify-between group"
 >
 <span className="font-bold text-lg text-foreground group-hover:text-primary transition-colors text-left">
 Q. {faq.qestnSj}
 </span>
 {expandedFaq === faq.faqId ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
 </button>
 {expandedFaq === faq.faqId && (
 <div className="px-8 pb-8 pt-2 animate-in slide-in-from-top-4 duration-300">
 <div className="p-6 bg-muted/20 rounded-xl text-muted-foreground leading-relaxed text-sm">
 {faq.answerCn}
 </div>
 </div>
 )}
 </div>
 ))
 )
 ) : (
 <div className="space-y-4">
 <div className="flex justify-end">
 <button className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
 <PlusCircle size={18} /> ë¬¸ì˜?˜ê¸°
 </button>
 </div>
 <StandardDataTable
 columns={qnaColumns}
 data={qnas}
 loading={loading}
 emptyMessage="?±ë¡??Q&Aê°€ ?†ìŠµ?ˆë‹¤."
 />
 </div>
 )}
 </div>
 </div>
 );
}

function TabButton({ active, onClick, icon, label }: any) {
 return (
 <button
 onClick={onClick}
 className={cn(
 "flex items-center gap-2 px-8 py-4 rounded-2xl font-black transition-all",
 active
 ? "bg-primary text-white shadow-lg shadow-primary/20 -translate-y-1"
 : "bg-card border text-muted-foreground hover:bg-accent"
 )}
 >
 {icon}
 {label}
 </button>
 );
}
