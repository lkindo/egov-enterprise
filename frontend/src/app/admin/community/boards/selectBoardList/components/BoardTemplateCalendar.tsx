'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { BoardPost } from '@/types/business/board';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface BoardTemplateCalendarProps {
  list: BoardPost[];
  bbsId: string;
  startDate?: Date;
  onDateChange: (date: Date) => void;
}

export const BoardTemplateCalendar = ({ list, bbsId, startDate, onDateChange }: BoardTemplateCalendarProps) => {
  const currentViewDate = startDate || new Date();
  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0: Sun, 6: Sat
  
  // 게시글을 날짜별로 그룹화
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
    <div className="p-10 space-y-8">
      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-8 rounded-lg text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 transition-colors">
        <div className="space-y-1">
          <p className="text-primary font-bold tracking-[0.2em] text-xs uppercase">Event schedule</p>
          <h3 className="text-3xl font-bold tracking-tighter uppercase">
            {format(currentViewDate, "MMMM yyyy", { locale: ko })}
          </h3>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => onDateChange(new Date(year, month - 1, 1))}
            className="h-12 w-12 border-slate-200 dark:border-white/20 bg-white/50 dark:bg-white/10 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 rounded-lg transition-all text-slate-900 dark:text-white"
            aria-label="이전 달"
          >
            <ChevronRight className="rotate-180" size={20} />
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onDateChange(new Date(year, month + 1, 1))}
            className="h-12 w-12 border-slate-200 dark:border-white/20 bg-white/50 dark:bg-white/10 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 rounded-lg transition-all text-slate-900 dark:text-white"
            aria-label="다음 달"
          >
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-4">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
          <div key={d} className="text-center font-bold text-slate-400 text-xs tracking-widest pb-4 border-b-2 border-slate-50">{d}</div>
        ))}
        {Array.from({ length: 42 }, (_, i) => i - firstDayOfMonth + 1).map((day, i) => {
          const isCurrentMonth = day > 0 && day <= daysInMonth;
          const dayPosts = isCurrentMonth ? postsByDay[day] || [] : [];
          const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

          return (
            <div key={i} className={cn(
              "min-h-[160px] p-4 border-2 transition-all relative group rounded-lg",
              isToday ? "bg-primary/5 border-primary/20 shadow-inner" : "bg-white border-slate-50 hover:border-slate-300",
              !isCurrentMonth ? "opacity-10 pointer-events-none bg-slate-50/50" : ""
            )}>
              <div className="flex justify-between items-start mb-4">
                <span className={cn(
                  "text-xl font-bold", 
                  isToday ? "text-primary" : "text-slate-300 group-hover:text-slate-900",
                  (i % 7 === 0) && isCurrentMonth ? "text-red-400" : "", // Sunday
                  (i % 7 === 6) && isCurrentMonth ? "text-blue-400" : "" // Saturday
                )}>
                  {isCurrentMonth ? day : ''}
                </span>
                {dayPosts.length > 0 && (
                  <Badge className="bg-primary hover:bg-primary text-xs font-bold h-5 w-5 rounded-lg p-0 flex items-center justify-center border-none">
                    {dayPosts.length}
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2 max-h-[100px] overflow-y-auto custom-scrollbar">
                {dayPosts.map((post) => (
                  <Link 
                    key={post.pstId}
                    href={`/admin/community/boards/detail?bbsId=${bbsId}&pstId=${post.pstId}`}
                    className={cn(
                      "block p-2 text-xs font-bold leading-tight rounded-sm shadow-sm transition-all hover:scale-105 cursor-pointer truncate",
                      (post as any).noticeYn === 'Y' ? "bg-rose-500 text-white" : "bg-slate-900 text-white"
                    )}
                    title={post.pstTtl}
                  >
                    {post.pstTtl}
                  </Link>
                ))}
              </div>

              {isCurrentMonth && (
                <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-100 group-hover:text-slate-200 transition-all uppercase">
                  {`${year}_${month + 1}_${day}`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
