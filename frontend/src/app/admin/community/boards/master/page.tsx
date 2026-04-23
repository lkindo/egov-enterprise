'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Settings2, 
  Layers,
  BookOpen,
  ImageIcon,
  List as ListIcon,
  Rocket,
  ArrowRight,
  TrendingUp,
  Zap,
  ShieldCheck,
  MoreVertical,
  FileText
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { boardAdminService, BoardMaster } from '@/services/foundation/system/BoardAdminService';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { PageHeader } from '@/app/components/layout/page-header';
import { LucideIcon } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

interface InsightCardProps {
  label: string;
  value: string;
  desc: string;
  icon: LucideIcon;
  color: string;
}

export default function BoardMasterListPage() {
  const router = useRouter();
  const [searchWrd, setSearchWrd] = useState('');

  const { data: boardData, isLoading } = useQuery({
    queryKey: ['boardMasters', searchWrd],
    queryFn: () => boardAdminService.getBoardMasterList({ searchWrd })
  });

  const boardList = (boardData?.list || []) as BoardMaster[];

  const columns: Column<BoardMaster>[] = [
    {
      header: '留덉뒪???꾩씠??,
      accessor: (board: BoardMaster) => (
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 rounded-[0.1rem] bg-white border-2 border-slate-50 shadow-sm flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition duration-500">
              {board.bbsTyCodeNm?.includes('吏??) ? <BookOpen size={28} /> : 
               board.bbsTyCodeNm === 'Visual Gallery' ? <ImageIcon size={28} /> : 
               <ListIcon size={28} />}
           </div>
           <div className="space-y-1 text-left">
              <p className="text-2xl font-black text-slate-800 tracking-tighter italic leading-none">{board.bbsNm}</p>
              <p className="text-[11px] font-black text-slate-300 uppercase leading-none tracking-widest">{board.bbsId}</p>
           </div>
        </div>
      ),
      className: 'px-10'
    },
    {
      header: '硫뷀? ?뺣낫',
      accessor: (board: BoardMaster) => (
        <div className="space-y-1.5 text-left">
           <p className="text-sm font-bold text-slate-500 line-clamp-1 leading-snug">{board.bbsIntrcn}</p>
           <div className="flex gap-2">
              <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none px-3 font-black text-[10px] uppercase tracking-tighter">
                {board.bbsTyCodeNm}
              </Badge>
           </div>
        </div>
      )
    },
    {
      header: '?곹깭',
      accessor: (board: BoardMaster) => (
        <div className="flex justify-center">
          <Badge className={cn(
            "px-4 py-1.5 rounded-full font-black text-[10px] uppercase border-none tracking-widest shadow-sm",
            board.useAt === 'Y' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
          )}>
            {board.useAt === 'Y' ? '?쒖꽦' : '?湲?}
          </Badge>
        </div>
      ),
      className: 'text-center'
    },
    {
      header: '?ъ슜??,
      accessor: (_board: BoardMaster) => (
        <div className="space-y-1 text-center">
           <p className="text-xl font-black text-slate-800 italic">0</p>
           <p className="text-[10px] font-black text-slate-300 uppercase leading-none">寃뚯떆湲 ??/p>
        </div>
      ),
      className: 'text-center'
    },
    {
      header: '?묒뾽 而⑦듃濡?,
      accessor: (board: BoardMaster) => (
        <div className="flex items-center justify-end gap-3 pr-6">
           <Button size="icon" variant="ghost" className="w-12 h-12 rounded-[0.1rem] text-slate-400 hover:bg-primary hover:text-white transition shadow-hover-sm">
              <Settings2 size={20} />
           </Button>
           <Button 
              onClick={() => router.push(`/admin/community/boards/selectBoardList?bbsId=${board.bbsId}`)}
              size="icon" 
              variant="ghost" 
              className="w-12 h-12 rounded-[0.1rem] text-slate-400 hover:bg-slate-900 hover:text-white transition shadow-hover-sm"
           >
              <ArrowRight size={20} />
           </Button>
        </div>
      ),
      className: 'pr-10 text-right'
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000 max-w-[1600px] mx-auto px-4">
      <PageHeader 
        title="寃뚯떆??留덉뒪?? 
        breadcrumbs={[{ label: '而ㅻ??덊떚' }, { label: '寃뚯떆??愿由? }, { label: '留덉뒪??肄섏넄' }]} 
      />

      <HubHeader 
        title="留덉뒪??肄섏넄" 
        highlight="寃뚯떆???듯빀 愿由? 
        subtitle="?앹꽦??紐⑤뱺 寃뚯떆?먯쓽 ?쇱씠?꾩궗?댄겢怨?沅뚰븳 留ㅽ듃由?뒪瑜??ㅼ떆媛꾩쑝濡??쒖뼱?섍퀬 紐⑤땲?곕쭅?⑸땲?? 
        icon={Settings2} 
        actions={
          <Button 
            onClick={() => router.push('/admin/community/boards/maker')}
            className="h-16 px-10 rounded-[0.1rem] bg-slate-900 dark:bg-primary border-none text-white font-black text-sm shadow-2xl hover:scale-105 active:scale-95 transition gap-4 ring-8 ring-slate-900/5 dark:ring-primary/5 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            ?앹꽦 留덈쾿??            <Rocket className="w-4 h-4 text-primary dark:text-white opacity-40 group-hover:text-primary group-hover:opacity-100 transition" />
          </Button>
        }
      />

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-8"
      >
        <InsightCard label="珥앷퀎" value="32" desc="Active Board Masters" icon={Layers} color="text-indigo-500" />
        <InsightCard label="援먮쪟" value="1.2k" desc="Engagement Traffic" icon={TrendingUp} color="text-rose-500" />
        <InsightCard label="?쒖뒪?? value="Optimal" desc="Storage Status" icon={Zap} color="text-emerald-500" />
        <InsightCard label="蹂댁븞" value="L4" desc="Encrypted Access" icon={ShieldCheck} color="text-amber-500" />
      </motion.div>

      <div className="border border-slate-100 rounded-[0.1rem] overflow-hidden bg-white shadow-2xl shadow-slate-200/50">
        <StandardDataTable<BoardMaster>
          columns={columns}
          data={boardList}
          loading={isLoading}
          search={{
            placeholder: '寃뚯떆??紐낆묶, ?쒖뒪??ID 寃??.',
            onSearch: (keyword) => setSearchWrd(keyword)
          }}
        />
      </div>

      <div className="p-12 rounded-[0.1rem] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-none text-slate-900 dark:text-white overflow-hidden relative group transition-colors">
        <div className="absolute top-0 right-0 p-20 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-[10s] pointer-events-none grayscale">
           <Rocket size={400} />
        </div>
        <div className="max-w-3xl space-y-8 relative z-10">
           <h3 className="text-5xl font-black italic tracking-tighter leading-tight uppercase transition-colors">Ready to scale your <span className="text-primary underline decoration-primary/30 decoration-8 underline-offset-8">ecosystem?</span></h3>
           <p className="text-xl text-slate-500 dark:text-slate-400 font-bold leading-relaxed tracking-tight transition-colors">?앺깭怨꾨? ?뺤옣??以鍮꾧? ?섏뀲?듬땲源? 留덈쾿?щ? ?듯빐 蹂듭옟??怨쇱젙 ?놁씠 ??4?④퀎留뚯쑝濡??щ궡 吏???덈툕瑜?援ъ텞?섏떗?쒖삤.</p>
           <Button 
              onClick={() => router.push('/admin/community/boards/maker')}
              className="h-20 px-12 rounded-[0.1rem] bg-primary text-white text-2xl font-black tracking-tighter shadow-[0_30px_60px_-15px_rgba(59,130,246,0.4)] hover:scale-110 active:scale-95 transition gap-4 ring-8 ring-primary/5 italic"
           >
              ?쇱씠釉?留덈쾿???ㅽ뻾 <Rocket className="w-8 h-8" />
           </Button>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ label, value, desc, icon: Icon, color }: InsightCardProps) {
    return (
      <motion.div variants={item} className="hub-card-premium p-8 space-y-6 group hover:ring-[30px] hover:ring-slate-100/30 transition border-2 border-slate-50/50">
        <div className="flex items-center justify-between">
           <div className={cn("w-14 h-14 rounded-[0.1rem] bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 group-hover:scale-110 transition-transform text-slate-400", color)}>
              <Icon size={28} />
           </div>
           <MoreVertical className="text-slate-200 dark:text-slate-700" size={20} />
        </div>
        <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest leading-none text-left">{label}</p>
            <h4 className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none group-hover:text-primary transition-colors text-left">{value}</h4>
            <p className="text-[10px] font-black text-slate-400/60 dark:text-slate-300 uppercase leading-none mt-2 text-left">{desc}</p>
        </div>
      </motion.div>
    );
}
