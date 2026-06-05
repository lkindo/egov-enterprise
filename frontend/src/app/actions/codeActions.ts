'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { codeAdminService } from '@/services/foundation/system/CodeAdminService';
import { CmmnDetailCode, CmmnClCode, CmmnCode } from '@/types/foundation/system';

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
  } catch (error: any) {
    const message = error instanceof Error ? error.message : '저장 중 오류 발생';
    console.error('Save Code Detail Error:', error);
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
  } catch (error: any) {
    const message = error instanceof Error ? error.message : '삭제 중 오류 발생';
    console.error('Delete Code Detail Error:', error);
    return { success: false, message };
  }
}

// --- Classification Code Actions ---
async function saveClCode(prevState: unknown, data: Partial<CmmnClCode> & { isNew?: boolean }) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};
    
    const isNew = data.isNew !== false;
    
    // isNew 플래그를 백엔드 전송 DTO 객체에서 배제
    const { isNew: _, ...pureData } = data;

    if (isNew) {
      await codeAdminService.createClCode(pureData, config);
    } else {
      await codeAdminService.updateClCode(pureData.clsfCd!, pureData, config);
    }

    revalidatePath('/admin/system/common-code');
    return { success: true, message: '분류 코드가 저장되었습니다.' };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : '저장 중 오류 발생';
    return { success: false, message };
  }
}

async function deleteClCode(prevState: unknown, clsfCd: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};
    await codeAdminService.deleteClCode(clsfCd, config);
    revalidatePath('/admin/system/common-code');
    return { success: true, message: '분류 코드가 삭제되었습니다.' };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : '삭제 중 오류 발생';
    return { success: false, message };
  }
}

// --- Common Code (Group) Actions ---
async function saveCmmnCode(prevState: unknown, data: Partial<CmmnCode> & { isNew?: boolean }) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};
    
    const isNew = data.isNew !== false;
    
    // isNew 플래그를 백엔드 전송 DTO 객체에서 배제
    const { isNew: _, ...pureData } = data;

    if (isNew) {
      await codeAdminService.createCmmnCode(pureData, config);
    } else {
      await codeAdminService.updateCmmnCode(pureData.cdId!, pureData, config);
    }

    revalidatePath('/admin/system/common-code');
    return { success: true, message: '공통 코드가 저장되었습니다.' };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : '저장 중 오류 발생';
    return { success: false, message };
  }
}

async function deleteCmmnCode(prevState: unknown, cdId: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};
    await codeAdminService.deleteCmmnCode(cdId, config);
    revalidatePath('/admin/system/common-code');
    return { success: true, message: '공통 코드가 삭제되었습니다.' };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : '삭제 중 오류 발생';
    return { success: false, message };
  }
}

export async function saveCmmnCodeHierarchyAction(flattenedNodes: any[]): Promise<{ success: boolean; message: string }> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    // CmmnCode의 clCode 업데이트를 위한 데이터 매핑
    const submitData = flattenedNodes
      .filter(node => node.type === 'group')
      .map((node, index) => ({
        cdId: node.id,
        clsfCd: node.parentId,
        ordr: index + 1 // 순서 필드가 있다면 반영
      }));

    await codeAdminService.updateCmmnCodeHierarchy(submitData, config);

    revalidatePath('/admin/system/common-code');
    return { success: true, message: '공통코드 도메인 구조가 동기화되었습니다.' };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : '계층 구조 저장 중 오류 발생';
    return { success: false, message };
  }
}
