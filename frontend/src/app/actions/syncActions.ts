'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { SyncServer } from '@/services/syncService';

export async function saveSyncServerAction(prevState: any, formData: FormData) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const serverId = formData.get('serverId') as string;
    const data: Partial<SyncServer> = {
      serverNm: formData.get('serverNm') as string,
      serverIp: formData.get('serverIp') as string,
      serverPort: Number(formData.get('serverPort')),
      targetDrctry: formData.get('targetDrctry') as string,
    };

    if (serverId) {
      await client.put(`/admin/system/sync-servers/${serverId}`, data, axiosConfig);
    } else {
      await client.post('/admin/system/sync-servers', data, axiosConfig);
    }

    revalidatePath('/admin/system/sync-server');
    return { success: true, message: '서버 정보가 저장되었습니다.' };
  } catch (error: any) {
    console.error('Save Sync Server Error:', error);
    return { success: false, message: error.message || '저장 중 오류 발생' };
  }
}

export async function deleteSyncServerAction(id: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.delete(`/admin/system/sync-servers/${id}`, axiosConfig);
    
    revalidatePath('/admin/system/sync-server');
    return { success: true, message: '서버 정보가 삭제되었습니다.' };
  } catch (error: any) {
    console.error('Delete Sync Server Error:', error);
    return { success: false, message: error.message || '삭제 중 오류 발생' };
  }
}

export async function executeSyncAction(id: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.post(`/admin/system/sync-servers/${id}/execute`, {}, axiosConfig);
    
    revalidatePath('/admin/system/sync-server');
    return { success: true, message: '동기화 명령이 전송되었습니다.' };
  } catch (error: any) {
    console.error('Execute Sync Error:', error);
    return { success: false, message: error.message || '동기화 중 오류 발생' };
  }
}
