'use client';

import * as React from 'react';
import {
  Settings,
  User,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Printer,
  Moon,
  Sun,
  Monitor,
  LogOut,
  Search,
  Activity,
  Database,
  Lock,
  Globe
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <CommandDialog 
      open={open} 
      onOpenChange={setOpen}
      className="hub-glass-premium border-2 border-slate-100/50 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] sm:max-w-[600px] overflow-hidden"
    >
      <div className="relative">
        <CommandInput 
          placeholder="실행할 명령어나 메뉴를 입력하십시오..." 
          className="h-16 border-none bg-transparent font-bold text-base placeholder:text-slate-400 focus:ring-0"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
          <kbd className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded border bg-slate-50 px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>
      
      <CommandList className="max-h-[450px] scrollbar-hide pb-4">
        <CommandEmpty className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
            <Search size={20} className="opacity-20" />
          </div>
          <p className="text-[10px] font-black tracking-widest uppercase">_ NO_MATCHING_INTEL</p>
        </CommandEmpty>

        <CommandGroup heading={<span className="text-[9px] font-black tracking-[0.3em] uppercase opacity-40 ml-2 mb-2 block">Enterprise_Navigation</span>}>
          <CommandItem onSelect={() => runCommand(() => router.push('/admin'))} className="h-12 rounded-lg mx-2 my-1 cursor-pointer transition-all">
            <LayoutDashboard size={18} className="mr-3 text-primary" />
            <span className="font-bold">통합 대시보드</span>
            <CommandShortcut className="opacity-30">NAV_HOME</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/admin/user/manage'))} className="h-12 rounded-lg mx-2 my-1 cursor-pointer transition-all">
            <Users size={18} className="mr-3 text-primary" />
            <span className="font-bold">전사 사용자 관리</span>
            <CommandShortcut className="opacity-30">USER_MGMT</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/admin/security/authority'))} className="h-12 rounded-lg mx-2 my-1 cursor-pointer transition-all">
            <ShieldCheck size={18} className="mr-3 text-primary" />
            <span className="font-bold">보안 및 권한 정책</span>
            <CommandShortcut className="opacity-30">SEC_POLICY</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/admin/system/monitoring'))} className="h-12 rounded-lg mx-2 my-1 cursor-pointer transition-all">
            <Activity size={18} className="mr-3 text-primary" />
            <span className="font-bold">시스템 모니터링</span>
            <CommandShortcut className="opacity-30">SYS_MON</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-2 opacity-10" />

        <CommandGroup heading={<span className="text-[9px] font-black tracking-[0.3em] uppercase opacity-40 ml-2 mb-2 block">Intelligence_Assets</span>}>
          <CommandItem onSelect={() => runCommand(() => router.push('/admin/system/logs/system'))} className="h-12 rounded-lg mx-2 my-1 cursor-pointer transition-all">
            <Database size={18} className="mr-3 text-emerald-500" />
            <span className="font-bold">로그 분석 마스터</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/admin/operation/events'))} className="h-12 rounded-lg mx-2 my-1 cursor-pointer transition-all">
            <Globe size={18} className="mr-3 text-emerald-500" />
            <span className="font-bold">글로벌 운영 자산</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="my-2 opacity-10" />

        <CommandGroup heading={<span className="text-[9px] font-black tracking-[0.3em] uppercase opacity-40 ml-2 mb-2 block">System_Control</span>}>
          <CommandItem onSelect={() => runCommand(() => setTheme('light'))} className="h-12 rounded-lg mx-2 my-1 cursor-pointer transition-all">
            <Sun size={18} className="mr-3 text-amber-500" />
            <span className="font-bold">라이트 모드로 전환</span>
            {theme === 'light' && <div className="ml-auto w-1.5 h-1.5 bg-amber-500 rounded-full" />}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme('dark'))} className="h-12 rounded-lg mx-2 my-1 cursor-pointer transition-all">
            <Moon size={18} className="mr-3 text-slate-900 dark:text-slate-100" />
            <span className="font-bold">다크 모드로 전환</span>
            {theme === 'dark' && <div className="ml-auto w-1.5 h-1.5 bg-primary rounded-full" />}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => window.print())} className="h-12 rounded-lg mx-2 my-1 cursor-pointer transition-all">
            <Printer size={18} className="mr-3 text-slate-500" />
            <span className="font-bold">현재 화면 인쇄</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/logout'))} className="h-12 rounded-lg mx-2 my-1 cursor-pointer transition-all text-rose-500">
            <LogOut size={18} className="mr-3" />
            <span className="font-bold">시스템 안전 종료</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
      
      <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100/50 flex items-center justify-between">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <kbd className="h-5 px-1.5 rounded border bg-white text-[9px] font-black shadow-sm">↑↓</kbd>
            <span className="text-[9px] font-black text-muted-foreground tracking-tighter">NAVIGATE</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="h-5 px-1.5 rounded border bg-white text-[9px] font-black shadow-sm">ENTER</kbd>
            <span className="text-[9px] font-black text-muted-foreground tracking-tighter">SELECT</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="h-5 px-1.5 rounded border bg-white text-[9px] font-black shadow-sm">ESC</kbd>
            <span className="text-[9px] font-black text-muted-foreground tracking-tighter">CLOSE</span>
          </div>
        </div>
        <p className="text-[8px] font-black text-primary tracking-widest uppercase opacity-50">_ Enterprise_Command_v1.2</p>
      </div>
    </CommandDialog>
  );
}
