'use client';

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date';
  placeholder?: string;
  options?: { label: string; value: string }[];
}

interface StandardSearchFilterProps {
  fields: FilterField[];
  onSearch: (values: Record<string, string>) => void;
  onReset?: () => void;
  className?: string;
}

export function StandardSearchFilter({ fields, onSearch, onReset, className }: StandardSearchFilterProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const values: Record<string, string> = {};
    formData.forEach((value, key) => {
      values[key] = value.toString();
    });
    onSearch(values);
  };

  return (
    <div className={cn("p-5 border rounded-xl bg-muted/10 mb-6", className)}>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
        {fields.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground ml-1">
              {field.label}
            </label>
            {field.type === 'select' ? (
              <select
                name={field.name}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
              >
                {field.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === 'date' ? (
              <input
                name={field.name}
                type="date"
                className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none"
              />
            ) : (
              <input
                name={field.name}
                type="text"
                placeholder={field.placeholder}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none"
              />
            )}
          </div>
        ))}
        
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 h-10 bg-primary text-primary-foreground rounded-md text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Search size={16} />
            조회
          </button>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="w-10 h-10 border rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
