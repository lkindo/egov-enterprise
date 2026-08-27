'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { codeAdminService, type CmmnCodeHierarchyItem } from '@/services/foundation/system/CodeAdminService';
import { CmmnDetailCode } from '@/types/foundation/system';
import type { FlattenedCodeNode } from '@/app/admin/system/common-code/treeUtils';
import { extractErrorMessage, extractFieldErrors } from './actionUtils';

export async function saveCodeDetail(prevState: unknown, data: Partial<CmmnDetailCode> & { isNew?: boolean }) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const isNew = data.isNew !== false;
    
    // isNew 플래그를 백엔드 전송 DTO 객체에서 배제
    const { isNew: _, ...pureData } = data;

    if (isNew) {
      await codeAdminService.createDetailCode(pureData as CmmnDetailCode, config);
    } else {
      await codeAdminService.updateDetailCode(pureData.cdId!, pureData.dtlCd!, pureData as CmmnDetailCode, config);
    }

    revalidatePath('/admin/system/common-code');
    return { success: true, message: '상세 코드가 저장되었습니다.' };
  } catch (error) {
    const message = extractErrorMessage(error, '저장 중 오류 발생');
    const fieldErrors = extractFieldErrors(error);
    return {
      success: false,
      message,
      ...(fieldErrors ? { fieldErrors } : {}),
    };
  }
}

export async function deleteCodeDetail(prevState: unknown, { cdId, dtlCd }: { cdId: string, dtlCd: string }) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await codeAdminService.deleteDetailCode(cdId, dtlCd, config);

    revalidatePath('/admin/system/common-code');
    return { success: true, message: '상세 코드가 삭제되었습니다.' };
  } catch (error) {
    const message = extractErrorMessage(error, '삭제 중 오류 발생');
    return { success: false, message };
  }
}

/**
 * 코드 탐색기 계층(코드그룹의 소속 분류) 일괄 저장.
 *
 * 종전에는 존재하지 않는 PUT /codes/cmmn/batch-hierarchy 를 호출했고, 그 경로가 백엔드의
 * PUT /codes/cmmn/{codeId} 에 codeId="batch-hierarchy" 로 흡수되면서 배열 본문을 CmmnCodeDto 로
 * 역직렬화하다 400 이 났다. 그래서 재배치 작업이 통째로 소실됐다. 이제 전용 엔드포인트가 있다.
 *
 * ordr(분류 내 정렬)은 tb_com_cd 에 물리 컬럼이 없어 저장할 곳이 없다. 보내봐야 버려지므로
 * 계약에서 제외했다. 순서 영속화가 필요하면 부서(V2_26)처럼 컬럼 추가 마이그레이션이 선행돼야 한다.
 */
export async function saveCmmnCodeHierarchyAction(flattenedNodes: FlattenedCodeNode[]): Promise<{ success: boolean; message: string }> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    // 코드그룹만 이동 대상이다(분류는 항상 루트). parentId 가 없는 노드는 트리에 표현될 수 없어 제외한다.
    const submitData: CmmnCodeHierarchyItem[] = flattenedNodes
      .filter((node): node is FlattenedCodeNode & { parentId: string } =>
        node.type === 'group' && !!node.id && !!node.parentId)
      .map(node => ({
        cdId: node.id,
        clsfCd: node.parentId,
      }));

    if (submitData.length === 0) {
      return { success: true, message: '변경할 코드그룹이 없습니다.' };
    }

    await codeAdminService.updateCmmnCodeHierarchy(submitData, config);

    revalidatePath('/admin/system/common-code');
    return { success: true, message: '공통코드 도메인 구조가 동기화되었습니다.' };
  } catch (error) {
    const message = extractErrorMessage(error, '계층 구조 저장 중 오류 발생');
    return { success: false, message };
  }
}

/**
 * 코드 분류(tb_com_clsf_cd) 저장.
 *
 * <p>[2026-08-28 배선] 서버·프런트 서비스에 CRUD 가 전부 살아 있었는데 **화면만 노출하지 않았다.**
 * 그래서 새 코드 체계를 도입하려면 DB 를 직접 건드려야 했고, 분류명 오타 수정도 불가능했다.
 *
 * <p>⚠ `useYn: 'N'` 은 이 화면에서 "삭제"가 아니라 **미사용 처리**다. 분류 행 자체는 목록에
 * 그대로 남지만, 코드그룹 조회가 `commonCodeCategory.useYn.eq("Y")` 로 조인 필터를 걸기 때문에
 * (CommonCodeGroupRepositoryImpl) **그 분류에 속한 코드그룹이 전부 목록에서 사라진다.**
 * 되돌릴 수는 있으나 사용자에게는 데이터가 없어진 것처럼 보이므로, 화면이 저장 전에 고지한다.
 */
export async function saveClCodeAction(
  prevState: unknown,
  data: { clsfCd: string; clsfCdNm: string; clsfCdExpln?: string; useYn: 'Y' | 'N'; isNew: boolean },
) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const { isNew, ...payload } = data;
    if (isNew) {
      await codeAdminService.createClCode(payload, config);
    } else {
      await codeAdminService.updateClCode(payload.clsfCd, payload, config);
    }

    revalidatePath('/admin/system/common-code');
    return { success: true, message: isNew ? '코드 분류가 등록되었습니다.' : '코드 분류가 저장되었습니다.' };
  } catch (error) {
    const message = extractErrorMessage(error, '코드 분류 저장 중 오류 발생');
    const fieldErrors = extractFieldErrors(error);
    return { success: false, message, ...(fieldErrors ? { fieldErrors } : {}) };
  }
}

/**
 * 코드 그룹(tb_com_cd) 저장.
 *
 * <p>소속 분류(`clsfCd`)는 **등록할 때만** 의미가 있다. 서버의 `updateCmmnCode` 는 명칭·설명·
 * 사용여부만 갱신하고 `clsfCd` 를 건드리지 않으므로(CommonCodeGroup#update), 수정 폼에서 소속
 * 분류를 바꾸게 두면 저장된 것처럼 보이고 아무 일도 일어나지 않는다. 분류 간 이동은 탐색기의
 * 드래그앤드롭 + '그룹 소속 저장'(batch-hierarchy) 경로가 담당한다.
 */
export async function saveCmmnCodeAction(
  prevState: unknown,
  data: { cdId: string; cdIdNm: string; cdIdExpln?: string; clsfCd: string; useYn: 'Y' | 'N'; isNew: boolean },
) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const { isNew, ...payload } = data;
    if (isNew) {
      await codeAdminService.createCmmnCode(payload, config);
    } else {
      // clsfCd 는 서버가 무시한다. 보내지 않아 "바뀔 수 있다"는 오해를 코드에서도 지운다.
      const { clsfCd: _ignored, ...updatable } = payload;
      await codeAdminService.updateCmmnCode(payload.cdId, updatable, config);
    }

    revalidatePath('/admin/system/common-code');
    return { success: true, message: isNew ? '코드 그룹이 등록되었습니다.' : '코드 그룹이 저장되었습니다.' };
  } catch (error) {
    const message = extractErrorMessage(error, '코드 그룹 저장 중 오류 발생');
    const fieldErrors = extractFieldErrors(error);
    return { success: false, message, ...(fieldErrors ? { fieldErrors } : {}) };
  }
}
