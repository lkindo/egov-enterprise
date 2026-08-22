'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { networkAdminService, Network } from '@/services/foundation/system/NetworkAdminService';
import { extractErrorMessage } from './actionUtils';

interface ActionResponse {
    success: boolean;
    message: string;
}

export async function saveNetworkAction(prevState: unknown, formData: FormData): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        const ntwrkId = formData.get('ntwrkId') as string;
        const data: Partial<Network> = {
            manageIem: formData.get('manageIem') as string,
            ntwrkIp: formData.get('ntwrkIp') as string,
            gtwy: formData.get('gtwy') as string,
            subnet: formData.get('subnet') as string,
            domnServer: formData.get('domnServer') as string,
            userNm: formData.get('userNm') as string,
            useYn: formData.get('useYn') as 'Y' | 'N',
        };

        if (ntwrkId) {
            await networkAdminService.updateNetwork(ntwrkId, data, axiosConfig);
        } else {
            await networkAdminService.createNetwork(data, axiosConfig);
        }

        revalidatePath('/admin/system/network');
        return { success: true, message: '네트워크 정보가 저장되었습니다.' };
    } catch (error) {
        const errorMessage = extractErrorMessage(error, '저장 중 오류 발생');
        return { success: false, message: errorMessage };
    }
}

export async function deleteNetworkAction(id: string): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        await networkAdminService.deleteNetwork(id, axiosConfig);

        revalidatePath('/admin/system/network');
        return { success: true, message: '네트워크 정보가 삭제되었습니다.' };
    } catch (error) {
        const errorMessage = extractErrorMessage(error, '삭제 중 오류 발생');
        return { success: false, message: errorMessage };
    }
}
