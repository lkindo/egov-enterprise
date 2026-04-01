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
            await client.post('/banners', data, axiosConfig);
        } else {
            await client.put(`/banners/${id}`, data, axiosConfig);
        }

        revalidatePath('/admin/system/banner');
        return { success: true, message: `諛곕꼫媛 ${mode === 'create' ? '등록' : '?섏젙'}?섏뿀?듬땲님` };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '?님以님ㅻ쪟 諛쒖깮';
        console.error('Save Banner Error:', error);
        return { success: false, message: errorMessage };
    }
}

export async function deleteBannerAction(prevState: unknown, id: string): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        await client.delete(`/banners/${id}`, axiosConfig);

        revalidatePath('/admin/system/banner');
        return { success: true, message: '諛곕꼫媛 님젣?섏뿀?듬땲님' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '님젣 以님ㅻ쪟 諛쒖깮';
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
            await client.post('/popups', data, axiosConfig);
        } else {
            await client.put(`/popups/${id}`, data, axiosConfig);
        }

        revalidatePath('/admin/system/banner');
        return { success: true, message: `?앹뾽님${mode === 'create' ? '등록' : '?섏젙'}?섏뿀?듬땲님` };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '?님以님ㅻ쪟 諛쒖깮';
        console.error('Save Popup Error:', error);
        return { success: false, message: errorMessage };
    }
}

export async function deletePopupAction(prevState: unknown, id: string): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        await client.delete(`/popups/${id}`, axiosConfig);

        revalidatePath('/admin/system/banner');
        return { success: true, message: '?앹뾽님님젣?섏뿀?듬땲님' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '님젣 以님ㅻ쪟 諛쒖깮';
        console.error('Delete Popup Error:', error);
        return { success: false, message: errorMessage };
    }
}
