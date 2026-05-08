'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardEditor } from '@/app/components/ui/standard-editor';
import { StandardFileUploader } from '@/app/components/ui/standard-file-uploader';
import { FormField } from '@/app/components/ui/standard-form';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useAutoSave } from '@/lib/hooks/use-auto-save';
import { Send, X, AlertCircle } from 'lucide-react';

export default function BoardWritePage() {
    const router = useRouter();
    const { toast } = useToast();
    const confirm = useConfirm();

    const [formData, setFormData] = useState({
        bbsId: 'BBSMSTR_AAAAAAAAAAAA',
        nttSj: '',
        nttCn: '',
        noticeAt: 'N' as 'Y' | 'N',
        secretAt: 'N' as 'Y' | 'N'
    });

    const [files, setFiles] = useState<File[]>([]);

    // 자동 저장 훅 연동
    const { clear } = useAutoSave('bbs_write', formData, (data) => setFormData(data));

    const handleSave = async () => {
        if (!formData.nttSj.trim()) {
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
                const res = await boardUserService.createPost(formData);
                if (res) {
                    toast('성공적으로 등록되었습니다.', 'success');
                    clear(); // 자동 저장 데이터 삭제
                    router.push('/admin/community/boards');
                }
            } catch (error) {
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
                            value={formData.nttSj}
                            onChange={(e) => setFormData({ ...formData, nttSj: e.target.value })}
                            placeholder="제목을 입력해 주세요."
                            className="w-full h-12 px-4 rounded-xl border bg-card text-lg font-bold outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                        />
                    </FormField>

                    <FormField label="내용 작성" required>
                        <StandardEditor
                            value={formData.nttCn}
                            onChange={(val) => setFormData({ ...formData, nttCn: val })}
                            minHeight="450px"
                        />
                    </FormField>
                </div>

                {/* Sidebar Options (Right) */}
                <div className="space-y-6">
                    <div className="p-6 border rounded-xl bg-card shadow-sm space-y-6">
                        <h3 className="font-bold flex items-center gap-2 border-b pb-4 mb-4">
                            <AlertCircle size={18} className="text-primary" />
                            게시 옵션
                        </h3>

                        <FormField label="게시판 선택">
                            <select
                                value={formData.bbsId}
                                onChange={(e) => setFormData({ ...formData, bbsId: e.target.value })}
                                className="w-full h-12 px-4 rounded-xl border bg-card text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
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
                                    checked={formData.noticeAt === 'Y'}
                                    onChange={(e) => setFormData({ ...formData, noticeAt: e.target.checked ? 'Y' : 'N' })}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium group-hover:text-primary transition-colors">중요 공지로 등록</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.secretAt === 'Y'}
                                    onChange={(e) => setFormData({ ...formData, secretAt: e.target.checked ? 'Y' : 'N' })}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium group-hover:text-primary transition-colors">비밀글로 설정</span>
                            </label>
                        </div>
                    </div>

                    <div className="p-6 border rounded-xl bg-card shadow-sm">
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
