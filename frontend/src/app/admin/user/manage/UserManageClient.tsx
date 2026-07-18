'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users,  
 Search,  
 UserPlus,  
 Shield,  
 MoreHorizontal, 
 RefreshCw, 
 Database, 
 ArrowUpRight, 
 UserCheck, 
 UserX, 
 History, 
 Lock, 
 Zap, 
 LayoutGrid, 
 List, 
 ChevronRight, 
 Edit2, 
 Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
 Table, 
 TableBody, 
 TableCell, 
 TableHead, 
 TableHeader, 
 TableRow 
} from '@/components/ui/table';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { UserManage, UserSearchParams } from '@/types/foundation/user';
;
;
import { cn } from '@/lib/utils';

export default function UserManageClient() {
 const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
 const [searchParams, setSearchParams] = useState<UserSearchParams>({
 pageIndex: 1,
 size: 10,
 searchCondition: '1',
 searchKeyword: ''
 });

 const { data, isLoading, refetch } = useQuery({
 queryKey: ['users', searchParams],
 queryFn: () => userAdminService.getUserList(searchParams),
 });

 const users = data?.list || [];

  return (
    <div className="space-y-8">
      {/* 🔮 Top Command Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Users size={18} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">사용자 관리</h1>
          </div>
          <p className="text-muted-foreground font-bold text-sm tracking-tight pl-1">
            조직의 계정 권한 및 사용자 인벤토리를 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-muted p-1 rounded-lg border border-border/50">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn("h-8 rounded-lg px-3 font-bold text-[11px]", viewMode === 'table' && "bg-card shadow-sm text-primary")}
              onClick={() => setViewMode('table')}
            >
              <List size={14} className="mr-2" />
              리스트
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn("h-8 rounded-lg px-3 font-bold text-[11px]", viewMode === 'grid' && "bg-card shadow-sm text-primary")}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={14} className="mr-2" />
              그리드
            </Button>
          </div>
          <Button className="h-10 rounded-xl px-5 bg-surface-inverse hover:bg-black text-surface-inverse-foreground font-bold text-xs tracking-tight shadow-lg transition-all hover:scale-105 active:scale-95 group">
            <UserPlus size={16} className="mr-2 group-hover:rotate-12 transition-transform" />
            사용자 추가
          </Button>
        </div>
      </div>

 {/* 🧩 Bento Grid Layout */}
 <div className="grid grid-cols-12 gap-6">
 
 {/* 🛡️ Search & Filter Control (Bento Left) */}
 <div className="col-span-12 lg:col-span-4 space-y-6">
 <div className="hub-bento-card bg-surface-inverse border-none p-8 text-surface-inverse-foreground group relative overflow-hidden h-full flex flex-col justify-between">
 <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:opacity-20 transition-opacity">
 <Shield size={160} />
 </div>
 
 <div className="relative z-10 space-y-8">
 <div className="space-y-1">
 <Badge className="bg-primary/20 text-primary border-none rounded-lg text-xs font-bold tracking-widest px-3 mb-3">SEC_PROTOCOL_01</Badge>
 <h2 className="text-2xl font-bold tracking-tight leading-none uppercase">Security<br/>Core Protocol</h2>
 </div>

 <div className="space-y-4">
 <div className="relative group/input">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/input:text-primary transition-colors" size={18} />
 <Input 
 placeholder="아이덴티티 검색..." 
 className="bg-white/5 border-white/10 h-11 pl-12 rounded-lg text-lg font-bold placeholder:text-muted-foreground focus:ring-primary focus:border-primary transition-all"
 value={searchParams.searchKeyword}
 onChange={(e) => setSearchParams((prev: UserSearchParams) => ({ ...prev, searchKeyword: e.target.value }))}
 />
 </div>
 
 <div className="grid grid-cols-2 gap-3">
 <div className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group/opt">
 <p className="text-xs font-bold text-muted-foreground mb-2 group-hover/opt:text-primary tracking-widest">FILTER_BY</p>
 <div className="flex items-center justify-between font-bold text-xs">
 <span>상태</span>
 <ChevronRight size={12} className="opacity-40" />
 </div>
 </div>
 <div className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group/opt">
 <p className="text-xs font-bold text-muted-foreground mb-2 group-hover/opt:text-primary tracking-widest">SORT_BY</p>
 <div className="flex items-center justify-between font-bold text-xs">
 <span>최근 활동</span>
 <ChevronRight size={12} className="opacity-40" />
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="mt-10 pt-6 border-t border-white/10 relative z-10">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
 <span className="text-xs font-bold tracking-widest opacity-60">REAL-TIME SYNC ACTIVE</span>
 </div>
 <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-surface-inverse-foreground/40 hover:text-surface-inverse-foreground hover:bg-white/5 h-8 px-2">
 <RefreshCw size={14} className="mr-2" />
 <span className="text-xs font-bold">REFRESH</span>
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* 📊 Inventory & Data Grid (Bento Right) */}
 <div className="col-span-12 lg:col-span-8">
 <div className="hub-bento-card p-0 bg-card shadow-xl border-border/50 h-full flex flex-col">
 <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-muted/50">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-hub-indigo/10 flex items-center justify-center text-hub-indigo">
 <Database size={16} />
 </div>
 <h3 className="text-sm font-bold tracking-tighter uppercase text-muted-foreground">사용자 인벤토리</h3>
 </div>
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg">
 <span className="w-1.5 h-1.5 rounded-full bg-primary" />
 <span className="text-xs font-bold text-muted-foreground">전체 {data?.total || 0}</span>
 </div>
 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted">
 <MoreHorizontal size={14} />
 </Button>
 </div>
 </div>

 <div className="flex-1 overflow-hidden">
 <Table className="relative">
 <TableHeader>
 <TableRow className="hover:bg-transparent border-border">
 <TableHead className="w-[80px] py-6 text-xs font-bold text-muted-foreground uppercase text-center">Protocol</TableHead>
 <TableHead className="py-6 text-xs font-bold text-muted-foreground uppercase">Core Identity</TableHead>
 <TableHead className="py-6 text-xs font-bold text-muted-foreground uppercase">Clearance</TableHead>
 <TableHead className="py-6 text-xs font-bold text-muted-foreground uppercase">State</TableHead>
 <TableHead className="py-6 text-xs font-bold text-muted-foreground uppercase text-right">관리</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 [...Array(5)].map((_, i) => (
 <TableRow key={`skeleton-${i}`} className="animate-pulse">
 <TableCell colSpan={5} className="py-10">
 <div className="h-4 bg-muted rounded-lg w-full" />
 </TableCell>
 </TableRow>
 ))
 ) : users.length > 0 ? (
 users.map((user: UserManage, idx: number) => (
 <TableRow key={user.esntlId} className="group hover:bg-muted transition-colors border-border">
 <TableCell className="text-center font-mono text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">
 #{idx + 1 + ((searchParams.pageIndex || 1) - 1) * (searchParams.size || 10)}
 </TableCell>
 <TableCell className="py-5">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
 <UserCheck size={18} />
 </div>
 <div className="flex flex-col">
 <span className="font-bold text-foreground text-base tracking-tight leading-none mb-1">{user.userNm}</span>
 <span className="text-xs font-bold text-muted-foreground leading-none">{user.userId} • {user.emlAddr}</span>
 </div>
 </div>
 </TableCell>
 <TableCell>
 <div className="flex flex-col gap-1">
 <div className="flex items-center gap-2">
 <Shield size={10} className="text-muted-foreground" />
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Level_04</span>
 </div>
 <span className="text-xs font-bold text-muted-foreground ">Global Admin Access</span>
 </div>
 </TableCell>
 <TableCell>
 <Badge variant="outline" className="rounded-lg bg-emerald-500/10 text-emerald-600 border-none font-bold text-xs tracking-widest px-3 py-1">
 OPERATIONAL
 </Badge>
 </TableCell>
 <TableCell className="text-right">
 <div className="flex items-center justify-end gap-2">
 <Button size="icon" className="h-10 w-10 rounded-lg bg-muted border border-border text-muted-foreground hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all">
 <Edit2 size={16} />
 </Button>
 <Button size="icon" className="h-10 w-10 rounded-lg bg-muted border border-border text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
 <Trash2 size={16} />
 </Button>
 </div>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={5} className="py-32 text-center">
 <div className="flex flex-col items-center gap-4 opacity-20">
 <Zap size={64} className="animate-bounce" />
 <p className="text-2xl font-bold tracking-tighter uppercase">검색 결과가 없습니다</p>
 </div>
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 
 <div className="px-8 py-6 border-t border-border flex items-center justify-between bg-muted/50">
 <p className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Encryption Standard: AES-256-GCM</p>
 <div className="flex items-center gap-2">
 {[1, 2, 3].map(p => (
 <Button key={p} variant="outline" className={cn("w-8 h-8 p-0 rounded-lg font-bold text-xs", p === 1 && "bg-surface-inverse text-surface-inverse-foreground border-none shadow-lg")}>
 {p}
 </Button>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* 🚀 System Analytics Row (Bento Bottom) */}
 <div className="grid grid-cols-12 gap-6">
 <div className="col-span-12 md:col-span-4">
 <div className="hub-bento-card p-8 group hover:border-primary/50">
 <div className="flex items-center justify-between mb-6">
 <div className="w-12 h-12 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
 <UserX size={20} />
 </div>
 <ArrowUpRight size={16} className="text-slate-300 group-hover:text-primary transition-colors" />
 </div>
 <h4 className="text-base font-bold tracking-tight mb-1 uppercase">Dormant Streams</h4>
 <p className="text-xs font-bold text-muted-foreground leading-relaxed">
 최근 90일간 활동이 없는 12개의 아이덴티티가 발견되었습니다. 보안 프로토콜에 따른 정리가 권장됩니다.
 </p>
 </div>
 </div>
 <div className="col-span-12 md:col-span-4">
 <div className="hub-bento-card p-8 group hover:border-hub-indigo/50">
 <div className="flex items-center justify-between mb-6">
 <div className="w-12 h-12 rounded-lg bg-hub-indigo/10 flex items-center justify-center text-hub-indigo">
 <Lock size={20} />
 </div>
 <ArrowUpRight size={16} className="text-slate-300 group-hover:text-hub-indigo transition-colors" />
 </div>
 <h4 className="text-base font-bold tracking-tight mb-1 uppercase">Security Lockdowns</h4>
 <p className="text-xs font-bold text-muted-foreground leading-relaxed">
 비정상적 접근 시도로 인해 일시 격리된 3개의 계정이 존재합니다. 관리자 검토가 필요합니다.
 </p>
 </div>
 </div>
 <div className="col-span-12 md:col-span-4">
 <div className="hub-bento-card p-8 group hover:border-amber-500/50">
 <div className="flex items-center justify-between mb-6">
 <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
 <History size={20} />
 </div>
 <ArrowUpRight size={16} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
 </div>
 <h4 className="text-base font-bold tracking-tight mb-1 uppercase">Audit Trailing</h4>
 <p className="text-xs font-bold text-muted-foreground leading-relaxed">
 전체 시스템 무결성 검사가 완료되었습니다. 모든 아이덴티티 변경 사항이 중앙 감사 로그에 기록되었습니다.
 </p>
 </div>
 </div>
 </div>
 </div>
 );
}

