'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { BackupOpert } from '@/services/admin/system/BackupAdminService';

export async function saveBackupAction(prevState: any, formData: FormData) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    const backupOpertId = formData.get('backupOpertId') as string;
    const data: Partial<BackupOpert> = {
      backupOpertNm: formData.get('backupOpertNm') as string,
      backupOrginlDrctry: formData.get('backupOrginlDrctry') as string,
      backupStreDrctry: formData.get('backupStreDrctry') as string,
      cmprsSe: formData.get('cmprsSe') as string,
      executCycle: formData.get('executCycle') as string,
      executSchdulHour: formData.get('executSchdulHour') as string,
      executSchdulMnt: formData.get('executSchdulMnt') as string,
      executSchdulSecnd: '00',
      useAt: formData.get('useAt') as 'Y' | 'N',
    };

    if (backupOpertId) {
      await client.put(`/admin/system/backups/operations/${backupOpertId}`, data, axiosConfig);
    } else {
      await client.post('/admin/system/backups/operations', data, axiosConfig);
    }

    revalidatePath('/admin/system/backup');
    return { success: true, message: '백업 정책이 저장되었습니다.' };
  } catch (error: any) {
    console.error('Save Backup Error:', error);
    return { success: false, message: error.message || '저장 중 오류 발생' };
  }
}

export async function deleteBackupAction(id: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.delete(`/admin/system/backups/operations/${id}`, axiosConfig);

    revalidatePath('/admin/system/backup');
    return { success: true, message: '백업 정책이 삭제되었습니다.' };
  } catch (error: any) {
    console.error('Delete Backup Error:', error);
    return { success: false, message: error.message || '삭제 중 오류 발생' };
  }
}