'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  eachDayOfInterval,
  parse
} from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { StandardDatePicker } from '@/app/components/ui/standard-date-picker';
import { FormField } from '@/app/components/ui/standard-form';
import { useToast } from '@/app/components/ui/toast';
import { scheduleService } from '@/services/user/ScheduleService';
import { Schedule } from '@/types/schedule';

export default function SchedulePage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [formData, setFormData] = useState<Partial<Schedule>>({
    schdulNm: '',
    schdulCn: '',
    schdulSe: '2', // Default: Private
    schdulPlace: ''
  });

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const yearMonth = format(currentDate, 'yyyyMM');
      const res = (await scheduleService.getMonthlySchedule(yearMonth)) as any;
      setSchedules(res.schedules || []);
    } catch (error) {
      toast('일정을 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentDate, toast]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleSave = async () => {
    if (!formData.schdulNm?.trim() || !selectedDate) {
      toast('일정명과 날짜를 입력해 주세요.', 'error');
      return;
    }

    try {
      const dateStr = format(selectedDate, 'yyyyMMdd');
      const payload = {
        ...formData,
        schdulBgnde: dateStr + "0900", // Default 9 AM
        schdulEndde: dateStr + "1800", // Default 6 PM
      };

      const res = (await scheduleService.createSchedule(payload)) as any;
      if (res?.success) {
        toast('일정이 등록되었습니다.', 'success');
        setIsOpen(false);
        setFormData({ schdulNm: '', schdulCn: '', schdulSe: '2', schdulPlace: '' });
        loadSchedules();
      }
    } catch (error) {
      toast('등록 중 오류가 발생했습니다.', 'error');
    }
  };

  // Calendar Logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="일정 관리"
        breadcrumbs={[{ label: "업무지원" }, { label: "일정관리" }]}
        actions={
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={18} />
            일정 등록
          </button>
        }
      />

      {/* Calendar Controller */}
      <div className="flex items-center justify-between bg-card p-4 border rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black text-foreground min-w-[150px]">
            {format(currentDate, "yyyy년 MM월", { locale: ko })}
          </h2>
          <div className="flex items-center border rounded-lg bg-background overflow-hidden">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-accent border-r transition-colors"><ChevronLeft size={20} /></button>
            <button onClick={handleToday} className="px-4 py-2 text-xs font-bold hover:bg-accent transition-colors">오늘</button>
            <button onClick={handleNextMonth} className="p-2 hover:bg-accent border-l transition-colors"><ChevronRight size={20} /></button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" /> 부서</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500" /> 개인</div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b bg-muted/20">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
            <div key={day} className={cn(
              "px-4 py-3 text-center text-xs font-black uppercase tracking-widest",
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
            )}>
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 grid-rows-5 flex-1 min-h-[600px]">
          {calendarDays.map((day, i) => {
            const daySchedules = schedules.filter(s => {
              const sDate = parse(s.schdulBgnde.substring(0, 8), 'yyyyMMdd', new Date());
              return isSameDay(sDate, day);
            });

            return (
              <div
                key={day.toString()}
                className={cn(
                  "p-2 border-r border-b min-h-[120px] transition-colors relative group",
                  !isSameMonth(day, monthStart) ? "bg-muted/10" : "bg-card hover:bg-accent/20",
                  isSameDay(day, new Date()) && "bg-primary/5"
                )}
                onClick={() => {
                  setSelectedDate(day);
                  setIsOpen(true);
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full",
                    !isSameMonth(day, monthStart) ? "text-muted-foreground/40" :
                      isSameDay(day, new Date()) ? "bg-primary text-white" : "text-foreground",
                    day.getDay() === 0 && isSameMonth(day, monthStart) && "text-red-500"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {daySchedules.length > 3 && (
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      +{daySchedules.length - 3}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {daySchedules.slice(0, 3).map((s) => (
                    <div
                      key={s.schdulId}
                      className={cn(
                        "px-2 py-1 text-[10px] font-bold rounded shadow-sm truncate border-l-4",
                        s.schdulSe === '1' ? "bg-blue-50 text-blue-700 border-blue-500 dark:bg-blue-900/30" : "bg-orange-50 text-orange-700 border-orange-500 dark:bg-orange-900/30"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toast(`일정: ${s.schdulNm}`, 'info');
                      }}
                    >
                      {s.schdulNm}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 등록 모달 */}
      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title="일정 등록"
        footer={
          <>
            <button onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-lg font-bold hover:bg-accent">취소</button>
            <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary/90">저장</button>
          </>
        }
      >
        <div className="space-y-6">
          <FormField label="일정 제목" required>
            <input
              type="text"
              value={formData.schdulNm}
              onChange={(e) => setFormData({ ...formData, schdulNm: e.target.value })}
              placeholder="일정 제목을 입력하세요"
              className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="날짜" required>
              <StandardDatePicker date={selectedDate} onDateChange={setSelectedDate} />
            </FormField>
            <FormField label="일정 구분" required>
              <select
                value={formData.schdulSe}
                onChange={(e) => setFormData({ ...formData, schdulSe: e.target.value })}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none"
              >
                <option value="1">부서 일정</option>
                <option value="2">개인 일정</option>
              </select>
            </FormField>
          </div>

          <FormField label="장소">
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                value={formData.schdulPlace}
                onChange={(e) => setFormData({ ...formData, schdulPlace: e.target.value })}
                placeholder="장소를 입력하세요"
                className="w-full h-10 pl-10 pr-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </FormField>

          <FormField label="상세 내용">
            <textarea
              value={formData.schdulCn}
              onChange={(e) => setFormData({ ...formData, schdulCn: e.target.value })}
              className="w-full min-h-[100px] p-3 rounded-md border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </FormField>
        </div>
      </StandardModal>
    </div>
  );
}
