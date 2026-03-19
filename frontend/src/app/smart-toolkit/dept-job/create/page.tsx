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
 priort: '2', // Default: 보통
 chargerNm: '', // 담당자명 (임시 텍스트)
 });

 const handleSave = async () => {
 if (!formData.deptJobNm || !formData.deptJobCn) {
 alert('업무명과 내용은 필수입니다.');
 return;
 }

 try {
 await createDeptJob(formData);
 alert('업무가 등록되었습니다.');
 router.push('/smart-toolkit/dept-job');
 } catch (error) {
 console.error(error);
 alert('업무 등록에 실패했습니다.');
 }
 };

 return (
 <div className="max-w-2xl mx-auto space-y-8">
 <div>
 <h2 className="text-2xl font-bold tracking-tight">부서 업무 등록</h2>
 <p className="text-muted-foreground">새로운 부서 업무를 등록합니다.</p>
 </div>

 <div className="space-y-6">
 <div className="space-y-2">
 <Label htmlFor="deptJobNm">업무명 (필수)</Label>
 <Input
 id="deptJobNm"
 value={formData.deptJobNm}
 onChange={(e) => setFormData(prev => ({ ...prev, deptJobNm: e.target.value }))}
 placeholder="예: 2024년 1분기 실적 보고"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="priort">우선순위</Label>
 <Select
 value={formData.priort}
 onValueChange={(value) => setFormData(prev => ({ ...prev, priort: value }))}
 >
 <SelectTrigger>
 <SelectValue placeholder="우선순위 선택" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="1">높음</SelectItem>
 <SelectItem value="2">보통</SelectItem>
 <SelectItem value="3">낮음</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label htmlFor="chargerNm">담당자 (선택)</Label>
 <Input
 id="chargerNm"
 value={formData.chargerNm}
 onChange={(e) => setFormData(prev => ({ ...prev, chargerNm: e.target.value }))}
 placeholder="담당자 이름 입력"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="deptJobCn">업무 내용 (필수)</Label>
 <Textarea
 id="deptJobCn"
 value={formData.deptJobCn}
 onChange={(e) => setFormData(prev => ({ ...prev, deptJobCn: e.target.value }))}
 className="min-h-[200px]"
 placeholder="업무 상세 내용을 입력하세요..."
 />
 </div>

 <div className="flex justify-end gap-2">
 <Button variant="outline" onClick={() => router.back()}>취소</Button>
 <Button onClick={handleSave}>등록 저장</Button>
 </div>
 </div>
 </div>
 );
}
