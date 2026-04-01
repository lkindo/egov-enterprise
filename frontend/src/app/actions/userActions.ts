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
        return { success: true, message: '?ъ슜?먭? 등록?섏뿀?듬땲님' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '등록 以님ㅻ쪟 諛쒖깮';
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
        return { success: true, message: '?ъ슜님?뺣낫媛 ?섏젙?섏뿀?듬땲님' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '?섏젙 以님ㅻ쪟 諛쒖깮';
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
        return { success: true, message: '?ъ슜?먭? 님젣?섏뿀?듬땲님' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '님젣 以님ㅻ쪟 諛쒖깮';
        console.error('Delete User Error:', error);
        return { success: false, message: errorMessage };
    }
}
