'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
 Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authorAdminService, AuthorInfo } from '@/services/admin/system/AuthorAdminService';
import { userAuthorityAdminService, AuthorGroupProjection, UserAuthorityDto } from '@/services/admin/system/UserAuthorityAdminService';
import { menuAdminService, Menu } from '@/services/admin/system/MenuAdminService';
import { useToast } from '@/app/components/ui/toast';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { StandardForm } from '@/app/components/ui/standard-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface MenuNode extends Menu {
 children?: MenuNode[];
 isChecked?: boolean;
}

export default function SecurityHubClient() {
 const queryClient = useQueryClient();
 const { toast } = useToast();

 // --- States ---
 const [selectedAuthorCode, setSelectedAuthorCode] = useState<string>('');
 const [userSearchKeyword, setUserSearchKeyword] = useState('');
 const [roleSearchKeyword, setRoleSearchKeyword] = useState('');
 
 // Modals
 const [isAuthorModalOpen, setIsAuthorModalOpen] = useState(false);
 const [authorMode, setAuthorMode] = useState<'create' | 'edit'>('create');
 const [authorFormData, setAuthorFormData] = useState<Partial<AuthorInfo>>({
 authorCode: '',
 authorNm: '',
 authorDc: ''
 });

 // Mappings
 const [tempUserMappings, setTempUserMappings] = useState<Set<string>>(new Set());
 const [tempMenuMappings, setTempMenuMappings] = useState<Set<number>>(new Set());

 // --- Queries ---
 
 // 1. Authorities (Roles)
 const { data: authorsData, isLoading: isAuthorsLoading } = useQuery({
 queryKey: ['admin-authorities', roleSearchKeyword],
 queryFn: () => authorAdminService.getAuthorList({ page번호: 1, searchKeyword: roleSearchKeyword }),
 });
 const authorities = authorsData?.list || [];

 // 2. Users with registration status for selected role
 const { data: usersData, isLoading: isUsersLoading } = useQuery({
 queryKey: ['admin-user-authorities', selectedAuthorCode, userSearchKeyword],
 queryFn: () => userAuthorityAdminService.getUserAuthorityList({ 
 searchKeyword: userSearchKeyword,
 searchCondition: '1', // Custom condition on backend to filter/mark for selectedAuthorCode
 authorCode: selectedAuthorCode // Pass selected role to check status
 } as any),
 enabled: !!selectedAuthorCode
 });
 const users = usersData?.list || [];

 // 3. Menus with registration status for selected role
 const { data: menusData, isLoading: isMenusLoading } = useQuery({
 queryKey: ['admin-author-menus', selectedAuthorCode],
 queryFn: async () => {
 const allMenus = await menuAdminService.getAllMenus();
 const authorMenus = await authorAdminService.getAuthorMenus(selectedAuthorCode);
 return { allMenus, authorMenus };
 },
 enabled: !!selectedAuthorCode
 });

 // --- Sync Temp Mappings when Role Changes ---
 useEffect(() => {
 if (usersData?.list) {
 const registeredUsers = usersData.list.filter(u => u.regYn === 'Y').map(u => u.uniqId);
 setTempUserMappings(new Set(registeredUsers));
 }
 }, [usersData, selectedAuthorCode]);

 useEffect(() => {
 if (menusData?.authorMenus) {
 const mappedMenuIds = (menusData.authorMenus as any[]).map(m => m.menuNo);
 setTempMenuMappings(new Set(mappedMenuIds));
 }
 }, [menusData, selectedAuthorCode]);

 // --- Tree Construction ---
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

 // --- Mutations ---
 
 // Save Role
 const saveAuthorMutation = useMutation({
 mutationFn: (data: Partial<AuthorInfo>) => 
 authorMode === 'create' ? authorAdminService.createAuthor(data) : authorAdminService.updateAuthor(data.authorCode!, data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['admin-authorities'] });
 toast('권한 정보가 저장되었습니다.', 'success');
 setIsAuthorModalOpen(false);
 }
 });

 // Save User Mappings
 const saveUserMappingMutation = useMutation({
 mutationFn: async () => {
 const mappings: UserAuthorityDto[] = Array.from(tempUserMappings).map(uid => ({
 uniqId: uid,
 authorCode: selectedAuthorCode,
 mberTyCode: users.find(u => u.uniqId === uid)?.mberTyCode || 'USR'
 }));
 
 // Note: Our backend endpoint for saving user authorities usually deletes existing for the list and re-inserts.
 // But we might need a specific behavior. Assuming saveUserAuthorities handles the set.
 return userAuthorityAdminService.saveUserAuthorities(mappings);
 },
 onSuccess: () => {
 toast('사용자 권한 할당이 반영되었습니다.', 'success');
 queryClient.invalidateQueries({ queryKey: ['admin-user-authorities', selectedAuthorCode] });
 }
 });

 // Save Menu Mappings
 const saveMenuMappingMutation = useMutation({
 mutationFn: () => menuAdminService.saveMenuCreation(selectedAuthorCode, Array.from(tempMenuMappings)),
 onSuccess: () => {
 toast('메뉴 접근 권한이 업데이트되었습니다.', 'success');
 queryClient.invalidateQueries({ queryKey: ['admin-author-menus', selectedAuthorCode] });
 }
 });

 // --- Handlers ---
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
 if (!confirm('권한을 삭제하시겠습니까? 관련 할당 정보가 모두 사라집니다.')) return;
 try {
 await authorAdminService.deleteAuthor(code);
 toast('권한이 삭제되었습니다.', 'success');
 queryClient.invalidateQueries({ queryKey: ['admin-authorities'] });
 if (selectedAuthorCode === code) setSelectedAuthorCode('');
 } catch (e) {
 toast('삭제 중 오류가 발생했습니다.', 'error');
 }
 };

 // --- Renderers ---
 const renderMenuTreeNodes = (nodes: MenuNode[], depth = 0) => {
 return nodes.map(node => (
 <div key={node.menuNo} className="space-y-1">
 <div 
 className={cn(
 "group flex items-center gap-3 py-2 px-4 rounded-xl transition-all cursor-pointer",
 tempMenuMappings.has(node.menuNo) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-slate-50"
 )}
 style={{ marginLeft: `${depth * 20}px` }}
 onClick={() => toggleMenuMapping(node.menuNo, !tempMenuMappings.has(node.menuNo))}
 >
 <div className={cn(
 "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
 tempMenuMappings.has(node.menuNo) ? "bg-primary border-primary" : "border-slate-200 bg-white"
 )}>
 {tempMenuMappings.has(node.menuNo) && <ShieldCheck size={12} className="text-white" />}
 </div>
 {node.children && node.children.length > 0 ? (
 <Folder size={14} className={tempMenuMappings.has(node.menuNo) ? "text-primary" : "text-amber-400"} />
 ) : (
 <File size={14} className="text-slate-400" />
 )}
 <span className={cn(
 "text-[11px] font-bold transition-all",
 tempMenuMappings.has(node.menuNo) ? "text-primary" : "text-slate-600"
 )}>
 {node.menuNm}
 </span>
 <span className="text-[9px] font-mono text-slate-300 ml-auto opacity-0 group-hover:opacity-100">{node.menuNo}</span>
 </div>
 {node.children && renderMenuTreeNodes(node.children, depth + 1)}
 </div>
 ));
 };

 return (
 <div className="space-y-10 pb-20 animate-in fade-in duration-700">
 {/* --- Header --- */}
 <div className="flex items-center justify-between px-4">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl rotate-3">
 <Lock size={28} className="text-white" />
 </div>
 <div>
 <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">
 보안 및 권한 관리 허브
 </h2>
 <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] mt-2 italic">
 통합 권한 제어 센터
 </p>
 </div>
 </div>
 <Button onClick={handleOpenAuthorCreate} className="h-14 px-8 rounded-2xl bg-primary text-white font-black tracking-tight shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all gap-3">
 <Plus size={20} /> 신규 권한 등록
 </Button>
 </div>

 <div className="grid grid-cols-12 gap-8 min-h-[750px] px-2">
 
 {/* --- Left Column: Authority List (25%) --- */}
 <div className="col-span-12 lg:col-span-3">
 <Card className="h-full rounded-[2.5rem] border-0 bg-white shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-100">
 <CardHeader className="bg-slate-50/50 border-b p-8">
 <div className="flex items-center justify-between mb-6">
 <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic flex items-center gap-2">
 <Activity size={12} className="text-primary" /> 권한 롤 목록 
 </CardTitle>
 <span className="bg-primary/10 text-primary text-[8px] font-black px-2 py-0.5 rounded-full border border-primary/20">{authorities.length}</span>
 </div>
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
 <Input 
 className="pl-9 h-11 bg-white border-slate-100 rounded-xl text-sm font-bold"
 placeholder="검색..."
 value={roleSearchKeyword}
 onChange={(e) => setRoleSearchKeyword(e.target.value)}
 />
 </div>
 </CardHeader>
 <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
 {authorities.map((auth) => (
 <div 
 key={auth.authorCode}
 onClick={() => handleRoleSelect(auth.authorCode)}
 className={cn(
 "w-full group p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between",
 selectedAuthorCode === auth.authorCode 
 ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]" 
 : "bg-white border-transparent hover:border-slate-100 text-slate-600"
 )}
 >
 <div className="flex flex-col gap-0.5 max-w-[70%]">
 <span className={cn("text-sm font-black truncate", selectedAuthorCode === auth.authorCode ? "text-white" : "text-slate-900")}>
 {auth.authorNm}
 </span>
 <span className={cn("text-[8px] font-mono", selectedAuthorCode === auth.authorCode ? "text-white/40" : "text-slate-400")}>
 {auth.authorCode}
 </span>
 </div>
 <div className="flex gap-1">
 <Button 
 variant="ghost" 
 size="icon" 
 className={cn("h-6 w-6", selectedAuthorCode === auth.authorCode ? "text-white/50 hover:text-white" : "opacity-0 group-hover:opacity-100")}
 onClick={(e) => { e.stopPropagation(); handleOpenAuthorEdit(auth); }}
 >
 <Pencil size={12} />
 </Button>
 <Button 
 variant="ghost" 
 size="icon" 
 className={cn("h-6 w-6 text-rose-400", selectedAuthorCode === auth.authorCode ? "hover:bg-rose-500/10" : "opacity-0 group-hover:opacity-100")}
 onClick={(e) => { e.stopPropagation(); handleAuthorDelete(auth.authorCode); }}
 >
 <Trash2 size={12} />
 </Button>
 </div>
 </div>
 ))}
 </CardContent>
 </Card>
 </div>

 {/* --- Center Column: User Mapping (35%) --- */}
 <div className="col-span-12 lg:col-span-4">
 <Card className="h-full rounded-[2.5rem] border-0 bg-white shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-100 relative">
 {!selectedAuthorCode && (
 <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-12 text-center">
 <div className="space-y-4">
 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
 <Users className="text-slate-300" size={32} />
 </div>
 <p className="text-sm font-black text-slate-900 italic tracking-tight">사용자를 관리하려면 역할을 선택하세요</p>
 <p className="text-[10px] text-slate-400 font-bold tracking-tight">사용자-권한 매핑 패널</p>
 </div>
 </div>
 )}
 <CardHeader className="bg-slate-50/50 border-b p-8">
 <div className="flex items-center justify-between mb-6">
 <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic flex items-center gap-2">
 <Users size={12} className="text-primary" /> 사용자 할당 정보
 </CardTitle>
 <Button 
 size="sm" 
 onClick={() => saveUserMappingMutation.mutate()} 
 className="h-8 bg-slate-900 text-white font-black text-[9px] tracking-tight px-4 rounded-lg hover:-translate-y-0.5 transition-all gap-2"
 >
 <Save size={12} /> 변경 내용 적용
 </Button>
 </div>
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
 <Input 
 className="pl-9 h-11 bg-white border-slate-100 rounded-xl text-sm font-bold"
 placeholder="검색..."
 value={userSearchKeyword}
 onChange={(e) => setUserSearchKeyword(e.target.value)}
 />
 </div>
 </CardHeader>
 <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
 {users.map((user) => (
 <div 
 key={user.uniqId}
 onClick={() => toggleUserMapping(user.uniqId)}
 className={cn(
 "p-4 rounded-xl border-2 transition-all flex items-center justify-between group cursor-pointer",
 tempUserMappings.has(user.uniqId) 
 ? "border-primary/20 bg-primary/5" 
 : "border-transparent bg-slate-50/50 hover:bg-slate-50"
 )}
 >
 <div className="flex items-center gap-3">
 <div className={cn(
 "w-3 h-3 rounded-full shadow-inner",
 tempUserMappings.has(user.uniqId) ? "bg-primary animate-pulse" : "bg-slate-200"
 )} />
 <div className="flex flex-col">
 <span className="text-[11px] font-black">{user.userNm}</span>
 <span className="text-[9px] font-mono text-slate-400">{user.userId}</span>
 </div>
 </div>
 {tempUserMappings.has(user.uniqId) ? (
 <CheckCircle2 size={16} className="text-primary" />
 ) : (
 <UserPlus size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
 )}
 </div>
 ))}
 </CardContent>
 </Card>
 </div>

 {/* --- Right Column: Menu Mapping (40%) --- */}
 <div className="col-span-12 lg:col-span-5">
 <Card className="h-full rounded-[2.5rem] border-0 bg-white shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-100 relative">
 {!selectedAuthorCode && (
 <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-12 text-center">
 <div className="space-y-4">
 <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
 <Layers className="text-slate-300" size={32} />
 </div>
 <p className="text-sm font-black text-slate-900 italic tracking-tight">메뉴를 관리하려면 역할을 선택하세요</p>
 <p className="text-[10px] text-slate-400 font-bold tracking-tight">권한-메뉴 계층 패널</p>
 </div>
 </div>
 )}
 <CardHeader className="bg-slate-50/50 border-b p-8">
 <div className="flex items-center justify-between mb-6">
 <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic flex items-center gap-2">
 <Layers size={12} className="text-primary" /> 메뉴 접근 권한 트리
 </CardTitle>
 <Button 
 size="sm" 
 onClick={() => saveMenuMappingMutation.mutate()}
 className="h-8 bg-slate-900 text-white font-black text-[9px] tracking-tight px-4 rounded-lg hover:-translate-y-0.5 transition-all gap-2"
 >
 <RefreshCcw size={12} /> 계층 정보 동기화
 </Button>
 </div>
 <div className="flex items-center gap-3 bg-slate-100/50 p-3 rounded-xl border border-dashed border-slate-200">
 <ShieldCheck size={14} className="text-primary" />
 <span className="text-[10px] font-black text-slate-500 italic">
 {tempMenuMappings.size} 개의 메뉴가 다음 권한에 할당됨: <span className="text-primary">{selectedAuthorCode}</span>
 </span>
 </div>
 </CardHeader>
 <CardContent className="flex-1 overflow-y-auto p-6 scrollbar-hide">
 <div className="space-y-1">
 {isMenusLoading ? (
 <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30">
 <RefreshCcw className="animate-spin" size={32} />
 <p className="text-[9px] font-black tracking-[0.3em]">메뉴 트리 구성 중...</p>
 </div>
 ) : renderMenuTreeNodes(menuTree)}
 </div>
 </CardContent>
 </Card>
 </div>
 </div>

 {/* --- Modals --- */}
 <StandardModal
 isOpen={isAuthorModalOpen}
 onClose={() => setIsAuthorModalOpen(false)}
 title={authorMode === 'create' ? '신규 권한 등록' : '권한 정보 수정'}
 maxWidth="lg"
 >
 <StandardForm onSubmit={() => saveAuthorMutation.mutate(authorFormData)} className="bg-transparent border-0 shadow-none">
 <div className="p-10 space-y-10">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="space-y-4">
 <Label className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic px-2">권한 코드</Label>
 <div className="relative">
 <Input 
 value={authorFormData.authorCode}
 onChange={(e) => setAuthorFormData({...authorFormData, authorCode: e.target.value})}
 disabled={authorMode === 'edit'}
 className="h-16 rounded-2xl border-2 bg-slate-50 font-black text-lg px-12 outline-none focus:ring-8 focus:ring-primary/5 transition-all italic shadow-inner"
 placeholder="ROLE_EX"
 />
 <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
 </div>
 </div>
 <div className="space-y-4">
 <Label className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic px-2">권한 명칭</Label>
 <Input 
 value={authorFormData.authorNm}
 onChange={(e) => setAuthorFormData({...authorFormData, authorNm: e.target.value})}
 className="h-16 rounded-2xl border-2 bg-slate-50 font-black text-lg px-6 outline-none focus:ring-8 focus:ring-primary/5 transition-all italic shadow-xl"
 placeholder="관리자 권한"
 />
 </div>
 </div>
 <div className="space-y-4">
 <Label className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic px-2">설명</Label>
 <Textarea 
 value={authorFormData.authorDc}
 onChange={(e) => setAuthorFormData({...authorFormData, authorDc: e.target.value})}
 className="min-h-[140px] p-6 rounded-[2rem] border-2 bg-slate-50 font-bold text-base outline-none focus:bg-white transition-all shadow-inner leading-relaxed"
 placeholder="..."
 />
 </div>
 <div className="flex gap-6 pt-6">
 <Button type="button" variant="outline" onClick={() => setIsAuthorModalOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-tight opacity-40">취소</Button>
 <Button type="submit" className="flex-[2] h-14 bg-slate-900 text-white rounded-2xl font-black tracking-[0.3em] text-[10px] shadow-2xl shadow-slate-900/40">
 {saveAuthorMutation.isPending ? '저장 중...' : '설정 저장'}
 </Button>
 </div>
 </div>
 </StandardForm>
 </StandardModal>
 </div>
 );
}
