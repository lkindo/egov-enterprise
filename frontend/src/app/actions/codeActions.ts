'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { codeAdminService, type CmmnCodeHierarchyItem } from '@/services/foundation/system/CodeAdminService';
import { CmmnDetailCode } from '@/types/foundation/system';
import type { FlattenedCodeNode } from '@/app/admin/system/common-code/treeUtils';
import { extractErrorMessage } from './actionUtils';

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
    return { success: false, message };
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
