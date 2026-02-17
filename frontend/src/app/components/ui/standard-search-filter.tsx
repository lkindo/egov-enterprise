'use client';

import React, { useState } from 'react';
import { Search, RotateCcw, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface FilterField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange';
  placeholder?: string;
  options?: { label: string; value: string }[];
}

interface StandardSearchFilterProps {
  fields: FilterField[];
  onSearch: (values: Record<string, any>) => void;
  onReset?: () => void;
  className?: string;
}

export function StandardSearchFilter({ fields, onSearch, onReset, className }: StandardSearchFilterProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [isExpanded, setIsExpanded] = useState(true);

  const handleValueChange = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(values);
  };

  const handleReset = () => {
    setValues({});
    onReset?.();
  };

  return (
    <div className={cn("p-6 border-2 border-primary/5 rounded-[1.5rem] bg-card shadow-sm mb-8 transition-all", className)}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black flex items-center gap-2 text-foreground/70 uppercase tracking-widest">
            <Search size={16} className="text-primary" />
            상세 검색 필터
          </h3>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-bold gap-1"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {isExpanded ? '접기' : '펴기'}
          </Button>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <label className="text-[11px] font-black text-muted-foreground/80 uppercase tracking-tighter ml-1">
                  {field.label}
                </label>
                
                {field.type === 'select' ? (
                  <Select 
                    value={values[field.name] || ''} 
                    onValueChange={(v) => handleValueChange(field.name, v)}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-primary/10 focus:ring-primary/20 transition-all">
                      <SelectValue placeholder={field.placeholder || "전체"} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'daterange' ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-11 justify-start text-left font-normal rounded-xl border-primary/10 transition-all",
                          !values[field.name] && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                        {values[field.name]?.from ? (
                          values[field.name].to ? (
                            <>
                              {format(values[field.name].from, "LLL dd", { locale: ko })} -{" "}
                              {format(values[field.name].to, "LLL dd", { locale: ko })}
                            </>
                          ) : (
                            format(values[field.name].from, "LLL dd", { locale: ko })
                          )
                        ) : (
                          <span>날짜 범위 선택</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={values[field.name]?.from}
                        selected={values[field.name]}
                        onSelect={(v) => handleValueChange(field.name, v)}
                        numberOfMonths={2}
                        locale={ko}
                      />
                    </PopoverContent>
                  </Popover>
                ) : field.type === 'date' ? (
                  <Input
                    type="date"
                    value={values[field.name] || ''}
                    onChange={(e) => handleValueChange(field.name, e.target.value)}
                    className="h-11 rounded-xl border-primary/10"
                  />
                ) : (
                  <Input
                    placeholder={field.placeholder}
                    value={values[field.name] || ''}
                    onChange={(e) => handleValueChange(field.name, e.target.value)}
                    className="h-11 rounded-xl border-primary/10 focus:ring-primary/20 transition-all"
                  />
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className="flex justify-end items-center gap-3 pt-2 border-t border-primary/5">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="rounded-xl h-11 px-6 font-bold gap-2 text-muted-foreground hover:text-foreground transition-all"
          >
            <RotateCcw size={16} />
            초기화
          </Button>
          <Button
            type="submit"
            className="rounded-xl h-11 px-8 font-black gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Search size={16} />
            조건 검색 실행
          </Button>
        </div>
      </form>
    </div>
  );
}
