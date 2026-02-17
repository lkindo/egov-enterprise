'use client';

import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Vacation } from '@/types/vacation';

interface VacationCalendarProps {
  vacations: Vacation[];
}

export function VacationCalendar({ vacations }: VacationCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // 날짜별 휴가 필터링
  const getVacationsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyyMMdd');
    return vacations.filter(v => dayStr >= v.bgnde && dayStr <= v.endde);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Y': return 'bg-green-500';
      case 'N': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="bg-card border rounded-[2rem] shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b bg-muted/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <CalendarIcon size={20} />
          </div>
          <h3 className="text-xl font-black tracking-tight">
            {format(currentMonth, 'yyyy년 MMMM', { locale: ko })}
          </h3>
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-accent rounded-full transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-1 text-xs font-bold border rounded-full hover:bg-accent transition-all">
            오늘
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-accent rounded-full transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 border-b bg-muted/5">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="py-3 text-center text-xs font-black text-muted-foreground uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 border-collapse">
        {days.map((day, idx) => {
          const dayVacations = getVacationsForDay(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          return (
            <div 
              key={idx} 
              className={cn(
                "min-h-[120px] p-2 border-r border-b group transition-colors hover:bg-accent/10",
                !isCurrentMonth && "bg-muted/10 opacity-40",
                (idx + 1) % 7 === 0 && "border-r-0"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "text-xs font-black w-6 h-6 flex items-center justify-center rounded-full transition-all",
                  isToday ? "bg-primary text-white shadow-lg" : "text-slate-500"
                )}>
                  {format(day, 'd')}
                </span>
                {dayVacations.length > 0 && isCurrentMonth && (
                  <span className="text-[10px] font-bold text-primary/60 bg-primary/5 px-2 rounded-full">
                    {dayVacations.length}건
                  </span>
                )}
              </div>
              
              <div className="space-y-1">
                {isCurrentMonth && dayVacations.map((v, vIdx) => (
                  <div 
                    key={vIdx} 
                    className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-md text-white truncate shadow-sm animate-in zoom-in-95",
                      getStatusColor(v.confmAt)
                    )}
                    title={`${v.vcatnSeNm || '휴가'}: ${v.vcatnResn}`}
                  >
                    {v.vcatnSeNm || '휴가'}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
