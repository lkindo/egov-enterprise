'날짜 선택';

import * as React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';

interface StandardDatePickerProps {
 date?: Date;
 onDateChange?: (date: Date | undefined) => void;
 placeholder?: string;
 className?: string;
}

export function StandardDatePicker({ date, onDateChange, placeholder, className }: StandardDatePickerProps) {
 const [isOpen, setIsOpen] = React.useState(false);

 return (
 <div className={cn("relative", className)}>
 <button
 type="button"
 onClick={() => setIsOpen(!isOpen)}
 className={cn(
 "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
 !date && "text-muted-foreground"
 )}
 >
 <div className="flex items-center gap-2">
 <CalendarIcon size={16} />
 {date ? format(date, 'yyyy-MM-dd') : <span>{placeholder || '?�짜 ?�택'}</span>}
 </div>
 </button>

 {isOpen && (
 <>
 <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
 <div className="absolute top-11 left-0 z-50 rounded-md border bg-popover p-3 text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
 <DayPicker
 mode="single"
 selected={date}
 onSelect={(d) => {
 onDateChange?.(d);
 setIsOpen(false);
 }}
 locale={ko}
 className="p-3"
 />
 </div>
 </>
 )}
 </div>
 );
}
