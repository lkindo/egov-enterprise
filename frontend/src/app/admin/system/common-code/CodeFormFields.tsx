/**
 * 공통코드 관리 화면의 분류·그룹·상세 코드 입력 필드.
 *
 * 폼 인스턴스·<form> 제출·저장 잠금·오류 요약은 CommonCodeClient 가 소유한다(폼 검증 census 의 소유자).
 * 이 파일은 필드 배치만 둔다 — 여기에 제출·저장 호출을 옮기지 않는다.
 */
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import {
 FormControl,
 FormField as ShadcnFormField,
 FormItem,
 FormLabel,
 FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AppFormReturn } from '@/hooks/useAppForm';
import type { CmmnClCode } from '@/types/foundation/system';
import type { codeClusterFormSchema, codeDetailFormSchema, codeGroupFormSchema } from './common-code-form-schemas';

type StructureMode = 'create' | 'edit';

export function CodeClusterFields({
 form,
 mode,
}: {
 form: AppFormReturn<z.infer<typeof codeClusterFormSchema>>;
 mode: StructureMode;
}) {
 return (
 <>
 <ShadcnFormField
 control={form.control}
 name="clsfCd"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">분류 코드</FormLabel>
 <FormControl>
 <Input
 {...field}
 readOnly={mode === 'edit'}
 maxLength={12}
 className="h-11 rounded-lg border-none bg-muted font-mono text-xs font-bold shadow-inner"
 placeholder="예: SYS (최대 12자)"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={form.control}
 name="clsfCdNm"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">분류명</FormLabel>
 <FormControl>
 <Input {...field} maxLength={100} className="h-11 rounded-lg border-none bg-muted text-sm font-bold shadow-inner" placeholder="분류명 입력 (최대 100자)" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={form.control}
 name="useYn"
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">사용 여부</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-none bg-muted text-xs font-bold shadow-inner">
 <SelectValue />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="rounded-lg shadow-xl z-[9999]">
 <SelectItem value="Y" className="h-12 rounded-lg text-xs font-bold text-success-emphasis">사용 중</SelectItem>
 <SelectItem value="N" className="h-12 rounded-lg text-xs font-bold text-destructive-emphasis">미사용</SelectItem>
 </SelectContent>
 </Select>
 <p className="px-1 text-xs text-muted-foreground">
 미사용으로 바꾸면 이 분류에 속한 코드 그룹이 목록에서 함께 사라집니다(그룹·상세 코드는 지워지지 않습니다).
 </p>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={form.control}
 name="clsfCdExpln"
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">분류 설명</FormLabel>
 <FormControl>
 <textarea {...field} maxLength={4000} className="w-full min-h-[120px] resize-none rounded-lg border-none bg-muted p-4 text-xs font-bold shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="이 분류가 무엇을 묶는지 설명 (최대 4000자)" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 </>
 );
}

export function CodeGroupFields({
 form,
 mode,
 clCodes,
}: {
 form: AppFormReturn<z.infer<typeof codeGroupFormSchema>>;
 mode: StructureMode;
 clCodes: CmmnClCode[];
}) {
 return (
 <>
 <ShadcnFormField
 control={form.control}
 name="cdId"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">그룹 코드</FormLabel>
 <FormControl>
 <Input
 {...field}
 readOnly={mode === 'edit'}
 maxLength={20}
 className="h-11 rounded-lg border-none bg-muted font-mono text-xs font-bold shadow-inner"
 placeholder="예: COM001 (최대 20자)"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={form.control}
 name="cdIdNm"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">그룹명</FormLabel>
 <FormControl>
 <Input {...field} maxLength={100} className="h-11 rounded-lg border-none bg-muted text-sm font-bold shadow-inner" placeholder="그룹명 입력 (최대 100자)" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 {mode === 'create' ? (
 <ShadcnFormField
 control={form.control}
 name="clsfCd"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">소속 분류</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-none bg-muted text-xs font-bold shadow-inner">
 <SelectValue placeholder="분류 선택" />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="rounded-lg shadow-xl z-[9999]">
 {clCodes.map((cl) => (
 <SelectItem key={cl.clsfCd} value={cl.clsfCd} className="h-12 rounded-lg text-xs font-bold">
 {cl.clsfCdNm} ({cl.clsfCd})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 ) : (
 <div className="space-y-1.5">
 <span id="cmmn-group-cluster-label" className="text-xs font-bold text-foreground">소속 분류</span>
 <div
 aria-labelledby="cmmn-group-cluster-label"
 className="flex h-11 items-center rounded-lg bg-muted px-4 font-mono text-xs font-bold text-muted-foreground shadow-inner"
 >
 {form.getValues('clsfCd')}
 </div>
 {/* 서버의 updateCmmnCode 는 clsfCd 를 갱신하지 않는다. 편집 가능한 것처럼 보이면 저장된 척하고 아무 일도 일어나지 않는다. */}
 <p className="px-1 text-xs text-muted-foreground">
 소속 분류는 이 창에서 바꿀 수 없습니다. 왼쪽 탐색기에서 그룹을 다른 분류로 끌어다 놓은 뒤 &lsquo;그룹 소속 저장&rsquo;을 누르세요.
 </p>
 </div>
 )}
 <ShadcnFormField
 control={form.control}
 name="useYn"
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">사용 여부</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-none bg-muted text-xs font-bold shadow-inner">
 <SelectValue />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="rounded-lg shadow-xl z-[9999]">
 <SelectItem value="Y" className="h-12 rounded-lg text-xs font-bold text-success-emphasis">사용 중</SelectItem>
 <SelectItem value="N" className="h-12 rounded-lg text-xs font-bold text-destructive-emphasis">미사용</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={form.control}
 name="cdIdExpln"
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">그룹 설명</FormLabel>
 <FormControl>
 <textarea {...field} maxLength={4000} className="w-full min-h-[120px] resize-none rounded-lg border-none bg-muted p-4 text-xs font-bold shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="이 그룹의 용도와 제약 설명 (최대 4000자)" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 </>
 );
}

export function CodeDetailFields({
 form,
 parentGroupId,
 isEditing,
}: {
 form: AppFormReturn<z.infer<typeof codeDetailFormSchema>>;
 parentGroupId?: string;
 isEditing: boolean;
}) {
 return (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
 <div className="space-y-8">
 {/* [P2] 폼 컨트롤이 아닌 읽기 전용 표시라 <label> 이 아닌 <span> + aria-describedby 로 연결한다. */}
 <div className="space-y-1.5 p-0.5">
 <span id="cmmn-parent-group-label" className="ml-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
 상위 그룹 식별자
 </span>
 <div
 aria-labelledby="cmmn-parent-group-label"
 className="h-11 flex items-center px-6 rounded-lg bg-muted border-none font-mono text-xs font-bold shadow-inner text-muted-foreground"
 >
 {parentGroupId}
 </div>
 </div>

 <ShadcnFormField
 control={form.control}
 name="dtlCd"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="ml-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
 코드 식별자 (Unique ID)
 </FormLabel>
 <FormControl>
 <Input
 {...field}
 readOnly={isEditing}
 maxLength={12}
 className="h-11 rounded-lg font-mono text-xs font-bold shadow-inner border-none bg-muted focus:bg-card transition-all text-left"
 placeholder="Unique code indicator (최대 12자)"
 />
 </FormControl>
 <FormMessage className="mt-1 px-1 text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />

 <ShadcnFormField
 control={form.control}
 name="dtlCdNm"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="ml-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
 표기 레이블 (Label)
 </FormLabel>
 <FormControl>
 <Input
 {...field}
 maxLength={100}
 className="h-11 rounded-lg text-sm font-bold tracking-tight shadow-inner border-none bg-muted focus:bg-card transition-all text-left"
 placeholder="레이블 명칭 입력 (최대 100자)"
 />
 </FormControl>
 <FormMessage className="mt-1 px-1 text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 </div>

 <div className="space-y-8">
 <ShadcnFormField
 control={form.control}
 name="useYn"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="ml-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
 활성 상태 프로토콜
 </FormLabel>
 <Select
 onValueChange={field.onChange}
 defaultValue={field.value}
 value={field.value}
 >
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-none bg-muted text-xs font-bold shadow-inner">
 <SelectValue />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="rounded-lg shadow-xl z-[9999]">
 <SelectItem value="Y" className="h-12 rounded-lg text-xs font-bold text-success-emphasis">
 사용 중 (ACTIVE)
 </SelectItem>
 <SelectItem value="N" className="h-12 rounded-lg text-xs font-bold text-destructive-emphasis">
 미사용 (INACTIVE)
 </SelectItem>
 </SelectContent>
 </Select>
 <FormMessage className="mt-1 px-1 text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />

 <ShadcnFormField
 control={form.control}
 name="dtlCdExpln"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="ml-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
 메타데이터 컨텍스트 설명
 </FormLabel>
 <FormControl>
 <textarea
 {...field}
 maxLength={4000}
 className="w-full min-h-[160px] resize-none rounded-lg border-none bg-muted p-6 text-left text-xs font-bold shadow-inner outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring"
 placeholder="코드 사용처 및 시스템 제약 조건 설명... (최대 4000자)"
 />
 </FormControl>
 <FormMessage className="mt-1 px-1 text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 </div>
 </div>
 );
}
