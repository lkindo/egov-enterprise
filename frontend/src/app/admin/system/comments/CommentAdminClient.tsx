'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { CommentDetail } from '@/services/admin/system/CommentAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { deleteCommentAction } from '@/app/actions/commentActions';
import {
  MessageSquare,
  Trash2,
  ExternalLink,
  User,
  Clock,
  Search,
  RefreshCcw,
  MessageCircle,
  Hash,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function CommentAdminClient({ initialComments }: { initialComments: CommentDetail[] }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchWrd, setSearchWrd] = useState('');

  const handleRefresh = async () => {
    setLoading(true);
    router.refresh();
    setTimeout(() => setLoading(false), 800);
  };

  const handleDelete = async (commentNo: number) => {
    const isConfirmed = await confirm({
      title: '댓글 삭제 확인',
      message: '이 댓글을 영구적으로 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.',
      variant: 'destructive',
      confirmText: '댓글 삭제'
    });
    if (isConfirmed) {
      const res = await deleteCommentAction(commentNo);
      if (res.success) {
        toast(res.message, 'success');
      } else {
        toast(res.message, 'error');
      }
    }
  };

  const filteredComments = initialComments.filter(c =>
    c.commentCn.toLowerCase().includes(searchWrd.toLowerCase()) ||
    c.wrterNm.toLowerCase().includes(searchWrd.toLowerCase()) ||
    c.wrterId.toLowerCase().includes(searchWrd.toLowerCase())
  );

  const columns: ColumnDef<CommentDetail>[] = [
    {
      id: 'commentNo',
      header: 'ID Signature',
      width: 100,
      accessor: (item: CommentDetail) => (
        <div className="flex items-center gap-2">
          <Hash size={12} className="text-slate-300" />
          <span className="font-mono font-black text-slate-400 tabular-nums italic text-xs">{item.commentNo}</span>
        </div>
      )
    },
    {
      id: 'commentCn',
      header: 'Interaction Content',
      width: 450,
      accessor: (item: CommentDetail) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm font-black text-slate-900 leading-relaxed line-clamp-2 italic">{item.commentCn}</span>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary/40 italic">
            Domain Entry Point: <span className="text-primary underline decoration-primary/20">{item.bbsId} / {item.nttId}</span>
          </div>
        </div>
      )
    },
    {
      id: 'author',
      header: 'Agent Identity',
      accessor: (item: CommentDetail) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200 shadow-inner group-hover:bg-slate-900 group-hover:text-white transition-all transform group-hover:rotate-6">
            <User size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-slate-900 italic tracking-tight">{item.wrterNm}</span>
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest opacity-60">@{item.wrterId}</span>
          </div>
        </div>
      )
    },
    {
      id: 'createdDate',
      header: 'Event Horizon',
      accessor: (item: CommentDetail) => (
        <div className="flex items-center gap-2 text-[10px] font-black font-mono text-slate-400 italic">
          <Clock size={12} className="opacity-40" /> {item.createdDate}
        </div>
      )
    },
    {
      id: 'actions',
      header: 'System Action',
      className: 'text-right',
      accessor: (item: CommentDetail) => (
        <div className="flex justify-end gap-2 pr-4">
          <button
            className="h-10 w-10 bg-slate-50 text-slate-400 hover:text-primary hover:bg-white hover:shadow-xl transition-all rounded-xl flex items-center justify-center border border-transparent hover:border-primary/10"
            title="원문 보기"
          >
            <ExternalLink size={16} />
          </button>
          <button
            onClick={() => handleDelete(item.commentNo)}
            className="h-10 w-10 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-xl transition-all rounded-xl flex items-center justify-center border border-transparent hover:border-rose-100"
            title="삭제"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="시스템 지능형 댓글 모니터링"
        breadcrumbs={[{ label: '시스템관리' }, { label: '댓글관리' }]}
        actions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl shadow-xl">
              <MessageCircle size={16} className="text-primary" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                Cumulative Streams: <span className="text-slate-900 tabular-nums">{initialComments.length.toLocaleString()}</span>
              </span>
            </div>
            <Button
              onClick={handleRefresh}
              className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl active:scale-95"
            >
              <RefreshCcw size={20} className={cn(loading && "animate-spin")} />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-3">
          <div className="p-10 bg-slate-900 text-white rounded-[3.5rem] shadow-2xl relative overflow-hidden group border border-white/5">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
              <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-2xl border border-white/20 shadow-2xl group-hover:scale-110 transition-transform duration-700">
                <MessageSquare size={36} className="text-primary-foreground" />
              </div>
              <div className="space-y-4 flex-1 text-center md:text-left">
                <h4 className="text-3xl font-black italic tracking-tighter uppercase tabular-nums leading-tight">Interaction Integrity Monitor</h4>
                <p className="text-base text-slate-400 font-bold leading-relaxed max-w-2xl">
                  모든 도메인 커뮤니케이션 스트림을 실시간으로 관제합니다. <br />
                  부적절한 <span className="text-white">Interaction Protocol</span>은 즉시 격리하여 시스템 안전성을 유지하십시오.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-8 bg-rose-50 border-2 border-rose-100 rounded-[3.5rem] shadow-xl flex flex-col justify-center items-center text-center gap-4 group hover:bg-rose-100 transition-all cursor-default">
          <ShieldAlert size={40} className="text-rose-500 group-hover:scale-125 transition-transform" />
          <div>
            <h5 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Neutralized Nodes</h5>
            <p className="text-4xl font-black text-rose-600 italic tabular-nums">0</p>
          </div>
        </div>
      </div>

      <div className="p-8 bg-white border-2 border-slate-100 rounded-[4rem] shadow-xl flex items-center gap-8 relative overflow-hidden group">
        <div className="w-14 h-14 bg-primary/5 text-primary rounded-2xl flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
          <Search size={24} />
        </div>
        <div className="flex-1">
          <input
            value={searchWrd}
            onChange={(e) => setSearchWrd(e.target.value)}
            autoFocus
            className="w-full h-16 bg-transparent border-none text-2xl font-black placeholder:text-slate-200 outline-none italic tracking-tighter"
            placeholder="PROBE INTERACTION MEMORY..."
          />
        </div>
        <div className="flex items-center gap-2 group-hover:translate-x-2 transition-transform">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Stream Analysis Active</span>
          <ArrowRight size={16} className="text-primary opacity-20" />
        </div>
      </div>

      <div className="bg-white rounded-[5rem] p-4 shadow-2xl border border-slate-100 ring-1 ring-slate-50 relative overflow-hidden">
        <UltimateDataGrid
          title="INTERACTION STREAM INVENTORY"
          columns={columns as any}
          data={filteredComments as any}
          keyField="commentNo"
          loading={loading}
          className="bg-slate-50/50 p-10 rounded-[4.5rem] border border-dashed border-slate-200"
        />
      </div>
    </div>
  );
}