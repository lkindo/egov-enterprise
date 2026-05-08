'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
 Users, 
 Search, 
 UserPlus, 
 Shield, 
 Activity, 
 MoreHorizontal, 
 Mail, 
 Calendar,
 Filter,
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
 Trash2
} from 'lucide-react';
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
import { PageResponse } from '@/types/foundation/system';
import { motion, AnimatePresence } from 'framer-motion';
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
 <div className="space-y-10">
 {/* 🔮 Top Command Bar */}
 <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
 <div className="space-y-2">
 <div className="flex items-center gap-3 mb-1">
 <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
 <Users size={20} />
 </div>
 <h1 className="text-4xl font-bold tracking-tighter text-slate-900 dark:text-white uppercase">Identity Stream</h1>
 </div>
 <p className="text-slate-500 font-bold text-sm tracking-tight pl-1">
 엔터프라이즈 계정 거버넌스 및 실시간 권한 매트릭스 관리
 </p>
 </div>

 <div className="flex items-center gap-3">
 <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200/50">
 <Button 
 variant="ghost" 
 size="sm" 
 className={cn("h-8 rounded-lg px-3", viewMode === 'table' && "bg-white dark:bg-slate-700 shadow-sm text-primary")}
 onClick={() => setViewMode('table')}
 >
 <List size={14} className="mr-2" />
 <span className="text-xs font-bold uppercase">테이블</span>
 </Button>
 <Button 
 variant="ghost" 
 size="sm" 
 className={cn("h-8 rounded-lg px-3", viewMode === 'grid' && "bg-white dark:bg-slate-700 shadow-sm text-primary")}
 onClick={() => setViewMode('grid')}
 >
 <LayoutGrid size={14} className="mr-2" />
 <span className="text-xs font-bold uppercase">그리드</span>
 </Button>
 </div>
 <Button className="h-12 rounded-lg px-6 bg-slate-900 hover:bg-black dark:bg-primary dark:hover:bg-primary/90 text-white font-bold text-xs tracking-widest uppercase shadow-xl transition-all hover:scale-105 active:scale-95 group">
 <UserPlus size={16} className="mr-2 group-hover:rotate-12 transition-transform" />
 신규 계정 생성
 </Button>
 </div>
 </div>

 {/* 🧩 Bento Grid Layout */}
 <div className="grid grid-cols-12 gap-6">
 
 {/* 🛡️ Search & Filter Control (Bento Left) */}
 <div className="col-span-12 lg:col-span-4 space-y-6">
 <div className="hub-bento-card bg-slate-900 border-none p-8 text-white group relative overflow-hidden h-full flex flex-col justify-between">
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
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-primary transition-colors" size={18} />
 <Input 
 placeholder="아이덴티티 검색..." 
 className="bg-white/5 border-white/10 h-11 pl-12 rounded-lg text-lg font-bold placeholder:text-slate-500 focus:ring-primary focus:border-primary transition-all"
 value={searchParams.searchKeyword}
 onChange={(e) => setSearchParams((prev: UserSearchParams) => ({ ...prev, searchKeyword: e.target.value }))}
 />
 </div>
 
 <div className="grid grid-cols-2 gap-3">
 <div className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group/opt">
 <p className="text-xs font-bold text-slate-500 mb-2 group-hover/opt:text-primary tracking-widest">FILTER_BY</p>
 <div className="flex items-center justify-between font-bold text-xs">
 <span>상태</span>
 <ChevronRight size={12} className="opacity-40" />
 </div>
 </div>
 <div className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group/opt">
 <p className="text-xs font-bold text-slate-500 mb-2 group-hover/opt:text-primary tracking-widest">SORT_BY</p>
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
 <div className="w-2 h-2 rounded-lg bg-emerald-500 animate-pulse" />
 <span className="text-xs font-bold tracking-widest opacity-60">REAL-TIME SYNC ACTIVE</span>
 </div>
 <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-white/40 hover:text-white hover:bg-white/5 h-8 px-2">
 <RefreshCw size={14} className="mr-2" />
 <span className="text-xs font-bold">REFRESH</span>
 </Button>
 </div>
 </div>
 </div>
 </div>

 {/* 📊 Inventory & Data Grid (Bento Right) */}
 <div className="col-span-12 lg:col-span-8">
 <div className="hub-bento-card p-0 bg-white dark:bg-slate-900 shadow-xl border-slate-200/50 h-full flex flex-col">
 <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
 <Database size={16} />
 </div>
 <h3 className="text-sm font-bold tracking-tighter uppercase text-slate-600 dark:text-slate-300">사용자 인벤토리</h3>
 </div>
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2 px-3 py-1 bg-slate-200/50 dark:bg-slate-800 rounded-lg">
 <span className="w-1.5 h-1.5 rounded-lg bg-primary" />
 <span className="text-xs font-bold text-slate-600 dark:text-slate-400">전체 {data?.total || 0}</span>
 </div>
 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800">
 <MoreHorizontal size={14} />
 </Button>
 </div>
 </div>

 <div className="flex-1 overflow-hidden">
 <Table className="relative">
 <TableHeader>
 <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
 <TableHead className="w-[80px] py-6 text-xs font-bold text-slate-400 uppercase text-center">Protocol</TableHead>
 <TableHead className="py-6 text-xs font-bold text-slate-400 uppercase">Core Identity</TableHead>
 <TableHead className="py-6 text-xs font-bold text-slate-400 uppercase">Clearance</TableHead>
 <TableHead className="py-6 text-xs font-bold text-slate-400 uppercase">State</TableHead>
 <TableHead className="py-6 text-xs font-bold text-slate-400 uppercase text-right">관리</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 [...Array(5)].map((_, i) => (
 <TableRow key={`skeleton-${i}`} className="animate-pulse">
 <TableCell colSpan={5} className="py-10">
 <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-full" />
 </TableCell>
 </TableRow>
 ))
 ) : users.length > 0 ? (
 users.map((user: UserManage, idx: number) => (
 <TableRow key={user.esntlId} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-slate-50 dark:border-slate-800">
 <TableCell className="text-center font-mono text-xs font-bold text-slate-400 group-hover:text-primary transition-colors">
 #{idx + 1 + ((searchParams.pageIndex || 1) - 1) * (searchParams.size || 10)}
 </TableCell>
 <TableCell className="py-5">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
 <UserCheck size={18} />
 </div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight leading-none mb-1">{user.userNm}</span>
 <span className="text-xs font-bold text-slate-400 leading-none">{user.userId} • {user.emailAdres}</span>
 </div>
 </div>
 </TableCell>
 <TableCell>
 <div className="flex flex-col gap-1">
 <div className="flex items-center gap-2">
 <Shield size={10} className="text-slate-400" />
 <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tighter">Level_04</span>
 </div>
 <span className="text-xs font-bold text-slate-400 ">Global Admin Access</span>
 </div>
 </TableCell>
 <TableCell>
 <Badge variant="outline" className="rounded-lg bg-emerald-500/10 text-emerald-600 border-none font-bold text-xs tracking-widest px-3 py-1">
 OPERATIONAL
 </Badge>
 </TableCell>
 <TableCell className="text-right">
 <div className="flex items-center justify-end gap-2">
 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-slate-900 hover:text-white dark:hover:bg-primary transition-all">
 <Edit2 size={16} />
 </Button>
 <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-rose-500 hover:text-white transition-all text-rose-500">
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
 
 <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
 <p className="text-xs font-bold text-slate-400 tracking-widest uppercase">Encryption Standard: AES-256-GCM</p>
 <div className="flex items-center gap-2">
 {[1, 2, 3].map(p => (
 <Button key={p} variant="outline" className={cn("w-8 h-8 p-0 rounded-lg font-bold text-xs", p === 1 && "bg-slate-900 text-white border-none shadow-lg")}>
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
 <p className="text-xs font-bold text-slate-500 leading-relaxed">
 최근 90일간 활동이 없는 12개의 아이덴티티가 발견되었습니다. 보안 프로토콜에 따른 정리가 권장됩니다.
 </p>
 </div>
 </div>
 <div className="col-span-12 md:col-span-4">
 <div className="hub-bento-card p-8 group hover:border-indigo-500/50">
 <div className="flex items-center justify-between mb-6">
 <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
 <Lock size={20} />
 </div>
 <ArrowUpRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
 </div>
 <h4 className="text-base font-bold tracking-tight mb-1 uppercase">Security Lockdowns</h4>
 <p className="text-xs font-bold text-slate-500 leading-relaxed">
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
 <p className="text-xs font-bold text-slate-500 leading-relaxed">
 전체 시스템 무결성 검사가 완료되었습니다. 모든 아이덴티티 변경 사항이 중앙 감사 로그에 기록되었습니다.
 </p>
 </div>
 </div>
 </div>
 </div>
 );
}

