'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { deptAdminService } from '@/services/foundation/system/DeptAdminService';
import type { FlattenedDept } from '@/app/admin/user/departments/treeUtils';
import { extractErrorMessage } from './actionUtils';

interface ActionResponse {
  success: boolean;
  message: string;
}

/**
 * 조직 계층(상위 부서·정렬 순서) 일괄 저장.
 *
 * 종전에는 존재하지 않는 PUT /departments/batch-hierarchy 를 호출해 404 를 받았고, 전송 필드도
 * 백엔드에 없는 upperOgnzId/ordr 였다. V2_26 으로 물리 컬럼(up_ognz_id, sort_ordr)과 엔드포인트가
 * 생겼으므로 실제 계약(upOgnzId, sortOrdr)에 맞춰 보낸다.
 *
 * 함께 있던 saveDeptAction/deleteDeptAction 은 export 되지 않아 어디서도 호출할 수 없는 死코드였고,
 * 실제 CRUD 는 클라이언트가 deptAdminService 를 직접 호출한다. 혼동을 없애기 위해 제거했다.
 */
export async function saveDeptHierarchyAction(flattenedDepts: FlattenedDept[]): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const submitData = flattenedDepts.map((item, index) => ({
      ognzId: item.ognzId,
      upOgnzId: item.parentId ?? undefined, // null(루트)은 미전송 → 서버가 최상위로 처리
      sortOrdr: index + 1,
    }));

    await deptAdminService.updateDeptHierarchy(submitData, config);

    revalidatePath('/admin/user/departments');
    return { success: true, message: '조직 아키텍처 구조가 동기화되었습니다.' };
  } catch (error) {
    const message = extractErrorMessage(error, '계층 구조 저장 중 오류 발생');
    return { success: false, message };
  }
}
