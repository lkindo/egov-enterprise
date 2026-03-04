'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { Banner, Popup } from '@/types/banner';

// Banner Actions
export async function saveBannerAction(prevState: any, { mode, data, id }: { mode: 'create' | 'edit', data: Banner, id?: string }) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    if (mode === 'create') {
      await client.post('/banners', data, axiosConfig);
    } else {
      await client.put(`/banners/${id}`, data, axiosConfig);
    }

    revalidatePath('/admin/system/banner');
    return { success: true, message: `배너가 ${mode === 'create' ? '등록' : '수정'}되었습니다.` };
  } catch (error: any) {
    console.error('Save Banner Error:', error);
    return { success: false, message: error.message || '저장 중 오류 발생' };
  }
}

export async function deleteBannerAction(prevState: any, id: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.delete(`/banners/${id}`, axiosConfig);

    revalidatePath('/admin/system/banner');
    return { success: true, message: '배너가 삭제되었습니다.' };
  } catch (error: any) {
    console.error('Delete Banner Error:', error);
    return { success: false, message: error.message || '삭제 중 오류 발생' };
  }
}

// Popup Actions
export async function savePopupAction(prevState: any, { mode, data, id }: { mode: 'create' | 'edit', data: Popup, id?: string }) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    if (mode === 'create') {
      await client.post('/popups', data, axiosConfig);
    } else {
      await client.put(`/popups/${id}`, data, axiosConfig);
    }

    revalidatePath('/admin/system/banner');
    return { success: true, message: `팝업이 ${mode === 'create' ? '등록' : '수정'}되었습니다.` };
  } catch (error: any) {
    console.error('Save Popup Error:', error);
    return { success: false, message: error.message || '저장 중 오류 발생' };
  }
}

export async function deletePopupAction(prevState: any, id: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.delete(`/popups/${id}`, axiosConfig);

    revalidatePath('/admin/system/banner');
    return { success: true, message: '팝업이 삭제되었습니다.' };
  } catch (error: any) {
    console.error('Delete Popup Error:', error);
    return { success: false, message: error.message || '삭제 중 오류 발생' };
  }
}