'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { hpcmAdminService, Hpcm } from '@/services/foundation/system/HpcmAdminService';
import { HelpCircle, FileText, Info, Search, Plus, Terminal, Zap, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HpcmClient({ initialData }: { initialData: { list: Hpcm[] } }) {
 const [loading, setLoading] = useState(false);
 const hpcmList = initialData.list || [];

 const columns: Column<Hpcm>[] = [
 {
 header: '������ ���',
 accessor: (item) => (
 <div className="flex items-center gap-5 py-4">
 <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-white/40 shadow-xl group-hover:scale-110 transition-transform">
 <BookOpen size={18} />
 </div>
 <div className="flex flex-col gap-1 text-left">
 <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-lg text-xs font-bold tracking-tight border border-slate-200 w-fit">
 {item.hpcmSe || 'SYSTEM'}
 </span>
 <span className="font-bold tracking-tight text-foreground text-md uppercase leading-tight mt-1">{item.hpcmNm}</span>
 </div>
 </div>
 )
 },
 {
 header: 'ID / ���۷���',
 accessor: (item) => (
 <span className="text-xs font-bold text-muted-foreground/40 tracking-[0.3em] font-mono ">
 ID: {item.hpcmId}
 </span>
 ),
 className: 'w-48'
 },
 {
 header: '��� ����',
 accessor: (item) => (
 <p className="text-sm text-slate-500 font-medium line-clamp-1 max-w-md">
 {item.hpcmDc || '������ �������� �ʴ� ��ī�̺��Դϴ�.'}
 </p>
 )
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="���� ������ ��Ű��ó"
 breadcrumbs={[{ label: '�ý��۰���' }, { label: 'HPCM' }]}
 />

 <HubHeader 
 title="HPCM" 
 highlight="Help Content" 
 subtitle="����� ���� ����ȭ�� ���� ��� �ý��� ���̵�� ���� �������� �߾� ���߽����� �����մϴ�." 
 icon={HelpCircle} 
 actions={
 <Button className="h-12 px-8 bg-slate-900 text-white rounded-lg font-bold text-xs tracking-widest uppercase hover:bg-primary transition-all">
 <Plus size={16} className="mr-2" /> ������ ���
 </Button>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="��ü_����_�ڻ�" value={hpcmList.length} icon={FileText} color="primary" status="SYNCED" />
 <HubMetricCard title="�ֱ�_������Ʈ_�α�" value={2} icon={Zap} color="amber" />
 <HubMetricCard title="�ý���_���Ἲ" value="99.9%" icon={Terminal} color="emerald" status="OPTIMIZED" />
 </HubMetricGrid>

 <HubSectionCard title="������ �κ��丮" description="���� Ŭ�����Ϳ� ������ ��� ���� ������ ����Դϴ�." icon={Search}>
 <div className="overflow-hidden min-h-[500px]">
 <StandardDataTable
 columns={columns}
 data={hpcmList}
 loading={loading}
 emptyMessage="��ȸ�� ���� �������� ���� Ŭ�����Ϳ� �������� �ʽ��ϴ�."
 className="border-none bg-transparent"
 />
 </div>
 </HubSectionCard>
 </div>
 );
}

