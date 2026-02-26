'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { MenuInfo } from '@/types/menu';

export async function saveMenuAction(prevState: any, { mode, data }: { mode: 'create' | 'edit', data: Partial<MenuInfo> }) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    if (mode === 'create') {
      await client.post('/admin/menus', data, axiosConfig);
    } else {
      await client.put(`/admin/menus/${data.menuNo}`, data, axiosConfig);
    }
    
    revalidatePath('/admin/system/menus');
    return { success: true, message: `메뉴가 ${mode === 'create' ? '등록' : '수정'}되었습니다.` };
  } catch (error: any) {
    console.error('Save Menu Error:', error);
    return { success: false, message: error.message || '저장 중 오류 발생' };
  }
}

export async function updateMenuOrdersAction(prevState: any, menus: MenuInfo[]) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.put('/admin/menus/batch-order', menus, axiosConfig);
    
    revalidatePath('/admin/system/menus');
    return { success: true, message: '순서가 저장되었습니다.' };
  } catch (error: any) {
    console.error('Update Menu Orders Error:', error);
    return { success: false, message: error.message || '순서 저장 중 오류 발생' };
  }
}

export async function deleteMenuAction(prevState: any, id: number) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await client.delete(`/admin/menus/${id}`, axiosConfig);
    
    revalidatePath('/admin/system/menus');
    return { success: true, message: '메뉴가 삭제되었습니다.' };
  } catch (error: any) {
    console.error('Delete Menu Error:', error);
    return { success: false, message: error.message || '삭제 중 오류 발생' };
  }
}
