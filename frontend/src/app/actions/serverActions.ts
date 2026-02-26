'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { ServerInfo } from '@/services/serverService';

export async function saveServerAction(prevState: any, formData: FormData) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const serverId = formData.get('serverId') as string;
    const data: Partial<ServerInfo> = {
      serverNm: formData.get('serverNm') as string,
      serverKnd: formData.get('serverKnd') as string,
    };

    if (serverId) {
      await client.put(`/admin/system/servers/${serverId}`, data, axiosConfig);
    } else {
      await client.post('/admin/system/servers', data, axiosConfig);
    }

    revalidatePath('/admin/system/server');
    return { success: true, message: '서버 정보가 저장되었습니다.' };
  } catch (error: any) {
    console.error('Save Server Error:', error);
    return { success: false, message: error.message || '저장 중 오류 발생' };
  }
}

export async function deleteServerAction(id: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.delete(`/admin/system/servers/${id}`, axiosConfig);
    
    revalidatePath('/admin/system/server');
    return { success: true, message: '서버 정보가 삭제되었습니다.' };
  } catch (error: any) {
    console.error('Delete Server Error:', error);
    return { success: false, message: error.message || '삭제 중 오류 발생' };
  }
}
