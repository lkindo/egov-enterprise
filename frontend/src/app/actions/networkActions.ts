'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { networkAdminService, Network } from '@/services/foundation/system/NetworkAdminService';

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
            useAt: formData.get('useAt') as 'Y' | 'N',
        };

        if (ntwrkId) {
            await networkAdminService.updateNetwork(ntwrkId, data, axiosConfig);
        } else {
            await networkAdminService.createNetwork(data, axiosConfig);
        }

        revalidatePath('/admin/system/network');
        return { success: true, message: '?ㅽ듃?뚰겕 ?뺣낫媛 ??λ릺?덉뒿?덈떎.' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '?님以님ㅻ쪟 諛쒖깮';
        console.error('Save Network Error:', error);
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
        return { success: true, message: '?ㅽ듃?뚰겕 ?뺣낫媛 님젣?섏뿀?듬땲님' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '님젣 以님ㅻ쪟 諛쒖깮';
        console.error('Delete Network Error:', error);
        return { success: false, message: errorMessage };
    }
}
