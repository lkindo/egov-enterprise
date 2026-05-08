'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { leaderScheduleAdminService, LeaderSchedule, LeaderStatus } from '@/services/foundation/system/LeaderScheduleAdminService';
import { Calendar, UserCheck, Clock, Shield, Search, Plus, Activity, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LsmClient({ 
 initialSchedules, 
 initialStatuses 
}: { 
 initialSchedules: LeaderSchedule[], 
 initialStatuses: LeaderStatus[] 
}) {
 const [loading, setLoading] = useState(false);

 const scheduleColumns: Column<LeaderSchedule>[] = [
 {
 header: '������ �� ����',
 accessor: (item) => (
 <div className="flex items-center gap-4 py-3">
 <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-primary/60">
 <Calendar size={18} />
 </div>
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.scheduleSe}</span>
 <span className="font-bold text-slate-900">{item.scheduleNm}</span>
 </div>
 </div>
 )
 },
 {
 header: '��� ����',
 accessor: (item) => (
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">
 {item.leaderNm?.charAt(0)}
 </div>
 <span className="font-semibold">{item.leaderNm || 'Unknown'}</span>
 </div>
 )
 },
 {
 header: '�Ⱓ',
 accessor: (item) => (
 <div className="flex flex-col text-xs font-mono text-slate-500">
 <span>{item.schdulBgnde}</span>
 <span className="opacity-40">~ {item.schdulEndde}</span>
 </div>
 )
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="���� ���� ���� �ý���"
 breadcrumbs={[{ label: '��ũ�����̽�' }, { label: 'LSM' }]}
 />

 <HubHeader 
 title="LSM" 
 highlight="Leader Schedule" 
 subtitle="���� �ٽ� �ǻ���������� ������ �ǽð����� �����ϰ� ������ ���뼺�� Ȯ���մϴ�." 
 icon={UserCheck} 
 actions={
 <Button className="h-12 px-8 bg-slate-900 text-white rounded-lg font-bold text-xs tracking-widest uppercase hover:bg-primary transition-all">
 <Plus size={16} className="mr-2" /> ���� ���
 </Button>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="��ü_���_����" value={initialSchedules.length} icon={Calendar} color="primary" status="NOMINAL" />
 <HubMetricCard title="Ȱ��_����_��" value={initialStatuses.length} icon={UserCheck} color="emerald" status="OPTIMIZED" />
 <HubMetricCard title="����_�ǻ����_������" value={3} icon={Clock} color="amber" status="ACTIVE" />
 </HubMetricGrid>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
 <HubSectionCard title="�ǽð� ���� ��Ʈ����" description="���� Ŭ������ �� ��� ������ ���� ��Ȳ�Դϴ�." icon={Activity}>
 <StandardDataTable columns={scheduleColumns} data={initialSchedules} loading={loading} />
 </HubSectionCard>

 <HubSectionCard title="���� ���� ����͸�" description="�ֿ� ������ ���� ���� ���뼺 �� ��ġ �����Դϴ�." icon={Shield}>
 <div className="space-y-4">
 {initialStatuses.map(status => (
 <div key={status.leaderId} className="p-4 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100 group hover:bg-white hover:shadow-xl transition-all">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400">
 <Star size={20} />
 </div>
 <div>
 <h5 className="font-bold text-slate-900 leading-tight">{status.leaderNm}</h5>
 <p className="text-xs text-slate-400 font-bold uppercase">{status.positionNm} | {status.orgnztNm}</p>
 </div>
 </div>
 <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold uppercase tracking-tight">
 {status.status}
 </div>
 </div>
 ))}
 {initialStatuses.length === 0 && <p className="text-center py-10 text-slate-400 font-bold uppercase ">No Active Leaders Detected</p>}
 </div>
 </HubSectionCard>
 </div>
 </div>
 );
}

