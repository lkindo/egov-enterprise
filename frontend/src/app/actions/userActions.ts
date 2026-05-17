'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { UserManage } from '@/types/foundation/user';

interface ActionResponse {
  success: boolean;
  message: string;
}

export async function createUserAction(prevState: unknown, formData: UserManage): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await userAdminService.createUser(formData, axiosConfig);

    revalidatePath('/admin/user/manage');
    return { success: true, message: '사용자가 등록되었습니다.' };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : '등록 중 오류 발생';
    console.error('Create User Error:', error);
    return { success: false, message: errorMessage };
  }
}

export async function updateUserAction(prevState: unknown, formData: UserManage): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await userAdminService.updateUser(formData.userId, formData, axiosConfig);

    revalidatePath('/admin/user/manage');
    return { success: true, message: '사용자 정보가 수정되었습니다.' };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : '수정 중 오류 발생';
    console.error('Update User Error:', error);
    return { success: false, message: errorMessage };
  }
}

export async function deleteUserAction(prevState: unknown, userId: string): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await userAdminService.deleteUser(userId, axiosConfig);

    revalidatePath('/admin/user/manage');
    return { success: true, message: '사용자가 삭제되었습니다.' };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : '삭제 중 오류 발생';
    console.error('Delete User Error:', error);
    return { success: false, message: errorMessage };
  }
}

export async function bulkUpdateUserStatusAction(userIds: string[], status: string): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await userAdminService.updateUsersStatus(userIds, status, axiosConfig);

    revalidatePath('/admin/user/manage');
    return { success: true, message: `${userIds.length}명의 사용자 상태가 변경되었습니다.` };
  } catch (error: any) {
    console.error('Bulk Update Status Error:', error);
    return { success: false, message: '상태 변경 중 오류 발생' };
  }
}

export async function bulkMoveUserDeptAction(userIds: string[], orgnztId: string): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await userAdminService.moveUsersToDept(userIds, orgnztId, axiosConfig);

    revalidatePath('/admin/user/manage');
    return { success: true, message: `${userIds.length}명의 사용자가 부서 이동되었습니다.` };
  } catch (error: any) {
    console.error('Bulk Move Dept Error:', error);
    return { success: false, message: '부서 이동 중 오류 발생' };
  }
}

export async function bulkDeleteUsersAction(userIds: string[]): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await userAdminService.deleteUsers(userIds, axiosConfig);

    revalidatePath('/admin/user/manage');
    return { success: true, message: `${userIds.length}명의 사용자가 삭제되었습니다.` };
  } catch (error: any) {
    console.error('Bulk Delete Users Error:', error);
    return { success: false, message: '일괄 삭제 중 오류 발생' };
  }
}

export async function bulkUpdateUserRoleAction(userIds: string[], role: string): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await userAdminService.updateUsersRole(userIds, role, axiosConfig);

    revalidatePath('/admin/user/manage');
    return { success: true, message: `${userIds.length}명의 사용자 권한이 변경되었습니다.` };
  } catch (error: any) {
    console.error('Bulk Update Role Error:', error);
    return { success: false, message: '권한 변경 중 오류 발생' };
  }
}
