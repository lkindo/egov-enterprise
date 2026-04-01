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
import { DeptJobVO } from '@/types/business/deptJob';

export default function CreateDeptJobPage() {
 const router = useRouter();
 const [formData, setFormData] = useState<DeptJobVO>({
 deptJobNm: '',
 deptJobCn: '',
 priort: '2', // Default: 蹂댄넻
 chargerNm: '', // ?대떦?먮챸 (?꾩떆 ?띿뒪님
 });

 const handleSave = async () => {
 if (!formData.deptJobNm || !formData.deptJobCn) {
 alert('업무紐낃낵 ?댁슜? ?꾩닔?낅땲님');
 return;
 }

 try {
 await createDeptJob(formData);
 alert('업무媛 등록?섏뿀?듬땲님');
 router.push('/smart-toolkit/dept-job');
 } catch {
 console.error(error);
 alert('업무 등록님?ㅽ뙣?덉뒿?덈떎.');
 }
 };

 return (
 <div className="max-w-2xl mx-auto space-y-8">
 <div>
 <h2 className="text-2xl font-bold tracking-tight">遺님업무 등록</h2>
 <p className="text-muted-foreground">?덈줈님遺님업무瑜?등록?⑸땲님</p>
 </div>

 <div className="space-y-6">
 <div className="space-y-2">
 <Label htmlFor="deptJobNm">업무紐?(?꾩닔)</Label>
 <Input
 id="deptJobNm"
 value={formData.deptJobNm}
 onChange={(e) => setFormData(prev => ({ ...prev, deptJobNm: e.target.value }))}
 placeholder="님 2024님1遺꾧린 ?ㅼ쟻 蹂닿퀬"
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
 <SelectItem value="3">님쓬</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label htmlFor="chargerNm">?대떦님(?좏깮)</Label>
 <Input
 id="chargerNm"
 value={formData.chargerNm}
 onChange={(e) => setFormData(prev => ({ ...prev, chargerNm: e.target.value }))}
 placeholder="?대떦님?대쫫 ?낅젰"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="deptJobCn">업무 ?댁슜 (?꾩닔)</Label>
 <Textarea
 id="deptJobCn"
 value={formData.deptJobCn}
 onChange={(e) => setFormData(prev => ({ ...prev, deptJobCn: e.target.value }))}
 className="min-h-[200px]"
 placeholder="업무 ?곸꽭 ?댁슜님?낅젰?섏꽭님.."
 />
 </div>

 <div className="flex justify-end gap-2">
 <Button variant="outline" onClick={() => router.back()}>痍⑥냼</Button>
 <Button onClick={handleSave}>등록 ?님/Button>
 </div>
 </div>
 </div>
 );
}

