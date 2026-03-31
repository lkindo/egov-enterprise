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
 priort: '2', // Default: ë³´í†µ
 chargerNm: '', // ?´ë‹¹?ëª… (?„ì‹œ ?ìŠ¤??
 });

 const handleSave = async () => {
 if (!formData.deptJobNm || !formData.deptJobCn) {
 alert('?…ë¬´ëª…ê³¼ ?´ìš©?€ ?„ìˆ˜?…ë‹ˆ??');
 return;
 }

 try {
 await createDeptJob(formData);
 alert('?…ë¬´ê°€ ?±ë¡?˜ì—ˆ?µë‹ˆ??');
 router.push('/smart-toolkit/dept-job');
 } catch {
 console.error(error);
 alert('?…ë¬´ ?±ë¡???¤íŒ¨?ˆìŠµ?ˆë‹¤.');
 }
 };

 return (
 <div className="max-w-2xl mx-auto space-y-8">
 <div>
 <h2 className="text-2xl font-bold tracking-tight">ë¶€???…ë¬´ ?±ë¡</h2>
 <p className="text-muted-foreground">?ˆë¡œ??ë¶€???…ë¬´ë¥??±ë¡?©ë‹ˆ??</p>
 </div>

 <div className="space-y-6">
 <div className="space-y-2">
 <Label htmlFor="deptJobNm">?…ë¬´ëª?(?„ìˆ˜)</Label>
 <Input
 id="deptJobNm"
 value={formData.deptJobNm}
 onChange={(e) => setFormData(prev => ({ ...prev, deptJobNm: e.target.value }))}
 placeholder="?? 2024??1ë¶„ê¸° ?¤ì  ë³´ê³ "
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="priort">?°ì„ ?œìœ„</Label>
 <Select
 value={formData.priort}
 onValueChange={(value) => setFormData(prev => ({ ...prev, priort: value }))}
 >
 <SelectTrigger>
 <SelectValue placeholder="?°ì„ ?œìœ„ ? íƒ" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="1">?’ìŒ</SelectItem>
 <SelectItem value="2">ë³´í†µ</SelectItem>
 <SelectItem value="3">??Œ</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label htmlFor="chargerNm">?´ë‹¹??(? íƒ)</Label>
 <Input
 id="chargerNm"
 value={formData.chargerNm}
 onChange={(e) => setFormData(prev => ({ ...prev, chargerNm: e.target.value }))}
 placeholder="?´ë‹¹???´ë¦„ ?…ë ¥"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="deptJobCn">?…ë¬´ ?´ìš© (?„ìˆ˜)</Label>
 <Textarea
 id="deptJobCn"
 value={formData.deptJobCn}
 onChange={(e) => setFormData(prev => ({ ...prev, deptJobCn: e.target.value }))}
 className="min-h-[200px]"
 placeholder="?…ë¬´ ?ì„¸ ?´ìš©???…ë ¥?˜ì„¸??.."
 />
 </div>

 <div className="flex justify-end gap-2">
 <Button variant="outline" onClick={() => router.back()}>ì·¨ì†Œ</Button>
 <Button onClick={handleSave}>?±ë¡ ?€??/Button>
 </div>
 </div>
 </div>
 );
}
