'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { CommonCodeDetail } from '@/services/codeService';

export async function saveCodeDetail(prevState: any, data: Partial<CommonCodeDetail>) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.post('/admin/system/codes/details', data, axiosConfig);
    
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
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.delete(`/admin/system/codes/${codeId}/details/${code}`, axiosConfig);
    
    revalidatePath('/admin/system/common-code');
    return { success: true, message: '상세 코드가 삭제되었습니다.' };
  } catch (error: any) {
    console.error('Delete Code Detail Error:', error);
    return { success: false, message: error.message || '삭제 중 오류 발생' };
  }
}
