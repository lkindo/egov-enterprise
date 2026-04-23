'use client';

import React, { useState, useMemo, useEffect, use } from 'react';
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
  Contact2,
  Settings
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { SecurityMatrixVisualizer } from './components/SecurityMatrixVisualizer';
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
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';

// --- Validation Schemas ---
const authorSchema = z.object({
  authorCode: z.string()
    .min(1, '沅뚰븳 肄붾뱶???꾩닔?낅땲??')
    .max(30, '沅뚰븳 肄붾뱶??30???대궡?ъ빞 ?⑸땲??')
    .regex(/^[A-Z0-9_]+$/, '?곷Ц ?臾몄옄, ?レ옄, ?몃뜑諛?_)留?媛?ν빀?덈떎.'),
  authorNm: z.string()
    .min(1, '沅뚰븳 紐낆묶? ?꾩닔?낅땲??')
    .max(60, '沅뚰븳 紐낆묶? 60???대궡?ъ빞 ?⑸땲??'),
  authorDc: z.string()
    .max(200, '?댁슜???덈Т 源곷땲?? (理쒕? 200??')
    .optional()
    .or(z.literal('')),
});

type AuthorFormValues = z.infer<typeof authorSchema>;

// --- Types ---
interface MenuNode extends Menu {
  children?: MenuNode[];
  isChecked?: boolean;
}

export default function SecurityHubClient({ 
  authoritiesPromise 
}: { 
  authoritiesPromise: Promise<any> 
}) {
  const initialAuthorities = use(authoritiesPromise);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedAuthorCode, setSelectedAuthorCode] = useState<string>('');
  const [userSearchKeyword, setUserSearchKeyword] = useState('');
  const [roleSearchKeyword, setRoleSearchKeyword] = useState('');

  const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
  const [authorMode, setAuthorMode] = useState<'create' | 'edit'>('create');
  
  const authorForm = useAppForm(authorSchema, {
    defaultValues: { authorCode: '', authorNm: '', authorDc: '' }
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
      const list = Array.isArray(usersData.list) ? usersData.list : [];
      const registeredUsers = list.filter(u => u?.regYn === 'Y').map(u => u?.uniqId);
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

  const handleAuthorSubmit = authorForm.handleSubmit(async (values: AuthorFormValues) => {
    try {
      if (authorMode === 'create') {
        await authorAdminService.createAuthor(values as AuthorInfo);
        toast('蹂댁븞 沅뚰븳 ?꾪궎?띿쿂媛 ?깃났?곸쑝濡?諛섏쁺?섏뿀?듬땲??', 'success');
      } else {
        await authorAdminService.updateAuthor(values.authorCode, values as AuthorInfo);
        toast('蹂댁븞 沅뚰븳 ?꾪궎?띿쿂媛 ?깃났?곸쑝濡??섏젙?섏뿀?듬땲??', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-authorities'] });
      setIsAuthorModalOpen(false);
    } catch (error) {
      toast('???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?낅젰???뺤씤?댁＜?몄슂.', 'error');
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
      toast('?ъ슜??沅뚰븳 ?좊떦??諛섏쁺?섏뿀?듬땲??', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-user-authorities', selectedAuthorCode] });
    }
  });

  const saveMenuMappingMutation = useMutation({
    mutationFn: () => menuAdminService.saveMenuCreation(selectedAuthorCode, Array.from(tempMenuMappings)),
    onSuccess: () => {
      toast('硫붾돱 ?묎렐 沅뚰븳???낅뜲?댄듃?섏뿀?듬땲??', 'success');
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
        const menuList = Array.isArray(menus) ? menus : [];
        allMappings.set(auth.authorCode, new Set(menuList.map(m => m.menuNo)));
      });
      await Promise.all(promises);
      setGlobalMappings(allMappings);
    } catch (e) {
      toast('湲濡쒕쾶 留ㅽ듃由?뒪 ?곗씠??濡쒕뱶 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
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
      toast('湲濡쒕쾶 蹂댁븞 ?뺤콉???꾩궗?곸쑝濡??숆린?붾릺?덉뒿?덈떎.', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-author-menus'] });
    } catch (e) {
      toast('湲濡쒕쾶 ?뺤콉 ???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
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
    authorForm.reset({ authorCode: '', authorNm: '', authorDc: '' });
    setIsAuthorModalOpen(true);
  };

  const handleOpenAuthorEdit = (auth: AuthorInfo) => {
    setAuthorMode('edit');
    authorForm.reset({
      authorCode: auth.authorCode || '',
      authorNm: auth.authorNm || '',
      authorDc: auth.authorDc || ''
    });
    setIsAuthorModalOpen(true);
  };

  const handleAuthorDelete = async (code: string) => {
    if (!confirm('沅뚰븳????젣?섏떆寃좎뒿?덇퉴? 愿???좊떦 ?뺣낫媛 紐⑤몢 ?щ씪吏묐땲??')) return;
    try {
      await authorAdminService.deleteAuthor(code);
      toast('沅뚰븳????젣?섏뿀?듬땲??', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-authorities'] });
      if (selectedAuthorCode === code) setSelectedAuthorCode('');
    } catch (e) {
      toast('??젣 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
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
            <button onClick={(e) => { e.stopPropagation(); handleOpenAuthorEdit(auth); }} className="p-2 hover:bg-white/10 rounded-[0.1rem] transition"><Settings size={12} /></button>
            <button onClick={(e) => { e.stopPropagation(); handleAuthorDelete(auth.authorCode); }} className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-[0.1rem] transition"><Trash2 size={12} /></button>
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
              "w-10 h-10 rounded-[0.1rem] flex items-center justify-center transition",
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
            "group flex items-center gap-4 py-3 px-6 rounded-[0.1rem] transition cursor-pointer relative overflow-hidden group active:scale-[0.99]",
            tempMenuMappings.has(node.menuNo) ? "bg-slate-900 border-none shadow-xl text-white" : "hover:bg-slate-50 border border-transparent"
          )}
          style={{ marginLeft: `${depth * 24}px` }}
          onClick={() => toggleMenuMapping(node.menuNo, !tempMenuMappings.has(node.menuNo))}
        >
          <div className={cn(
            "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition",
            tempMenuMappings.has(node.menuNo) ? "bg-primary border-primary scale-110 shadow-[0_0_10px_rgba(255,255,255,0.3)]" : "border-slate-200 bg-white"
          )}>
            {tempMenuMappings.has(node.menuNo) && <ShieldCheck size={12} className="text-white" />}
          </div>

          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition",
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
        title="?듯빀 蹂댁븞 嫄곕쾭?뚯뒪 ?덈툕"
        breadcrumbs={[{ label: '蹂댁븞 愿由? }, { label: '沅뚰븳 ?ㅼ젙' }, { label: '?듯빀 而⑦듃濡? }]}
      />

      <HubHeader
        title="Security"
        highlight="Fabric"
        subtitle="?쒖뒪???꾨컲 蹂댁븞 ??븷(Role), ?ъ슜???좊떦 留ㅽ듃由?뒪 諛?怨꾩링???묎렐 ?쒖뼱 ?뺤콉 ?듯빀 ?꾪궎?띿쿂"
        icon={Lock}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-[0.1rem] mr-4 border-2 border-slate-100">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => setViewMode('TOPOLOGY')}
                    className={cn(
                      "h-10 px-6 rounded-[0.1rem] text-[9px] font-black tracking-widest uppercase transition",
                      viewMode === 'TOPOLOGY' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-900"
                    )}
                  >
                    TOPOLOGY_VIEW
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                  蹂댁븞 媛앹껜 媛꾩쓽 怨꾩링??愿怨??쒓컖??                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={() => { setViewMode('MATRIX'); loadGlobalMappings(); }}
                    className={cn(
                      "h-10 px-6 rounded-[0.1rem] text-[9px] font-black tracking-widest uppercase transition",
                      viewMode === 'MATRIX' ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-900"
                    )}
                  >
                    MATRIX_PLANE
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                  ?꾩궗??沅뚰븳 ?좊떦 ?꾪솴 ?쇨큵 寃??諛??섏젙
                </TooltipContent>
              </Tooltip>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => queryClient.invalidateQueries()}
                  className="h-14 w-14 rounded-[0.1rem] bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition shadow-xl group active:scale-95 px-4"
                >
                  <RefreshCcw size={22} className="group-hover:rotate-180 transition-transform duration-700" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                ?쒕쾭濡쒕???理쒖떊 ?뺤콉 ?뺣낫 濡쒕뱶
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleOpenAuthorCreate}
                  className="h-14 px-10 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition hover:-translate-y-1 gap-3 group"
                >
                  <Plus size={20} className="group-hover:scale-110 transition-transform duration-500" /> ?좉퇋 蹂댁븞 ?꾪궎?띿쿂 ?ㅼ젙
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                ?덈줈????븷 ?먮뒗 蹂댁븞 洹몃９ ?뺤쓽
              </TooltipContent>
            </Tooltip>
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
              <HubSectionCard title="??븷 ?몃깽?좊━" description="?쒖뒪???묎렐 沅뚰븳???뺤쓽?섎뒗 蹂댁븞 ?꾨줈?뚯씪 由ъ뒪?몄엯?덈떎." icon={Lock}>
                <div className="space-y-8 pt-4">
                  <div className="relative group/search">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={16} />
                    <Input
                      className="pl-12 h-14 bg-slate-50/50 border-none rounded-[0.1rem] text-sm font-black tracking-tight shadow-inner"
                      placeholder="??븷 寃??ID, 紐낆묶)..."
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
                title="?ъ슜???좊떦"
                description="?좏깮????븷???좊떦??媛쒕퀎 ?앸퀎?먮뱾???ㅼ떆媛??좊떦 ?곹깭?낅땲??"
                icon={Users}
                action={
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => saveUserMappingMutation.mutate()}
                        disabled={!selectedAuthorCode}
                        className="h-10 px-6 rounded-[0.1rem] bg-slate-900 text-white font-black text-[10px] tracking-widest uppercase hover:bg-primary transition shadow-xl disabled:opacity-10 gap-2"
                      >
                        <Save size={14} /> COMMIT_ENTITY
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                      ?섏젙???ъ슜??留ㅽ븨 ?뺣낫瑜?DB??理쒖쥌 諛섏쁺
                    </TooltipContent>
                  </Tooltip>
                }
              >
                <div className="relative h-full flex flex-col pt-4">
                  <div className="relative group/search mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={16} />
                    <Input
                      className="pl-12 h-14 bg-slate-50/50 border-none rounded-[0.1rem] text-sm font-black tracking-tight shadow-inner"
                      placeholder="?ъ슜??寃??ID, ?깅챸)..."
                      value={userSearchKeyword}
                      onChange={(e) => setUserSearchKeyword(e.target.value)}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[500px]">
                    <AnimatePresence mode="wait">
                      {!selectedAuthorCode ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center p-20 text-center space-y-6">
                          <div className="w-20 h-20 rounded-[0.1rem] bg-slate-50 flex items-center justify-center text-slate-200">
                            <Users size={40} className="愿由ъ옄 沅뚰븳" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xl font-black text-slate-300 uppercase tracking-tighter">Identity_Idle</h4>
                            <p className="text-[10px] font-black text-slate-200 tracking-[0.3em] uppercase leading-relaxed">蹂댁븞 ??븷???좏깮?섏뿬 ?앸퀎???꾨줈釉뚮? ?쒖꽦?뷀븯??떆??/p>
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
                title="?묎렐 ?뺤콉 ?좏뤃濡쒖?"
                description="??븷蹂??숈쟻 硫붾돱 ?몃뱶 怨꾩링 諛??꾪궎?띿쿂 ?묎렐 ?섏? ?ㅼ젙?낅땲??"
                icon={Layers}
                action={
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => saveMenuMappingMutation.mutate()}
                        disabled={!selectedAuthorCode}
                        className="h-10 px-6 rounded-[0.1rem] bg-slate-900 text-white font-black text-[10px] tracking-widest uppercase hover:bg-primary transition shadow-xl disabled:opacity-10 gap-2"
                      >
                        <RefreshCcw size={14} /> SYNC_POLICY
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                      ?꾩옱 ?몃뱶 援ъ“瑜?蹂댁븞 ?뺤콉???숆린??                    </TooltipContent>
                  </Tooltip>
                }
              >
                <div className="relative h-full flex flex-col pt-4">
                  <div className="flex items-center gap-4 bg-slate-900 rounded-[0.1rem] p-8 mb-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 transition-transform group-hover:rotate-6">
                      <ShieldCheck size={120} className="text-primary" />
                    </div>
                    <div className="w-14 h-14 bg-white/10 rounded-[0.1rem] flex items-center justify-center border border-white/5 relative z-10">
                      <ShieldCheck size={28} className="text-primary" />
                    </div>
                    <div className="relative z-10 space-y-1">
                      <span className="text-[10px] font-black text-white/30 tracking-[0.4em] uppercase font-mono">Policy_Manifest</span>
                      <div className="text-white text-lg font-black tracking-tighter leading-none">
                        {tempMenuMappings.size} 媛쒖쓽 ?쒖꽦 ?몃뱶媛 <span className="text-primary">{selectedAuthorCode || 'N/A'}</span> ??留ㅽ븨??                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[500px]">
                    <AnimatePresence mode="wait">
                      {!selectedAuthorCode ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center p-20 text-center space-y-6">
                          <div className="w-20 h-20 rounded-[0.1rem] bg-slate-50 flex items-center justify-center text-slate-200">
                            <Layers size={40} className="opacity-20" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xl font-black text-slate-300 uppercase tracking-tighter">Topology_Idle</h4>
                            <p className="text-[10px] font-black text-slate-200 tracking-[0.3em] uppercase leading-relaxed">蹂댁븞 嫄곕쾭?뚯뒪 ??븷???좏깮?섏뿬 怨꾩링 ?몃뱶瑜?濡쒕뱶?섏떗?쒖삤</p>
                          </div>
                        </motion.div>
                      ) : isMenusLoading ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 gap-6">
                          <RotateCcw className="animate-spin text-primary opacity-40 shadow-inner" size={48} />
                          <p className="text-[11px] font-black tracking-[0.4em] text-muted-foreground/40 uppercase">Mapping_Topology_Stream...</p>
                        </motion.div>
                      ) : (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 p-2 rounded-[0.1rem] bg-slate-50/50">
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
        title={authorMode === 'create' ? '?좉퇋 沅뚰븳 ?깅줉' : '蹂댁븞 ??븷 ?꾪궎?띿쿂 ?곸꽭 ?섏젙'}
        maxWidth="xl"
        footer={
          <div className="flex w-full gap-6 pt-4">
            <Button variant="outline" onClick={() => setIsAuthorModalOpen(false)} className="flex-1 h-14 rounded-[0.1rem] font-black text-[10px] tracking-widest border-2">痍⑥냼</Button>
            <Button 
                onClick={handleAuthorSubmit} 
                className="flex-[2] h-14 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-[10px] tracking-widest shadow-2xl hover:bg-primary transition hover:-translate-y-2 group px-6"
            >
              <Zap size={18} className="group-hover:animate-pulse mr-2" /> {authorMode === 'create' ? '沅뚰븳 諛고룷' : '沅뚰븳 ?섏젙'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAuthorSubmit} className="p-4 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <FormField label="蹂댁븞 ??븷 ?앸퀎??Role Code)" required description="?쒖뒪???꾨컲???곸슜?섎뒗 ?좎씪????븷 怨좎쑀 肄붾뱶">
              <div className="relative group/id">
                <Key size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/id:opacity-100 transition-opacity" />
                <Input
                  {...authorForm.register('authorCode')}
                  disabled={authorMode === 'edit'}
                  className={cn(
                    "h-16 rounded-[0.1rem] border-2 text-md font-black italic tracking-widest uppercase shadow-inner pl-16 pt-0",
                    authorForm.formState.errors.authorCode ? "border-rose-500 bg-rose-50" : "border-slate-100"
                  )}
                  placeholder="ROLE_IDENTIFIER (MAX_30)"
                />
              </div>
              {authorForm.formState.errors.authorCode && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2 tracking-tight">{authorForm.formState.errors.authorCode.message}</p>}
            </FormField>
            <FormField label="??븷 ?덉씠釉?紐낆묶" required description="UI 諛?鍮꾩쫰?덉뒪 ?덉씠?댁뿉???앸퀎 紐낅Ц?붾맂 ?대쫫">
              <div className="relative group/nm">
                <ShieldCheck size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/nm:opacity-100 transition-opacity" />
                <Input
                  {...authorForm.register('authorNm')}
                  className={cn(
                    "h-16 pl-16 rounded-[0.1rem] border-2 text-md font-black tracking-tight shadow-inner",
                    authorForm.formState.errors.authorNm ? "border-rose-500 bg-rose-50" : "border-slate-100"
                  )}
                  placeholder="??븷 紐낆묶 ?낅젰 (MAX_60)"
                />
              </div>
              {authorForm.formState.errors.authorNm && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2 tracking-tight">{authorForm.formState.errors.authorNm.message}</p>}
            </FormField>
          </div>

          <FormField label="蹂댁븞 ?뺤콉 ?뺣낫 紐낆꽭" description="?대떦 ??븷???곸꽭 紐⑹쟻 諛??곗씠???묎렐 踰붿쐞??????뺣낫 紐낆꽭">
            <div className="relative group/dc">
              <Binary size={18} className="absolute left-6 top-6 text-muted-foreground opacity-30 group-focus-within/dc:opacity-100 transition-opacity" />
              <textarea
                {...authorForm.register('authorDc')}
                className={cn(
                  "min-h-[160px] w-full pl-16 p-8 rounded-[0.1rem] border-2 bg-slate-50/50 text-xs font-bold focus:ring-8 focus:ring-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition resize-none shadow-inner",
                  authorForm.formState.errors.authorDc ? "border-rose-500 bg-rose-50" : "border-slate-100"
                )}
                placeholder="?곸꽭 紐낆꽭 ?낅젰... (理쒕? 200??"
              />
              {authorForm.formState.errors.authorDc && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2 tracking-tight">{authorForm.formState.errors.authorDc.message}</p>}
            </div>
          </FormField>
        </form>
      </StandardModal>
    </div>
  );
}
