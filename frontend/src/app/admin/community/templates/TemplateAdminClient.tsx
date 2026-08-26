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
 Code } from 'lucide-react';
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

// Generated DTO가 누락한 필드 제약은 실제 Template 엔티티/물리 스키마의 non-null·길이 계약을 보강한다.
export const templateFormSchema = TemplateDtoSchema.pick({
 tmpltNm: true,
 tmpltSeCd: true,
 tmpltPath: true,
 useYn: true,
}).extend({
 tmpltNm: TemplateDtoSchema.shape.tmpltNm.unwrap().trim()
  .min(1, '템플릿 명칭을 입력해 주세요.')
  .max(100, '템플릿 명칭은 최대 100자까지 입력할 수 있습니다.'),
 tmpltSeCd: TemplateDtoSchema.shape.tmpltSeCd.unwrap().trim()
  .min(1, '카테고리를 선택해 주세요.')
  .max(12, '카테고리 코드는 최대 12자까지 입력할 수 있습니다.'),
 tmpltPath: TemplateDtoSchema.shape.tmpltPath.unwrap().trim()
  .min(1, '소스 경로를 입력해 주세요.')
  .max(1000, '소스 경로는 최대 1000자까지 입력할 수 있습니다.'),
 useYn: TemplateDtoSchema.shape.useYn.pipe(z.enum(['Y', 'N'])),
});

const templateValidationLabels = {
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
 const [newTemplate, setNewTemplate] = useState<TmplatInfo>({
 tmpltNm: '',
 tmpltSeCd: 'TMPT01',
 tmpltPath: '',
 useYn: 'Y'
 });
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
 await templateAdminService.createTemplate(validated);
 toast('새 템플릿을 등록했습니다.', 'success');
 setIsAddOpen(false);
 await handleRefresh();
 } catch (err: unknown) {
 const fieldErrors = extractFieldErrors(err);
 if (fieldErrors) validation.setFormErrors(fieldErrors);
 else toast(extractErrorMessage(err, '템플릿 등록에 실패했습니다.'), 'error');
 } finally {
 addPendingRef.current = false;
 setIsAdding(false);
 }
 };

 const handleOpenAdd = () => {
 validation.setFormErrors({}, false);
 setIsAddOpen(true);
 };

 const handleAddOpenChange = (open: boolean) => {
 if (!open && addPendingRef.current) return;
 setIsAddOpen(open);
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
 <DialogTitle className="text-3xl font-bold text-foreground tracking-tighter text-center">신규 블루프린트 등록</DialogTitle>
 <DialogDescription className="text-center font-bold text-muted-foreground text-sm">
 시스템에 새로운 UI/UX 구조를 정의합니다.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-8 py-8">
 <FormErrorSummary
 errors={validation.errors}
 labels={templateValidationLabels}
 onNavigate={validation.focusError}
 />
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
 aria-label={isAdding ? '템플릿 등록 중' : '등록 승인'}
 className="h-11 px-14 bg-surface-inverse text-surface-inverse-foreground rounded-lg font-bold text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 flex-1"
 >
 {isAdding ? <RefreshCcw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
 {isAdding ? '등록 중...' : '등록 승인'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </WorkListPage>
 );
}

