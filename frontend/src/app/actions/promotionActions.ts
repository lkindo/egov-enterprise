'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { Banner, Popup } from '@/types/foundation/banner';
import { extractErrorMessage } from './actionUtils';

interface ActionResponse {
    success: boolean;
    message: string;
}

interface SaveActionParams<T> {
    mode: 'create' | 'edit';
    data: T;
    id?: string | number;
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
    } catch (error) {
        const errorMessage = extractErrorMessage(error, '저장 중 오류 발생');
        console.error('Save Banner Error:', error);
        return { success: false, message: errorMessage };
    }
}

export async function deleteBannerAction(prevState: unknown, bnrSn: number): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        await client.delete(`/admin/system/banners/${bnrSn}`, axiosConfig);

        revalidatePath('/admin/system/banner');
        // [2026-08-09 비대칭 정정] 저장은 '/' 를 재검증하는데 삭제는 하지 않았다.
        //   그래서 배너를 지워도 **공개 첫 화면에는 캐시가 만료될 때까지 계속 보였다.**
        revalidatePath('/');
        return { success: true, message: '배너가 삭제되었습니다.' };
    } catch (error) {
        const errorMessage = extractErrorMessage(error, '삭제 중 오류 발생');
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
    } catch (error) {
        const errorMessage = extractErrorMessage(error, '저장 중 오류 발생');
        console.error('Save Popup Error:', error);
        return { success: false, message: errorMessage };
    }
}

export async function deletePopupAction(prevState: unknown, id: number): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        await client.delete(`/admin/system/popups/${id}`, axiosConfig);

        revalidatePath('/admin/system/banner');
        // 배너와 같은 비대칭이었다 — 지운 팝업이 공개 화면에 계속 떴다.
        revalidatePath('/');
        return { success: true, message: '팝업이 삭제되었습니다.' };
    } catch (error) {
        const errorMessage = extractErrorMessage(error, '삭제 중 오류 발생');
        console.error('Delete Popup Error:', error);
        return { success: false, message: errorMessage };
    }
}
