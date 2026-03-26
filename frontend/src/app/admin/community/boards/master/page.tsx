'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Settings2, 
  MessageSquare, 
  Eye, 
  ChevronRight, 
  MoreVertical,
  Layers,
  Layout,
  BookOpen,
  Image as ImageIcon,
  List as ListIcon,
  ShieldCheck,
  Rocket,
  ArrowRight,
  TrendingUp,
  Zap,
  Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { boardAdminService } from '@/services/foundation/system/BoardAdminService';

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

export default function BoardMasterListPage() {
  const router = useRouter();
  const [searchWrd, setSearchWrd] = useState('');

  const { data: boardData, isLoading } = useQuery({
    queryKey: ['boardMasters', searchWrd],
    queryFn: () => boardAdminService.getBoardMasterList({ searchWrd })
  });

  const boardList = boardData?.content || [];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-700 max-w-[1600px] mx-auto px-4">
      {/* 1. Dashboard Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 pt-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="relative">
                <div className="w-3 h-3 rounded-full bg-primary animate-ping absolute inset-0" />
                <div className="w-3 h-3 rounded-full bg-primary relative ring-4 ring-primary/20" />
             </div>
             <span className="text-[10px] font-black tracking-[0.4em] text-primary uppercase">게시판 통합 관리 시스템</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
            마스터 콘솔
          </h1>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <Button 
            onClick={() => router.push('/admin/community/boards/maker')}
            className="h-20 px-10 rounded-[2rem] bg-slate-900 border-none text-white font-black text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all gap-4 ring-8 ring-slate-900/5 group"
          >
            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
            게시판 생성 마법사
            <Rocket className="w-5 h-5 text-primary opacity-40 group-hover:text-primary group-hover:opacity-100 transition-all" />
          </Button>
        </div>
      </div>

      {/* 2. Insight Stats Cards */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-8"
      >
        <InsightCard label="총 " value="32" desc="Active Board Masters" icon={Layers} color="text-indigo-500" />
        <InsightCard label="총 " value="1.2k" desc="Engagement Traffic" icon={TrendingUp} color="text-rose-500" />
        <InsightCard label="시스템 " value="Optimal" desc="Storage & Network Status" icon={Zap} color="text-emerald-500" />
        <InsightCard label="Security" value="L4" desc="Encrypted Node Access" icon={ShieldCheck} color="text-amber-500" />
      </motion.div>

      {/* 3. Global Search & Filter Area */}
      <Card className="border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] rounded-[3rem] bg-white/60 backdrop-blur-xl border-2 border-slate-50">
        <CardHeader className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
             <CardTitle className="text-3xl font-black italic tracking-tighter uppercase text-slate-800 flex items-center gap-3">
                <Settings2 className="w-8 h-8 text-primary" /> 게시판 목록
             </CardTitle>
             <CardDescription className="text-slate-400 font-bold tracking-tight">생성된 모든 게시판의 라이프사이클을 관리합니다.</CardDescription>
          </div>
          <div className="relative group w-full md:w-[400px]">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
            <Input 
               placeholder="시스템 노드 검색..." 
               className="h-16 pl-16 rounded-2xl border-none bg-slate-100/50 text-lg font-bold placeholder:text-slate-300 ring-offset-0 focus:ring-4 focus:ring-primary/10 transition-all font-sans"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-none">
                <TableHead className="py-10 px-10 text-xs font-black text-slate-400 uppercase tracking-widest">마스터 아이덴티티</TableHead>
                <TableHead className="text-xs font-black text-slate-400 uppercase tracking-widest">메타데이터</TableHead>
                <TableHead className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">상태</TableHead>
                <TableHead className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">수용량</TableHead>
                <TableHead className="pr-10 text-xs font-black text-slate-400 uppercase tracking-widest text-right">작업 컨트롤</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center font-bold text-slate-400 italic">
                    노드 동기화 중...
                  </TableCell>
                </TableRow>
              ) : boardList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center font-bold text-slate-400 italic">
                    등록된 게시판이 없습니다.
                  </TableCell>
                </TableRow>
              ) : boardList.map((board) => (
                <TableRow key={board.bbsId} className="group hover:bg-slate-50/50 transition-colors border-slate-50/50 border-b last:border-0 h-32">
                  <TableCell className="px-10">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 rounded-2xl bg-white border-2 border-slate-50 shadow-sm flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-500">
                          {board.bbsTyCodeNm === '지식 허브' ? <BookOpen size={28} /> : 
                           board.bbsTyCodeNm === 'Visual Gallery' ? <ImageIcon size={28} /> : 
                           <ListIcon size={28} />}
                       </div>
                       <div className="space-y-1">
                          <p className="text-2xl font-black text-slate-800 tracking-tighter italic leading-none">{board.bbsNm}</p>
                          <p className="text-[11px] font-black text-slate-300 uppercase leading-none tracking-widest">{board.bbsId}</p>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                       <p className="text-sm font-bold text-slate-500 line-clamp-1 leading-snug">{board.bbsIntrcn}</p>
                       <div className="flex gap-2">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none px-3 font-black text-[10px] uppercase tracking-tighter">
                            {board.bbsTyCodeNm}
                          </Badge>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn(
                      "px-4 py-1.5 rounded-full font-black text-[10px] uppercase border-none tracking-widest shadow-sm",
                      board.useAt === 'Y' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                    )}>
                      {board.useAt === 'Y' ? '활성' : '대기'}
                    </Badge>
                  </TableCell>
                   <TableCell className="text-center">
                    <div className="space-y-1">
                       <p className="text-xl font-black text-slate-800 italic">0</p>
                       <p className="text-[10px] font-black text-slate-300 uppercase leading-none">게시글 수</p>
                    </div>
                  </TableCell>
                  <TableCell className="pr-10 text-right">
                    <div className="flex items-center justify-end gap-3">
                       <Button size="icon" variant="ghost" className="w-12 h-12 rounded-xl text-slate-400 hover:bg-primary hover:text-white transition-all shadow-hover-sm">
                          <Settings2 size={20} />
                       </Button>
                       <Button 
                          onClick={() => router.push(`/admin/community/boards/selectBoardList?bbsId=${board.bbsId}`)}
                          size="icon" 
                          variant="ghost" 
                          className="w-12 h-12 rounded-xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-hover-sm"
                       >
                          <ArrowRight size={20} />
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-12 rounded-[4rem] bg-slate-900 border-none text-white overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-20 opacity-[0.03] group-hover:scale-110 transition-transform duration-[10s] pointer-events-none grayscale">
           <Rocket size={400} />
        </div>
        <div className="max-w-3xl space-y-8 relative z-10">
           <h3 className="text-5xl font-black italic tracking-tighter leading-tight uppercase">Ready to scale your <span className="text-primary underline decoration-primary/30 decoration-8 underline-offset-8">ecosystem?</span></h3>
           <h3 className="text-5xl font-black italic tracking-tighter leading-tight uppercase">생태계를 확장할 준비가 되셨습니까?</h3>
           <p className="text-xl text-slate-400 font-bold leading-relaxed tracking-tight">마법사를 통해 복잡한 과정 없이 단 4단계만으로 사내 지식 허브를 구축하십시오. 메뉴 배포부터 권한 매트릭스 설계까지 리얼타임으로 자동화됩니다.</p>
           <Button 
              onClick={() => router.push('/admin/community/boards/maker')}
              className="h-20 px-12 rounded-[2rem] bg-primary text-white text-2xl font-black tracking-tighter shadow-[0_30px_60px_-15px_rgba(59,130,246,0.4)] hover:scale-110 active:scale-95 transition-all gap-4 ring-8 ring-primary/5 italic"
           >
              라이브 마법사 실행 <Rocket className="w-8 h-8" />
           </Button>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ label, value, desc, icon: Icon, color }: any) {
    return (
      <motion.div variants={item} className="hub-card-premium p-8 space-y-6 group hover:ring-[30px] hover:ring-slate-100/30 transition-all border-2 border-slate-50/50">
        <div className="flex items-center justify-between">
           <div className={cn("w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform text-slate-400", color)}>
              <Icon size={28} />
           </div>
           <MoreVertical className="text-slate-200" size={20} />
        </div>
        <div className="space-y-1">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
           <h4 className="text-4xl font-black text-slate-900 italic tracking-tighter leading-none group-hover:text-primary transition-colors">{value}</h4>
           <p className="text-[10px] font-black text-slate-300 uppercase leading-none mt-2">{desc}</p>
        </div>
      </motion.div>
    );
}
