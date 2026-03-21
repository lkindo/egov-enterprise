'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubInsightBadge } from '@/components/ui/hub/HubInsightBadge';
import { 
  Library, 
  BookOpen, 
  MessageCircleQuestion, 
  HelpCircle, 
  Search, 
  Plus, 
  BookCheck, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight,
  Star,
  Layers,
  FileText,
  History,
  Sparkles,
  Hash,
  Users,
  MessageSquare,
  Globe,
  ChevronRight,
  Award,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { hubContainerVariants, hubItemVariants } from '@/lib/hub-animations';

// --- Types ---
type KnowledgeCategory = 'WIKI' | 'FAQ' | 'QNA' | 'COMMUNITY';

interface KnowledgeItem {
  id: string | number;
  category: KnowledgeCategory;
  title: string;
  author: string;
  date: string;
  views: number;
  tags: string[];
}

export default function KnowledgeHubClient({ defaultTab = 'WIKI' }: { defaultTab?: KnowledgeCategory }) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<KnowledgeCategory | 'ALL'>(defaultTab === 'COMMUNITY' ? 'COMMUNITY' : 'ALL');

  // --- Mock Data ---
  const recentKnowledge: KnowledgeItem[] = [
    { id: 1, category: 'WIKI', title: '엔터프라이즈 보안 아키텍처 v2.0 가이드라인', author: 'Admin', date: '2024.03.18', views: 1240, tags: ['보안', '아키텍처'] },
    { id: 2, category: 'FAQ', title: '다요소 인증(MFA) 초기화 방법 및 절차', author: 'System', date: '2024.03.17', views: 890, tags: ['인증', '지원'] },
    { id: 3, category: 'QNA', title: '다가오는 전체 시스템 마이그레이션 점검 일정 관련', author: '홍길동', date: '2024.03.18', views: 45, tags: ['마이그레이션', '긴급'] },
    { id: 4, category: 'COMMUNITY', title: '스마트 시티 혁신 기술 보드 - 아이디어 공모', author: '도시계획부', date: '2024.03.19', views: 450, tags: ['혁신', '스마트시티'] },
  ];

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={hubContainerVariants}
      className="space-y-12 pb-24"
    >
      <motion.div variants={hubItemVariants}>
        <PageHeader
          title="인텔리전스 센터"
          breadcrumbs={[{ label: '헬프데스크' }, { label: '지식 허브' }]}
        />
      </motion.div>

      <motion.div variants={hubItemVariants} className="relative h-[320px] rounded-[4rem] bg-slate-900 overflow-hidden flex flex-col items-center justify-center p-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] border-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-rose-500/10 opacity-60 animate-pulse duration-[10s]" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        
        <div className="relative z-10 text-center w-full max-w-4xl space-y-12">
          <div className="space-y-4">
            <h1 className="text-5xl font-black text-white tracking-tighter leading-none uppercase">Knowledge Portal</h1>
            <HubInsightBadge label="Enterprise Collective Intelligence Archive" className="text-white/30 !opacity-30" />
          </div>
          
          <div className="relative group max-w-2xl mx-auto w-full">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-all scale-150" size={20} />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-20 bg-white/5 border-none rounded-[2.5rem] px-20 text-white text-2xl font-black placeholder:text-white/10 focus:bg-white focus:text-slate-900 transition-all shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] focus:ring-[24px] focus:ring-primary/10 tracking-tight"
              placeholder="위키, FAQ, 기술 포럼 연동 검색..."
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black text-white/40 tracking-widest border border-white/5 uppercase">Global Core</div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={hubItemVariants}>
        <HubHeader 
          title="지식 자산" 
          highlight="매트릭스" 
          subtitle="전사적 지식 공유 및 기술 지원을 위한 통합 데이터 레이어" 
          icon={Library} 
          actions={
            <div className="flex gap-4 p-2">
              <Button variant="outline" size="lg" className="h-12 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase gap-2">
                <History size={16} /> 최근 이력
              </Button>
              <Button size="lg" className="h-12 px-8 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all gap-2">
                <Plus size={18} /> 새 지식 등록
              </Button>
            </div>
          }
        />
      </motion.div>

      <motion.div variants={hubItemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-2">
        <CategoryCard title="Global Wiki" desc="기술 사양서" icon={<Library size={28} />} count={142} color="primary" active={activeCategory === 'WIKI'} onClick={() => setActiveCategory('WIKI')} />
        <CategoryCard title="Customer Help" desc="FAQ 가이드" icon={<BookOpen size={28} />} count={28} color="amber" active={activeCategory === 'FAQ'} onClick={() => setActiveCategory('FAQ')} />
        <CategoryCard title="Tech Forum" desc="Q&A 분석" icon={<MessageCircleQuestion size={28} />} count={567} color="rose" active={activeCategory === 'QNA'} onClick={() => setActiveCategory('QNA')} />
        <CategoryCard title="Community" desc="혁신 클러스터" icon={<Globe size={28} />} count={12} color="emerald" active={activeCategory === 'COMMUNITY'} onClick={() => setActiveCategory('COMMUNITY')} />
      </motion.div>

      <motion.div variants={hubItemVariants} className="grid grid-cols-12 gap-10 px-2 mt-4">
        <div className="col-span-12 lg:col-span-8 space-y-10">
          <HubSectionCard
            title="저장소 스트림"
            description="전사 지식 네트워크에서 유입되는 실시간 데이터 유닛입니다."
            icon={Layers}
          >
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {recentKnowledge.filter(i => activeCategory === 'ALL' || i.category === activeCategory).map((item) => (
                  <motion.div 
                    layout
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="group hub-table-container p-8 border-border/50 bg-white hover:bg-slate-50/30 transition-all flex items-center justify-between relative"
                  >
                    <div className="flex items-center gap-10 w-full relative z-10">
                      <div className={cn(
                        "w-16 h-16 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-2xl transition-all group-hover:rotate-12 duration-500",
                        item.category === 'WIKI' ? "bg-primary/10 text-primary" : 
                        item.category === 'FAQ' ? "bg-amber-500/10 text-amber-600" : 
                        item.category === 'COMMUNITY' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                      )}>
                        {item.category === 'WIKI' ? <Library size={28} /> : 
                        item.category === 'FAQ' ? <HelpCircle size={28} /> : 
                        item.category === 'COMMUNITY' ? <Users size={28} /> : <MessageCircleQuestion size={28} />}
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-4">
                          <span className={cn(
                            "text-[9px] font-black tracking-[0.3em] uppercase px-3 py-1 rounded-full border",
                            item.category === 'WIKI' ? "bg-primary/5 border-primary/10 text-primary" : 
                            item.category === 'FAQ' ? "bg-amber-500/5 border-amber-500/10 text-amber-600" : 
                            item.category === 'COMMUNITY' ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600" : "bg-rose-500/5 border-rose-500/10 text-rose-600"
                          )}>{item.category}</span>
                          <span className="text-[10px] font-black text-muted-foreground opacity-30 tracking-widest uppercase">STAMP: {item.date} • BY {item.author}</span>
                        </div>
                        <h4 className="text-2xl font-black text-foreground tracking-tighter leading-none group-hover:text-primary transition-colors uppercase">{item.title}</h4>
                        <div className="flex items-center gap-3">
                          {item.tags.map(tag => (
                            <span key={tag} className="text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase bg-slate-50 dark:bg-muted/50 px-3 py-1 rounded-lg border border-border/50 leading-none">#{tag}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-black text-slate-900 dark:text-foreground bg-slate-100 dark:bg-muted/50 px-5 py-2 rounded-2xl border border-border/30 shadow-inner tabular-nums">{item.views.toLocaleString()} VIEWS</div>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500 ml-6 relative z-10">
                      <ArrowUpRight size={28} className="text-primary" />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </HubSectionCard>
        </div>

        {/* Sidebar Insights */}
        <div className="col-span-12 lg:col-span-4 space-y-10">
          <div className="hub-card-premium p-12 space-y-10 bg-slate-900 border-none text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]">
            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/20 blur-[100px] rounded-full group-hover:scale-150 transition-transform duration-[2s]" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-primary border border-white/5 shadow-2xl">
                <Award size={32} />
              </div>
              <HubStatusBadge label="HIGH INTEGRITY" variant="success" className="bg-emerald-500/20 border-emerald-500/20 text-emerald-400 text-[8px] font-black tracking-[0.2em] uppercase" />
            </div>
            <div className="relative z-10 space-y-2">
              <h3 className="hub-label-accent text-white/30 !opacity-30 leading-none">Intelligence Score</h3>
              <h4 className="text-5xl font-black tracking-tighter text-white leading-none tabular-nums">98.4<span className="text-xl opacity-30">%</span></h4>
              <p className="text-[10px] font-bold text-white/40 tracking-tight leading-relaxed max-w-[200px] mt-4">시스템 인텔리전스 분석 결과, 기술 문서의 최신화 비율이 '매우 높음' 상태입니다.</p>
            </div>
            <Button size="lg" className="w-full h-16 bg-white/10 border-white/5 text-white font-black tracking-[0.3em] uppercase rounded-2xl relative z-10 hover:bg-white hover:text-slate-900 transition-all">
              Execute Sync
            </Button>
          </div>

          <div className="hub-card-premium p-12 space-y-8 border-border/50">
             <div className="flex items-center justify-between">
               <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                 <Zap size={24} />
               </div>
               <div className="text-right">
                 <p className="hub-label-accent leading-none">Active Pulse</p>
                 <p className="text-sm font-black text-foreground tracking-tighter uppercase mt-1">Real-time Stream</p>
               </div>
             </div>
             <div className="space-y-4">
               {[1, 2, 3].map(i => (
                 <div key={i} className="flex items-center gap-4 group/item cursor-help">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <div className="flex-1 border-b border-border/30 pb-3 group-hover/item:border-primary/30 transition-all">
                     <p className="text-[10px] font-black text-muted-foreground tracking-tight opacity-40 uppercase">Action Log • 2m ago</p>
                     <p className="text-xs font-bold text-foreground leading-tight mt-1 line-clamp-1">New Core Security API specs updated by Admin</p>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Sub-components ---

function CategoryCard({ title, desc, icon, count, color, active, onClick }: any) {
  const colorMap: any = {
    primary: "text-primary border-primary/20 bg-primary/5",
    amber: "text-amber-500 border-amber-500/20 bg-amber-500/5",
    rose: "text-rose-500 border-rose-500/20 bg-rose-500/5",
    emerald: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
  };

  return (
    <div 
      className={cn(
        "hub-card-premium p-10 space-y-8 group transition-all cursor-pointer border-border/50",
        active ? "bg-slate-900 border-slate-900 text-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] scale-[1.05] z-10" : "hover:-translate-y-2 hover:shadow-2xl hover:border-primary/20"
      )}
      onClick={onClick}
    >
      <div className={cn(
        "w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all shadow-xl duration-500 group-hover:rotate-12",
        active ? "bg-white/10 text-white" : colorMap[color]
      )}>
        {icon}
      </div>
      <div>
        <h3 className={cn("text-2xl font-black tracking-tighter uppercase leading-none", active ? "text-white" : "text-foreground")}>{title}</h3>
        <p className={cn("text-[10px] font-black tracking-[0.2em] uppercase mt-3 leading-none opacity-40", active ? "text-white/40" : "text-muted-foreground")}>{count} UNITS • {desc}</p>
      </div>
      <div className={cn(
        "absolute right-[-10%] bottom-[-10%] opacity-[0.03] grayscale transition-all duration-1000",
        active ? "scale-150 rotate-12 opacity-[0.05]" : "group-hover:rotate-12"
      )}>
        {React.cloneElement(icon, { size: 120 })}
      </div>
    </div>
  );
}
