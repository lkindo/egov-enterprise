'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import client from '@/lib/api/client';

export async function updateKno(prevState: any, formData: FormData) {
  const knoId = formData.get('knoId') as string;
  const knoNm = formData.get('knoNm') as string;
  const knoCn = formData.get('knoCn') as string;
  const knoType = formData.get('knoType') as string;
  const othbcAt = formData.get('othbcAt') as string;

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const response: any = await client.put(`/dam/mgm/kno/${knoId}`, {
      knoNm,
      knoCn,
      knoType,
      othbcAt
    }, axiosConfig);

    if (response.success || response.data?.success) {
      revalidatePath(`/admin/dam/kno`);
      revalidatePath(`/admin/dam/kno/${knoId}`);
      return { success: true, message: '지식정보가 수정되었습니다.' };
    }
    return { success: false, message: response.message || '수정 실패' };
  } catch (error: any) {
    console.error('Update KNO Error:', error);
    return { success: false, message: error.response?.data?.message || '수정 중 오류 발생' };
  }
}

export async function deleteKno(prevState: any, formData: FormData) {
  const knoId = formData.get('knoId') as string;

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const response: any = await client.delete(`/dam/mgm/kno/${knoId}`, axiosConfig);

    if (response.success || response.data?.success) {
      revalidatePath(`/admin/dam/kno`);
      return { success: true, message: '지식정보가 삭제되었습니다.' };
    }
    return { success: false, message: response.message || '삭제 실패' };
  } catch (error: any) {
    console.error('Delete KNO Error:', error);
    return { success: false, message: error.response?.data?.message || '삭제 중 오류 발생' };
  }
}

export async function createKno(prevState: any, formData: FormData) {
  const knoNm = formData.get('knoNm') as string;
  const knoCn = formData.get('knoCn') as string;
  const knoType = formData.get('knoType') as string;
  const othbcAt = formData.get('othbcAt') as string;

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const response: any = await client.post('/dam/mgm/kno', {
      knoNm,
      knoCn,
      knoType,
      othbcAt
    }, axiosConfig);

    if (response.success || response.data?.success) {
      revalidatePath(`/admin/dam/kno`);
      return { success: true, message: '지식정보가 등록되었습니다.' };
    }
    return { success: false, message: response.message || '등록 실패' };
  } catch (error: any) {
    console.error('Create KNO Error:', error);
    return { success: false, message: error.response?.data?.message || '등록 중 오류 발생' };
  }
}