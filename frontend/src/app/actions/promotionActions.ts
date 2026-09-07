'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { bannerAdminService } from '@/services/foundation/system/BannerAdminService';
import { popupAdminService } from '@/services/foundation/system/PopupAdminService';
import { Banner, Popup } from '@/types/foundation/banner';
import { extractErrorMessage, extractFieldErrors } from './actionUtils';

/*
  [2026-09-07] 생성 실행기 직접 호출 → 서비스 위임.

  종전에는 이 파일만 `executeGeneratedOperation(insertBannerOperation, ...)` 처럼 디스크립터를
  직접 불렀고, 그 결과 BannerAdminService·PopupAdminService 의 등록·수정·삭제 6메서드가
  **같은 일을 하는 두 번째 경로로 살아 있으면서 아무도 부르지 않는 상태**가 됐다
  (operation-consumer-census 축 2 가 고아로 집계 — DEC-OPS-051).

  저장소의 다른 action 6개(code·comment·dept·menu·network·user)는 이미 서비스에 위임한다.
  서비스 메서드가 모두 `config?: AxiosRequestConfig` 를 받으므로 서버 컨텍스트의 쿠키 주입도
  그대로 통과한다 — action 은 서버 관심사(쿠키·revalidatePath·오류 정형화)만 갖고,
  operation 결속은 서비스 한 곳이 소유한다.
*/

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
            await bannerAdminService.createBanner(data, axiosConfig);
        } else {
            if (id === undefined) throw new Error('수정할 배너 ID가 없습니다.');
            await bannerAdminService.updateBanner(id, data, axiosConfig);
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

        await bannerAdminService.deleteBanner(bnrSn, axiosConfig);

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
            await popupAdminService.createPopup(data, axiosConfig);
        } else {
            if (id === undefined) throw new Error('수정할 팝업 ID가 없습니다.');
            await popupAdminService.updatePopup(id, data, axiosConfig);
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

        await popupAdminService.deletePopup(id, axiosConfig);

        revalidatePath('/admin/system/banner');
        // 배너와 같은 비대칭이었다 — 지운 팝업이 공개 화면에 계속 떴다.
        revalidatePath('/');
        return { success: true, message: '팝업이 삭제되었습니다.' };
    } catch (error) {
        const errorMessage = extractErrorMessage(error, '삭제 중 오류 발생');
        return { success: false, message: errorMessage };
    }
}
