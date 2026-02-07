'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import damService from '@/services/dam/damService';
import { KnoManagementVO } from '@/types/dam';

export default function KnoDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    // params is a Promise in Next.js 15+, need to unwrap or use React.use()
    const { id } = use(params);

    const [kno, setKno] = useState<KnoManagementVO | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Edit form state
    const [knoNm, setKnoNm] = useState('');
    const [knoCn, setKnoCn] = useState('');
    const [knoType, setKnoType] = useState('');
    const [othbcAt, setOthbcAt] = useState('');

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const result = await damService.getKnoDetail(id);
                if (result.success) {
                    const data = result.data;
                    setKno(data);
                    setKnoNm(data.knoNm || '');
                    setKnoCn(data.knoCn || '');
                    setKnoType(data.knoType || '1');
                    setOthbcAt(data.othbcAt || 'Y');
                }
            } catch (error) {
                console.error('Failed to fetch kno detail', error);
                alert('지식정보 조회 실패');
            }
        };
        fetchDetail();
    }, [id]);

    const handleUpdate = async () => {
        try {
            await damService.updateKno({
                knoId: id,
                knoNm,
                knoCn,
                knoType,
                othbcAt
            });
            alert('수정되었습니다.');
            setIsEditing(false);
            // Refresh logic if needed
        } catch (error) {
            console.error('Update failed', error);
            alert('수정 실패');
        }
    };

    const handleDelete = async () => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await damService.deleteKno(id);
            alert('삭제되었습니다.');
            router.push('/admin/dam/kno');
        } catch (error) {
            console.error('Delete failed', error);
            alert('삭제 실패');
        }
    };

    if (!kno) return <div>Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">
                    {isEditing ? '지식정보 수정' : '지식정보 상세'}
                </h2>
                <div className="space-x-2">
                    {!isEditing ? (
                        <>
                            <Button onClick={() => setIsEditing(true)}>수정</Button>
                            <Button variant="destructive" onClick={handleDelete}>삭제</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>취소</Button>
                            <Button onClick={handleUpdate}>저장</Button>
                        </>
                    )}
                    <Button variant="ghost" onClick={() => router.push('/admin/dam/kno')}>목록</Button>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <Label>지식명</Label>
                    {isEditing ? (
                        <Input value={knoNm} onChange={(e) => setKnoNm(e.target.value)} />
                    ) : (
                        <div className="p-2 border rounded bg-slate-50">{kno.knoNm}</div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>지식유형</Label>
                    {isEditing ? (
                        <Select value={knoType} onValueChange={setKnoType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">지침</SelectItem>
                                <SelectItem value="2">법령</SelectItem>
                                <SelectItem value="3">매뉴얼</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                        <div className="p-2 border rounded bg-slate-50">{kno.knoType}</div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>공개여부</Label>
                    {isEditing ? (
                        <RadioGroup value={othbcAt} onValueChange={setOthbcAt} className="flex space-x-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Y" id="public" />
                                <Label htmlFor="public">공개</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="N" id="private" />
                                <Label htmlFor="private">비공개</Label>
                            </div>
                        </RadioGroup>
                    ) : (
                        <div className="p-2 border rounded bg-slate-50">
                            {kno.othbcAt === 'Y' ? '공개' : '비공개'}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>내용</Label>
                    {isEditing ? (
                        <Textarea value={knoCn} onChange={(e) => setKnoCn(e.target.value)} rows={5} />
                    ) : (
                        <div className="p-4 border rounded bg-slate-50 min-h-[100px] whitespace-pre-wrap">
                            {kno.knoCn}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
