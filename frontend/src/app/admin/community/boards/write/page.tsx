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

    // ?ë™ ?€?????°ë™
    const { clear } = useAutoSave('bbs_write', formData, (data) => setFormData(data));

    const handleSave = async () => {
        if (!formData.nttSj.trim()) {
            toast('?œëª©???…ë ¥??ì£¼ì„¸??', 'error');
            return;
        }

        const isConfirmed = await confirm({
            title: 'ê²Œì‹œê¸€ ?±ë¡',
            message: '?‘ì„±?˜ì‹  ?´ìš©???±ë¡?˜ì‹œê² ìŠµ?ˆê¹Œ?',
            confirmText: '?±ë¡'
        });

        if (isConfirmed) {
            try {
                const res = (await boardUserService.createPost(formData)) as any;
                if (res?.success) {
                    toast('?±ê³µ?ìœ¼ë¡??±ë¡?˜ì—ˆ?µë‹ˆ??', 'success');
                    clear(); // ?ë™ ?€???°ì´???? œ
                    router.push('/admin/community/boards');
                }
            } catch {
                toast('?±ë¡ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.', 'error');
            }
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            <PageHeader
                title="??ê²Œì‹œê¸€ ?‘ì„±"
                breadcrumbs={[{ label: 'ê²Œì‹œ??, href: '/admin/community/boards' }, { label: 'ê¸€?°ê¸°' }]}
                actions={
                    <div className="flex gap-2">
                        <button onClick={() => router.back()} className="px-4 py-2 border rounded-lg font-bold hover:bg-accent transition-all flex items-center gap-2">
                            <X size={18} /> ì·¨ì†Œ
                        </button>
                        <button onClick={handleSave} className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md hover:bg-primary/90 transition-all flex items-center gap-2">
                            <Send size={18} /> ?±ë¡
                        </button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form (Left) */}
                <div className="lg:col-span-2 space-y-6">
                    <FormField label="ê²Œì‹œê¸€ ?œëª©" required>
                        <input
                            type="text"
                            value={formData.nttSj}
                            onChange={(e) => setFormData({ ...formData, nttSj: e.target.value })}
                            placeholder="?œëª©???…ë ¥??ì£¼ì„¸??"
                            className="w-full h-12 px-4 rounded-xl border bg-card text-lg font-bold outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                        />
                    </FormField>

                    <FormField label="?´ìš© ?‘ì„±" required>
                        <StandardEditor
                            value={formData.nttCn}
                            onChange={(val) => setFormData({ ...formData, nttCn: val })}
                            minHeight="450px"
                        />
                    </FormField>
                </div>

                {/* Sidebar Options (Right) */}
                <div className="space-y-6">
                    <div className="p-6 border rounded-2xl bg-card shadow-sm space-y-6">
                        <h3 className="font-bold flex items-center gap-2 border-b pb-4 mb-4">
                            <AlertCircle size={18} className="text-primary" />
                            ê²Œì‹œ ?µì…˜
                        </h3>

                        <FormField label="ê²Œì‹œ???€??>
                            <select
                                value={formData.bbsId}
                                onChange={(e) => setFormData({ ...formData, bbsId: e.target.value })}
                                className="w-full h-10 px-3 rounded-md border bg-background text-sm outline-none"
                            >
                                <option value="BBSMSTR_AAAAAAAAAAAA">ê³µì??¬í•­</option>
                                <option value="BBSMSTR_BBBBBBBBBBBB">?ìœ ê²Œì‹œ??/option>
                                <option value="BBSMSTR_CCCCCCCCCCCC">?…ë¬´ê²Œì‹œ??/option>
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
                                <span className="text-sm font-medium group-hover:text-primary transition-colors">ì¤‘ìš” ê³µì?ë¡??±ë¡</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={formData.secretAt === 'Y'}
                                    onChange={(e) => setFormData({ ...formData, secretAt: e.target.checked ? 'Y' : 'N' })}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium group-hover:text-primary transition-colors">ë¹„ë?ê¸€ë¡??¤ì •</span>
                            </label>
                        </div>
                    </div>

                    <div className="p-6 border rounded-2xl bg-card shadow-sm">
                        <h3 className="font-bold flex items-center gap-2 border-b pb-4 mb-4 text-sm text-muted-foreground">
                            ì²¨ë??Œì¼
                        </h3>
                        <StandardFileUploader onFilesChange={setFiles} maxFiles={3} />
                    </div>
                </div>
            </div>
        </div>
    );
}
