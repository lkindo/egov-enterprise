'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { surveyAdminService } from '@/services/foundation/survey/SurveyAdminService';
import { Survey } from '@/types/business/survey';
import { useToast } from '@/app/components/ui/toast';
import { Vote, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SurveyListPage() {
 const router = useRouter();
 const { toast } = useToast();
 const [loading, setLoading] = useState(true);
 const [data, setData] = useState<Survey[]>([]);

 useEffect(() => {
 async function loadData() {
 try {
 setLoading(true);
 const res = await surveyAdminService.getSurveys({ page: 0, size: 10 });
 setData(res.list || []);
 } catch {
 toast('?¤ë¬¸ ëª©ë¡??ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??', 'error');
 } finally {
 setLoading(false);
 }
 }
 loadData();
 }, [toast]);

 const columns = [
 {
 header: '?íƒœ',
 accessor: (item: Survey) => (
 <span className={cn(
 "px-2 py-1 rounded text-[10px] font-black ",
 item.status === 'OPEN' ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
 )}>
 {item.status === 'OPEN' ? 'ì§„í–‰ì¤? : 'ì¢…ë£Œ'}
 </span>
 ),
 className: 'w-24'
 },
 {
 header: '?¤ë¬¸ ?œëª©',
 accessor: (item: Survey) => (
 <div className="font-bold text-foreground group-hover:text-primary transition-colors">
 {item.qestnrSj}
 </div>
 )
 },
 {
 header: 'ì°¸ì—¬ ê¸°ê°„',
 accessor: (item: Survey) => (
 <div className="flex items-center gap-2 text-sm text-muted-foreground">
 <Calendar size={12} />
 {item.qestnrBgnde} ~ {item.qestnrEndde}
 </div>
 )
 },
 {
 header: '',
 className: 'text-right',
 accessor: (item: Survey) => (
 <button
 onClick={(e) => {
 e.stopPropagation();
 router.push(`/survey/${item.qestnrId}`);
 }}
 className="p-2 hover:bg-primary/10 text-primary rounded-full transition-all"
 >
 <ArrowRight size={18} />
 </button>
 )
 }
 ];

 return (
 <div className="space-y-6">
 <PageHeader
 title="?¨ë¼???¤ë¬¸ ì¡°ì‚¬"
 breadcrumbs={[{ label: '?…ë¬´ì§€?? }, { label: '?¤ë¬¸ì¡°ì‚¬' }]}
 />

 <StandardSearchFilter
 fields={[
 { name: 'searchWrd', label: '?¤ë¬¸ëª?ê²€??, type: 'text', placeholder: '?œëª© ?…ë ¥...' }
 ]}
 onSearch={(v) => console.log('Filtering...', v)}
 />

 <div className="grid grid-cols-1 gap-6">
 <StandardDataTable
 columns={columns}
 data={data}
 loading={loading}
 onRowClick={(item) => router.push(`/survey/${item.qestnrId}`)}
 emptyMessage="?±ë¡???¤ë¬¸ ì¡°ì‚¬ê°€ ?†ìŠµ?ˆë‹¤."
 />
 </div>
 </div>
 );
}
