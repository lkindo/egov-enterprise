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

    if (isNew) {
      await codeAdminService.createDetailCode(data as CmmnDetailCode, config);
    } else {
      await codeAdminService.updateDetailCode(data.codeId!, data.code!, data as CmmnDetailCode, config);
    }

    revalidatePath('/admin/system/common-code');
    return { success: true, message: '?곸꽭 肄붾뱶媛 ??λ릺?덉뒿?덈떎.' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '?님以님ㅻ쪟 諛쒖깮';
    console.error('Save Code Detail Error:', error);
    return { success: false, message };
  }
}

export async function deleteCodeDetail(prevState: unknown, { codeId, code }: { codeId: string, code: string }) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await codeAdminService.deleteDetailCode(codeId, code, config);

    revalidatePath('/admin/system/common-code');
    return { success: true, message: '?곸꽭 肄붾뱶媛 님젣?섏뿀?듬땲님' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '님젣 以님ㅻ쪟 諛쒖깮';
    console.error('Delete Code Detail Error:', error);
    return { success: false, message };
  }
}

// --- Classification Code Actions ---
export async function saveClCode(prevState: unknown, data: Partial<CmmnClCode> & { isNew?: boolean }) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};
    const isNew = data.isNew !== false;

    if (isNew) {
      await codeAdminService.createClCode(data, config);
    } else {
      await codeAdminService.updateClCode(data.clCode!, data, config);
    }

    revalidatePath('/admin/system/common-code');
    return { success: true, message: '遺꾨쪟 肄붾뱶媛 ??λ릺?덉뒿?덈떎.' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '?님以님ㅻ쪟 諛쒖깮';
    return { success: false, message };
  }
}

export async function deleteClCode(prevState: unknown, clCode: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};
    await codeAdminService.deleteClCode(clCode, config);
    revalidatePath('/admin/system/common-code');
    return { success: true, message: '遺꾨쪟 肄붾뱶媛 님젣?섏뿀?듬땲님' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '님젣 以님ㅻ쪟 諛쒖깮';
    return { success: false, message };
  }
}

// --- Common Code (Group) Actions ---
export async function saveCmmnCode(prevState: unknown, data: Partial<CmmnCode> & { isNew?: boolean }) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};
    const isNew = data.isNew !== false;

    if (isNew) {
      await codeAdminService.createCmmnCode(data, config);
    } else {
      await codeAdminService.updateCmmnCode(data.codeId!, data, config);
    }

    revalidatePath('/admin/system/common-code');
    return { success: true, message: '怨듯넻 肄붾뱶媛 ??λ릺?덉뒿?덈떎.' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '?님以님ㅻ쪟 諛쒖깮';
    return { success: false, message };
  }
}

export async function deleteCmmnCode(prevState: unknown, codeId: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};
    await codeAdminService.deleteCmmnCode(codeId, config);
    revalidatePath('/admin/system/common-code');
    return { success: true, message: '怨듯넻 肄붾뱶媛 님젣?섏뿀?듬땲님' };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '님젣 以님ㅻ쪟 諛쒖깮';
    return { success: false, message };
  }
}
