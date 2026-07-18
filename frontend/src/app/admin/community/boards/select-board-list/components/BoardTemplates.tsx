'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BoardPost } from '@/types/business/board';
import { HighlightText } from './HighlightText';
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { BookOpen,  Clock,  Eye,  MessageSquare,  ChevronRight,  ThumbsUp,  Share2,  
  HelpCircle,  CheckCircle2,  ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

interface TemplateProps {
  list: BoardPost[];
  bbsId: string;
  querySearchWrd: string;
  handleLike: (e: React.MouseEvent, pstId: string) => void;
  isLikePending: boolean;
  page?: number;
  totalCount?: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100
    }
  }
};

export const HubTemplate = ({ list, bbsId, page = 1 }: TemplateProps) => {
  if (list.length === 0) return null;
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10 p-10"
    >
      {page === 1 && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-12 p-12 bg-surface-inverse rounded-3xl text-surface-inverse-foreground relative overflow-hidden group border-none shadow-2xl">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 bg-hub-indigo/10 blur-[100px] rounded-full" />
            
            <div className="relative z-10 space-y-8">
              <Badge className="bg-white/10 backdrop-blur-md text-white border-white/20 font-black tracking-[0.4em] uppercase py-2 px-6 text-xs rounded-full">FEATURED_KNOWLEDGE</Badge>
              <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&pstId=${list[0].pstId}`}>
                <h3 className="text-5xl font-black tracking-tighter leading-none group-hover:text-primary transition-all cursor-pointer decoration-primary/30 group-hover:underline underline-offset-8 decoration-4">{list[0].pstTtl}</h3>
              </Link>
              <div className="flex flex-wrap items-center gap-10 mt-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-primary font-black text-sm border border-white/10 shadow-xl">OP</div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-1">Author</span>
                    <span className="text-lg font-black">{list[0].userNm}</span>
                  </div>
                </div>
                <div className="h-10 w-px bg-white/10 hidden md:block" />
                <div className="flex items-center gap-3 text-white/60">
                  <Clock size={20} className="text-primary" />
                  <span className="text-sm font-bold tracking-tight">{list[0].crtDt ? String(list[0].crtDt).substring(0, 10) : 'Just now'}</span>
                </div>
                <div className="h-10 w-px bg-white/10 hidden md:block" />
                <div className="flex items-center gap-3 text-white/60">
                  <Eye size={20} className="text-primary" />
                  <span className="text-sm font-bold tracking-tight">{(list[0].inqCnt || 0).toLocaleString()} views</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {(page === 1 ? list.slice(1) : list).map((item: BoardPost) => (
          <motion.div key={item.pstId} variants={itemVariants}>
            <Card className="group p-8 bg-white/40 backdrop-blur-md rounded-3xl border border-white/60 space-y-6 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden ring-1 ring-black/5">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 group-hover:scale-125 transition-all text-primary">
                <BookOpen size={80} />
              </div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="bg-muted/80 text-muted-foreground font-bold px-3 py-1 rounded-lg">KNOWLEDGE</Badge>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">UNIT_{String(item.pstId).slice(-4)}</span>
              </div>
              <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&pstId=${item.pstId}`}>
                <h4 className="font-black text-foreground text-xl leading-tight line-clamp-2 group-hover:text-primary transition-colors tracking-tighter">{item.pstTtl}</h4>
              </Link>
              <div className="flex justify-between items-center pt-6 border-t border-border/50">
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-xs"><Eye size={16} className="text-slate-300" /> {item.inqCnt}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-xs"><MessageSquare size={16} className="text-slate-300" /> 0</div>
                </div>
                <motion.div 
                  whileHover={{ x: 5 }}
                  className="w-12 h-12 rounded-2xl bg-white border border-border flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white group-hover:border-primary shadow-sm transition-all"
                >
                  <ChevronRight size={20} />
                </motion.div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export const GalleryTemplate = ({ list, bbsId, querySearchWrd, handleLike, isLikePending }: TemplateProps) => {
  if (list.length === 0) return null;
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-12 p-10"
    >
      {list.map((item: BoardPost) => (
        <motion.div key={item.pstId} variants={itemVariants}>
          <Card className="group overflow-hidden rounded-3xl bg-white/60 backdrop-blur-md border border-white shadow-xl transition-all hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] hover:-translate-y-3 ring-1 ring-black/5">
            <div className="h-72 overflow-hidden relative bg-muted">
              <div className="w-full h-full flex items-center justify-center bg-muted overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-white to-purple-100 group-hover:scale-110 transition-transform duration-1000" />
                <BookOpen size={140} className="text-slate-200 opacity-40 relative z-10 group-hover:rotate-12 transition-transform duration-700" />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-500" />
              </div>
              <div className="absolute top-8 right-8 px-5 py-2 bg-surface-inverse/80 backdrop-blur-xl rounded-2xl text-surface-inverse-foreground text-[10px] font-black tracking-[0.3em] uppercase border border-white/10 shadow-2xl">INSIGHT_NODE</div>
            </div>
            <CardContent className="p-10 space-y-8">
              <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&pstId=${item.pstId}`}>
                <h3 className="text-3xl font-black text-foreground tracking-tighter leading-[1.1] group-hover:text-primary transition-all cursor-pointer line-clamp-2">
                  <HighlightText text={item.pstTtl} highlight={querySearchWrd} />
                </h3>
              </Link>
              <div className="flex items-center justify-between pt-8 border-t border-border/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-muted-foreground font-black text-xs border border-white shadow-inner">OP</div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-foreground leading-none mb-1.5">
                      <HighlightText text={item.userNm} highlight={querySearchWrd} />
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.crtDt ? String(item.crtDt).substring(0, 10) : '-'}</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleLike(e, String(item.pstId))}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-border shadow-sm text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
                    aria-label="좋아요"
                  >
                    <ThumbsUp size={18} className={cn(isLikePending && "animate-bounce")} />
                    <span className="text-sm font-black text-foreground">{item.likeCnt || 0}</span>
                  </motion.button>
                  <Button variant="ghost" size="icon" className="rounded-xl bg-muted hover:bg-muted text-muted-foreground">
                    <Share2 size={20} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

export const QnaTemplate = ({ list, bbsId, querySearchWrd, handleLike, isLikePending }: TemplateProps) => {
  if (list.length === 0) return null;
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 p-10"
    >
      {list.map((item: BoardPost) => (
        <motion.div key={item.pstId} variants={itemVariants}>
          <Card className="group p-8 bg-white/60 backdrop-blur-md border border-white rounded-[2rem] flex flex-col md:flex-row gap-10 hover:shadow-2xl hover:border-amber-400/50 transition-all cursor-pointer relative overflow-hidden ring-1 ring-black/5">
            <div className="flex flex-col items-center gap-3 min-w-[100px] justify-center">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={cn(
                  "w-20 h-16 rounded-2xl flex items-center justify-center font-black text-3xl shadow-xl transition-all",
                  item.qnaSttsCd === 'SOLVED' ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-amber-500 text-white shadow-amber-500/20"
                )}
              >
                {item.qnaSttsCd === 'SOLVED' ? <CheckCircle2 size={40} /> : <HelpCircle size={40} /> }
              </motion.div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-[0.3em]",
                item.qnaSttsCd === 'SOLVED' ? "text-emerald-500" : "text-amber-500"
              )}>{item.qnaSttsCd === 'SOLVED' ? 'Solved' : 'Awaiting'}</span>
            </div>
            <div className="flex-1 space-y-5">
              <div className="flex items-center gap-5">
                <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none text-[10px] font-black px-4 py-1.5 rounded-lg tracking-widest uppercase">
                  {item.qnaCatCd || 'GENERAL_QNA'}
                </Badge>
                <div className="w-1.5 h-1.5 rounded-full bg-muted" />
                <span className="text-[10px] font-black text-muted-foreground flex items-center gap-2 tracking-widest uppercase"><Clock size={14} className="text-amber-400" /> {item.crtDt ? String(item.crtDt).substring(0, 10) : '-'}</span>
              </div>
              <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&pstId=${item.pstId}`}>
                <h4 className="text-3xl font-black text-foreground leading-tight group-hover:text-amber-600 transition-colors tracking-tighter uppercase decoration-amber-500/20 group-hover:underline underline-offset-8 decoration-4">
                  <HighlightText text={item.pstTtl} highlight={querySearchWrd} />
                </h4>
              </Link>
              <div className="flex flex-wrap items-center gap-8 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground text-[10px] font-black border border-white shadow-sm">AD</div>
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-tight">
                    <HighlightText text={item.userNm} highlight={querySearchWrd} />
                  </span>
                </div>
                <div className="h-4 w-px bg-muted" />
                <div className="flex items-center gap-2.5 text-muted-foreground font-black text-[10px] tracking-widest uppercase">
                  <MessageSquare size={16} className="text-amber-400" />
                  <span>{item.commentCnt || 0} Responses</span>
                </div>
                <div className="h-4 w-px bg-muted" />
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => handleLike(e, String(item.pstId))}
                  className="flex items-center gap-2.5 text-muted-foreground hover:text-amber-500 font-black text-[10px] tracking-widest uppercase transition-all"
                  aria-label="좋아요"
                >
                  <ThumbsUp size={16} className={cn(isLikePending && "animate-bounce")} />
                  <span>{item.likeCnt || 0} Appreciations</span>
                </motion.button>
              </div>
            </div>
            <div className="absolute right-[-40px] top-[-40px] opacity-[0.02] group-hover:opacity-[0.05] transition-all group-hover:scale-110 duration-1000">
              <HelpCircle size={250} />
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

interface CalendarTemplateProps extends TemplateProps {
  currentViewDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const CalendarTemplate = ({ list, bbsId, currentViewDate, onPrevMonth, onNextMonth }: CalendarTemplateProps) => {
  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const postsByDay = list.reduce((acc: { [key: number]: BoardPost[] }, post) => {
    const targetDate = post.evntDt || post.crtDt;
    if (targetDate) {
      const d = new Date(targetDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!acc[day]) acc[day] = [];
        acc[day].push(post);
      }
    }
    return acc;
  }, {});

  return (
    <div className="p-10 space-y-10">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex justify-between items-center bg-surface-inverse p-10 rounded-[2.5rem] text-surface-inverse-foreground relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full" />
        <div className="space-y-2 relative z-10">
          <p className="text-primary font-black tracking-[0.4em] text-[10px] uppercase">Node Timeline Matrix</p>
          <h3 className="text-5xl font-black tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-r from-white to-white/40">
            {format(currentViewDate, "MMMM yyyy", { locale: ko })}
          </h3>
        </div>
        <div className="flex gap-4 relative z-10">
          <Button 
            variant="outline" 
            onClick={onPrevMonth}
            className="h-16 w-16 border-white/10 bg-white/5 hover:bg-white hover:text-foreground rounded-2xl transition-all"
            aria-label="이전 달"
          >
            <ChevronRight className="rotate-180" size={24} />
          </Button>
          <Button 
            variant="outline" 
            onClick={onNextMonth}
            className="h-16 w-16 border-white/10 bg-white/5 hover:bg-white hover:text-foreground rounded-2xl transition-all"
            aria-label="다음 달"
          >
            <ChevronRight size={24} />
          </Button>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-7 gap-1 md:gap-4 lg:gap-5"
      >
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
          <div key={d} className="text-center font-black text-slate-300 text-[8px] md:text-[10px] tracking-[0.1em] md:tracking-[0.4em] pb-2 md:pb-6 border-b-2 border-border uppercase">{d}</div>
        ))}
        {Array.from({ length: 42 }, (_, i) => i - firstDayOfMonth + 1).map((day, i) => {
          const isCurrentMonth = day > 0 && day <= daysInMonth;
          const dayPosts = isCurrentMonth ? postsByDay[day] || [] : [];
          const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

          return (
            <motion.div 
              key={i} 
              variants={itemVariants}
              className={cn(
                "min-h-[60px] md:min-h-[140px] lg:min-h-[180px] p-1 md:p-3 lg:p-6 border-2 transition-all relative group rounded-xl md:rounded-3xl",
                isToday ? "bg-primary/5 border-primary/30 shadow-inner" : "bg-white/40 backdrop-blur-sm border-border hover:border-border hover:shadow-xl",
                !isCurrentMonth ? "opacity-10 pointer-events-none bg-muted/50" : ""
              )}
            >
              <div className="flex justify-between items-start mb-2 md:mb-6">
                <span className={cn(
                  "text-xs md:text-xl lg:text-2xl font-black tracking-tighter", 
                  isToday ? "text-primary" : "text-slate-200 group-hover:text-foreground",
                  (i % 7 === 0) && isCurrentMonth ? "text-rose-400" : "", // Sunday
                  (i % 7 === 6) && isCurrentMonth ? "text-hub-indigo" : "" // Saturday
                )}>
                  {isCurrentMonth ? day : ''}
                </span>
                {dayPosts.length > 0 && (
                  <Badge className="bg-surface-inverse text-surface-inverse-foreground hover:bg-primary text-[8px] md:text-[10px] font-black h-4 w-4 md:h-6 md:w-6 rounded-xl p-0 flex items-center justify-center border-none shadow-lg group-hover:scale-110 transition-transform">
                    {dayPosts.length}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-1 md:space-y-2.5 max-h-[40px] md:max-h-[80px] lg:max-h-[110px] overflow-y-auto custom-scrollbar pr-1">
                {dayPosts.map((post) => (
                  <Link 
                    key={post.pstId}
                    href={`/admin/community/boards/detail?bbsId=${bbsId}&pstId=${post.pstId}`}
                    className={cn(
                      "block p-2.5 text-[10px] font-black leading-none rounded-lg shadow-sm transition-all hover:scale-105 cursor-pointer truncate uppercase tracking-tight",
                      (post as any).noticeYn === 'Y' ? "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-rose-500/20" : "bg-white border border-border text-foreground hover:bg-surface-inverse hover:text-surface-inverse-foreground"
                    )}
                    title={post.pstTtl}
                  >
                    {post.pstTtl}
                  </Link>
                ))}
              </div>

              {isCurrentMonth && (
                <div className="absolute bottom-1 right-2 lg:bottom-5 lg:right-6 text-[8px] lg:text-[10px] font-black text-slate-100 group-hover:text-slate-200 transition-all uppercase tracking-widest opacity-0 group-hover:opacity-100 invisible md:visible">
                  {`${year}.${month + 1}.${day}`}
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

const FAQItem = ({ item }: { item: BoardPost }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div variants={itemVariants}>
      <Card 
        className={cn(
          "overflow-hidden transition-all duration-500 rounded-3xl border border-white shadow-xl ring-1 ring-black/5",
          isOpen ? "bg-white/80 backdrop-blur-xl shadow-2xl border-indigo-200" : "bg-white/40 hover:bg-white hover:border-border"
        )}
      >
        <div 
          className="p-8 cursor-pointer flex items-center justify-between group"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-8">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl transition-all shadow-xl",
              isOpen ? "bg-hub-indigo text-white shadow-hub-indigo/20 rotate-12" : "bg-white text-slate-300 group-hover:bg-indigo-50 group-hover:text-hub-indigo group-hover:shadow-hub-indigo/10"
            )}>
              Q
            </div>
            <h4 className={cn(
              "text-2xl font-black tracking-tighter transition-colors uppercase leading-tight",
              isOpen ? "text-hub-indigo" : "text-foreground"
            )}>
              {item.pstTtl}
            </h4>
          </div>
          <motion.div 
            animate={{ rotate: isOpen ? 180 : 0 }}
            className={cn(
              "transition-colors",
              isOpen ? "text-hub-indigo" : "text-slate-300"
            )}
          >
            <ChevronDown size={32} />
          </motion.div>
        </div>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="px-8 pb-10 ml-[88px] border-t border-border/50 pt-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] grayscale pointer-events-none">
                  <BookOpen size={120} className="text-hub-indigo" />
                </div>
                <div className="flex items-start gap-6 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-xl shadow-emerald-500/20">A</div>
                  <div className="space-y-6 flex-1">
                    <p className="text-muted-foreground font-bold leading-relaxed text-xl whitespace-pre-wrap tracking-tight">
                      {item.pstCn}
                    </p>
                    <div className="flex flex-wrap items-center gap-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] pt-6 border-t border-border">
                      <span className="flex items-center gap-2"><Clock size={12} /> Sync: {item.crtDt ? String(item.crtDt).substring(0, 10) : '-'}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-muted" />
                      <span className="flex items-center gap-2"><Eye size={12} /> Reach: {item.inqCnt} Units</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

export const FaqTemplate = ({ list }: TemplateProps) => {
  if (list.length === 0) return null;
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-10 space-y-6"
    >
      {list.map((item: BoardPost) => (
        <FAQItem key={item.pstId} item={item} />
      ))}
    </motion.div>
  );
};

export const WikiTemplate = ({ list, bbsId, querySearchWrd }: TemplateProps) => {
  if (list.length === 0) return null;
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-10 space-y-10"
    >
      {list.map((item: BoardPost) => (
        <motion.div key={item.pstId} variants={itemVariants}>
          <Card className="group overflow-hidden bg-white/40 backdrop-blur-md border border-white hover:border-slate-900 transition-all rounded-[2.5rem] shadow-xl hover:shadow-2xl ring-1 ring-black/5">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-24 bg-surface-inverse flex md:flex-col items-center justify-center p-6 gap-3 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <BookOpen className="text-surface-inverse-foreground opacity-40 group-hover:opacity-100 group-hover:scale-125 transition-all relative z-10" size={32} />
              </div>
              <div className="flex-1 p-10 space-y-6">
                <div className="flex items-center gap-5">
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground rounded-lg border-border px-4 py-1.5">Documentation_v3.0</Badge>
                  <span className="text-[10px] font-black text-slate-300 tracking-widest uppercase">{item.crtDt ? String(item.crtDt).substring(0, 10) : '-'}</span>
                </div>
                <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&pstId=${item.pstId}`}>
                  <h4 className="text-2xl font-black text-foreground leading-tight group-hover:text-primary transition-all tracking-tighter uppercase truncate">
                    <HighlightText text={item.pstTtl} highlight={querySearchWrd} />
                  </h4>
                </Link>
                <p className="text-muted-foreground font-bold text-lg line-clamp-2 leading-relaxed tracking-tight">{item.pstCn}</p>
                <div className="flex items-center gap-10 pt-8 border-t border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Compiler</span>
                    <span className="text-xs font-black text-foreground uppercase tracking-tight">
                       <HighlightText text={item.userNm} highlight={querySearchWrd} />
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Global_Index</span>
                    <span className="text-xs font-black text-foreground uppercase tracking-tight">{(item.inqCnt || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

export const DefaultTemplate = ({ list, bbsId, querySearchWrd, handleLike, isLikePending, page = 1, totalCount = 0 }: TemplateProps) => {
  if (list.length === 0) return null;
  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent border-b-2 border-border">
            <TableHead className="w-[80px] text-center font-black text-muted-foreground tracking-wider text-[11px] py-6">번호</TableHead>
            <TableHead className="font-black text-foreground tracking-wider text-[11px] py-6 px-8">제목</TableHead>
            <TableHead className="w-[120px] font-black text-muted-foreground tracking-wider text-[11px] py-6 text-center">작성자</TableHead>
            <TableHead className="w-[120px] font-black text-muted-foreground tracking-wider text-[11px] py-6 text-center">등록일</TableHead>
            <TableHead className="w-[160px] font-black text-muted-foreground tracking-wider text-[11px] py-6 text-center">조회/추천</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((item: BoardPost, idx: number) => (
            <TableRow key={item.pstId} className="hover:bg-primary/[0.03] transition-all group border-b border-border last:border-0 relative">
              <TableCell className="text-center font-bold text-xs text-muted-foreground py-5">
                {(totalCount - ((page - 1) * 10) - idx).toString().padStart(3, '0')}
              </TableCell>
              <TableCell className="px-8 py-5">
                <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&pstId=${item.pstId}`} className="group/link flex flex-col gap-1 max-w-full overflow-hidden">
                  <div className="text-sm font-black text-foreground group-hover/link:text-primary transition-all tracking-tight leading-snug truncate">
                    <HighlightText text={item.pstTtl} highlight={querySearchWrd} />
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="h-[1px] w-5 bg-primary/30" />
                    <span className="text-[9px] font-black text-primary uppercase tracking-wider">Node Details</span>
                  </div>
                </Link>
              </TableCell>
              <TableCell className="text-center py-5">
                <div className="font-bold text-xs text-muted-foreground tracking-tight">
                  <HighlightText text={item.userNm} highlight={querySearchWrd} />
                </div>
              </TableCell>
              <TableCell className="text-center py-5">
                <div className="font-bold text-xs text-muted-foreground tracking-tight">
                  {item.crtDt ? String(item.crtDt).substring(0, 10).replace(/-/g, '.') : '-'}
                </div>
              </TableCell>
              <TableCell className="text-center py-5">
                <div className="flex items-center justify-center gap-2">
                  <div className="font-bold text-[10px] text-primary bg-primary/5 px-2.5 py-1.5 rounded-lg flex items-center gap-1 border border-primary/10">
                    <Eye size={12} className="opacity-50" />
                    {item.inqCnt}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => handleLike(e, String(item.pstId))}
                    className="font-bold text-[10px] text-muted-foreground bg-white px-2.5 py-1.5 rounded-lg flex items-center gap-1 border border-border shadow-sm hover:bg-primary hover:text-white hover:border-primary transition-all"
                    aria-label="좋아요"
                  >
                    <ThumbsUp size={12} className={cn("opacity-50", isLikePending && "animate-bounce")} />
                    <span>{item.likeCnt || 0}</span>
                  </motion.button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export const BoardSkeleton = ({ tmpltId }: { tmpltId: string }) => {
  if (tmpltId === 'TMPLT_HUB') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 p-10">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-6">
            <Skeleton className="aspect-video w-full rounded-3xl" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-3/4 rounded-xl" />
              <Skeleton className="h-4 w-full rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (tmpltId === 'TMPLT_QNA') {
    return (
      <div className="p-10 space-y-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-8 p-10 border-2 border-border rounded-[2.5rem]">
            <Skeleton className="w-20 h-16 rounded-2xl shrink-0" />
            <div className="space-y-4 flex-1">
              <Skeleton className="h-10 w-1/2 rounded-xl" />
              <Skeleton className="h-4 w-full rounded-lg" />
              <div className="flex gap-6">
                <Skeleton className="h-4 w-24 rounded-lg" />
                <Skeleton className="h-4 w-24 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="p-10 space-y-6">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
};
