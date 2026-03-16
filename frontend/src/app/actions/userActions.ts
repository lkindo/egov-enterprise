'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { userAdminService } from '@/services/admin/system/UserAdminService';
import { UserManage } from '@/types/user';

export async function createUserAction(prevState: any, formData: UserManage) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await userAdminService.createUser(formData, axiosConfig);

    revalidatePath('/admin/user/manage');
    return { success: true, message: '사용자가 등록되었습니다.' };
  } catch (error: any) {
    console.error('Create User Error:', error);
    return { success: false, message: error.message || '등록 중 오류 발생' };
  }
}

export async function updateUserAction(prevState: any, formData: UserManage) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await userAdminService.updateUser(formData.userId, formData, axiosConfig);

    revalidatePath('/admin/user/manage');
    return { success: true, message: '사용자 정보가 수정되었습니다.' };
  } catch (error: any) {
    console.error('Update User Error:', error);
    return { success: false, message: error.message || '수정 중 오류 발생' };
  }
}

export async function deleteUserAction(prevState: any, userId: string) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await userAdminService.deleteUser(userId, axiosConfig);

    revalidatePath('/admin/user/manage');
    return { success: true, message: '사용자가 삭제되었습니다.' };
  } catch (error: any) {
    console.error('Delete User Error:', error);
    return { success: false, message: error.message || '삭제 중 오류 발생' };
  }
}
