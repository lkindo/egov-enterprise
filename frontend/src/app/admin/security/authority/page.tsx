'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Plus, ShieldCheck, ShieldAlert, Key, Loader2, FileText, Calendar } from "lucide-react";
import { getAuthorList, createAuthor, updateAuthor, deleteAuthor } from '@/services/security/securityService';
import { AuthorManage } from '@/types/security';
import { SearchParams } from '@/types/system';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { PageHeader } from '@/app/components/layout/page-header';
import { useToast } from '@/app/components/ui/toast';

export default function AuthorityManagePage() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [params, setParams] = useState<SearchParams>({
        pageIndex: 1,
        searchKeyword: '',
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAuthority, setEditingAuthority] = useState<AuthorManage | null>(null);
    const [formData, setFormData] = useState<AuthorManage>({
        authorCode: '',
        authorNm: '',
        authorDc: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['admin-authorities', params],
        queryFn: () => getAuthorList(params),
    });

    const authorities: AuthorManage[] = data?.resultList || [];
    const pagination = data?.paginationInfo;

    const saveMutation = useMutation({
        mutationFn: (data: AuthorManage) => editingAuthority ? updateAuthor(data) : createAuthor(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-authorities'] });
            toast(editingAuthority ? '권한 정보가 수정되었습니다.' : '새 권한이 등록되었습니다.', 'success');
            setIsDialogOpen(false);
        },
        onError: () => toast('저장 중 오류가 발생했습니다.', 'error')
    });

    const deleteMutation = useMutation({
        mutationFn: deleteAuthor,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-authorities'] });
            toast('권한이 삭제되었습니다.', 'success');
        },
        onError: () => toast('삭제 중 오류가 발생했습니다.', 'error')
    });

    const handleCreate = () => {
        setEditingAuthority(null);
        setFormData({ authorCode: '', authorNm: '', authorDc: '' });
        setIsDialogOpen(true);
    };

    const handleEdit = (authority: AuthorManage) => {
        setEditingAuthority(authority);
        setFormData(authority);
        setIsDialogOpen(true);
    };

    const handleDelete = async (authorCode: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        deleteMutation.mutate(authorCode);
    };

    const handleSubmit = async () => {
        saveMutation.mutate(formData);
    };

    const filterFields = [
        {
            name: 'searchKeyword',
            label: '검색어',
            type: 'text' as const,
            placeholder: '권한코드 또는 권한명 입력'
        }
    ];

    const columns = [
        {
            header: '권한코드',
            accessor: (item: AuthorManage) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                        <Key size={14} />
                    </div>
                    <span className="font-mono font-black text-xs tracking-tight text-orange-700">{item.authorCode}</span>
                </div>
            )
        },
        { 
            header: '권한명', 
            accessor: (item: AuthorManage) => item.authorNm, 
            className: 'font-bold' 
        },
        {
            header: '설명', 
            accessor: (item: AuthorManage) => (
                <span className="text-xs text-muted-foreground line-clamp-1 max-w-[250px]">{item.authorDc || '-'}</span>
            )
        },
        { 
            header: '등록일', 
            accessor: (item: AuthorManage) => (
                <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <Calendar size={12} className="opacity-40" />
                    <span className="text-xs">{item.authorCreatDe || '2026-02-17'}</span>
                </div>
            )
        },
        {
            header: '액션',
            className: 'text-right',
            accessor: (item: AuthorManage) => (
                <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => handleEdit(item)}>
                        <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(item.authorCode)}>
                        <Trash2 size={14} />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-500">
            <PageHeader
                title="시스템 권한 관리"
                breadcrumbs={[{ label: '보안 관리' }, { label: '권한 관리' }]}
                actions={
                    <Button onClick={handleCreate} className="rounded-xl h-11 px-6 font-black shadow-lg shadow-primary/20 gap-2">
                        <Plus size={18} /> 신규 권한 등록
                    </Button>
                }
            />

            {/* Authority Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
                <div className="p-8 rounded-[2.5rem] border-2 border-primary/5 bg-card shadow-sm flex items-center justify-between overflow-hidden relative group">
                    <div className="relative z-10">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Active Roles</p>
                        <h4 className="text-4xl font-black text-primary">{pagination?.totalRecordCount || 0}</h4>
                        <p className="text-[11px] text-muted-foreground mt-4 font-bold">시스템 전체에 적용된 활성 권한 수입니다.</p>
                    </div>
                    <div className="w-20 h-20 rounded-[2rem] bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <ShieldCheck size={40} />
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-[0.02] scale-[3] -rotate-12">
                        <ShieldCheck size={100} />
                    </div>
                </div>
                <div className="p-8 rounded-[2.5rem] border-2 border-primary/5 bg-card shadow-sm flex items-center justify-between overflow-hidden relative group">
                    <div className="relative z-10">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Security Level</p>
                        <h4 className="text-4xl font-black text-orange-600">High</h4>
                        <p className="text-[11px] text-muted-foreground mt-4 font-bold">RBAC 기반의 엄격한 권한 체계를 유지 중입니다.</p>
                    </div>
                    <div className="w-20 h-20 rounded-[2rem] bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                        <ShieldAlert size={40} />
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-[0.02] scale-[3] -rotate-12 text-orange-600">
                        <Key size={100} />
                    </div>
                </div>
            </div>

            <StandardSearchFilter
                fields={filterFields}
                onSearch={(values) => setParams(prev => ({ 
                    ...prev, 
                    pageIndex: 1,
                    searchKeyword: values.searchKeyword || ''
                }))}
                onReset={() => setParams({ pageIndex: 1, searchKeyword: '' })}
            />

            <StandardDataTable
                columns={columns}
                data={authorities}
                loading={isLoading}
                keyField="authorCode"
                emptyMessage="등록된 권한이 없습니다."
            />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md rounded-[2.5rem] border-2 border-primary/5 p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                                <Key size={20} />
                            </div>
                            {editingAuthority ? '권한 정보 수정' : '신규 권한 등록'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="authorCode" className="font-black ml-1">권한코드</Label>
                            <Input
                                id="authorCode"
                                className="h-12 rounded-xl border-primary/10 font-mono text-sm"
                                value={formData.authorCode}
                                onChange={(e) => setFormData(prev => ({ ...prev, authorCode: e.target.value }))}
                                disabled={!!editingAuthority}
                                placeholder="ROLE_USER"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="authorNm" className="font-black ml-1">권한명</Label>
                            <Input
                                id="authorNm"
                                className="h-12 rounded-xl border-primary/10 font-bold"
                                value={formData.authorNm}
                                onChange={(e) => setFormData(prev => ({ ...prev, authorNm: e.target.value }))}
                                placeholder="일반 사용자"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="authorDc" className="font-black ml-1">설명</Label>
                            <Textarea
                                id="authorDc"
                                className="rounded-xl border-primary/10 min-h-[100px] resize-none"
                                value={formData.authorDc}
                                onChange={(e) => setFormData(prev => ({ ...prev, authorDc: e.target.value }))}
                                placeholder="권한에 대한 상세 설명을 입력하세요."
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-3">
                        <Button variant="outline" className="rounded-xl h-12 px-6 font-bold" onClick={() => setIsDialogOpen(false)}>취소</Button>
                        <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="rounded-xl h-12 px-8 font-black shadow-lg shadow-primary/20">
                            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '저장하기'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
