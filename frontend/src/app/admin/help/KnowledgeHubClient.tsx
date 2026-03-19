'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
 Library, 
 BookOpen, 
 MessageCircleQuestion, 
 HelpCircle, 
 Search, 
 Plus, 
 BookCheck, 
 TrendingUp, 
 Clock, 
 ArrowUpRight,
 Star,
 Layers,
 FileText,
 History,
 Sparkles,
 Hash,
 Users,
 MessageSquare,
 Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';

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
 { id: 1, category: 'WIKI', title: 'Enterprise Security Architecture v2.0', author: 'Admin', date: '2024.03.18', views: 1240, tags: ['Security', 'Arch'] },
 { id: 2, category: 'FAQ', title: 'How to reset multi-factor authentication?', author: 'System', date: '2024.03.17', views: 890, tags: ['Auth', 'Support'] },
 { id: 3, category: 'QNA', title: 'Regarding the upcoming system migration window', author: 'John Doe', date: '2024.03.18', views: 45, tags: ['Migration', 'Urgent'] },
 { id: 4, category: 'COMMUNITY', title: 'Smart-City Innovation Board', author: 'City Planning', date: '2024.03.19', views: 450, tags: ['Innovation', 'SmartCity'] },
 ];

 return (
 <div className="space-y-12 pb-20 animate-in fade-in duration-1000">
 
 {/* --- Hero Section --- */}
 <div className="relative h-[280px] rounded-[3.5rem] bg-slate-900 overflow-hidden flex flex-col items-center justify-center p-12 shadow-2xl">
 <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-rose-500/5 opacity-50" />
 <div className="relative z-10 text-center w-full max-w-4xl space-y-10">
 <div className="space-y-4">
 <h1 className="text-5xl font-black text-white italic tracking-tighter">지식 및 커뮤니티</h1>
 <p className="text-[10px] font-black text-white/40 tracking-[0.6em] italic">집단 지성 아카이브 v4.0</p>
 </div>
 
 <div className="relative group max-w-2xl mx-auto w-full">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-all scale-125" size={20} />
 <Input 
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="h-20 bg-white/5 border-white/10 rounded-[2rem] px-16 text-white text-xl font-bold placeholder:text-white/20 focus:bg-white focus:text-slate-900 transition-all shadow-2xl focus:ring-[20px] focus:ring-primary/10"
 placeholder="위키, FAQ 및 게시판 통합 검색..."
 />
 </div>
 </div>
 </div>

 {/* --- Category Matrix --- */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
 <CategoryCard title="글로벌 위키" desc="기술 사양" icon={<Library size={28} />} count={142} color="primary" active={activeCategory === 'WIKI'} onClick={() => setActiveCategory('WIKI')} />
 <CategoryCard title="고객지원 " desc="빠른 답변" icon={<BookOpen size={28} />} count={28} color="amber" active={activeCategory === 'FAQ'} onClick={() => setActiveCategory('FAQ')} />
 <CategoryCard title="기술 Q&A" desc="포럼 해결" icon={<MessageCircleQuestion size={28} />} count={567} color="rose" active={activeCategory === 'QNA'} onClick={() => setActiveCategory('QNA')} />
 <CategoryCard title="커뮤니티" desc="활성 게시판" icon={<Globe size={28} />} count={12} color="emerald" active={activeCategory === 'COMMUNITY'} onClick={() => setActiveCategory('COMMUNITY')} />
 </div>

 {/* --- Main Content Area --- */}
 <div className="grid grid-cols-12 gap-8 px-2">
 <div className="col-span-12 lg:col-span-8 space-y-10">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-6">
 <h3 className="text-2xl font-black italic tracking-tighter">저장소 스트림</h3>
 <div className="flex gap-2">
 <Button variant="ghost" className="h-8 text-[9px] font-black tracking-tight text-primary border-b-2 border-primary rounded-none">인기</Button>
 <Button variant="ghost" className="h-8 text-[9px] font-black tracking-tight text-slate-400">Library</Button>
 </div>
 </div>
 <Button className="h-12 px-6 rounded-2xl bg-slate-900 text-white font-black tracking-tight shadow-xl">
 <Plus size={18} className="mr-2" /> 새 항목 등록
 </Button>
 </div>

 <div className="space-y-4">
 {recentKnowledge.filter(i => activeCategory === 'ALL' || i.category === activeCategory).map((item) => (
 <motion.div 
 layout
 key={item.id}
 className="group p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl shadow-slate-100/20 hover:shadow-2xl transition-all flex items-center justify-between relative ring-1 ring-slate-50"
 >
 <div className="flex items-center gap-8 w-full">
 <div className={cn(
 "w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-lg",
 item.category === 'WIKI' ? "bg-primary/10 text-primary" : 
 item.category === 'FAQ' ? "bg-amber-500/10 text-amber-600" : 
 item.category === 'COMMUNITY' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
 )}>
 {item.category === 'WIKI' ? <Library size={24} /> : 
 item.category === 'FAQ' ? <HelpCircle size={24} /> : 
 item.category === 'COMMUNITY' ? <Users size={24} /> : <MessageCircleQuestion size={24} />}
 </div>
 <div className="flex-1 space-y-2">
 <div className="flex items-center gap-3">
 <span className="text-[10px] font-black tracking-[0.2em] opacity-40 italic">{item.category}</span>
 <span className="text-[10px] font-bold text-slate-400">등록일 {item.date}</span>
 </div>
 <h4 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-primary transition-colors">{item.title}</h4>
 <div className="flex items-center gap-2">
 {item.tags.map(tag => (
 <span key={tag} className="text-[9px] font-black tracking-tight text-slate-400 bg-slate-50 px-2 py-0.5 rounded">#{tag}</span>
 ))}
 </div>
 </div>
 <div className="text-right shrink-0">
 <div className="text-[10px] font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-full">{item.views} 조회수</div>
 </div>
 </div>
 <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-6">
 <ArrowUpRight size={24} className="text-primary" />
 </div>
 </motion.div>
 ))}
 </div>
 </div>

 {/* Sidebar Insights */}
 <div className="col-span-12 lg:col-span-4 space-y-8">
 <Card className="rounded-[3rem] border-0 bg-white shadow-2xl p-10 space-y-8 ring-1 ring-slate-100 relative overflow-hidden">
 <div className="absolute top-0 right-0 p-8 opacity-5">
 <Sparkles size={120} />
 </div>
 <div className="space-y-1">
 <h3 className="text-[10px] font-black text-slate-400 tracking-tight italic">인텔리전스</h3>
 <h4 className="text-2xl font-black italic tracking-tighter ">지식 점수</h4>
 </div>
 <div className="flex items-center gap-6">
 <div className="text-5xl font-black text-primary italic tracking-tighter">92%</div>
 <p className="text-[10px] font-bold text-slate-400 tracking-tight leading-relaxed">시스템 문서가 4시간 전에 업데이트되었습니다.</p>
 </div>
 <Button variant="outline" className="w-full h-14 rounded-2xl border-2 font-black tracking-tight">감사 실행</Button>
 </Card>

 <Card className="rounded-[3rem] border-0 bg-slate-900 text-white shadow-2xl p-10 space-y-8 relative group">
 <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity" />
 <div className="relative z-10 space-y-6 text-center">
 <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto shadow-2xl">
 <MessageSquare size={32} className="text-primary" />
 </div>
 <div className="space-y-2">
 <h4 className="text-xl font-black italic tracking-tighter">활성 커뮤니티</h4>
 <p className="text-[10px] text-white/40 font-bold tracking-tight">혁신 클러스터에 참여하세요.</p>
 </div>
 </div>
 </Card>
 </div>
 </div>
 </div>
 );
}

// --- Sub-components ---

function CategoryCard({ title, desc, icon, count, color, active, onClick }: any) {
 const colorClasses = {
 primary: active ? "border-primary bg-primary text-white" : "text-primary border-primary/20 bg-primary/5",
 amber: active ? "border-amber-500 bg-amber-500 text-white" : "text-amber-500 border-amber-500/20 bg-amber-500/5",
 rose: active ? "border-rose-500 bg-rose-500 text-white" : "text-rose-500 border-rose-500/20 bg-rose-500/5",
 emerald: active ? "border-emerald-500 bg-emerald-500 text-white" : "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
 };

 return (
 <Card 
 className={cn(
 "group rounded-[2.5rem] border-2 shadow-xl p-8 space-y-6 transition-all cursor-pointer overflow-hidden relative",
 (colorClasses as any)[color],
 active ? "scale-105 shadow-2xl z-10" : "hover:border-slate-200 bg-white border-transparent"
 )}
 onClick={onClick}
 >
 <div className={cn(
 "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg",
 active ? "bg-white/20 text-white" : (colorClasses as any)[color]
 )}>
 {icon}
 </div>
 <div>
 <h3 className={cn("text-lg font-black italic tracking-tighter truncate", active ? "text-white" : "text-slate-900")}>{title}</h3>
 <p className={cn("text-[9px] font-bold tracking-tight mt-1", active ? "text-white/60" : "text-slate-400")}>{count} 항목 • {desc}</p>
 </div>
 </Card>
 );
}
