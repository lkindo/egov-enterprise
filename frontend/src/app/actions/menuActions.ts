'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { menuAdminService } from '@/services/foundation/system/MenuAdminService';
import { MenuInfo } from '@/types/foundation/menu';
import { extractErrorMessage, extractFieldErrors } from './actionUtils';

interface ActionResponse {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

interface SaveMenuParams {
  mode: 'create' | 'edit';
  data: Partial<MenuInfo>;
}

export async function saveMenuAction(prevState: unknown, { mode, data }: SaveMenuParams): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    if (mode === 'create') {
      await menuAdminService.createMenu(data, axiosConfig);
    } else {
      await menuAdminService.updateMenu(data.menuNo!, data, axiosConfig);
    }

    revalidatePath('/admin/system/menus');
    return { success: true, message: `메뉴가 ${mode === 'create' ? '등록' : '수정'}되었습니다.` };
  } catch (error) {
    const errorMessage = extractErrorMessage(error, '저장 중 오류 발생');
    const fieldErrors = extractFieldErrors(error);
    return fieldErrors
      ? { success: false, message: errorMessage, fieldErrors }
      : { success: false, message: errorMessage };
  }
}

export async function updateMenuOrdersAction(menus: MenuInfo[]): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await menuAdminService.updateMenuOrder(menus, axiosConfig);

    revalidatePath('/admin/system/menus');
    return { success: true, message: '순서가 저장되었습니다.' };
  } catch (error) {
    const errorMessage = extractErrorMessage(error, '순서 저장 중 오류 발생');
    return { success: false, message: errorMessage };
  }
}

export async function deleteMenuAction(prevState: unknown, id: number): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await menuAdminService.deleteMenu(id, axiosConfig);

    revalidatePath('/admin/system/menus');
    return { success: true, message: '메뉴가 삭제되었습니다.' };
  } catch (error) {
    const errorMessage = extractErrorMessage(error, '삭제 중 오류 발생');
    return { success: false, message: errorMessage };
  }
}
