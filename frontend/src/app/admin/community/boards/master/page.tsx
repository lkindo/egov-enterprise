'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
 Plus, 
 Settings2, 
 Layers,
 BookOpen,
 ImageIcon,
 List as ListIcon,
 Rocket,
 ArrowRight,
 TrendingUp,
 Zap,
 ShieldCheck,
 MoreVertical,
 FileText,
 Trash2,
 AlertTriangle,
 Lock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { boardAdminService, BoardMaster } from '@/services/foundation/system/BoardAdminService';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { PageHeader } from '@/app/components/layout/page-header';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { 
 Dialog, 
 DialogContent, 
 DialogHeader, 
 DialogTitle, 
 DialogDescription,
 DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LucideIcon } from 'lucide-react';

const container = {
 hidden: { opacity: 0 },
 show: {
 opacity: 1,
 transition: {
 staggerChildren: 0.1
 }
 }
};

const item = {
 hidden: { y: 20, opacity: 0 },
 show: { y: 0, opacity: 1 }
};

interface InsightCardProps {
 label: string;
 value: string;
 desc: string;
 icon: LucideIcon;
 color: string;
}

export default function BoardMasterListPage() {
 const router = useRouter();
 const confirm = useConfirm();
 const { toast } = useToast();
 const [searchWrd, setSearchWrd] = useState('');
 
 // Settings Modal State
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [selectedBoard, setSelectedBoard] = useState<BoardMaster | null>(null);
 const [editData, setEditData] = useState<Partial<BoardMaster>>({});

 const { data: boardData, isLoading, refetch } = useQuery({
 queryKey: ['boardMasters', searchWrd],
 queryFn: () => boardAdminService.getBoardMasterList({ searchWrd })
 });

 const boardList = (boardData?.list || []) as BoardMaster[];

 const handleEdit = (board: BoardMaster) => {
 setSelectedBoard(board);
 setEditData({
 bbsNm: board.bbsNm,
 bbsIntrcn: board.bbsIntrcn,
 useAt: board.useAt
 });
 setIsModalOpen(true);
 };

 const handleSave = async () => {
 if (!selectedBoard || !selectedBoard.bbsId) return;
 try {
 await boardAdminService.updateBoardMaster(selectedBoard.bbsId, editData);
 toast('게시???�정???�데?�트?�었?�니??', 'success');
 setIsModalOpen(false);
 refetch();
 } catch (error) {
 toast('?�데?�트 �??�류가 발생?�습?�다.', 'error');
 }
 };

 const handleDelete = async (board: BoardMaster) => {
 const isConfirmed = await confirm({
 title: '게시???�전 ??��',
 message: `[${board.bbsNm}] 게시?�을 ?�구?�으�???��?�시겠습?�까? ???�업?� ?�돌�????�습?�다.`,
 confirmText: '??��',
 variant: 'destructive'
 });

 if (isConfirmed && board.bbsId) {
 try {
 // userId???�재 로그?�한 ?�용???�보�??�용?�야 ?�나, ?�기???�시�?'admin' ?�용
 await boardAdminService.deleteBoardMaster(board.bbsId, 'admin');
 toast('게시?�이 ??��?�었?�니??', 'success');
 refetch();
 } catch (error) {
 toast('??�� �??�류가 발생?�습?�다.', 'error');
 }
 }
 };

 const columns: Column<BoardMaster>[] = [
 {
 header: '마스???�이??,
 accessor: (board: BoardMaster) => (
 <div className="flex items-center gap-6 group">
 <div className="w-12 h-12 rounded-lg bg-background border-2 border-border/50 shadow-sm flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-500">
 {board.bbsTyCodeNm?.includes('지??) ? <BookOpen size={24} /> : 
 board.bbsTyCodeNm === 'Visual Gallery' ? <ImageIcon size={24} /> : 
 <ListIcon size={24} />}
 </div>
 <div className="space-y-1 text-left">
 <p className="text-xl font-bold text-foreground tracking-tight leading-none">{board.bbsNm}</p>
 <p className="text-xs font-bold text-muted-foreground/40 uppercase leading-none tracking-widest">{board.bbsId}</p>
 </div>
 </div>
 ),
 className: 'px-10'
 },
 {
 header: '메�? ?�보',
 accessor: (board: BoardMaster) => (
 <div className="space-y-1.5 text-left">
 <p className="text-sm font-medium text-slate-500 line-clamp-1 leading-snug">{board.bbsIntrcn}</p>
 <div className="flex gap-2">
 <Badge variant="secondary" className="bg-muted text-muted-foreground border-none px-3 font-bold text-xs uppercase tracking-tight">
 {board.bbsTyCodeNm}
 </Badge>
 </div>
 </div>
 )
 },
 {
 header: '?�태',
 accessor: (board: BoardMaster) => (
 <div className="flex justify-center">
 <Badge className={cn(
 "px-4 py-1.5 rounded-full font-bold text-xs uppercase border-none tracking-widest shadow-sm",
 board.useAt === 'Y' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
 )}>
 {board.useAt === 'Y' ? '?�성' : '?��?}
 </Badge>
 </div>
 ),
 className: 'text-center'
 },
 {
 header: '?�용??,
 accessor: (_board: BoardMaster) => (
 <div className="space-y-1 text-center">
 <p className="text-lg font-bold text-foreground ">0</p>
 <p className="text-xs font-bold text-muted-foreground/40 uppercase leading-none">게시글 ??/p>
 </div>
 ),
 className: 'text-center'
 },
 {
 header: '?�업 컨트�?,
 accessor: (board: BoardMaster) => (
 <div className="flex items-center justify-end gap-3 pr-6">
 <Button 
 onClick={() => handleEdit(board)}
 size="icon" 
 variant="ghost" 
 className="w-10 h-10 rounded-lg text-muted-foreground hover:bg-primary hover:text-white transition-all shadow-sm"
 >
 <Settings2 size={18} />
 </Button>
 <Button 
 onClick={() => handleDelete(board)}
 size="icon" 
 variant="ghost" 
 className="w-10 h-10 rounded-lg text-muted-foreground hover:bg-rose-500 hover:text-white transition-all shadow-sm"
 >
 <Trash2 size={18} />
 </Button>
 <Button 
 onClick={() => router.push(`/admin/community/boards/selectBoardList?bbsId=${board.bbsId}`)}
 size="icon" 
 variant="ghost" 
 className="w-10 h-10 rounded-lg text-muted-foreground hover:bg-slate-900 dark:hover:bg-white dark:hover:text-slate-900 hover:text-white transition-all shadow-sm"
 >
 <ArrowRight size={18} />
 </Button>
 </div>
 ),
 className: 'pr-10 text-right'
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000 max-w-[1600px] mx-auto px-4">
 <PageHeader 
 title="게시??마스?? 
 breadcrumbs={[{ label: '커�??�티' }, { label: '게시??관�? }, { label: '마스??콘솔' }]} 
 />

 <HubHeader 
 title="마스??콘솔" 
 highlight="게시???�합 관�? 
 subtitle="?�성??모든 게시?�의 ?�이?�사?�클�?권한 매트�?���??�시간으�??�어?�고 모니?�링?�니?? 
 icon={Settings2} 
 actions={
 <Button 
 onClick={() => router.push('/admin/community/boards/maker')}
 className="h-12 px-8 rounded-lg bg-slate-900 dark:bg-primary border-none text-white font-bold text-sm shadow-xl hover:scale-105 active:scale-95 transition-all gap-4 ring-8 ring-slate-900/5 dark:ring-primary/5 group"
 >
 <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
 ?�성 마법?? <Rocket className="w-4 h-4 text-primary dark:text-white opacity-40 group-hover:text-primary group-hover:opacity-100 transition-all" />
 </Button>
 }
 />

 <motion.div 
 variants={container}
 initial="hidden"
 animate="show"
 className="grid grid-cols-1 md:grid-cols-4 gap-8"
 >
 <InsightCard label="총계" value="32" desc="Active Board Masters" icon={Layers} color="text-indigo-500" />
 <InsightCard label="교류" value="1.2k" desc="Engagement Traffic" icon={TrendingUp} color="text-rose-500" />
 <InsightCard label="?�스?? value="Optimal" desc="Storage Status" icon={Zap} color="text-emerald-500" />
 <InsightCard label="보안" value="L4" desc="Encrypted Access" icon={ShieldCheck} color="text-amber-500" />
 </motion.div>

 <div className="hub-table-container">
 <StandardDataTable<BoardMaster>
 columns={columns}
 data={boardList}
 loading={isLoading}
 isPremium={true}
 enableSelection={true}
 bulkActions={[
 {
 label: '?�괄 ?�성??,
 icon: <Zap size={16} />,
 onClick: (items) => toast(`${items.length}개의 게시?�이 즉시 ?�성?�됩?�다.`, 'success')
 },
 {
 label: '?�괄 비활??,
 icon: <Lock size={16} />,
 onClick: (items) => toast(`${items.length}개의 게시?�이 ?��??�태�??�환?�니??`, 'info')
 },
 {
 label: '?�전 말소',
 icon: <Trash2 size={16} />,
 variant: 'destructive',
 onClick: (items) => toast(`${items.length}개의 마스???�이??말소 ?�로?�스 가??`, 'error')
 }
 ]}
 search={{
 placeholder: '게시??명칭, ?�스??ID 검??.',
 onSearch: (keyword) => setSearchWrd(keyword)
 }}
 />
 </div>

 <div className="p-12 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-none text-slate-900 dark:text-white overflow-hidden relative group transition-colors">
 <div className="absolute top-0 right-0 p-20 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-[10s] pointer-events-none grayscale">
 <Rocket size={400} />
 </div>
 <div className="max-w-3xl space-y-8 relative z-10">
 <h3 className="text-3xl font-bold tracking-tight leading-tight uppercase transition-colors">Ready to scale your <span className="text-primary underline decoration-primary/30 decoration-4 underline-offset-4">ecosystem?</span></h3>
 <p className="text-lg text-slate-500 dark:text-slate-400 font-bold leading-relaxed tracking-tight transition-colors">?�태계�? ?�장??준비�? ?�셨?�니�? 마법?��? ?�해 복잡??과정 ?�이 ??4?�계만으�??�내 지???�브�?구축?�십?�오.</p>
 <Button 
 onClick={() => router.push('/admin/community/boards/maker')}
 className="h-12 px-10 rounded-lg bg-primary text-white text-xl font-bold tracking-tight shadow-[0_30px_60px_-15px_rgba(59,130,246,0.4)] hover:scale-110 active:scale-95 transition-all gap-4 ring-8 ring-primary/5 "
 >
 ?�이�?마법???�행 <Rocket className="w-6 h-6" />
 </Button>
 </div>
 </div>

 {/* Settings Modal */}
 <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
 <DialogContent className="sm:max-w-[600px] rounded-lg p-0 overflow-hidden border-none shadow-2xl">
 <div className="bg-slate-900 p-10 text-white relative">
 <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
 <Settings2 size={120} />
 </div>
 <DialogHeader className="relative z-10">
 <DialogTitle className="text-2xl font-bold tracking-tight uppercase">Board Configuration</DialogTitle>
 <DialogDescription className="text-slate-400 font-bold uppercase tracking-widest text-xs">
 게시??마스???�정 매트�?��
 </DialogDescription>
 </DialogHeader>
 </div>
 
 <div className="p-10 space-y-8 bg-white dark:bg-slate-950 transition-colors">
 <div className="space-y-3">
 <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">게시??명칭</Label>
 <Input 
 id="modal-bbs-name"
 value={editData.bbsNm || ''} 
 onChange={(e) => setEditData({...editData, bbsNm: e.target.value})}
 className="h-12 rounded-lg border-2 font-bold text-lg focus:ring-4 focus:ring-primary/10 transition-all"
 />
 </div>

 <div className="space-y-3">
 <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">게시???�개</Label>
 <Input 
 id="modal-bbs-description"
 value={editData.bbsIntrcn || ''} 
 onChange={(e) => setEditData({...editData, bbsIntrcn: e.target.value})}
 className="h-12 rounded-lg border-2 font-bold focus:ring-4 focus:ring-primary/10 transition-all"
 />
 </div>

 <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 transition-colors">
 <div className="space-y-1">
 <p className="font-bold text-slate-900 dark:text-white transition-colors text-left">?�비???�성???�태</p>
 <p className="text-xs text-slate-400 font-bold uppercase tracking-tight transition-colors text-left">?�성????모든 ?�결??메뉴?�서 ?�비?��? ?�개?�니??</p>
 </div>
 <Switch 
 id="modal-bbs-use-at"
 checked={editData.useAt === 'Y'} 
 onCheckedChange={(checked) => setEditData({...editData, useAt: checked ? 'Y' : 'N'})}
 className="scale-125"
 />
 </div>

 <div className="p-6 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-900/50 flex items-start gap-4 transition-colors">
 <AlertTriangle className="text-rose-500 shrink-0 mt-1" size={20} />
 <div className="space-y-1">
 <p className="font-bold text-rose-900 dark:text-rose-100 text-sm transition-colors text-left">주의?�항</p>
 <p className="text-xs text-rose-600/70 dark:text-rose-400 font-medium leading-relaxed transition-colors text-left">
 게시?�을 비활?�화(?��??�면 기존 링크�??�한 ?�근??차단?�니?? 
 ?�구 ??���??�하?�면 목록????��(?��??? ?�이콘을 ?�용?�십?�오.
 </p>
 </div>
 </div>
 </div>

 <DialogFooter className="p-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 transition-colors">
 <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-12 px-8 rounded-lg font-bold">취소</Button>
 <Button onClick={handleSave} className="h-12 px-10 rounded-lg bg-primary text-white font-bold tracking-tight hover:scale-105 transition-all shadow-xl shadow-primary/20">?�정 ?�용?�기</Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}

function InsightCard({ label, value, desc, icon: Icon, color }: InsightCardProps) {
 return (
 <motion.div variants={item} className="hub-card-premium p-8 space-y-6 group hover:ring-[30px] hover:ring-slate-100/30 transition-all border-2 border-slate-50/50 rounded-lg">
 <div className="flex items-center justify-between">
 <div className={cn("w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 group-hover:scale-110 transition-transform text-slate-400", color)}>
 <Icon size={24} />
 </div>
 <MoreVertical className="text-slate-200 dark:text-slate-700" size={20} />
 </div>
 <div className="space-y-1">
 <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest leading-none text-left">{label}</p>
 <h4 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-none group-hover:text-primary transition-colors text-left">{value}</h4>
 <p className="text-xs font-bold text-slate-400/60 dark:text-slate-300 uppercase leading-none mt-2 text-left">{desc}</p>
 </div>
 </motion.div>
 );
}

