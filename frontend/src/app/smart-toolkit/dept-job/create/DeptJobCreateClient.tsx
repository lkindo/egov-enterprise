'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { deptJobUserService } from '@/services/business/user/deptJob/DeptJobUserService';
import { DeptJobForm, DeptJobFormValues } from '@/components/business/deptJob/DeptJobForm';

/**
 * 부서 업무 등록 화면.
 *
 * 종전에는 useState + 수동 검증(빈 문자열 체크)으로 폼을 직접 굴렸고, 같은 폼이
 * insertDeptJob/ · selectDeptJobDetail/[id]/ 에도 복제돼 있었다. 수정 화면과 필드가 동일하므로
 * 공용 DeptJobForm(useAppForm + generated-zod 확장)으로 합친다 — FE 헌법 제7조·제13조 2항.
 *
 * 또한 종전에는 등록 후 selectDeptJobList(존재하지 않는 API 를 부르는 파손 목록)로 보냈다.
 * 이제 서버가 채번한 식별자로 상세 화면에 착지시킨다.
 */
export default function DeptJobCreateClient() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSubmit = async (values: DeptJobFormValues) => {
    try {
      const newId = await deptJobUserService.createDeptJob(values);
      toast.success('업무가 등록되었습니다.');
      await queryClient.invalidateQueries({ queryKey: ['work-jobs'] });
      // 응답에 식별자가 없으면(구버전 서버 등) 목록으로 되돌린다.
      router.push(newId ? `/smart-toolkit/dept-job/${newId}` : '/smart-toolkit/dept-job');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '업무 등록에 실패했습니다.');
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <Button variant="ghost" onClick={() => router.push('/smart-toolkit/dept-job')} className="rounded-lg font-bold gap-2">
        <ArrowLeft className="w-4 h-4" /> 목록으로
      </Button>

      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border pb-6">
          <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            <Briefcase size={20} />
            부서 업무 등록
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <DeptJobForm
            mode="create"
            onSubmit={handleSubmit}
            onCancel={() => router.push('/smart-toolkit/dept-job')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
