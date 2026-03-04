'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import client from '@/lib/api/client';

export async function executeBatchAction(prevState: any, id: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.post(`/admin/system/batches/schedules/${id}/execute`, null, axiosConfig);

    revalidatePath('/admin/system/batch');
    return { success: true, message: '배치 실행 요청이 전송되었습니다.' };
  } catch (error: any) {
    console.error('Execute Batch Error:', error);
    return { success: false, message: error.message || '실행 요청 중 오류 발생' };
  }
}
