'use client';

import * as React from 'react';
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Search,
  LayoutDashboard,
  ShieldCheck,
  Activity,
  Box,
  Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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

/**
 * 전역 커맨드 팔레트 (Ctrl+K / Cmd+K)
 * 메뉴 검색 및 퀵 액션을 지원합니다.
 */
export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

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
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="메뉴 검색 또는 명령어 입력..." />
      <CommandList>
        <CommandEmpty>결과가 없습니다.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem onSelect={() => runCommand(() => router.push('/admin'))}>
            <LayoutDashboard size={16} className="mr-2" />
            <span>대시보드</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/admin/user/manage'))}>
            <Users size={16} className="mr-2" />
            <span>사용자 관리</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/admin/security/authority'))}>
            <ShieldCheck size={16} className="mr-2" />
            <span>보안 정책 관리</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => window.print())}>
            <Calculator size={16} className="mr-2" />
            <span>현재 화면 인쇄</span>
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/admin/workspace/mypage'))}>
            <User size={16} className="mr-2" />
            <span>마이페이지</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/admin/system/programs'))}>
            <Settings size={16} className="mr-2" />
            <span>시스템 설정</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
