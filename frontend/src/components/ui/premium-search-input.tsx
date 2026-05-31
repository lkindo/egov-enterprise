import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PremiumSearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  onSearch?: (value: string) => void;
}

export function PremiumSearchInput({
  placeholder = "자산 명칭 검색..",
  className,
  onSearch,
  ...props
}: PremiumSearchInputProps) {

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(e.currentTarget.value);
    }
    if (props.onKeyDown) props.onKeyDown(e);
  };

  return (
    <div className={cn("relative group transition-all", className)}>
      <Search
        className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-300"
        size={20}
      />
      <Input
        placeholder={placeholder}
        className={cn(
          "h-11 pl-14 pr-6 w-full rounded-lg border-2 border-border font-[number:var(--font-weight-hub-title)] text-xs tracking-tight focus:ring-4 focus:ring-primary/10 transition-all bg-background shadow-sm hover:border-primary/50",
          "placeholder:font-bold placeholder:text-muted-foreground/40",
          className
        )}
        onKeyDown={handleKeyDown}
        {...props}
      />
    </div>
  );
}

