'use client';

import { useState, useCallback, useEffect } from 'react';

export const dynamic = 'force-dynamic';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Eye } from "lucide-react";
import { getCommunityList, createCommunity, updateCommunity, getCommunity } from '@/services/community/communityService';
import { CommunityVO, CommunitySearchParams } from '@/types/community';

export default function CommunityManagePage() {
    const [communities, setCommunities] = useState<CommunityVO[]>([]);
    const [params, setParams] = useState<CommunitySearchParams>({
        pageIndex: 1,
        searchKeyword: '',
    });
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCommunity, setEditingCommunity] = useState<CommunityVO | null>(null);
    const [formData, setFormData] = useState<CommunityVO>({
        cmmntyNm: '',
        cmmntyIntrcn: '',
        useAt: 'Y',
        registSeCode: 'REGC01',
    });

    const fetchList = useCallback(async () => {
        try {
            const response = await getCommunityList(params);
            if (response && response.resultList) {
                setCommunities(response.resultList);
            } else {
                setCommunities([]);
            }
        } catch (error) {
            console.error(error);
            setCommunities([]);
        }
    }, [params]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const handleCreate = () => {
        setEditingCommunity(null);
        setFormData({
            cmmntyNm: '',
            cmmntyIntrcn: '',
            useAt: 'Y',
            registSeCode: 'REGC01',
        });
        setIsDialogOpen(true);
    };

    const handleEdit = async (community: CommunityVO) => {
        try {
            const detail = await getCommunity(community.cmmntyId!);
            setEditingCommunity(detail);
            setFormData(detail);
            setIsDialogOpen(true);
        } catch (error) {
            console.error(error);
            alert('상세 정보를 불러오는데 실패했습니다.');
        }
    };

    const handleSubmit = async () => {
        try {
            if (editingCommunity) {
                await updateCommunity(formData);
            } else {
                await createCommunity(formData);
            }
            setIsDialogOpen(false);
            fetchList();
        } catch (error) {
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    const getStatusBadge = (useAt?: string) => {
        return useAt === 'Y'
            ? <Badge variant="secondary">사용중</Badge>
            : <Badge variant="destructive">중지</Badge>;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">커뮤니티(동호회) 관리</h2>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    커뮤니티 등록
                </Button>
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <Input
                    placeholder="커뮤니티명으로 검색"
                    className="max-w-sm"
                    value={params.searchKeyword}
                    onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                />
                <Button onClick={handleSearch}>조회</Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">순번</TableHead>
                            <TableHead>커뮤니티명</TableHead>
                            <TableHead>설명</TableHead>
                            <TableHead>사용여부</TableHead>
                            <TableHead>등록일</TableHead>
                            <TableHead className="w-[100px]">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {communities.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            communities.map((community, index) => (
                                <TableRow key={community.cmmntyId}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-medium">{community.cmmntyNm}</TableCell>
                                    <TableCell className="max-w-[300px] truncate">{community.cmmntyIntrcn}</TableCell>
                                    <TableCell>{getStatusBadge(community.useAt)}</TableCell>
                                    <TableCell>{community.frstRegistPnttm?.slice(0, 10)}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(community)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingCommunity ? '커뮤니티 수정' : '커뮤니티 등록'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="cmmntyNm">커뮤니티명</Label>
                            <Input
                                id="cmmntyNm"
                                value={formData.cmmntyNm}
                                onChange={(e) => setFormData(prev => ({ ...prev, cmmntyNm: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cmmntyIntrcn">설명</Label>
                            <Textarea
                                id="cmmntyIntrcn"
                                value={formData.cmmntyIntrcn}
                                onChange={(e) => setFormData(prev => ({ ...prev, cmmntyIntrcn: e.target.value }))}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="useAt">사용 여부</Label>
                            <Select
                                value={formData.useAt}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, useAt: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="사용 여부 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Y">사용</SelectItem>
                                    <SelectItem value="N">미사용</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>취소</Button>
                        <Button onClick={handleSubmit}>저장</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
