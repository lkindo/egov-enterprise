'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { Banner, Popup } from '@/types/foundation/banner';

interface ActionResponse {
    success: boolean;
    message: string;
}

interface SaveActionParams<T> {
    mode: 'create' | 'edit';
    data: T;
    id?: string;
}

// Banner Actions
export async function saveBannerAction(prevState: unknown, { mode, data, id }: SaveActionParams<Banner>): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        if (mode === 'create') {
            await client.post('/admin/system/banners', data, axiosConfig);
        } else {
            await client.put(`/admin/system/banners/${id}`, data, axiosConfig);
        }

        revalidatePath('/admin/system/banner');
        revalidatePath('/');
        return { success: true, message: `배너가 ${mode === 'create' ? '등록' : '수정'}되었습니다.` };
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : '저장 중 오류 발생';
        console.error('Save Banner Error:', error);
        return { success: false, message: errorMessage };
    }
}

export async function deleteBannerAction(prevState: unknown, id: string): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        await client.delete(`/admin/system/banners/${id}`, axiosConfig);

        revalidatePath('/admin/system/banner');
        return { success: true, message: '배너가 삭제되었습니다.' };
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : '삭제 중 오류 발생';
        console.error('Delete Banner Error:', error);
        return { success: false, message: errorMessage };
    }
}

// Popup Actions
export async function savePopupAction(prevState: unknown, { mode, data, id }: SaveActionParams<Popup>): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        if (mode === 'create') {
            await client.post('/admin/system/popups', data, axiosConfig);
        } else {
            await client.put(`/admin/system/popups/${id}`, data, axiosConfig);
        }

        revalidatePath('/admin/system/banner');
        revalidatePath('/');
        return { success: true, message: `팝업이 ${mode === 'create' ? '등록' : '수정'}되었습니다.` };
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : '저장 중 오류 발생';
        console.error('Save Popup Error:', error);
        return { success: false, message: errorMessage };
    }
}

export async function deletePopupAction(prevState: unknown, id: string): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        await client.delete(`/admin/system/popups/${id}`, axiosConfig);

        revalidatePath('/admin/system/banner');
        return { success: true, message: '팝업이 삭제되었습니다.' };
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : '삭제 중 오류 발생';
        console.error('Delete Popup Error:', error);
        return { success: false, message: errorMessage };
    }
}
