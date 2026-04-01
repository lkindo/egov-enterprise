'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { reportService, WorkReport } from '@/services/business/user/ReportService';
import { useToast } from '@/app/components/ui/toast';
import { FileText, Plus, Calendar, ArrowRight, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WorkReportListPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [reports, setReports] = useState<WorkReport[]>([]);
    const [loading, setLoading] = useState(true);

<<<<<<< HEAD
 useEffect(() => {
 async function loadData() {
 try {
 setLoading(true);
 const res = await reportService.getReports({ page: 0, size: 20 });
 setReports(res.list || []);
 } catch {
 toast('蹂닿퀬님紐⑸줉님遺덈윭?ㅼ? 紐삵뻽?듬땲님', 'error');
 } finally {
 setLoading(false);
 }
 }
 loadData();
 }, [toast]);
=======
    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const res = await reportService.getReports({ page: 0, size: 20 });
                setReports(res.list || []);
            } catch {
                toast('蹂닿퀬님紐⑸줉님遺덈윭?ㅼ? 紐삵뻽?듬땲님', 'error');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [toast]);
>>>>>>> 99be2886750c05e99df098d47b5b4fd8f624093f

    const columns = [
        {
            header: '?좏삎',
            accessor: (item: WorkReport) => (
                <span className="text-[10px] font-black px-2 py-0.5 bg-muted rounded">
                    {item.reprtSe === '1' ? 'WEEKLY' : 'MONTHLY'}
                </span>
            ),
            className: 'w-24'
        },
        {
            header: '?쒕ぉ',
            accessor: (item: WorkReport) => item.reprtSj,
            className: 'font-bold'
        },
        {
            header: '蹂닿퀬님,
            accessor: (item: WorkReport) => item.reprtDe,
            className: 'text-sm text-muted-foreground'
        },
        {
            header: '?묒꽦님,
            accessor: (item: WorkReport) => item.wrterId
        },
        {
            header: '?곹깭',
            accessor: (item: WorkReport) => <StatusBadge status={item.confmDt ? 'Y' : 'R'} />
        },
        {
            header: '',
            className: 'text-right',
            accessor: (item: WorkReport) => (
                <button
                    onClick={() => router.push(`/smart-toolkit/work-report/${item.reprtId}`)}
                    className="p-2 hover:bg-accent rounded-full transition-all text-primary"
                >
                    <ArrowRight size={18} />
                </button>
            )
        }
    ];

    return (
        <div className="space-y-6 pb-12">
            <PageHeader
                title="업무 蹂닿퀬 ?쇳꽣"
                breadcrumbs={[{ label: '?묒뾽吏님 }, { label: '二쇨컙/?붽컙蹂닿퀬' }]}
                actions={
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all">
                        <Plus size={18} /> 님蹂닿퀬님?묒꽦
                    </button>
                }
            />

            <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
                <StandardDataTable
                    columns={columns}
                    data={reports}
                    loading={loading}
                    emptyMessage="등록님蹂닿퀬?쒓? ?놁뒿?덈떎."
                    className="border-none rounded-none"
                />
            </div>
        </div>
    );
}
