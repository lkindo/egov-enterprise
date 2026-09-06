'use client';

import { useRef, useState, use } from 'react';
import { z } from 'zod';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { templateAdminService, TmplatInfo } from '@/services/foundation/system/TemplateAdminService';
import { Layout, 
 Plus, 
 RefreshCcw,  
 CheckCircle2, 
 XCircle, 
 Code,
 Loader2,
 Pencil,
 Trash2 } from 'lucide-react';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { TemplateDtoSchema } from '@/types/generated-zod';

// [2026-08-29] 생성 DTO 가 이제 길이·필수를 스스로 말한다(백엔드 @Size/@NotBlank 추가).
// 여기서는 사용자에게 보일 한국어 사유만 덧입힌다 — 제약 자체를 여기서 창작하지 않는다.
export const templateFormSchema = TemplateDtoSchema.pick({
 tmpltId: true,
 tmpltNm: true,
 tmpltSeCd: true,
 tmpltPath: true,
 useYn: true,
}).extend({
 // [2026-08-29] tmpltId 는 PK 이자 NOT NULL 인데 폼이 아예 묻지 않아 **등록이 언제나 실패**했다.
 //   엔티티에 생성 전략이 없고 서버도 값을 만들지 않는다 — 사용자가 정하는 업무 키다.
 tmpltId: TemplateDtoSchema.shape.tmpltId.trim()
  .min(1, '템플릿 ID를 입력해 주세요.')
  .max(20, '템플릿 ID는 최대 20자까지 입력할 수 있습니다.'),
 tmpltNm: TemplateDtoSchema.shape.tmpltNm.trim()
  .min(1, '템플릿 명칭을 입력해 주세요.')
  .max(100, '템플릿 명칭은 최대 100자까지 입력할 수 있습니다.'),
 tmpltSeCd: TemplateDtoSchema.shape.tmpltSeCd.trim()
  .min(1, '카테고리를 선택해 주세요.')
  .max(12, '카테고리 코드는 최대 12자까지 입력할 수 있습니다.'),
 tmpltPath: TemplateDtoSchema.shape.tmpltPath.trim()
  .min(1, '소스 경로를 입력해 주세요.')
  .max(1000, '소스 경로는 최대 1000자까지 입력할 수 있습니다.'),
 useYn: TemplateDtoSchema.shape.useYn.pipe(z.enum(['Y', 'N'])),
});

const EMPTY_TEMPLATE: TmplatInfo = {
 tmpltId: '',
 tmpltNm: '',
 tmpltSeCd: 'TMPT01',
 tmpltPath: '',
 useYn: 'Y'
};

const templateValidationLabels = {
 tmpltId: '템플릿 ID',
 tmpltNm: '템플릿 명칭',
 tmpltSeCd: '카테고리',
 tmpltPath: '소스 경로',
 useYn: '상태',
};

export default function TemplateAdminClient({
 templatesPromise
}: {
 templatesPromise: Promise<TmplatInfo[]>
}) {
 const initialTemplates = use(templatesPromise);
 const { toast } = useToast();
 const [loading, setLoading] = useState(false);
 const [isAdding, setIsAdding] = useState(false);
 const addPendingRef = useRef(false);
 // 감사 P1-1: 새로고침 조회가 실패했을 때 목록을 그대로 두고 "0건"으로 위장하지 않도록
 // 실패를 상태로 보관해 StandardDataTable 의 error/onRetry 로 노출한다.
 const [loadError, setLoadError] = useState<Error | null>(null);
 const [templates, setTemplates] = useState(initialTemplates);
 const [isAddOpen, setIsAddOpen] = useState(false);
 const [newTemplate, setNewTemplate] = useState<TmplatInfo>(EMPTY_TEMPLATE);
 /**
  * 수정 대상 ID. null 이면 등록 다이얼로그다.
  * [2026-09-05 DEC-OPS-036] 종전에는 등록·조회만 가능했다(감사 D11-02). 템플릿 ID 는 PK 라 수정 모드에서 잠근다.
  */
 const [editingId, setEditingId] = useState<string | null>(null);
 const [deletingId, setDeletingId] = useState<string | null>(null);
 const deletePendingRef = useRef(false);
 const confirm = useConfirm();
 const validation = useManualFormValidation(templateFormSchema, { labels: templateValidationLabels });

 const handleRefresh = async () => {
 setLoading(true);
 try {
 const res = await templateAdminService.getTemplateList();
 setTemplates(res);
 setLoadError(null);
 } catch (err: unknown) {
 setLoadError(err instanceof Error ? err : new Error('템플릿 목록을 불러오지 못했습니다.'));
 toast('템플릿 목록을 불러오지 못했습니다.', 'error');
 } finally {
 setLoading(false);
 }
 };

 const handleAdd = async () => {
 if (addPendingRef.current) return;
 const validated = validation.validate(newTemplate);
 if (!validated) return;

 addPendingRef.current = true;
 setIsAdding(true);
 try {
 if (editingId) {
 await templateAdminService.updateTemplate(editingId, validated);
 toast('템플릿을 수정했습니다.', 'success');
 } else {
 await templateAdminService.createTemplate(validated);
 toast('새 템플릿을 등록했습니다.', 'success');
 }
 setIsAddOpen(false);
 setEditingId(null);
 await handleRefresh();
 } catch (err: unknown) {
 const fieldErrors = extractFieldErrors(err);
 if (fieldErrors) validation.setFormErrors(fieldErrors);
 else toast(extractErrorMessage(err, editingId ? '템플릿 수정에 실패했습니다.' : '템플릿 등록에 실패했습니다.'), 'error');
 } finally {
 addPendingRef.current = false;
 setIsAdding(false);
 }
 };

 const handleOpenAdd = () => {
 validation.setFormErrors({}, false);
 setEditingId(null);
 setNewTemplate(EMPTY_TEMPLATE);
 setIsAddOpen(true);
 };

 const handleOpenEdit = (item: TmplatInfo) => {
 validation.setFormErrors({}, false);
 setEditingId(item.tmpltId);
 setNewTemplate({ tmpltId: item.tmpltId, tmpltNm: item.tmpltNm, tmpltSeCd: item.tmpltSeCd, tmpltPath: item.tmpltPath, useYn: item.useYn });
 setIsAddOpen(true);
 };

 const handleDelete = async (item: TmplatInfo) => {
 if (deletePendingRef.current) return;
 deletePendingRef.current = true;
 setDeletingId(item.tmpltId);
 try {
 const ok = await confirm({
 title: '템플릿 삭제',
 message: `'${item.tmpltNm}' 템플릿을 삭제합니다. 이 템플릿을 가리키는 게시판은 서식 ID 만 남깁니다. 삭제한 템플릿은 복구할 수 없습니다.`,
 confirmText: '삭제',
 variant: 'destructive',
 });
 if (!ok) return;
 await templateAdminService.deleteTemplate(item.tmpltId);
 toast('템플릿을 삭제했습니다.', 'success');
 await handleRefresh();
 } catch (err: unknown) {
 toast(extractErrorMessage(err, '템플릿 삭제에 실패했습니다.'), 'error');
 } finally {
 deletePendingRef.current = false;
 setDeletingId(null);
 }
 };

 const handleAddOpenChange = (open: boolean) => {
 if (!open && addPendingRef.current) return;
 setIsAddOpen(open);
 if (!open) setEditingId(null);
 };

 const columns = [
 {
 header: '템플릿 ID',
 accessor: (item: TmplatInfo) => (
 <span className="font-mono font-bold text-muted-foreground text-xs tracking-tight">{item.tmpltId}</span>
 )
 },
 {
 header: '템플릿 명',
 accessor: (item: TmplatInfo) => (
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-md">
 <Layout size={14} />
 </div>
 <span className="font-bold tracking-tighter text-foreground">{item.tmpltNm}</span>
 </div>
 )
 },
 {
 header: '구분',
 accessor: (item: TmplatInfo) => (
 <span className="text-xs font-bold text-muted-foreground tracking-tight bg-muted px-2 py-1 rounded-md ">
 {item.tmpltSeCd === 'TMPT01' ? '게시판' : item.tmpltSeCd === 'TMPT02' ? '커뮤니티' : '일반'}
 </span>
 )
 },
 {
 header: '템플릿 경로',
 accessor: (item: TmplatInfo) => (
 <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs ">
 <Code size={12} />
 {item.tmpltPath}
 </div>
 )
 },
 {
 header: '사용 여부',
 accessor: (item: TmplatInfo) => (
 <div className={cn(
 "flex items-center gap-2 px-3 py-1 rounded-lg border w-fit transition-all",
 item.useYn === 'Y' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-muted text-muted-foreground border-border"
 )}>
 {item.useYn === 'Y' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
 <span className="text-xs font-bold tracking-tight ">{item.useYn === 'Y' ? '활성' : '비활성'}</span>
 </div>
 )
 },
 {
 header: '관리',
 className: 'text-right w-28',
 accessor: (item: TmplatInfo) => {
 const isDeleting = deletingId === item.tmpltId;
 return (
 <div className="flex items-center justify-end gap-1 pr-2">
 <Button
 variant="ghost"
 size="icon"
 disabled={deletingId !== null || isAdding}
 aria-label={`${item.tmpltNm} 수정`}
 onClick={() => handleOpenEdit(item)}
 className="w-10 h-10 rounded-lg hover:bg-muted transition-colors"
 >
 <Pencil size={16} aria-hidden="true" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 disabled={deletingId !== null}
 aria-busy={isDeleting}
 aria-label={isDeleting ? `${item.tmpltNm} 삭제 중` : `${item.tmpltNm} 삭제`}
 onClick={() => { void handleDelete(item); }}
 className="w-10 h-10 rounded-lg hover:bg-destructive/10 hover:text-destructive-emphasis transition-colors"
 >
 {isDeleting
 ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
 : <Trash2 size={16} aria-hidden="true" />}
 </Button>
 </div>
 );
 }
 }
 ];

 return (
 <WorkListPage
 title="템플릿 관리"
 description="게시판·화면 구성에 쓰는 시스템 템플릿을 조회·등록합니다."
 breadcrumbItems={[{ label: '시스템관리' }, { label: '커뮤니티관리' }, { label: '템플릿관리' }]}
 totalCount={loadError ? undefined : templates.length}
 actions={
 <>
 <Button
 onClick={() => void handleRefresh()}
 disabled={loading}
 variant="outline"
 size="sm"
 aria-label="템플릿 목록 새로고침"
 className="gap-2"
 >
 <RefreshCcw size={16} className={cn(loading && "animate-spin")} aria-hidden="true" />
 새로고침
 </Button>
 <Button size="sm" onClick={handleOpenAdd} className="gap-2">
 <Plus size={16} aria-hidden="true" />
 신규 템플릿 등록
 </Button>
 </>
 }
 >
 <StandardDataTable
 accessibleLabel="템플릿 목록"
 columns={columns}
 data={templates}
 loading={loading}
 error={loadError}
 onRetry={() => void handleRefresh()}
 emptyMessage="등록된 템플릿이 없습니다."
 />

 <Dialog open={isAddOpen} onOpenChange={handleAddOpenChange}>
 <DialogContent className="sm:max-w-[500px] rounded-lg p-10 border-none shadow-2xl bg-card">
 <DialogHeader className="space-y-4">
 <div className="w-16 h-11 bg-primary text-white rounded-lg flex items-center justify-center shadow-2xl shadow-primary/20 mx-auto">
 <Plus size={28} />
 </div>
 <DialogTitle className="text-3xl font-bold text-foreground tracking-tighter text-center">{editingId ? '템플릿 수정' : '신규 블루프린트 등록'}</DialogTitle>
 <DialogDescription className="text-center font-bold text-muted-foreground text-sm">
 {editingId ? '템플릿 ID 는 바꿀 수 없습니다. 명칭·카테고리·경로·상태를 고칩니다.' : '시스템에 새로운 UI/UX 구조를 정의합니다.'}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-8 py-8">
 <FormErrorSummary
 errors={validation.errors}
 labels={templateValidationLabels}
 onNavigate={validation.focusError}
 />
 <div className="space-y-3">
 <label htmlFor="tmplt-id" className="text-xs font-bold text-muted-foreground tracking-tight ml-2">템플릿 ID</label>
 <Input
 id="tmplt-id"
 {...validation.fieldProps('tmpltId')}
 placeholder="예: TMPLT_NOTICE"
 value={newTemplate.tmpltId ?? ''}
 onChange={(e) => {
 validation.clearError('tmpltId');
 setNewTemplate(prev => ({ ...prev, tmpltId: e.target.value }));
 }}
 required
 maxLength={20}
 disabled={editingId !== null}
 className="h-11 px-8 rounded-lg border-2 border-border bg-muted/50 text-lg font-bold focus:bg-card focus:ring-4 focus:ring-primary/10 transition-all shadow-inner disabled:opacity-60"
 />
 {validation.errors.tmpltId ? <p {...validation.messageProps('tmpltId')} className="text-xs font-bold text-destructive-emphasis ml-2" /> : null}
 </div>

 <div className="space-y-3">
 <label htmlFor="tmplt-nm" className="text-xs font-bold text-muted-foreground tracking-tight ml-2">템플릿 명칭</label>
 <Input
 id="tmplt-nm"
 {...validation.fieldProps('tmpltNm')}
 placeholder="템플릿 명..."
 value={newTemplate.tmpltNm}
 onChange={(e) => {
 validation.clearError('tmpltNm');
 setNewTemplate(prev => ({ ...prev, tmpltNm: e.target.value }));
 }}
 required
 maxLength={100}
 className="h-11 px-8 rounded-lg border-2 border-border bg-muted/50 text-lg font-bold focus:bg-card focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
 />
 {validation.errors.tmpltNm ? <p {...validation.messageProps('tmpltNm')} className="text-xs font-bold text-destructive-emphasis ml-2" /> : null}
 </div>

 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-3">
 <label htmlFor="tmplt-se-cd" className="text-xs font-bold text-muted-foreground tracking-tight ml-2">카테고리</label>
 <Select
 value={newTemplate.tmpltSeCd}
 onValueChange={(v) => {
 validation.clearError('tmpltSeCd');
 setNewTemplate(prev => ({ ...prev, tmpltSeCd: v }));
 }}
 >
 <SelectTrigger id="tmplt-se-cd" {...validation.fieldProps('tmpltSeCd')} aria-required="true" className="h-11 rounded-lg border-2 border-border bg-muted/50 font-bold text-xs tracking-tight focus:bg-card">
 <SelectValue placeholder="카테고리 선택" />
 </SelectTrigger>
 <SelectContent className="rounded-lg border-none shadow-2xl">
 <SelectItem value="TMPT01" className="font-bold text-xs tracking-tight ">게시판</SelectItem>
 <SelectItem value="TMPT02" className="font-bold text-xs tracking-tight ">커뮤니티</SelectItem>
 <SelectItem value="TMPT03" className="font-bold text-xs tracking-tight ">일반</SelectItem>
 </SelectContent>
 </Select>
 {validation.errors.tmpltSeCd ? <p {...validation.messageProps('tmpltSeCd')} className="text-xs font-bold text-destructive-emphasis ml-2" /> : null}
 </div>
 <div className="space-y-3">
 <label htmlFor="tmplt-use-yn" className="text-xs font-bold text-muted-foreground tracking-tight ml-2">상태</label>
 <Select
 value={newTemplate.useYn}
 onValueChange={(v) => {
 validation.clearError('useYn');
 setNewTemplate(prev => ({ ...prev, useYn: v }));
 }}
 >
 <SelectTrigger id="tmplt-use-yn" {...validation.fieldProps('useYn')} aria-required="true" className="h-11 rounded-lg border-2 border-border bg-muted/50 font-bold text-xs tracking-tight focus:bg-card">
 <SelectValue placeholder="상태 선택" />
 </SelectTrigger>
 <SelectContent className="rounded-lg border-none shadow-2xl">
 <SelectItem value="Y" className="font-bold text-xs tracking-tight ">활성</SelectItem>
 <SelectItem value="N" className="font-bold text-xs tracking-tight ">비활성</SelectItem>
 </SelectContent>
 </Select>
 {validation.errors.useYn ? <p {...validation.messageProps('useYn')} className="text-xs font-bold text-destructive-emphasis ml-2" /> : null}
 </div>
 </div>

 <div className="space-y-3">
 <label htmlFor="tmplt-path" className="text-xs font-bold text-muted-foreground tracking-tight ml-2">소스 경로</label>
 <div className="relative">
 <Code className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} aria-hidden="true" />
 <Input
 id="tmplt-path"
 {...validation.fieldProps('tmpltPath')}
 placeholder="/src/templates/..."
 value={newTemplate.tmpltPath}
 onChange={(e) => {
 validation.clearError('tmpltPath');
 setNewTemplate(prev => ({ ...prev, tmpltPath: e.target.value }));
 }}
 required
 maxLength={1000}
 className="h-11 pl-16 pr-8 rounded-lg border-2 border-border bg-muted/50 font-mono text-sm font-bold focus:bg-card focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
 />
 </div>
 {validation.errors.tmpltPath ? <p {...validation.messageProps('tmpltPath')} className="text-xs font-bold text-destructive-emphasis ml-2" /> : null}
 </div>
 </div>

 <DialogFooter>
 <Button
 type="button"
 variant="outline"
 disabled={isAdding}
 onClick={() => handleAddOpenChange(false)}
 className="h-11 px-10 rounded-lg border-2 border-border font-bold text-sm tracking-tight hover:bg-muted transition-all"
 >
 취소
 </Button>
 <Button
 type="button"
 onClick={handleAdd}
 disabled={loading || isAdding}
 aria-busy={isAdding || undefined}
 aria-label={isAdding ? (editingId ? '템플릿 수정 중' : '템플릿 등록 중') : (editingId ? '수정 승인' : '등록 승인')}
 className="h-11 px-14 bg-surface-inverse text-surface-inverse-foreground rounded-lg font-bold text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 flex-1"
 >
 {isAdding ? <RefreshCcw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
 {isAdding ? (editingId ? '수정 중...' : '등록 중...') : (editingId ? '수정 승인' : '등록 승인')}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </WorkListPage>
 );
}

