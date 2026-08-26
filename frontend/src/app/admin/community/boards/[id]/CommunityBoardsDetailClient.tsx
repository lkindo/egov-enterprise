'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardEditor } from '@/app/components/ui/standard-editor';
import { StandardFileUploader } from '@/app/components/ui/standard-file-uploader';
import { FormField } from '@/app/components/ui/standard-form';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { fileAdminService } from '@/services/foundation/system/FileAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useAutoSave } from '@/lib/hooks/use-auto-save';
import { Send, X, AlertCircle } from 'lucide-react';
import { FREE_BOARD_ID, NOTICE_BOARD_ID, TASK_BOARD_ID } from '@/config/board-ids';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { BoardSaveRequestSchema } from '@/types/generated-zod';

// Generated schema의 pstCn min(0)은 백엔드 BoardSaveRequest @NotBlank보다 약하므로 required만 보강한다.
export const communityBoardCreateSchema = BoardSaveRequestSchema.pick({
    bbsId: true,
    pstTtl: true,
    pstCn: true,
    scrtYn: true,
}).extend({
    bbsId: BoardSaveRequestSchema.shape.bbsId.trim()
        .min(1, '게시판을 선택해 주세요.'),
    pstTtl: BoardSaveRequestSchema.shape.pstTtl.trim()
        .min(1, '게시글 제목을 입력해 주세요.'),
    pstCn: BoardSaveRequestSchema.shape.pstCn.trim()
        .min(1, '내용을 입력해 주세요.'),
});

const boardValidationLabels = {
    bbsId: '게시판',
    pstTtl: '게시글 제목',
    pstCn: '내용',
    scrtYn: '비밀글 설정',
};

export default function CommunityBoardsDetailClient() {
    const router = useRouter();
    const { toast } = useToast();
    const confirm = useConfirm();
    const [isSaving, setIsSaving] = useState(false);
    const savePendingRef = useRef(false);

    const [formData, setFormData] = useState({
        bbsId: NOTICE_BOARD_ID,
        pstTtl: '',
        pstCn: '',
        scrtYn: 'N' as 'Y' | 'N'
    });
    const validation = useManualFormValidation(communityBoardCreateSchema, {
        labels: boardValidationLabels,
        focusTargets: {
            pstCn: () => document.querySelector<HTMLTextAreaElement>('[aria-label="에디터 본문 내용"]'),
        },
    });

    // [2026-08-11 결함 수정] 종전에는 `const [, setFiles] = useState<File[]>([])` 였다 —
    //   **값 슬롯이 아예 버려져 있어** 첨부한 파일이 어디에도 쓰이지 않았다.
    //   사용자는 파일을 붙이고(진행 게이지가 완료까지 돈다) 등록 성공 토스트까지 받지만,
    //   그 파일들은 **전송되지 않고 사라진다.** 오류도 경고도 없다.
    //   백엔드는 지원하고 있었다 — BoardSaveRequest.atchFileSn 가 있고 Board.atch_file_sn 컬럼도 있다.
    //   같은 업로더를 쓰는 배너 화면(BannerAdminClient)은 저장 시점에 실제로 업로드한다.
    //   **게시글만 배선이 빠져 있었다.**
    const [files, setFiles] = useState<File[]>([]);

    // 자동 저장 훅 연동
    const { clear } = useAutoSave('bbs_write', formData, (data) => setFormData(data));

    const handleSave = async () => {
        if (savePendingRef.current) return;
        const validated = validation.validate(formData);
        if (!validated) return;

        savePendingRef.current = true;
        setIsSaving(true);

        try {
            const isConfirmed = await confirm({
                title: '게시글 등록',
                message: '작성하신 내용을 등록하시겠습니까?',
                confirmText: '등록'
            });

            if (isConfirmed) {
                // 첨부가 있으면 **먼저 업로드**해 식별자를 받고, 그 id 를 게시글 본문에 실어 보낸다.
                //   REST 계약상 POST /boards/posts 는 JSON 전용(@RequestBody BoardSaveRequest)이라
                //   파일 자체를 함께 보낼 수 없다. 배너 화면이 쓰는 것과 같은 2단계 방식이다.
                //   업로드가 실패하면 게시글을 만들지 않는다 — 첨부가 빠진 글이 조용히 등록되는 것보다
                //   실패를 알리는 편이 낫다(아래 catch 가 오류 토스트를 띄운다).
                const atchFileSn = files.length > 0
                    ? await fileAdminService.uploadFiles(files)
                    : undefined;

                const res = await boardUserService.createPost({ ...validated, atchFileSn });
                if (res) {
                    toast('성공적으로 등록되었습니다.', 'success');
                    clear(); // 자동 저장 데이터 삭제
                    router.push('/admin/community/boards');
                }
            }
        } catch (error) {
            const fieldErrors = extractFieldErrors(error);
            if (fieldErrors) validation.setFormErrors(fieldErrors);
            else toast(extractErrorMessage(error, '등록 중 오류가 발생했습니다.'), 'error');
        } finally {
            savePendingRef.current = false;
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 p-6">
            <PageHeader
                title="새 게시글 작성"
                breadcrumbs={[{ label: '게시판', href: '/admin/community/boards' }, { label: '글쓰기' }]}
                actions={
                    <div className="flex gap-2">
                        <button onClick={() => router.back()} className="px-4 py-2 border rounded-lg font-bold hover:bg-accent transition-all flex items-center gap-2">
                            <X size={18} /> 취소
                        </button>
                        <button disabled={isSaving} onClick={handleSave} aria-label={isSaving ? '게시글 등록 중' : '게시글 등록'} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary/90 transition-all flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
                            <Send size={18} aria-hidden="true" /> {isSaving ? '등록 중...' : '등록'}
                        </button>
                    </div>
                }
            />

            <FormErrorSummary
                errors={validation.errors}
                labels={boardValidationLabels}
                onNavigate={validation.focusError}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form (Left) */}
                <div className="lg:col-span-2 space-y-6">
                    <FormField htmlFor="pstTtl" label="게시글 제목" required error={validation.errors.pstTtl}>
                        <input
                            id="pstTtl"
                            {...validation.fieldProps('pstTtl')}
                            type="text"
                            aria-label="게시글 제목"
                            value={formData.pstTtl}
                            onChange={(e) => {
                                validation.clearError('pstTtl');
                                setFormData({ ...formData, pstTtl: e.target.value });
                            }}
                            placeholder="제목을 입력해 주세요."
                            required
                            maxLength={100}
                            className="w-full h-12 px-4 rounded-lg border bg-card text-lg font-bold outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                        />
                    </FormField>

                    <FormField htmlFor="pstCn" label="내용 작성" required error={validation.errors.pstCn}>
                        <div id="pstCn" {...validation.fieldProps('pstCn')} aria-required="true">
                            <StandardEditor
                                value={formData.pstCn}
                                onChange={(val) => {
                                    validation.clearError('pstCn');
                                    setFormData({ ...formData, pstCn: val });
                                }}
                                minHeight="450px"
                            />
                        </div>
                    </FormField>
                </div>

                {/* Sidebar Options (Right) */}
                <div className="space-y-6">
                    <div className="p-6 border rounded-lg bg-card shadow-sm space-y-6">
                        <h3 className="font-bold flex items-center gap-2 border-b pb-4 mb-4">
                            <AlertCircle size={18} className="text-primary" />
                            게시 옵션
                        </h3>

                        <FormField htmlFor="bbsId" label="게시판 선택" required error={validation.errors.bbsId}>
                            <select
                                id="bbsId"
                                {...validation.fieldProps('bbsId')}
                                value={formData.bbsId}
                                onChange={(e) => {
                                    validation.clearError('bbsId');
                                    setFormData({ ...formData, bbsId: e.target.value });
                                }}
                                required
                                className="w-full h-12 px-4 rounded-lg border bg-card text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                            >
                                <option value={NOTICE_BOARD_ID}>공지사항</option>
                                <option value={FREE_BOARD_ID}>자유게시판</option>
                                <option value={TASK_BOARD_ID}>업무게시판</option>
                            </select>
                        </FormField>

                        <div className="flex flex-col gap-3 pt-2">
                            {/* BoardSaveRequest에는 공지 여부 필드가 없으므로 효과 없는 noticeAt 입력은 노출하지 않는다. */}
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    {...validation.fieldProps('scrtYn')}
                                    type="checkbox"
                                    aria-label="비밀글로 설정"
                                    checked={formData.scrtYn === 'Y'}
                                    onChange={(e) => {
                                        validation.clearError('scrtYn');
                                        setFormData({ ...formData, scrtYn: e.target.checked ? 'Y' : 'N' });
                                    }}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium group-hover:text-primary transition-colors">비밀글로 설정</span>
                            </label>
                            {validation.errors.scrtYn ? <p {...validation.messageProps('scrtYn')} className="text-xs font-bold text-destructive-emphasis" /> : null}
                        </div>
                    </div>

                    <div className="p-6 border rounded-lg bg-card shadow-sm">
                        <h3 className="font-bold flex items-center gap-2 border-b pb-4 mb-4 text-sm text-muted-foreground">
                            첨부파일
                        </h3>
                        <StandardFileUploader onFilesChange={setFiles} maxFiles={3} />
                    </div>
                </div>
            </div>
        </div>
    );
}
