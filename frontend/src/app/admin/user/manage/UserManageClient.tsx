'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users,
 Search,
 UserPlus,
 Shield,
 MoreHorizontal,
 RefreshCw,
 Database,
 UserCheck,
 Zap,
 LayoutGrid,
 List,
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
import { ErrorStateDisplay } from '@/app/components/ui/status-displays';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

/** 계정 상태 코드(userSttsCd) → 표시 라벨. 종전에는 전 행이 'OPERATIONAL' 로 고정돼 있었다(감사 P1-5). */
const USER_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  P: { label: '정상', className: 'bg-emerald-500/10 text-emerald-600' },
  A: { label: '승인 대기', className: 'bg-amber-500/10 text-amber-700' },
  D: { label: '비활성', className: 'bg-muted text-muted-foreground' },
};

export default function UserManageClient() {
 const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
 const [keyword, setKeyword] = useState('');
 /** 타이핑마다 서버를 때리지 않도록 300ms 디바운스(감사 P1-8). */
 const debouncedKeyword = useDebouncedValue(keyword, 300);
 const [pageIndex, setPageIndex] = useState(1);

 const searchParams: UserSearchParams = {
   pageIndex,
   size: 10,
   searchCondition: '1',
   searchKeyword: debouncedKeyword,
 };

 const { data, isLoading, isError, error, refetch } = useQuery({
 queryKey: ['users', debouncedKeyword, pageIndex],
 queryFn: () => userAdminService.getUserList(searchParams),
 });

 const users = data?.list || [];
 const totalPage = data?.totalPage || 1;

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
          {/* 등록 폼이 이 화면에 배선돼 있지 않다. 눌리는 死버튼 대신 '준비 중'을 명시한다(감사 P1-6). */}
          <Button
            disabled
            title="준비 중"
            aria-disabled="true"
            className="h-10 rounded-xl px-5 bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-tight shadow-lg opacity-60 cursor-not-allowed group"
          >
            <UserPlus size={16} className="mr-2" />
            사용자 추가 (준비 중)
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
 placeholder="사용자명 또는 아이디 검색..."
 aria-label="사용자 검색"
 className="bg-white/5 border-white/10 h-11 pl-12 rounded-lg text-lg font-bold placeholder:text-muted-foreground focus:ring-primary focus:border-primary transition-all"
 value={keyword}
 // 검색 시 1페이지로 되돌린다 — 3페이지에서 검색하면 빈 화면이 되던 결함(감사 P1-8).
 onChange={(e) => { setKeyword(e.target.value); setPageIndex(1); }}
 />
 </div>
 {/* 종전의 FILTER_BY / SORT_BY 카드는 핸들러가 없는데 cursor-pointer 로 클릭 가능한 척했다 → 제거(감사 P1-6). */}
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
 {/* 종전의 ⋮ 더보기 버튼은 핸들러가 없는 死버튼이었다 → 실제 동작(새로고침)에 배선(감사 P1-6). */}
 <Button
 variant="ghost"
 size="icon"
 aria-label="사용자 목록 새로고침"
 onClick={() => refetch()}
 className="h-8 w-8 rounded-lg hover:bg-muted"
 >
 <MoreHorizontal size={14} />
 </Button>
 </div>
 </div>

 <div className="flex-1 overflow-hidden">
 <Table className="relative">
 <TableHeader>
 <TableRow className="hover:bg-transparent border-border">
 {/* 영문 조어 헤더(Protocol/Core Identity/Clearance/State)를 한글로 정정(감사 P2). */}
 <TableHead className="w-[80px] py-6 text-xs font-bold text-muted-foreground text-center">번호</TableHead>
 <TableHead className="py-6 text-xs font-bold text-muted-foreground">사용자 정보</TableHead>
 <TableHead className="py-6 text-xs font-bold text-muted-foreground">소속</TableHead>
 <TableHead className="py-6 text-xs font-bold text-muted-foreground">상태</TableHead>
 <TableHead className="py-6 text-xs font-bold text-muted-foreground text-right">관리</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isError ? (
 /* 조회 실패를 '검색 결과 없음'으로 위장하지 않는다(감사 P1-1). */
 <TableRow>
 <TableCell colSpan={5} className="py-16">
 <ErrorStateDisplay error={error} onRetry={() => refetch()} />
 </TableCell>
 </TableRow>
 ) : isLoading ? (
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
 #{idx + 1 + (pageIndex - 1) * 10}
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
 {/* 종전에는 전 행이 'Level_04 / Global Admin Access' 로 고정돼 실제 권한과 무관한
 거짓 정보를 보여줬다 → 실제 데이터(부서 ID)만 표시한다(감사 P1-5). */}
 <div className="flex items-center gap-2">
 <Shield size={10} className="text-muted-foreground" />
 <span className="text-xs font-bold text-muted-foreground tracking-tighter">{user.ognzId || '미지정'}</span>
 </div>
 </TableCell>
 <TableCell>
 {(() => {
 const status = USER_STATUS_LABELS[user.userSttsCd] ?? { label: user.userSttsCd || '-', className: 'bg-muted text-muted-foreground' };
 return (
 <Badge variant="outline" className={cn("rounded-lg border-none font-bold text-xs tracking-widest px-3 py-1", status.className)}>
 {status.label}
 </Badge>
 );
 })()}
 </TableCell>
 <TableCell className="text-right">
 {/* 편집·삭제 배선이 이 화면에 없다. 누르면 아무 일도 없는 死버튼 대신 '준비 중'으로 명시한다(감사 P1-6).
 아이콘 전용 버튼에는 대상명을 포함한 접근명을 부여한다(감사 P1-10). */}
 <div className="flex items-center justify-end gap-2">
 <Button
 size="icon"
 disabled
 aria-disabled="true"
 title="준비 중"
 aria-label={`${user.userNm} 수정 (준비 중)`}
 className="h-10 w-10 rounded-lg bg-muted border border-border text-muted-foreground opacity-50 cursor-not-allowed"
 >
 <Edit2 size={16} />
 </Button>
 <Button
 size="icon"
 disabled
 aria-disabled="true"
 title="준비 중"
 aria-label={`${user.userNm} 삭제 (준비 중)`}
 className="h-10 w-10 rounded-lg bg-muted border border-border text-rose-500 opacity-50 cursor-not-allowed"
 >
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
 
 {/* 종전 페이저는 항상 1·2·3 을 그리고 클릭해도 아무 일이 없었으며,
 좌측 문구('Encryption Standard: AES-256-GCM')도 근거 없는 고정 텍스트였다(감사 P1-5·P1-6). */}
 <div className="px-8 py-6 border-t border-border flex items-center justify-between bg-muted/50">
 <p className="text-xs font-bold text-muted-foreground tracking-widest">
 총 {data?.total || 0}건 · {pageIndex}/{totalPage} 페이지
 </p>
 <div className="flex items-center gap-2">
 {Array.from({ length: totalPage }, (_, i) => i + 1).slice(0, 10).map(p => (
 <Button
 key={p}
 variant="outline"
 aria-label={`${p}페이지로 이동`}
 aria-current={p === pageIndex ? 'page' : undefined}
 onClick={() => setPageIndex(p)}
 className={cn("w-8 h-8 p-0 rounded-lg font-bold text-xs", p === pageIndex && "bg-surface-inverse text-surface-inverse-foreground border-none shadow-lg")}
 >
 {p}
 </Button>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* 종전 하단 3카드(Dormant Streams/Security Lockdowns/Audit Trailing)는 12건·3건 같은
     수치와 "무결성 검사 완료" 문구가 어떤 조회 결과와도 연결돼 있지 않은 고정 텍스트였다 → 제거(감사 P1-5). */}
 </div>
 );
}

