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

    /*
      ⚠ 상위 부서를 지금 모르는 노드는 보내지 않는다(GAP-DEPT-001).

      부서 검색은 `ognzNm` 만 보므로 좁힌 결과에서 상위가 빠질 수 있다. `listToDeptTree` 는 그런
      노드를 루트로 그리고 `parentId` 가 null 이 되는데, 그대로 보내면 서버가
      `updateHierarchy(blankToNull(null), ...)` 로 `up_ognz_id` 를 **지운다**. 화면은 아무 오류도
      보여 주지 않고 되돌리는 경로도 없다.

      전송에서 빼면 서버는 그 행을 건드리지 않아 기존 소속이 그대로 남는다. 사용자가 직접 끈
      노드는 `useDeptTree` 가 표시를 해제하므로 여기서 걸리지 않는다 — 즉 "안 만진 것은 안 바꾼다".

      `sortOrdr` 는 제외 전 화면 순서로 매긴다. 제외분 때문에 번호가 당겨지면 남은 부서의 순서가
      실제 화면과 어긋난다. (현재 목록 조회는 `ognzNm` 오름차순이라 이 값을 읽지 않지만,
      보내는 값이 화면과 다른 뜻을 갖게 두지는 않는다.)
    */
    const submitData = flattenedDepts
      .map((item, index) => ({
        ognzId: item.ognzId,
        upOgnzId: item.parentId ?? undefined, // null(루트)은 미전송 → 서버가 최상위로 처리
        sortOrdr: index + 1,
        unloadedParentId: item.unloadedParentId ?? null,
      }))
      .filter((item) => !item.unloadedParentId)
      .map(({ unloadedParentId: _unloadedParentId, ...item }) => item);

    await deptAdminService.updateDeptHierarchy(submitData, config);

    revalidatePath('/admin/user/departments');
    return { success: true, message: '조직 아키텍처 구조가 동기화되었습니다.' };
  } catch (error) {
    const message = extractErrorMessage(error, '계층 구조 저장 중 오류 발생');
    return { success: false, message };
  }
}
