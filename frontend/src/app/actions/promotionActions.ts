'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import { Banner, Popup } from '@/types/foundation/banner';
import {
    createPopupOperation,
    deleteBannerOperation,
    deletePopupOperation,
    insertBannerOperation,
    updateBannerOperation,
    updatePopupOperation,
} from '@/types/generated-operations';
import { extractErrorMessage, extractFieldErrors } from './actionUtils';

interface ActionResponse {
    success: boolean;
    message: string;
    fieldErrors?: Record<string, string>;
}

interface SaveActionParams<T> {
    mode: 'create' | 'edit';
    data: T;
    id?: number;
}

// Banner Actions
export async function saveBannerAction(prevState: unknown, { mode, data, id }: SaveActionParams<Banner>): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        if (mode === 'create') {
            await executeGeneratedOperation(insertBannerOperation, { body: data, config: axiosConfig });
        } else {
            if (id === undefined) throw new Error('수정할 배너 ID가 없습니다.');
            await executeGeneratedOperation(updateBannerOperation, {
                path: { bnrSn: id },
                body: data,
                config: axiosConfig,
            });
        }

        revalidatePath('/admin/system/banner');
        revalidatePath('/');
        return { success: true, message: `배너가 ${mode === 'create' ? '등록' : '수정'}되었습니다.` };
    } catch (error) {
        const errorMessage = extractErrorMessage(error, '저장 중 오류 발생');
        const fieldErrors = extractFieldErrors(error);
        return { success: false, message: errorMessage, ...(fieldErrors ? { fieldErrors } : {}) };
    }
}

export async function deleteBannerAction(prevState: unknown, bnrSn: number): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        await executeGeneratedOperation(deleteBannerOperation, {
            path: { bnrSn },
            config: axiosConfig,
        });

        revalidatePath('/admin/system/banner');
        // [2026-08-09 비대칭 정정] 저장은 '/' 를 재검증하는데 삭제는 하지 않았다.
        //   그래서 배너를 지워도 **공개 첫 화면에는 캐시가 만료될 때까지 계속 보였다.**
        revalidatePath('/');
        return { success: true, message: '배너가 삭제되었습니다.' };
    } catch (error) {
        const errorMessage = extractErrorMessage(error, '삭제 중 오류 발생');
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
            await executeGeneratedOperation(createPopupOperation, { body: data, config: axiosConfig });
        } else {
            if (id === undefined) throw new Error('수정할 팝업 ID가 없습니다.');
            await executeGeneratedOperation(updatePopupOperation, {
                path: { popupSn: id },
                body: data,
                config: axiosConfig,
            });
        }

        revalidatePath('/admin/system/banner');
        revalidatePath('/');
        return { success: true, message: `팝업이 ${mode === 'create' ? '등록' : '수정'}되었습니다.` };
    } catch (error) {
        const errorMessage = extractErrorMessage(error, '저장 중 오류 발생');
        const fieldErrors = extractFieldErrors(error);
        return { success: false, message: errorMessage, ...(fieldErrors ? { fieldErrors } : {}) };
    }
}

export async function deletePopupAction(prevState: unknown, id: number): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        await executeGeneratedOperation(deletePopupOperation, {
            path: { popupSn: id },
            config: axiosConfig,
        });

        revalidatePath('/admin/system/banner');
        // 배너와 같은 비대칭이었다 — 지운 팝업이 공개 화면에 계속 떴다.
        revalidatePath('/');
        return { success: true, message: '팝업이 삭제되었습니다.' };
    } catch (error) {
        const errorMessage = extractErrorMessage(error, '삭제 중 오류 발생');
        return { success: false, message: errorMessage };
    }
}
