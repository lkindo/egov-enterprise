'use client';

import React, { useState, useMemo, useEffect, use, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, 
  Users, 
  Layers, 
  Search, 
  Plus, 
  Trash2, 
  File, 
  Save, 
  RefreshCcw, 
  CheckCircle2, 
  UserPlus, 
  Key, 
  Lock, 
  Fingerprint, 
  RotateCcw, 
  ArrowUpRight, 
  AlertTriangle, 
  Settings } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { SecurityMatrixVisualizer } from './components/SecurityMatrixVisualizer';
import { authorAdminService, AuthorInfo } from '@/services/foundation/system/AuthorAdminService';
import type { PageResponse } from '@/types/foundation/system';
import { userAuthorityAdminService, AuthorGroupProjection, UserAuthorityDto } from '@/services/foundation/system/UserAuthorityAdminService';
import { menuAdminService, Menu } from '@/services/foundation/system/MenuAdminService';
import { MenuByAuthority } from '@/types/foundation/security';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
;
;
import { Input } from '@/components/ui/input';
;
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';

import { AuthorForm, AuthorFormValues } from '@/components/admin/security/AuthorForm';
// --- Types ---
interface MenuNode extends Menu {
  children?: MenuNode[];
  isChecked?: boolean;
}

export default function SecurityHubClient({
  authoritiesPromise
}: {
  // Promise<any> 로 두면 authorities 가 any[] 가 되어 자식 컴포넌트와의 필드명 불일치를
  // tsc 가 잡지 못한다(매트릭스 헤더 공백·undefined 키 저장의 근본 원인이었다).
  authoritiesPromise: Promise<PageResponse<AuthorInfo>>
}) {
  const initialAuthorities = use(authoritiesPromise);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedAuthorCode, setSelectedAuthorCode] = useState<string>('');
  /**
   * 입력 컨트롤에는 원본을, 서버 요청/queryKey 에는 디바운스 값만 쓴다.
   * 종전에는 검색어가 queryKey 에 직접 들어가 타이핑 한 글자마다 요청이 나갔다.
   */
  const [userSearchInput, setUserSearchInput] = useState('');
  const [roleSearchInput, setRoleSearchInput] = useState('');
  const userSearchKeyword = useDebouncedValue(userSearchInput, 300);
  const roleSearchKeyword = useDebouncedValue(roleSearchInput, 300);

  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
  const [authorMode, setAuthorMode] = useState<'create' | 'edit'>('create');
  // 수정 모달이 편집 중인 역할. selectedAuthorCode(좌측 선택)와 독립이어야 한다.
  const [editingAuthor, setEditingAuthor] = useState<AuthorInfo | null>(null);
  
  const [tempUserMappings, setTempUserMappings] = useState<Set<string>>(new Set());
  const [tempMenuMappings, setTempMenuMappings] = useState<Set<number>>(new Set());

  // --- Matrix Mode States ---
  const [globalMappings, setGlobalMappings] = useState<Map<string, Set<number>>>(new Map());
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);

  /**
   * 뷰 전환(토폴로지/매트릭스)과 역할 페이지는 URL 파생값이다.
   * 공유·새로고침·뒤로가기에서 화면 상태가 복원되고, 사이드바 활성 표시도 유지된다.
   * (검색어는 URL 에 싣지 않는다 — 개인정보 노출 우려로 제품 보류 항목이다.)
   */
  const viewMode: 'TOPOLOGY' | 'MATRIX' = searchParams.get('view') === 'matrix' ? 'MATRIX' : 'TOPOLOGY';
  const rolePage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  const updateUrlState = (next: { view?: 'TOPOLOGY' | 'MATRIX'; page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.view !== undefined) {
      if (next.view === 'MATRIX') params.set('view', 'matrix');
      else params.delete('view');
    }
    if (next.page !== undefined) {
      if (next.page > 1) params.set('page', String(next.page));
      else params.delete('page');
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const setViewMode = (view: 'TOPOLOGY' | 'MATRIX') => updateUrlState({ view });
  const setRolePage = (page: number) => updateUrlState({ page });

  // --- Pagination States ---
  const [userPage, setUserPage] = useState(1);

  const { data: authorsData, isLoading: isAuthorsLoading, error: authorsError, refetch: refetchAuthors } = useQuery({
    queryKey: ['admin-authorities', roleSearchKeyword, rolePage],
    queryFn: () => authorAdminService.getAuthorList({ pageIndex: rolePage, searchKeyword: roleSearchKeyword }),
    initialData: (rolePage === 1 && !roleSearchKeyword) ? initialAuthorities : undefined
  });
  const authorities = authorsData?.list || [];

  const { data: usersData, isLoading: isUsersLoading, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-user-authorities', selectedAuthorCode, userSearchKeyword, userPage],
    queryFn: () => userAuthorityAdminService.getUserAuthorityList({
      searchKeyword: userSearchKeyword,
      searchCondition: '1',
      authorCode: selectedAuthorCode,
      page: userPage
    }),
    enabled: !!selectedAuthorCode
  });
  const users = usersData?.list || [];

  const { data: menusData, isLoading: isMenusLoading, error: menusError, refetch: refetchMenus } = useQuery({
    queryKey: ['admin-author-menus', selectedAuthorCode],
    queryFn: async () => {
      const allMenus = await menuAdminService.getAllMenus();
      const authorMenus = await authorAdminService.getAuthorMenus(selectedAuthorCode);
      return { allMenus, authorMenus };
    },
    enabled: !!selectedAuthorCode
  });

  useEffect(() => {
    if (usersData?.list) {
      const list = Array.isArray(usersData.list) ? usersData.list : [];
      const registeredUsers = list.filter(u => u?.regYn === 'Y').map(u => u?.scrtyDcsnTrgtId);
      setTempUserMappings(new Set(registeredUsers));
    }
  }, [usersData, selectedAuthorCode]);

  useEffect(() => {
    if (menusData?.authorMenus) {
      const menus = Array.isArray(menusData.authorMenus) ? menusData.authorMenus : [];
      const mappedMenuIds = (menus as MenuByAuthority[]).map(m => m.menuNo);
      setTempMenuMappings(new Set(mappedMenuIds));
    }
  }, [menusData, selectedAuthorCode]);

  const menuTree = useMemo(() => {
    if (!menusData?.allMenus) return [];

    const map = new Map<number, MenuNode>();
    const roots: MenuNode[] = [];

    menusData.allMenus.forEach(m => {
      map.set(m.menuNo, { ...m, children: [], isChecked: tempMenuMappings.has(m.menuNo) });
    });

    map.forEach(node => {
      if (node.upMenuSn === 0 || !map.has(node.upMenuSn)) {
        roots.push(node);
      } else {
        const parent = map.get(node.upMenuSn);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      }
    });

    return roots;
  }, [menusData, tempMenuMappings]);

  const onAuthorSubmit = async (values: AuthorFormValues) => {
    try {
      if (authorMode === 'create') {
        await authorAdminService.createAuthor(values as AuthorInfo);
        toast('보안 권한 아키텍처가 성공적으로 반영되었습니다.', 'success');
      } else {
        await authorAdminService.updateAuthor(values.authrtCd, values as AuthorInfo);
        toast('보안 권한 아키텍처가 성공적으로 수정되었습니다.', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-authorities'] });
      setIsAuthorModalOpen(false);
    } catch (error) {
      toast('저장 중 오류가 발생했습니다. 입력을 확인해주세요.', 'error');
    }
  };

  /**
   * 현재 페이지에서 서버가 '부여됨'으로 내려준 사용자 목록.
   * 회수(delete) 대상 계산의 기준선이며, 페이지 단위로만 판단해 다른 페이지의 할당은 건드리지 않는다.
   */
  const grantedUserIdsOnPage = useMemo(
    () => users.filter(u => u?.regYn === 'Y').map(u => u.scrtyDcsnTrgtId),
    [users]
  );

  /** 체크 해제된 기존 부여자 = 회수 대상. */
  const revokeTargets = useMemo(
    () => grantedUserIdsOnPage.filter(id => !tempUserMappings.has(id)),
    [grantedUserIdsOnPage, tempUserMappings]
  );

  const saveUserMappingMutation = useMutation({
    mutationFn: async () => {
      const mappings: UserAuthorityDto[] = Array.from(tempUserMappings).map(uid => ({
        scrtyDcsnTrgtId: uid,
        authrtId: selectedAuthorCode,
        mbrTypeCd: users.find(u => u.scrtyDcsnTrgtId === uid)?.mbrTypeCd || 'USR'
      }));

      // 저장 API 는 업서트 전용이라, 체크를 해제해도 기존 행이 남아 권한이 회수되지 않았다.
      // (성공 토스트 후 invalidate 하면 서버 상태가 다시 체크된 채 돌아오던 원인)
      // tb_user_authrt_map 의 PK 는 scrty_dcsn_trgt_id 단일이므로 삭제 = 그 사용자의 권한 할당 해제다.
      await Promise.all([
        ...(mappings.length > 0 ? [userAuthorityAdminService.saveUserAuthorities(mappings)] : []),
        ...(revokeTargets.length > 0 ? [userAuthorityAdminService.deleteUserAuthorities(revokeTargets)] : []),
      ]);
      return { granted: mappings.length, revoked: revokeTargets.length };
    },
    onSuccess: ({ revoked }) => {
      toast(
        revoked > 0
          ? `사용자 권한 할당이 반영되었습니다. (회수 ${revoked}건 포함)`
          : '사용자 권한 할당이 반영되었습니다.',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['admin-user-authorities', selectedAuthorCode] });
    },
    onError: () => {
      toast('권한 할당 저장에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      // 실패 시 화면이 저장된 것처럼 남지 않도록 서버 상태로 되돌린다.
      queryClient.invalidateQueries({ queryKey: ['admin-user-authorities', selectedAuthorCode] });
    }
  });

  /** 회수가 포함되면 확인을 받는다(권한 회수는 되돌리기 어려운 파괴적 변경이다). */
  const handleSaveUserMapping = async () => {
    if (revokeTargets.length > 0) {
      const ok = await confirm({
        title: '권한 회수 확인',
        message: `${revokeTargets.length}명의 '${selectedAuthorCode}' 권한이 회수됩니다. 계속하시겠습니까?`,
        confirmText: '회수하고 저장',
        variant: 'destructive',
      });
      if (!ok) return;
    }
    saveUserMappingMutation.mutate();
  };

  const saveMenuMappingMutation = useMutation({
    mutationFn: () => menuAdminService.saveMenuCreation(selectedAuthorCode, Array.from(tempMenuMappings)),
    onSuccess: () => {
      toast('메뉴 접근 권한이 업데이트되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-author-menus', selectedAuthorCode] });
    },
    // onError 가 없으면 저장 실패가 무음으로 지나가고 화면은 반영된 것처럼 남는다.
    onError: () => {
      toast('메뉴 접근 권한 저장에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      queryClient.invalidateQueries({ queryKey: ['admin-author-menus', selectedAuthorCode] });
    }
  });

  const loadGlobalMappings = async () => {
    if (!authorities.length) return;
    setIsGlobalLoading(true);
    try {
      const allMappings = new Map<string, Set<number>>();
      const promises = authorities.map(async (auth) => {
        const menus = await authorAdminService.getAuthorMenus(auth.authrtCd);
        const menuList = Array.isArray(menus) ? menus : [];
        allMappings.set(auth.authrtCd, new Set(menuList.map(m => m.menuNo)));
      });
      await Promise.all(promises);
      setGlobalMappings(allMappings);
    } catch (e) {
      toast('글로벌 매트릭스 데이터 로드 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsGlobalLoading(false);
    }
  };

  /**
   * 매트릭스 뷰는 버튼 클릭뿐 아니라 `?view=matrix` 딥링크로도 진입한다.
   * 로드 트리거를 클릭 핸들러가 아니라 뷰 상태에 결속해야 두 경로가 모두 동작한다.
   */
  useEffect(() => {
    if (viewMode !== 'MATRIX') return;
    if (globalMappings.size > 0 || isGlobalLoading) return;
    if (!authorities.length) return;
    loadGlobalMappings();
    // loadGlobalMappings 는 매 렌더 재생성되므로 의존성에 넣지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, authorities.length]);

  const handleToggleGlobal = (authorCode: string, menuNo: number) => {
    setGlobalMappings(prev => {
      const next = new Map(prev);
      const set = new Set(next.get(authorCode) || []);
      if (set.has(menuNo)) set.delete(menuNo);
      else set.add(menuNo);
      next.set(authorCode, set);

      if (authorCode === selectedAuthorCode) {
        setTempMenuMappings(set);
      }
      return next;
    });
  };

  const handleSaveGlobal = async () => {
    setIsGlobalLoading(true);
    try {
      const promises = Array.from(globalMappings.entries()).map(([code, set]) =>
        menuAdminService.saveMenuCreation(code, Array.from(set))
      );
      await Promise.all(promises);
      toast('글로벌 보안 정책이 전사적으로 동기화되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-author-menus'] });
    } catch (e) {
      toast('글로벌 정책 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsGlobalLoading(false);
    }
  };

  const handleRoleSelect = (code: string) => {
    setSelectedAuthorCode(code);
  };

  const toggleUserMapping = (scrtyDcsnTrgtId: string) => {
    setTempUserMappings(prev => {
      const next = new Set(prev);
      if (next.has(scrtyDcsnTrgtId)) next.delete(scrtyDcsnTrgtId);
      else next.add(scrtyDcsnTrgtId);
      return next;
    });
  };

  const toggleMenuMapping = (menuNo: number, checked: boolean) => {
    setTempMenuMappings(prev => {
      const next = new Set(prev);
      if (checked) next.add(menuNo);
      else next.delete(menuNo);
      return next;
    });
  };

  const handleOpenAuthorCreate = () => {
    setEditingAuthor(null);
    setAuthorMode('create');
    setIsAuthorModalOpen(true);
  };

  /**
   * 수정 대상은 반드시 클릭한 행(auth)이다.
   * 종전에는 인자를 무시하고 좌측에서 '선택된' 역할(selectedAuthorCode)로 폼을 채워,
   * B 역할의 톱니를 눌러 저장하면 A 역할이 덮어써지는 사고가 났다.
   */
  const handleOpenAuthorEdit = (auth: AuthorInfo) => {
    setEditingAuthor(auth);
    setAuthorMode('edit');
    setIsAuthorModalOpen(true);
  };

  const handleAuthorDelete = async (auth: AuthorInfo) => {
    const code = auth.authrtCd;
    const ok = await confirm({
      title: '권한 삭제',
      message: `'${auth.authrtNm || code}'(${code}) 권한을 삭제하시겠습니까? 관련 할당 정보가 모두 사라집니다.`,
      confirmText: '삭제',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await authorAdminService.deleteAuthor(code);
      toast('권한이 삭제되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-authorities'] });
      if (selectedAuthorCode === code) setSelectedAuthorCode('');
    } catch (e) {
      toast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  const roleColumns: Column<AuthorInfo>[] = [
    {
      header: '역할',
      accessor: (auth) => (
        <div className="flex items-center justify-between w-full group/role-item py-1">
          <div className="flex flex-col gap-1">
            <span className={cn("text-sm font-bold tracking-tighter truncate leading-none", selectedAuthorCode === auth.authrtCd ? "text-surface-inverse-foreground" : "text-foreground")}>
              {auth.authrtNm}
            </span>
            <span className={cn("text-xs font-bold tracking-tight ", selectedAuthorCode === auth.authrtCd ? "text-surface-inverse-foreground/30" : "text-muted-foreground")}>
              {auth.authrtCd}
            </span>
          </div>
          <div className={cn("flex gap-1", selectedAuthorCode === auth.authrtCd ? "opacity-100" : "opacity-0 group-hover/role-item:opacity-100 transition-opacity")}>
            <button
              type="button"
              aria-label={`${auth.authrtNm || auth.authrtCd} 역할 수정`}
              onClick={(e) => { e.stopPropagation(); handleOpenAuthorEdit(auth); }}
              className="p-2 hover:bg-white/10 rounded-lg transition-all"
            >
              <Settings size={12} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`${auth.authrtNm || auth.authrtCd} 역할 삭제`}
              onClick={(e) => { e.stopPropagation(); handleAuthorDelete(auth); }}
              className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all"
            >
              <Trash2 size={12} aria-hidden="true" />
            </button>
          </div>
        </div>
      )
    }
  ];

  const userColumns: Column<AuthorGroupProjection>[] = [
    {
      header: '사용자',
      accessor: (user) => (
        <div className="flex items-center justify-between w-full py-1">
          <div className="flex items-center gap-4 relative z-10">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
              tempUserMappings.has(user.scrtyDcsnTrgtId) ? "bg-white/20" : "bg-muted group-hover:bg-surface-inverse group-hover:text-surface-inverse-foreground"
            )}>
              <Fingerprint size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight">{user.userNm}</span>
              <span className={cn("text-xs font-bold tracking-tight opacity-40", tempUserMappings.has(user.scrtyDcsnTrgtId) ? "text-surface-inverse-foreground" : "text-muted-foreground")}>{user.userId}</span>
            </div>
          </div>
          {tempUserMappings.has(user.scrtyDcsnTrgtId) ? (
            <CheckCircle2 size={20} className="text-surface-inverse-foreground relative z-10" />
          ) : (
            <UserPlus size={16} className="text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      )
    }
  ];

  const renderMenuTreeNodes = (nodes: MenuNode[], depth = 0) => {
    return nodes.map((node, idx) => (
      <motion.div
        key={node.menuNo}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.02 }}
        className="space-y-1"
      >
        <button
          type="button"
          aria-pressed={tempMenuMappings.has(node.menuNo)}
          aria-label={`${node.menuNm} 메뉴 접근 권한 ${tempMenuMappings.has(node.menuNo) ? '해제' : '부여'}`}
          className={cn(
            "w-full text-left group flex items-center gap-4 py-3 px-6 rounded-lg transition-all cursor-pointer relative overflow-hidden group active:scale-[0.99]",
            tempMenuMappings.has(node.menuNo) ? "bg-surface-inverse border-none shadow-xl text-surface-inverse-foreground" : "hover:bg-muted border border-transparent"
          )}
          style={{ marginLeft: `${depth * 24}px` }}
          onClick={() => toggleMenuMapping(node.menuNo, !tempMenuMappings.has(node.menuNo))}
        >
          <div className={cn(
            "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
            tempMenuMappings.has(node.menuNo) ? "bg-primary border-primary scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "border-border bg-card"
          )}>
            {tempMenuMappings.has(node.menuNo) && <ShieldCheck size={12} className="text-white" />}
          </div>

          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
            node.children && node.children.length > 0 ? "text-amber-500 bg-amber-50 group-hover:bg-amber-500 group-hover:text-white" : "text-muted-foreground bg-muted group-hover:bg-surface-inverse group-hover:text-surface-inverse-foreground"
          )}>
            {node.children && node.children.length > 0 ? <ShieldCheck size={14} /> : <File size={14} />}
          </div>

          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span className={cn(
              "text-xs font-bold tracking-tight truncate",
              tempMenuMappings.has(node.menuNo) ? "text-surface-inverse-foreground" : "text-muted-foreground"
            )}>
              {node.menuNm}
            </span>
            <span className={cn(
              "text-xs font-bold tracking-tight opacity-40 truncate",
              tempMenuMappings.has(node.menuNo) ? "text-surface-inverse-foreground/40" : "text-muted-foreground"
            )}>
              NODE_{node.menuNo}
            </span>
          </div>

          <div className={cn(
            "hidden md:block px-2 py-0.5 rounded bg-white/10 border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity",
            tempMenuMappings.has(node.menuNo) ? "text-surface-inverse-foreground" : "text-muted-foreground"
          )}>
            <ArrowUpRight size={10} />
          </div>
        </button>
        {node.children && renderMenuTreeNodes(node.children, depth + 1)}
      </motion.div>
    ));
  };

  return (
    <TooltipProvider delayDuration={0}>
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="통합 보안 거버넌스 허브"
        breadcrumbs={[{ label: '보안 관리' }, { label: '권한 설정' }, { label: '통합 컨트롤' }]}
      />

      <HubHeader
        title="Security"
        highlight="Fabric"
        subtitle="시스템 전반 보안 역할(Role), 사용자 할당 매트릭스 및 계층적 접근 제어 정책 통합 아키텍처"
        icon={Lock}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <div role="tablist" aria-label="보안 허브 보기 전환" className="flex items-center gap-1 bg-muted p-1 rounded-lg mr-4 border-2 border-border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    role="tab"
                    id="security-tab-topology"
                    aria-selected={viewMode === 'TOPOLOGY'}
                    aria-controls="security-panel-topology"
                    variant="ghost"
                    onClick={() => startTransition(() => setViewMode('TOPOLOGY'))}
                    className={cn(
                      "h-10 px-6 rounded-lg text-xs font-bold tracking-tight transition-all",
                      viewMode === 'TOPOLOGY' ? "bg-surface-inverse text-surface-inverse-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    계층 토폴로지
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-tight">
                  보안 객체 간의 계층적 관계 시각화
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    role="tab"
                    id="security-tab-matrix"
                    aria-selected={viewMode === 'MATRIX'}
                    aria-controls="security-panel-matrix"
                    variant="ghost"
                    onClick={() => startTransition(() => setViewMode('MATRIX'))}
                    className={cn(
                      "h-10 px-6 rounded-lg text-xs font-bold tracking-tight transition-all",
                      viewMode === 'MATRIX' ? "bg-surface-inverse text-surface-inverse-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    권한 매트릭스
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-tight">
                  전사적 권한 할당 현황 일괄 검토 및 수정
                </TooltipContent>
              </Tooltip>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label="보안 정책 정보 새로고침"
                  onClick={() => {
                    // 무인자 invalidateQueries 는 메뉴·알림 등 무관한 쿼리까지 전역 재요청한다.
                    queryClient.invalidateQueries({ queryKey: ['admin-authorities'] });
                    queryClient.invalidateQueries({ queryKey: ['admin-user-authorities'] });
                    queryClient.invalidateQueries({ queryKey: ['admin-author-menus'] });
                  }}
                  className="h-11 w-14 rounded-lg bg-card border-2 border-border text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95 px-4"
                >
                  <RefreshCcw size={22} aria-hidden="true" className="group-hover:rotate-180 transition-transform duration-700" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-tight">
                서버로부터 최신 정책 정보 로드
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleOpenAuthorCreate}
                  className="h-11 px-10 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-xs tracking-tight shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
                >
                  <Plus size={20} className="group-hover:scale-110 transition-transform duration-500" /> 신규 보안 아키텍처 설정
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-tight">
                새로운 역할 또는 보안 그룹 정의
              </TooltipContent>
            </Tooltip>
          </div>
        }
      />

      {/*
        지표는 서버가 실제로 내려준 값만 노출한다.
        - 'ACTIVE_SESSIONS = PROBING…(ONLINE)' 은 세션을 조회하는 경로가 없는 고정 문자열이라 삭제했다.
        - 'IDENTITY_POOL' 은 현재 페이지 배열 길이를 전체 풀처럼 표기했으므로 서버 total 로 교체했다.
      */}
      <HubMetricGrid>
        <HubMetricCard title="보안 역할" value={authorsData?.total ?? authorities.length} icon={Key} color="indigo" status="서버 집계" />
        <HubMetricCard title="선택 역할의 접근 노드" value={tempMenuMappings.size} icon={Layers} color="primary" status={selectedAuthorCode || '역할 미선택'} />
        <HubMetricCard title="선택 역할의 대상 사용자" value={selectedAuthorCode ? (usersData?.total ?? 0) : 0} icon={Fingerprint} color="amber" status={selectedAuthorCode ? '서버 집계' : '역할 미선택'} />
      </HubMetricGrid>

      <AnimatePresence mode="wait">
        {viewMode === 'MATRIX' ? (
          <motion.div
            key="matrix-view"
            role="tabpanel"
            id="security-panel-matrix"
            aria-labelledby="security-tab-matrix"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5 }}
          >
            <SecurityMatrixVisualizer
              authors={authorities}
              menus={menusData?.allMenus || []}
              mappings={globalMappings}
              onToggle={handleToggleGlobal}
              onSave={handleSaveGlobal}
              isSaving={isGlobalLoading}
            />
          </motion.div>
        ) : (
          <motion.div
            key="topology-view"
            role="tabpanel"
            id="security-panel-topology"
            aria-labelledby="security-tab-topology"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-12 gap-12 min-h-[850px]"
          >

            <div className="col-span-12 lg:col-span-3 space-y-8 h-full">
              <HubSectionCard title="역할 인벤토리" description="시스템 접근 권한을 정의하는 보안 프로파일 리스트입니다." icon={Lock}>
                <div className="space-y-8 pt-4">
                  {/* 검색어 변경 시 항상 1페이지로 되돌린다 — 3페이지에서 검색하면 빈 화면이 되는 결함 방지. */}
                  <div className="relative group/search">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={16} />
                    <Input
                      aria-label="역할 검색(ID, 명칭)"
                      className="pl-12 h-11 bg-muted/50 border-none rounded-lg text-sm font-bold tracking-tight shadow-inner"
                      placeholder="역할 검색(ID, 명칭)..."
                      value={roleSearchInput}
                      onChange={(e) => { setRoleSearchInput(e.target.value); setRolePage(1); }}
                    />
                  </div>

                  <div className="max-h-[650px] overflow-y-auto pr-2 custom-scrollbar">
                    <StandardDataTable<AuthorInfo>
                      columns={roleColumns}
                      data={authorities}
                      loading={isAuthorsLoading}
                      error={authorsError as Error | null}
                      onRetry={() => refetchAuthors()}
                      onRowClick={(item) => handleRoleSelect((item as AuthorInfo).authrtCd)}
                      keyField="authrtCd"
                      isPremium={false}
                      className="border-none bg-transparent"
                      pagination={{
                        currentPage: rolePage,
                        totalPages: authorsData?.totalPage || 1,
                        onPageChange: (p) => setRolePage(p)
                      }}
                    />
                  </div>
                </div>
              </HubSectionCard>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-8 h-full">
              <HubSectionCard
                title="사용자 할당"
                description="선택한 역할에 할당된 개별 식별자들의 실시간 할당 상태입니다."
                icon={Users}
                action={
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={handleSaveUserMapping}
                        disabled={!selectedAuthorCode}
                        className="h-10 px-6 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-tight hover:bg-primary transition-all shadow-xl disabled:opacity-10 gap-2"
                      >
                        <Save size={14} aria-hidden="true" /> 사용자 할당 저장
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-tight">
                      수정된 사용자 매핑 정보를 DB에 최종 반영
                    </TooltipContent>
                  </Tooltip>
                }
              >
                <div className="relative h-full flex flex-col pt-4">
                  <div className="relative group/search mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={16} />
                    <Input
                      aria-label="사용자 검색(ID, 성명)"
                      className="pl-12 h-11 bg-muted/50 border-none rounded-lg text-sm font-bold tracking-tight shadow-inner"
                      placeholder="사용자 검색(ID, 성명)..."
                      value={userSearchInput}
                      onChange={(e) => { setUserSearchInput(e.target.value); setUserPage(1); }}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[500px]">
                    <AnimatePresence mode="wait">
                      {!selectedAuthorCode ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center p-20 text-center space-y-6">
                          <div className="w-20 h-11 rounded-lg bg-muted flex items-center justify-center text-slate-200">
                            <Users size={40} className="opacity-20" aria-hidden="true" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xl font-bold text-muted-foreground tracking-tighter">역할을 선택하세요</h4>
                            <p className="text-xs font-bold text-slate-200 tracking-tight leading-relaxed">보안 역할을 선택하여 식별자 프로브를 활성화하십시오</p>
                          </div>
                        </motion.div>
                      ) : (
                        <StandardDataTable<AuthorGroupProjection>
                          columns={userColumns}
                          data={users as AuthorGroupProjection[]}
                          loading={isUsersLoading}
                          error={usersError as Error | null}
                          onRetry={() => refetchUsers()}
                          onRowClick={(item) => toggleUserMapping((item as AuthorGroupProjection).scrtyDcsnTrgtId)}
                          keyField="scrtyDcsnTrgtId"
                          isPremium={false}
                          className="border-none bg-transparent"
                          pagination={{
                            currentPage: userPage,
                            totalPages: usersData?.totalPage || 1,
                            onPageChange: (p) => setUserPage(p)
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </HubSectionCard>
            </div>

            <div className="col-span-12 lg:col-span-5 h-full">
              <HubSectionCard
                title="접근 정책 토폴로지"
                description="역할별 동적 메뉴 노드 계층 및 아키텍처 접근 수준 설정입니다."
                icon={Layers}
                action={
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => saveMenuMappingMutation.mutate()}
                        disabled={!selectedAuthorCode}
                        className="h-10 px-6 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-tight hover:bg-primary transition-all shadow-xl disabled:opacity-10 gap-2"
                      >
                        <RefreshCcw size={14} aria-hidden="true" /> 메뉴 권한 저장
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-tight">
                      현재 노드 구조를 보안 정책에 동기화
                    </TooltipContent>
                  </Tooltip>
                }
              >
                <div className="relative h-full flex flex-col pt-4">
                  <div className="flex items-center gap-4 bg-surface-inverse rounded-lg p-8 mb-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 transition-transform group-hover:rotate-6">
                      <ShieldCheck size={120} className="text-primary" />
                    </div>
                    <div className="w-14 h-11 bg-white/10 rounded-lg flex items-center justify-center border border-white/5 relative z-10">
                      <ShieldCheck size={28} className="text-primary" />
                    </div>
                    <div className="relative z-10 space-y-1">
                      <span className="text-xs font-bold text-surface-inverse-foreground/30 tracking-tight">Policy_Manifest</span>
                      <div className="text-surface-inverse-foreground text-lg font-bold tracking-tighter leading-none">
                        {tempMenuMappings.size} 개의 활성 노드가 <span className="text-primary">{selectedAuthorCode || 'N/A'}</span> 에 매핑됨
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[500px]">
                    <AnimatePresence mode="wait">
                      {!selectedAuthorCode ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center p-20 text-center space-y-6">
                          <div className="w-20 h-11 rounded-lg bg-muted flex items-center justify-center text-slate-200">
                            <Layers size={40} className="opacity-20" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xl font-bold text-muted-foreground tracking-tighter">역할을 선택하세요</h4>
                            <p className="text-xs font-bold text-slate-200 tracking-tight leading-relaxed">보안 거버넌스 역할을 선택하여 계층 노드를 로드하십시오</p>
                          </div>
                        </motion.div>
                      ) : menusError ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="alert" className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                          <AlertTriangle size={40} className="text-rose-500 opacity-70" aria-hidden="true" />
                          <p className="text-sm font-bold text-foreground">메뉴 접근 정책을 불러오지 못했습니다.</p>
                          <p className="text-xs font-medium text-muted-foreground">네트워크 상태를 확인한 뒤 다시 시도해 주세요.</p>
                          <Button variant="outline" onClick={() => refetchMenus()} className="h-10 px-6 rounded-lg text-xs font-bold">다시 시도</Button>
                        </motion.div>
                      ) : isMenusLoading ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 gap-6">
                          <RotateCcw className="animate-spin text-primary opacity-40 shadow-inner" size={48} />
                          <p className="text-xs font-bold tracking-tight text-muted-foreground/40">Mapping_Topology_Stream...</p>
                        </motion.div>
                      ) : (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 p-2 rounded-lg bg-muted/50">
                          {renderMenuTreeNodes(menuTree)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </HubSectionCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <StandardModal
        isOpen={isAuthorModalOpen}
        onClose={() => setIsAuthorModalOpen(false)}
        title={authorMode === 'create' ? '신규 권한 등록' : '보안 역할 아키텍처 상세 수정'}
        maxWidth="xl"
      >
        <AuthorForm
          mode={authorMode}
          initialData={authorMode === 'edit' ? (editingAuthor ?? undefined) : undefined}
          onSubmit={onAuthorSubmit}
          onCancel={() => setIsAuthorModalOpen(false)}
        />
      </StandardModal>
    </div>
    </TooltipProvider>
  );
}
