'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { deptAdminService } from '@/services/foundation/system/DeptAdminService';
import { changedDeptHierarchy, type FlattenedDept } from '@/app/admin/user/departments/treeUtils';
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
export async function saveDeptHierarchyAction(
  flattenedDepts: FlattenedDept[],
  baselineDepts?: FlattenedDept[],
): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    /*
      ⚠ 상위 부서를 지금 모르는 노드는 보내지 않는다(GAP-DEPT-001).

      부서 검색은 `ognzNm` 만 보므로 좁힌 결과에서 상위가 빠질 수 있다. `listToDeptTree` 는 그런
      노드를 루트로 그리고 `parentId` 가 null 이 되는데, 그대로 보내면 서버가
      `updateHierarchy(blankToNull(null), ...)` 로 `up_ognz_id` 를 **지운다**. 화면은 아무 오류도
      보여 주지 않고 되돌리는 경로도 없다.

      전송에서 빼면 서버는 그 행을 건드리지 않아 기존 소속이 그대로 남는다. 사용자가 직접 끈
      노드는 `useDeptTree` 가 표시를 해제하므로 여기서 걸리지 않는다 — 즉 "안 만진 것은 안 바꾼다".

      [2026-09-26 DIP C5] `sortOrdr` 는 형제 안 상대 순서이고, 서버에서 읽은 기준선과 달라진 부서만 보낸다.
      종전에는 화면 전체 순번을 매겨 검색으로 좁힌 상태에서 저장하면 여러 형제 집합의 순서가 함께 망가졌다.
    */
    const submitData = changedDeptHierarchy(flattenedDepts, baselineDepts);

    await deptAdminService.updateDeptHierarchy(submitData, config);

    revalidatePath('/admin/user/departments');
    return { success: true, message: '조직 아키텍처 구조가 동기화되었습니다.' };
  } catch (error) {
    const message = extractErrorMessage(error, '계층 구조 저장 중 오류 발생');
    return { success: false, message };
  }
}
