'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { menuAdminService } from '@/services/foundation/system/MenuAdminService';
import { MenuInfo } from '@/types/foundation/menu';

export async function saveMenuAction(prevState: any, { mode, data }: { mode: 'create' | 'edit', data: Partial<MenuInfo> }) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    if (mode === 'create') {
      await menuAdminService.createMenu(data as any, axiosConfig);
    } else {
      await menuAdminService.updateMenu(data.menuNo!, data, axiosConfig);
    }

    revalidatePath('/admin/system/menus');
    return { success: true, message: `메뉴가 ${mode === 'create' ? '등록' : '수정'}되었습니다.` };
  } catch (error: any) {
    console.error('Save Menu Error:', error);
    return { success: false, message: error.message || '저장 중 오류 발생' };
  }
}

export async function updateMenuOrdersAction(menus: any[]) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await menuAdminService.updateMenuOrder(menus, axiosConfig);

    return { success: true, message: '순서가 저장되었습니다.' };
  } catch (error: any) {
    console.error('Update Menu Orders Error:', error);
    // [object Event] 방지 및 상세 메시지 반환
    const errorMessage = error.response?.data?.message || error.message || '순서 저장 중 오류 발생';
    return { success: false, message: errorMessage };
  }
}

export async function deleteMenuAction(prevState: any, id: number) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await menuAdminService.deleteMenu(id, axiosConfig);

    revalidatePath('/admin/system/menus');
    return { success: true, message: '메뉴가 삭제되었습니다.' };
  } catch (error: any) {
    console.error('Delete Menu Error:', error);
    return { success: false, message: error.message || '삭제 중 오류 발생' };
  }
}
