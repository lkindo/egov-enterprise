'use client';

import { useState } from 'react';
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
import * as damService from '@/services/dam/damService';

export default function CreateKnoPage() {
    const router = useRouter();
    const [knoNm, setKnoNm] = useState('');
    const [knoCn, setKnoCn] = useState('');
    const [knoType, setKnoType] = useState('1'); // 1: 지침, 2: 법령, 3: 매뉴얼 등 (공통코드 연동 필요)
    const [othbcAt, setOthbcAt] = useState('Y');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await damService.createKno({
                knoNm,
                knoCn,
                knoType,
                othbcAt
            });
            alert('지식정보가 등록되었습니다.');
            router.push('/admin/dam/kno');
        } catch (error) {
            console.error('Failed to create kno:', error);
            alert('등록 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">지식정보 등록</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="knoNm">지식명</Label>
                    <Input
                        id="knoNm"
                        value={knoNm}
                        onChange={(e) => setKnoNm(e.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="knoType">지식유형</Label>
                    <Select value={knoType} onValueChange={setKnoType}>
                        <SelectTrigger>
                            <SelectValue placeholder="유형 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">지침</SelectItem>
                            <SelectItem value="2">법령</SelectItem>
                            <SelectItem value="3">매뉴얼</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>공개여부</Label>
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
                </div>

                <div className="space-y-2">
                    <Label htmlFor="knoCn">내용</Label>
                    <Textarea
                        id="knoCn"
                        value={knoCn}
                        onChange={(e) => setKnoCn(e.target.value)}
                        rows={5}
                        required
                    />
                </div>

                <div className="flex justify-end space-x-2">
                    <Button variant="outline" type="button" onClick={() => router.back()}>
                        취소
                    </Button>
                    <Button type="submit">등록</Button>
                </div>
            </form>
        </div>
    );
}
