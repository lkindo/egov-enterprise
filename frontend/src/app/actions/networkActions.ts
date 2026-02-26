'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { Network } from '@/services/networkService';

export async function saveNetworkAction(prevState: any, formData: FormData) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const ntwrkId = formData.get('ntwrkId') as string;
    const data: Partial<Network> = {
      manageIem: formData.get('manageIem') as string,
      ntwrkIp: formData.get('ntwrkIp') as string,
      gtwy: formData.get('gtwy') as string,
      subnet: formData.get('subnet') as string,
      domnServer: formData.get('domnServer') as string,
      userNm: formData.get('userNm') as string,
      useAt: formData.get('useAt') as 'Y' | 'N',
    };

    if (ntwrkId) {
      await client.put(`/admin/system/networks/${ntwrkId}`, data, axiosConfig);
    } else {
      await client.post('/admin/system/networks', data, axiosConfig);
    }

    revalidatePath('/admin/system/network');
    return { success: true, message: '네트워크 정보가 저장되었습니다.' };
  } catch (error: any) {
    console.error('Save Network Error:', error);
    return { success: false, message: error.message || '저장 중 오류 발생' };
  }
}

export async function deleteNetworkAction(id: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.delete(`/admin/system/networks/${id}`, axiosConfig);
    
    revalidatePath('/admin/system/network');
    return { success: true, message: '네트워크 정보가 삭제되었습니다.' };
  } catch (error: any) {
    console.error('Delete Network Error:', error);
    return { success: false, message: error.message || '삭제 중 오류 발생' };
  }
}
