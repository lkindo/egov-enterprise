'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createDeptJob } from '@/services/deptJob/deptJobService';
import { DeptJobVO } from '@/types/deptJob';

export default function CreateDeptJobPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<DeptJobVO>({
        deptJobNm: '',
        deptJobCn: '',
        priort: '2', // Default: 蹂댄넻
        chargerNm: '', // ?대떦?먮챸 (?꾩떆 ?띿뒪??
    });

    const handleSave = async () => {
        if (!formData.deptJobNm || !formData.deptJobCn) {
            alert('?낅Т紐낃낵 ?댁슜? ?꾩닔?낅땲??');
            return;
        }

        try {
            await createDeptJob(formData);
            alert('?낅Т媛 ?깅줉?섏뿀?듬땲??');
            router.push('/smart-toolkit/dept-job');
        } catch (error) {
            console.error(error);
            alert('?낅Т ?깅줉???ㅽ뙣?덉뒿?덈떎.');
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">遺???낅Т ?깅줉</h2>
                <p className="text-muted-foreground">?덈줈??遺???낅Т瑜??깅줉?⑸땲??</p>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="deptJobNm">?낅Т紐?(?꾩닔)</Label>
                    <Input
                        id="deptJobNm"
                        value={formData.deptJobNm}
                        onChange={(e) => setFormData(prev => ({ ...prev, deptJobNm: e.target.value }))}
                        placeholder="?? 2024??1遺꾧린 ?ㅼ쟻 蹂닿퀬"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="priort">?곗꽑?쒖쐞</Label>
                    <Select
                        value={formData.priort}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, priort: value }))}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="?곗꽑?쒖쐞 ?좏깮" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">?믪쓬</SelectItem>
                            <SelectItem value="2">蹂댄넻</SelectItem>
                            <SelectItem value="3">??쓬</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="chargerNm">?대떦??(?좏깮)</Label>
                    <Input
                        id="chargerNm"
                        value={formData.chargerNm}
                        onChange={(e) => setFormData(prev => ({ ...prev, chargerNm: e.target.value }))}
                        placeholder="?대떦???대쫫 ?낅젰"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="deptJobCn">?낅Т ?댁슜 (?꾩닔)</Label>
                    <Textarea
                        id="deptJobCn"
                        value={formData.deptJobCn}
                        onChange={(e) => setFormData(prev => ({ ...prev, deptJobCn: e.target.value }))}
                        className="min-h-[200px]"
                        placeholder="?낅Т ?곸꽭 ?댁슜???낅젰?섏꽭??"
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => router.back()}>痍⑥냼</Button>
                    <Button onClick={handleSave}>등록 저장</Button>
                </div>
            </div>
        </div>
    );
}
