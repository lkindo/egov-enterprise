'use client';

import { useState } from 'react';
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

export default function CommunityBoardsDetailClient() {
    const router = useRouter();
    const { toast } = useToast();
    const confirm = useConfirm();

    const [formData, setFormData] = useState({
        bbsId: 'BBSMSTR_AAAAAAAAAAAA',
        pstTtl: '',
        pstCn: '',
        noticeAt: 'N' as 'Y' | 'N',
        secretAt: 'N' as 'Y' | 'N'
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
        if (!formData.pstTtl.trim()) {
            toast('제목을 입력해 주세요.', 'error');
            return;
        }

        const isConfirmed = await confirm({
            title: '게시글 등록',
            message: '작성하신 내용을 등록하시겠습니까?',
            confirmText: '등록'
        });

        if (isConfirmed) {
            try {
                // 첨부가 있으면 **먼저 업로드**해 식별자를 받고, 그 id 를 게시글 본문에 실어 보낸다.
                //   REST 계약상 POST /boards/posts 는 JSON 전용(@RequestBody BoardSaveRequest)이라
                //   파일 자체를 함께 보낼 수 없다. 배너 화면이 쓰는 것과 같은 2단계 방식이다.
                //   업로드가 실패하면 게시글을 만들지 않는다 — 첨부가 빠진 글이 조용히 등록되는 것보다
                //   실패를 알리는 편이 낫다(아래 catch 가 오류 토스트를 띄운다).
                const atchFileSn = files.length > 0
                    ? await fileAdminService.uploadFiles(files)
                    : undefined;

                const res = await boardUserService.createPost({ ...formData, atchFileSn });
                if (res) {
                    toast('성공적으로 등록되었습니다.', 'success');
                    clear(); // 자동 저장 데이터 삭제
                    router.push('/admin/community/boards');
                }
            } catch {
                toast('등록 중 오류가 발생했습니다.', 'error');
            }
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
                        <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary/90 transition-all flex items-center gap-2">
                            <Send size={18} /> 등록
                        </button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form (Left) */}
                <div className="lg:col-span-2 space-y-6">
                    <FormField label="게시글 제목" required>
                        <input
                            type="text"
                            aria-label="게시글 제목"
                            value={formData.pstTtl}
                            onChange={(e) => setFormData({ ...formData, pstTtl: e.target.value })}
                            placeholder="제목을 입력해 주세요."
                            className="w-full h-12 px-4 rounded-lg border bg-card text-lg font-bold outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                        />
                    </FormField>

                    <FormField label="내용 작성" required>
                        <StandardEditor
                            value={formData.pstCn}
                            onChange={(val) => setFormData({ ...formData, pstCn: val })}
                            minHeight="450px"
                        />
                    </FormField>
                </div>

                {/* Sidebar Options (Right) */}
                <div className="space-y-6">
                    <div className="p-6 border rounded-lg bg-card shadow-sm space-y-6">
                        <h3 className="font-bold flex items-center gap-2 border-b pb-4 mb-4">
                            <AlertCircle size={18} className="text-primary" />
                            게시 옵션
                        </h3>

                        <FormField label="게시판 선택">
                            <select
                                value={formData.bbsId}
                                onChange={(e) => setFormData({ ...formData, bbsId: e.target.value })}
                                className="w-full h-12 px-4 rounded-lg border bg-card text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                            >
                                <option value="BBSMSTR_AAAAAAAAAAAA">공지사항</option>
                                <option value="BBSMSTR_BBBBBBBBBBBB">자유게시판</option>
                                <option value="BBSMSTR_CCCCCCCCCCCC">업무게시판</option>
                            </select>
                        </FormField>

                        <div className="flex flex-col gap-3 pt-2">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    aria-label="중요 공지로 등록"
                                    checked={formData.noticeAt === 'Y'}
                                    onChange={(e) => setFormData({ ...formData, noticeAt: e.target.checked ? 'Y' : 'N' })}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium group-hover:text-primary transition-colors">중요 공지로 등록</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    aria-label="비밀글로 설정"
                                    checked={formData.secretAt === 'Y'}
                                    onChange={(e) => setFormData({ ...formData, secretAt: e.target.checked ? 'Y' : 'N' })}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium group-hover:text-primary transition-colors">비밀글로 설정</span>
                            </label>
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
