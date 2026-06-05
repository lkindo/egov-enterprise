'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { deptAdminService, DeptDto } from '@/services/foundation/user/DeptAdminService';

interface ActionResponse {
  success: boolean;
  message: string;
}

async function saveDeptAction(prevState: unknown, { mode, data }: { mode: 'create' | 'edit', data: DeptDto }): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    if (mode === 'create') {
      await deptAdminService.createDept(data, config);
    } else {
      await deptAdminService.updateDept(data.ognzId!, data, config);
    }

    revalidatePath('/admin/user/departments');
    return { success: true, message: `부서 정보가 ${mode === 'create' ? '배포' : '수정'}되었습니다.` };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : '저장 중 오류 발생';
    return { success: false, message };
  }
}

async function deleteDeptAction(prevState: unknown, deptId: string): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await deptAdminService.deleteDept(deptId, config);

    revalidatePath('/admin/user/departments');
    return { success: true, message: '부서 정보가 영구 삭제되었습니다.' };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : '삭제 중 오류 발생';
    return { success: false, message };
  }
}

export async function saveDeptHierarchyAction(flattenedDepts: any[]): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    // 트리 구조 변경 사항을 백엔드 형식에 맞춰 매핑 (parentId -> upperOgnzId, ordr)
    const submitData = flattenedDepts.map((item, index) => ({
      ognzId: item.ognzId,
      ognzNm: item.ognzNm,
      ognzExpln: item.ognzExpln,
      upperOgnzId: item.parentId,
      ordr: index + 1
    }));

    await deptAdminService.updateDeptHierarchy(submitData, config);

    revalidatePath('/admin/user/departments');
    return { success: true, message: '조직 아키텍처 구조가 동기화되었습니다.' };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : '계층 구조 저장 중 오류 발생';
    return { success: false, message };
  }
}
