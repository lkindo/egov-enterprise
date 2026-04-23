'use client';

import React, { useState, useMemo, use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { PagePagination } from '@/components/common/PagePagination';
import { StandardModal } from '@/app/components/ui/standard-modal';
import {
  Terminal,
  Activity,
  History,
  SearchCode,
  Database,
  Clock,
  Zap,
  Lock,
  Globe,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageResponse } from '@/types/foundation/system';

const logCategories = [
  { id: 'SYS', label: '?쒖뒪?쒕줈洹?, icon: <Terminal size={20} />, description: '?쒕퉬??諛?硫붿냼???섑뻾 ?대젰', serviceMethod: 'getSystemLogs' },
  { id: 'LGN', label: '濡쒓렇?몃줈洹?, icon: <Lock size={20} />, description: '?ъ슜???묒냽 諛??몄쬆 湲곕줉', serviceMethod: 'getLoginLogs' },
  { id: 'USR', label: '?ъ슜???쒕룞', icon: <UserCheck size={20} />, description: '?곗씠??蹂寃?諛?沅뚰븳 異붿쟻', serviceMethod: 'getUserLogs' },
  { id: 'WEB', label: '??濡쒓렇', icon: <Globe size={20} />, description: 'HTTP ?붿껌 諛?泥섎━ 遺꾩꽍', serviceMethod: 'getWebLogs' },
  { id: 'TRS', label: '?꾩넚 濡쒓렇', icon: <Activity size={20} />, description: '?몃? ?곕룞 諛?諛곗튂 寃곌낵', serviceMethod: 'getTransferLogs' },
];

export default function LogDashboardClient({ systemLogsPromise }: { systemLogsPromise: Promise<any> }) {
  const initialSystemLogs = use(systemLogsPromise);
  const [activeCategory, setCategory] = useState('SYS');
  const [params, setParams] = useState({ page: 1, searchKeyword: '' });
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { data, isLoading } = useQuery<PageResponse<any>>({
    queryKey: ['admin-logs-integrated', activeCategory, params],
    queryFn: async () => {
      const apiParams = { page: (params.page || 1) - 1, size: 10, searchKeyword: params.searchKeyword };
      switch (activeCategory) {
        case 'SYS': return systemLogAdminService.getSystemLogs(apiParams);
        case 'LGN': return systemLogAdminService.getLoginLogs(apiParams);
        case 'USR': return systemLogAdminService.getUserLogs(apiParams);
        case 'WEB': return systemLogAdminService.getWebLogs(apiParams);
        case 'TRS': return systemLogAdminService.getTransferLogs(apiParams);
        default: return systemLogAdminService.getSystemLogs(apiParams);
      }
    },
    initialData: (activeCategory === 'SYS' && params.page === 1 && !params.searchKeyword) ? initialSystemLogs : undefined
  });

  const logs = (data?.list || []) as any[];
  const pagination = {
    currentPageNo: Number(params.page),
    recordCountPerPage: 10,
    totalRecordCount: Number(data?.total || 0),
    totalPageCount: Number(data?.totalPage || 1)
  };

  const columns = useMemo(() => {
    const commonCols: Column<any>[] = [
      {
        header: '諛쒖깮 ?쒓컖',
        accessor: (item: any) => (
          <div className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white/40 shadow-sm">
              <Clock size={14} />
            </div>
            <span className="text-[11px] font-mono font-black text-slate-500 tracking-tighter italic">
              {item.creatDt || item.occcrrncDe || '-'}
            </span>
          </div>
        ),
        className: 'w-48'
      }
    ];

    if (activeCategory === 'LGN') {
      return [
        ...commonCols,
        {
          header: '?붿껌??,
          accessor: (item: any) => (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-slate-100 flex items-center justify-center bg-white shadow-sm font-black text-[10px] text-slate-400">
                {item.loginNm?.substring(0, 1)}
              </div>
              <span className="text-xs font-bold text-slate-700">{item.loginNm} ({item.loginId})</span>
            </div>
          )
        },
        {
          header: '?묒냽 IP',
          accessor: (item: any) => (
            <div className="font-mono text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border w-fit">{item.loginIp}</div>
          )
        },
        {
          header: '援щ텇',
          accessor: (item: any) => (
            <HubStatusBadge label={item.loginMthd} variant={item.loginMthd === 'LOGIN' ? 'success' : 'secondary'} />
          )
        }
      ];
    }

    return [
      ...commonCols,
      {
        header: '?붿껌??,
        className: 'w-32',
        accessor: (item: any) => (
          <span className="text-xs font-bold text-slate-700">{item.rqsterNm || item.rqesterId || 'SYSTEM'}</span>
        )
      },
      {
        header: '?섑뻾 ?쒕퉬??/ 由ъ냼??,
        accessor: (item: any) => (
          <div className="flex flex-col gap-0.5 max-w-md">
            <span className="text-[11px] font-black text-foreground truncate uppercase tracking-tighter italic">{item.srvcNm || item.processSeCodeNm || 'INTERNAL_PROCESS'}</span>
            <span className="text-[9px] font-bold text-slate-300 font-mono truncate">{item.methodNm || item.trgetMenuNm || '-'}</span>
          </div>
        )
      },
      {
        header: '?묒냽 ?뺣낫',
        accessor: (item: any) => (
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-slate-400">
            <Globe size={11} className="opacity-40" />
            {item.rqesterIp || '127.0.0.1'}
          </div>
        )
      }
    ];
  }, [activeCategory]);

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="濡쒓렇 ?듯빀 由ы룷??
        breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '濡쒓렇愿由? }]}
      />

      <HubHeader
        title="?쒖뒪??
        highlight="濡쒓렇 ?듯빀 愿由?
        subtitle="?쒖뒪???꾨컲?먯꽌 諛쒖깮?섎뒗 蹂댁븞, ?묒냽, ?됰룞, ???붿껌 濡쒓렇瑜??듯빀?곸쑝濡?紐⑤땲?곕쭅?⑸땲??
        icon={History}
        actions={
          <div className="flex gap-4">
            <Button variant="outline" size="lg" className="h-14 px-8 rounded-[0.1rem] border-2 font-black text-[10px] tracking-widest gap-3">
              <SearchCode size={18} /> ?곸꽭 濡쒓렇 寃??            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="?ㅻ뒛 ?꾩껜 濡쒓렇" value="1,492" icon={Database} color="primary" />
        <HubMetricCard title="蹂댁븞 ?꾪삊 濡쒓렇" value="3" icon={Lock} color="rose" status="?댁긽 吏뺥썑" />
        <HubMetricCard title="?쒖꽦 ?몄뀡" value="84" icon={Activity} color="emerald" status="?덉쟾" />
        <HubMetricCard title="?됯퇏 泥섎━ ?띾룄" value="38ms" icon={Zap} color="amber" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-3">
          <div className="rounded-[0.1rem] bg-white border-2 border-slate-100 shadow-xl p-4 flex flex-col gap-3" id="log-categories">
            {logCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "w-full group p-6 rounded-[0.1rem] border-2 transition flex items-center gap-5 relative overflow-hidden",
                  activeCategory === cat.id
                    ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10"
                    : "bg-transparent border-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-[0.1rem] flex items-center justify-center transition shadow-lg",
                  activeCategory === cat.id ? "bg-white/10 text-white" : "bg-white text-slate-300 group-hover:bg-primary group-hover:text-white"
                )}>
                  {cat.icon}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-black tracking-tighter uppercase leading-tight">{cat.label}</span>
                  <span className="text-[7px] font-bold text-slate-400 tracking-widest uppercase opacity-60 truncate max-w-[120px]">{cat.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-9">
          <HubSectionCard
            title="?ㅼ떆媛?濡쒓렇 ?ㅽ듃由?
            description={`${logCategories.find(c => c.id === activeCategory)?.label}?먯꽌 ?ㅼ떆媛꾩쑝濡??좎엯?섎뒗 ?쒕룞 ?ㅽ듃由??곗씠?곗엯?덈떎.`}
            icon={Activity}
          >
            <StandardDataTable
              columns={columns}
              data={logs}
              loading={isLoading}
              className="border-none bg-transparent"
              onRowClick={(item) => setSelectedLog(item)}
              search={{
                placeholder: '?붿껌??IP, 硫붿떆吏 ?깆쑝濡??뺣? 遺꾩꽍...',
                onSearch: (keyword) => setParams({ ...params, searchKeyword: keyword, page: 1 })
              }}
            />

            {(Number(pagination.totalPageCount) || 0) > 1 && (
              <div className="mt-12 flex justify-center">
                <PagePagination
                  pagination={pagination}
                  onPageChange={(page) => setParams({ ...params, page: page })}
                />
              </div>
            )}
          </HubSectionCard>
        </div>
      </div>

      {/* Log Inspector Modal */}
      <StandardModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Log Inspector (Raw Intel)"
        maxWidth="2xl"
      >
        <div className="p-8 space-y-8 font-sans text-left">
          <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[0.1rem] border-2 border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[0.1rem] bg-slate-900 flex items-center justify-center text-white shadow-xl">
                <Terminal size={22} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">濡쒓렇 由ъ냼???앸퀎??/p>
                <p className="text-sm font-black text-slate-900 tracking-tight leading-none">{selectedLog?.logId || selectedLog?.requstId || '?앸퀎???놁쓬'}</p>
              </div>
            </div>
            <HubStatusBadge label="?뺤씤?? variant="success" />
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2 italic">Raw Architecture Payload</h4>
            <div className="p-10 rounded-[0.1rem] bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-auto shadow-2xl relative group max-h-[400px]">
              <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-100 transition-opacity">
                <Zap size={20} className="animate-pulse" />
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed">{JSON.stringify(selectedLog, null, 2)}</pre>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
                type="button"
                onClick={() => setSelectedLog(null)} 
                className="flex-1 h-14 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase hover:bg-primary transition active:scale-95 shadow-xl"
            >
              CLOSE_INSPECTOR
            </button>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}
