'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { codeAdminService } from '@/services/foundation/system'/CodeAdminService';
import { CmmnDetailCode } from '@/types/foundation/system';

export async function saveCodeDetail(prevState: any, data: Partial<CmmnDetailCode>) {
 try {
 const cookieStore = await cookies();
 const accessToken = cookieStore.get('accessToken')?.value;
 const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

 // Check if it's an update or create. Since we use a modal and 'mode' state on client,
 // we should ideally pass it. For now, we'll try to update if it has both codeId and code.
 // In a real app, you might want to call check if it exists or pass a flag.
 // But since the service methods use different endpoints, we use a simple heuristic or a new param.

 // Let's use 'isNew' flag if provided in data (as partial)
 const isNew = (data as any).isNew !== false;

 if (isNew) {
 await codeAdminService.createDetailCode(data as CmmnDetailCode, config);
 } else {
 await codeAdminService.updateDetailCode(data.codeId!, data.code!, data as CmmnDetailCode, config);
 }

 revalidatePath('/admin/system/common-code');
 return { success: true, message: '상세 코드가 저장되었습니다.' };
 } catch (error: any) {
 console.error('Save Code Detail Error:', error);
 return { success: false, message: error.message || '저장 중 오류 발생' };
 }
}

export async function deleteCodeDetail(prevState: any, { codeId, code }: { codeId: string, code: string }) {
 try {
 const cookieStore = await cookies();
 const accessToken = cookieStore.get('accessToken')?.value;
 const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

 await codeAdminService.deleteDetailCode(codeId, code, config);

 revalidatePath('/admin/system/common-code');
 return { success: true, message: '상세 코드가 삭제되었습니다.' };
 } catch (error: any) {
 console.error('Delete Code Detail Error:', error);
 return { success: false, message: error.message || '삭제 중 오류 발생' };
 }
}

// --- Classification Code Actions ---
export async function saveClCode(prevState: any, data: Partial<any>) {
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
 return { success: true, message: '분류 코드가 저장되었습니다.' };
 } catch (error: any) {
 return { success: false, message: error.message || '저장 중 오류 발생' };
 }
}

export async function deleteClCode(prevState: any, clCode: string) {
 try {
 const cookieStore = await cookies();
 const accessToken = cookieStore.get('accessToken')?.value;
 const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};
 await codeAdminService.deleteClCode(clCode, config);
 revalidatePath('/admin/system/common-code');
 return { success: true, message: '분류 코드가 삭제되었습니다.' };
 } catch (error: any) {
 return { success: false, message: error.message || '삭제 중 오류 발생' };
 }
}

// --- Common Code (Group) Actions ---
export async function saveCmmnCode(prevState: any, data: Partial<any>) {
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
 return { success: true, message: '공통 코드가 저장되었습니다.' };
 } catch (error: any) {
 return { success: false, message: error.message || '저장 중 오류 발생' };
 }
}

export async function deleteCmmnCode(prevState: any, codeId: string) {
 try {
 const cookieStore = await cookies();
 const accessToken = cookieStore.get('accessToken')?.value;
 const config = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};
 await codeAdminService.deleteCmmnCode(codeId, config);
 revalidatePath('/admin/system/common-code');
 return { success: true, message: '공통 코드가 삭제되었습니다.' };
 } catch (error: any) {
 return { success: false, message: error.message || '삭제 중 오류 발생' };
 }
}
