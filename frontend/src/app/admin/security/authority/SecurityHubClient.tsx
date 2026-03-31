'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Users,
  Layers,
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Folder,
  File,
  Save,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  UserPlus,
  Key,
  Activity,
  Lock,
  Fingerprint,
  RotateCcw,
  ShieldAlert,
  Zap,
  ArrowUpRight,
  Database,
  Binary,
  Workflow,
  Network,
  SearchCode,
  Milestone,
  Building2,
  Contact2,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authorAdminService, AuthorInfo } from '@/services/foundation/system/AuthorAdminService';
import { userAuthorityAdminService, AuthorGroupProjection, UserAuthorityDto } from '@/services/foundation/system/UserAuthorityAdminService';
import { menuAdminService, Menu } from '@/services/foundation/system/MenuAdminService';
import { MenuByAuthority } from '@/types/foundation/security';
import { useToast } from '@/app/components/ui/toast';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { FormField } from '@/app/components/ui/standard-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { SecurityMatrixVisualizer } from './components/SecurityMatrixVisualizer';

export default function SecurityHubClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedAuthorCode, setSelectedAuthorCode] = useState<string>('');
  const [userSearchKeyword, setUserSearchKeyword] = useState('');
  const [roleSearchKeyword, setRoleSearchKeyword] = useState('');

  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
  const [authorMode, setAuthorMode] = useState<'create' | 'edit'>('create');
  const [authorFormData, setAuthorFormData] = useState<Partial<AuthorInfo>>({
    authorCode: '',
    authorNm: '',
    authorDc: ''
  });

  const [tempUserMappings, setTempUserMappings] = useState<Set<string>>(new Set());
  const [tempMenuMappings, setTempMenuMappings] = useState<Set<number>>(new Set());

  // --- Matrix Mode States ---
  const [viewMode, setViewMode] = useState<'TOPOLOGY' | 'MATRIX'>('TOPOLOGY');
  const [globalMappings, setGlobalMappings] = useState<Map<string, Set<number>>>(new Map());
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);


  // --- Pagination States ---
  const [rolePage, setRolePage] = useState(1);
  const [userPage, setUserPage] = useState(1);

  const { data: authorsData, isLoading: isAuthorsLoading, error: authorsError, refetch: refetchAuthors } = useQuery({
    queryKey: ['admin-authorities', roleSearchKeyword, rolePage],
    queryFn: () => authorAdminService.getAuthorList({ pageIndex: rolePage, searchKeyword: roleSearchKeyword }),
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

  const { data: menusData, isLoading: isMenusLoading } = useQuery({
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
      const registeredUsers = usersData.list.filter(u => u.regYn === 'Y').map(u => u.uniqId);
      setTempUserMappings(new Set(registeredUsers));
    }
  }, [usersData, selectedAuthorCode]);

  useEffect(() => {
    if (menusData?.authorMenus) {
      const mappedMenuIds = (menusData.authorMenus as MenuByAuthority[]).map(m => m.menuNo);
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
      if (node.upperMenuNo === 0 || !map.has(node.upperMenuNo)) {
        roots.push(node);
      } else {
        const parent = map.get(node.upperMenuNo);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      }
    });

    return roots;
  }, [menusData, tempMenuMappings]);

  const saveAuthorMutation = useMutation({
    mutationFn: (data: Partial<AuthorInfo>) =>
      authorMode === 'create' ? authorAdminService.createAuthor(data) : authorAdminService.updateAuthor(data.authorCode!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-authorities'] });
      toast('보안 권한 아키텍처가 성공적으로 반영되었습니다.', 'success');
      setIsAuthorModalOpen(false);
    }
  });

  const saveUserMappingMutation = useMutation({
    mutationFn: async () => {
      const mappings: UserAuthorityDto[] = Array.from(tempUserMappings).map(uid => ({
        uniqId: uid,
        authorCode: selectedAuthorCode,
        mberTyCode: users.find(u => u.uniqId === uid)?.mberTyCode || 'USR'
      }));
      return userAuthorityAdminService.saveUserAuthorities(mappings);
    },
    onSuccess: () => {
      toast('사용자-권한 할당 매트릭스가 업데이트되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-user-authorities', selectedAuthorCode] });
    }
  });

  const saveMenuMappingMutation = useMutation({
    mutationFn: () => menuAdminService.saveMenuCreation(selectedAuthorCode, Array.from(tempMenuMappings)),
    onSuccess: () => {
      toast('메뉴 접근 거버넌스 정책이 동기화되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-author-menus', selectedAuthorCode] });
    }
  });

  const loadGlobalMappings = async () => {
    if (!authorities.length) return;
    setIsGlobalLoading(true);
    try {
      const allMappings = new Map<string, Set<number>>();
      const promises = (authorities as AuthorInfo[]).map(async (auth) => {
        const menus = await authorAdminService.getAuthorMenus(auth.authorCode);
        allMappings.set(auth.authorCode, new Set((menus as MenuByAuthority[]).map(m => m.menuNo)));
      });
      await Promise.all(promises);
      setGlobalMappings(allMappings);
    } catch (e) {
      toast('글로벌 매트릭스 데이터 로드 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsGlobalLoading(false);
    }
  };

  const handleToggleGlobal = (authorCode: string, menuNo: number) => {
    setGlobalMappings(prev => {
      const next = new Map(prev);
      const set = new Set(next.get(authorCode) || []);
      if (set.has(menuNo)) set.delete(menuNo);
      else set.add(menuNo);
      next.set(authorCode, set);

      // If the currently selected author matches, sync it too
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

  const toggleUserMapping = (uniqId: string) => {
    setTempUserMappings(prev => {
      const next = new Set(prev);
      if (next.has(uniqId)) next.delete(uniqId);
      else next.add(uniqId);
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
    setAuthorMode('create');
    setAuthorFormData({ authorCode: '', authorNm: '', authorDc: '' });
    setIsAuthorModalOpen(true);
  };

  const handleOpenAuthorEdit = (auth: AuthorInfo) => {
    setAuthorMode('edit');
    setAuthorFormData(auth);
    setIsAuthorModalOpen(true);
  };

  const handleAuthorDelete = async (code: string) => {
    if (!confirm('권한 아키텍처를 삭제하시겠습니까? 관련 할당 정보가 모두 영구적으로 소멸됩니다.')) return;
    try {
      await authorAdminService.deleteAuthor(code);
      toast('권한 프로필이 성공적으로 삭제되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-authorities'] });
      if (selectedAuthorCode === code) setSelectedAuthorCode('');
    } catch (e) {
      toast('삭제 중 시스템 예외가 발생했습니다.', 'error');
    }
  };

  // --- DataTable Columns ---
  const roleColumns: Column<AuthorInfo>[] = [
    {
      header: 'ROLE_MANIFEST',
      accessor: (auth) => (
        <div className="flex items-center justify-between w-full group/role-item py-1">
          <div className="flex flex-col gap-1">
            <span className={cn("text-sm font-black tracking-tighter truncate leading-none", selectedAuthorCode === auth.authorCode ? "text-white" : "text-slate-900")}>
              {auth.authorNm}
            </span>
            <span className={cn("text-[8px] font-black tracking-[0.3em] font-mono", selectedAuthorCode === auth.authorCode ? "text-white/30" : "text-slate-300")}>
              {auth.authorCode}
            </span>
          </div>
          <div className={cn("flex gap-1", selectedAuthorCode === auth.authorCode ? "opacity-100" : "opacity-0 group-hover/role-item:opacity-100 transition-opacity")}>
            <button onClick={(e) => { e.stopPropagation(); handleOpenAuthorEdit(auth); }} className="p-2 hover:bg-white/10 rounded-xl transition-all"><Settings size={12} /></button>
            <button onClick={(e) => { e.stopPropagation(); handleAuthorDelete(auth.authorCode); }} className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all"><Trash2 size={12} /></button>
          </div>
        </div>
      )
    }
  ];

  const userColumns: Column<AuthorGroupProjection>[] = [
    {
      header: 'IDENTITY_PROBE',
      accessor: (user) => (
        <div className="flex items-center justify-between w-full py-1">
          <div className="flex items-center gap-4 relative z-10">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              tempUserMappings.has(user.uniqId) ? "bg-white/20" : "bg-slate-50 group-hover:bg-slate-900 group-hover:text-white"
            )}>
              <Fingerprint size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight">{user.userNm}</span>
              <span className={cn("text-[8px] font-black tracking-widest font-mono opacity-40", tempUserMappings.has(user.uniqId) ? "text-white" : "text-slate-400")}>{user.userId}</span>
            </div>
          </div>
          {tempUserMappings.has(user.uniqId) ? (
            <CheckCircle2 size={20} className="text-white relative z-10" />
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
        <div
          className={cn(
            "group flex items-center gap-4 py-3 px-6 rounded-2xl transition-all cursor-pointer relative overflow-hidden group active:scale-[0.99]",
            tempMenuMappings.has(node.menuNo) ? "bg-slate-900 border-none shadow-xl text-white" : "hover:bg-slate-50 border border-transparent"
          )}
          style={{ marginLeft: `${depth * 24}px` }}
          onClick={() => toggleMenuMapping(node.menuNo, !tempMenuMappings.has(node.menuNo))}
        >
          <div className={cn(
            "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
            tempMenuMappings.has(node.menuNo) ? "bg-primary border-primary scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "border-slate-200 bg-white"
          )}>
            {tempMenuMappings.has(node.menuNo) && <ShieldCheck size={12} className="text-white" />}
          </div>

          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
            node.children && node.children.length > 0 ? "text-amber-500 bg-amber-50 group-hover:bg-amber-500 group-hover:text-white" : "text-slate-400 bg-slate-50 group-hover:bg-slate-900 group-hover:text-white"
          )}>
            {node.children && node.children.length > 0 ? <Folder size={14} /> : <File size={14} />}
          </div>

          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span className={cn(
              "text-[11px] font-black tracking-tight truncate",
              tempMenuMappings.has(node.menuNo) ? "text-white" : "text-slate-600"
            )}>
              {node.menuNm}
            </span>
            <span className={cn(
              "text-[8px] font-black tracking-widest font-mono opacity-40 uppercase truncate",
              tempMenuMappings.has(node.menuNo) ? "text-white/40" : "text-slate-400"
            )}>
              NODE_{node.menuNo}
            </span>
          </div>

          <div className={cn(
            "hidden md:block px-2 py-0.5 rounded bg-white/10 border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity",
            tempMenuMappings.has(node.menuNo) ? "text-white" : "text-slate-300"
          )}>
            <ArrowUpRight size={10} />
          </div>
        </div>
        {node.children && renderMenuTreeNodes(node.children, depth + 1)}
      </motion.div>
    ));
  };

  const currentAuth = (authorities as AuthorInfo[]).find((a) => a.authorCode === selectedAuthorCode);

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="통합 보안 거버넌스 허브"
        breadcrumbs={[{ label: '보안관리' }, { label: '권한 설정' }, { label: '통합 콘트롤' }]}
      />

      <HubHeader
        title="Security"
        highlight="Fabric"
        subtitle="시스템 전반의 보안 역할(Role), 사용자 할당 매트릭스 및 다차원 접근 제어 정책 통합 아키텍처"
        icon={Lock}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl mr-4 border-2 border-slate-100">
              <Button
                variant="ghost"
                onClick={() => setViewMode('TOPOLOGY')}
                className={cn(
                  "h-10 px-6 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all",
                  viewMode === 'TOPOLOGY' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-900"
                )}
              >
                TOPOLOGY_VIEW
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setViewMode('MATRIX'); loadGlobalMappings(); }}
                className={cn(
                  "h-10 px-6 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all",
                  viewMode === 'MATRIX' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-900"
                )}
              >
                MATRIX_PLANE
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={() => queryClient.invalidateQueries()}
              className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95 px-4"
            >
              <RefreshCcw size={22} className="group-hover:rotate-180 transition-transform duration-700" />
            </Button>
            <Button
              onClick={handleOpenAuthorCreate}
              className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
            >
              <Plus size={20} className="group-hover:scale-110 transition-transform duration-500" /> 신규 보안 아키텍처 실장
            </Button>
          </div>
        }
      />


      <HubMetricGrid>
        <HubMetricCard title="SECURITY_ROLES" value={authorities.length} icon={Key} color="indigo" />
        <HubMetricCard title="ACTIVE_SESSIONS" value="PROBING..." icon={Activity} color="emerald" status="ONLINE" />
        <HubMetricCard title="ACCESS_ENTITIES" value={tempMenuMappings.size} icon={Layers} color="primary" />
        <HubMetricCard title="IDENTITY_POOL" value={users.length || "IDLE"} icon={Fingerprint} color="amber" />
      </HubMetricGrid>

      <AnimatePresence mode="wait">
        {viewMode === 'MATRIX' ? (
          <motion.div
            key="matrix-view"
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-12 gap-12 min-h-[850px]"
          >

            {/* Left: Role Inventory */}
            <div className="col-span-12 lg:col-span-3 space-y-8 h-full">
              <HubSectionCard title="역할 인벤토리" description="시스템 접근 수준을 정의하는 보안 프로필 리스트입니다." icon={Lock}>
                <div className="space-y-8 pt-4">
                  <div className="relative group/search">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={16} />
                    <Input
                      className="pl-12 h-14 bg-slate-50/50 border-none rounded-2xl text-sm font-black tracking-tight shadow-inner"
                      placeholder="역할 검색 (ID, 명칭)..."
                      value={roleSearchKeyword}
                      onChange={(e) => setRoleSearchKeyword(e.target.value)}
                    />
                  </div>

                  <div className="max-h-[650px] overflow-y-auto pr-2 custom-scrollbar">
                    <StandardDataTable<AuthorInfo>
                      columns={roleColumns}
                      data={authorities as AuthorInfo[]}
                      loading={isAuthorsLoading}
                      error={authorsError as Error | null}
                      onRetry={() => refetchAuthors()}
                      onRowClick={(item) => handleRoleSelect((item as AuthorInfo).authorCode)}
                      keyField="authorCode"
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

            {/* Center: Identity Matrix */}
            <div className="col-span-12 lg:col-span-4 space-y-8 h-full">
              <HubSectionCard
                title="아이디 "
                description="선택된 역할에 할당된 개별 식별자들의 실시간 할당 상태입니다."
                icon={Users}
                action={
                  <Button
                    size="sm"
                    onClick={() => saveUserMappingMutation.mutate()}
                    disabled={!selectedAuthorCode}
                    className="h-10 px-6 rounded-xl bg-slate-900 text-white font-black text-[10px] tracking-widest uppercase hover:bg-primary transition-all shadow-xl disabled:opacity-10 gap-2"
                  >
                    <Save size={14} /> COMMIT_ENTITY
                  </Button>
                }
              >
                <div className="relative h-full flex flex-col pt-4">
                  <div className="relative group/search mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={16} />
                    <Input
                      className="pl-12 h-14 bg-slate-50/50 border-none rounded-2xl text-sm font-black tracking-tight shadow-inner"
                      placeholder="사용자 검색 (ID, 성명)..."
                      value={userSearchKeyword}
                      onChange={(e) => setUserSearchKeyword(e.target.value)}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[500px]">
                    <AnimatePresence mode="wait">
                      {!selectedAuthorCode ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center p-20 text-center space-y-6">
                          <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-200">
                            <Users size={40} className="opacity-20" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xl font-black text-slate-300 uppercase tracking-tighter">Identity_Idle</h4>
                            <p className="text-[10px] font-black text-slate-200 tracking-[0.3em] uppercase leading-relaxed">보안 역할을 선택하여 식별자 프로브를 활성화하십시오.</p>
                          </div>
                        </motion.div>
                      ) : (
                        <StandardDataTable<AuthorGroupProjection>
                          columns={userColumns}
                          data={users as AuthorGroupProjection[]}
                          loading={isUsersLoading}
                          error={usersError as Error | null}
                          onRetry={() => refetchUsers()}
                          onRowClick={(item) => toggleUserMapping((item as AuthorGroupProjection).uniqId)}
                          keyField="uniqId"
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

            {/* Right: Policy Topology */}
            <div className="col-span-12 lg:col-span-5 h-full">
              <HubSectionCard
                title="접근 정책 토폴로지"
                description="역할별 동적인 메뉴 노드 계층 및 아키텍처 접근 수준 설정입니다."
                icon={Layers}
                action={
                  <Button
                    size="sm"
                    onClick={() => saveMenuMappingMutation.mutate()}
                    disabled={!selectedAuthorCode}
                    className="h-10 px-6 rounded-xl bg-slate-900 text-white font-black text-[10px] tracking-widest uppercase hover:bg-primary transition-all shadow-xl disabled:opacity-10 gap-2"
                  >
                    <RefreshCcw size={14} /> SYNC_POLICY
                  </Button>
                }
              >
                <div className="relative h-full flex flex-col pt-4">
                  <div className="flex items-center gap-4 bg-slate-900 rounded-[2rem] p-8 mb-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 transition-transform group-hover:rotate-6">
                      <ShieldCheck size={120} className="text-primary" />
                    </div>
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5 relative z-10">
                      <ShieldCheck size={28} className="text-primary" />
                    </div>
                    <div className="relative z-10 space-y-1">
                      <span className="text-[10px] font-black text-white/30 tracking-[0.4em] uppercase font-mono">Policy_Manifest</span>
                      <div className="text-white text-lg font-black tracking-tighter leading-none">
                        {tempMenuMappings.size} 개의 활성 노드가 <span className="text-primary">{selectedAuthorCode || 'N/A'}</span> 에 매핑됨
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[500px]">
                    <AnimatePresence mode="wait">
                      {!selectedAuthorCode ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center p-20 text-center space-y-6">
                          <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-200">
                            <Layers size={40} className="opacity-20" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xl font-black text-slate-300 uppercase tracking-tighter">Topology_Idle</h4>
                            <p className="text-[10px] font-black text-slate-200 tracking-[0.3em] uppercase leading-relaxed">보안 거버넌스 역할을 선택하여 계층 노드를 프로드하십시오.</p>
                          </div>
                        </motion.div>
                      ) : isMenusLoading ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 gap-6">
                          <RotateCcw className="animate-spin text-primary opacity-40 shadow-inner" size={48} />
                          <p className="text-[11px] font-black tracking-[0.4em] text-muted-foreground/40 uppercase">Mapping_Topology_Stream...</p>
                        </motion.div>
                      ) : (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 p-2 rounded-[2.5rem] bg-slate-50/50">
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


      {/* Authority Profile Modal */}
      <StandardModal
        isOpen={isAuthorModalOpen}
        onClose={() => setIsAuthorModalOpen(false)}
        title={authorMode === 'create' ? '신규 보안 역할 프로비저닝' : '보안 역할 아키텍처 상세 수정'}
        maxWidth="xl"
      >
        <div className="p-4 space-y-12">
          <div className="grid grid-cols-2 gap-10">
            <FormField label="보안 역할 식별자 (Role Code)" required description="시스템 전반에 적용되는 유일한 역할 고유 코드">
              <div className="relative group/id">
                <Key size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/id:opacity-100 transition-opacity" />
                <Input
                  value={authorFormData.authorCode}
                  onChange={(e) => setAuthorFormData({ ...authorFormData, authorCode: e.target.value })}
                  disabled={authorMode === 'edit'}
                  className="h-16 pl-16 rounded-2xl border-2 text-md font-black italic tracking-widest uppercase shadow-inner"
                  placeholder="롤 식별자"
                />
              </div>
            </FormField>
            <FormField label="역할 레이블 명칭" required description="UI 및 비즈니스 레이어에서 식별될 명문화된 이름">
              <div className="relative group/nm">
                <ShieldCheck size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/nm:opacity-100 transition-opacity" />
                <Input
                  value={authorFormData.authorNm}
                  onChange={(e) => setAuthorFormData({ ...authorFormData, authorNm: e.target.value })}
                  className="h-16 pl-16 rounded-2xl border-2 text-md font-black tracking-tight shadow-inner"
                  placeholder="역할 명칭 입력"
                />
              </div>
            </FormField>
          </div>

          <FormField label="보안 정책 정밀 명세" description="해당 역할의 상세 목적 및 데이터 접근 범위에 대한 정밀 명세">
            <div className="relative group/dc">
              <Binary size={18} className="absolute left-6 top-6 text-muted-foreground opacity-30 group-focus-within/dc:opacity-100 transition-opacity" />
              <Textarea
                value={authorFormData.authorDc}
                onChange={(e) => setAuthorFormData({ ...authorFormData, authorDc: e.target.value })}
                className="min-h-[160px] pl-16 p-8 rounded-[2.5rem] border-2 bg-slate-50/50 text-xs font-bold focus:ring-8 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner"
                placeholder="상세 명세 입력..."
              />
            </div>
          </FormField>

          <div className="flex gap-6 pt-4">
            <Button variant="outline" onClick={() => setIsAuthorModalOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest border-2">취소</Button>
            <Button onClick={() => saveAuthorMutation.mutate(authorFormData)} disabled={saveAuthorMutation.isPending} className="flex-[2] h-14 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group">
              <Zap size={18} className="group-hover:animate-pulse" /> {authorMode === 'create' ? '권한 배포' : '권한 수정'}
            </Button>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}
