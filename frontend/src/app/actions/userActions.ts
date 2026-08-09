'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { extractErrorMessage } from './actionUtils';

interface ActionResponse {
  success: boolean;
  message: string;
}

export async function bulkUpdateUserStatusAction(userIds: string[], status: string): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await userAdminService.updateUsersStatus(userIds, status, axiosConfig);

    revalidatePath('/admin/user/manage');
    return { success: true, message: `${userIds.length}명의 사용자 상태가 변경되었습니다.` };
  } catch (error) {
    const errorMessage = extractErrorMessage(error, '상태 변경 중 오류 발생');
    console.error('Bulk Update Status Error:', error);
    return { success: false, message: errorMessage };
  }
}

export async function bulkMoveUserDeptAction(userIds: string[], ognzId: string): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

    await userAdminService.moveUsersToDept(userIds, ognzId, axiosConfig);

    revalidatePath('/admin/user/manage');
    return { success: true, message: `${userIds.length}명의 사용자가 부서 이동되었습니다.` };
  } catch (error) {
    const errorMessage = extractErrorMessage(error, '부서 이동 중 오류 발생');
    console.error('Bulk Move Dept Error:', error);
    return { success: false, message: errorMessage };
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
  } catch (error) {
    const errorMessage = extractErrorMessage(error, '일괄 삭제 중 오류 발생');
    console.error('Bulk Delete Users Error:', error);
    return { success: false, message: errorMessage };
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
  } catch (error) {
    const errorMessage = extractErrorMessage(error, '권한 변경 중 오류 발생');
    console.error('Bulk Update Role Error:', error);
    return { success: false, message: errorMessage };
  }
}
