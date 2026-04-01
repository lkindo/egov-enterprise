'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { syncAdminService, SyncServer } from '@/services/foundation/system/SyncAdminService';

interface ActionResponse {
    success: boolean;
    message: string;
}

export async function saveSyncServerAction(prevState: unknown, formData: FormData): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        const serverId = formData.get('serverId') as string;
        const data: Partial<SyncServer> = {
            serverNm: formData.get('serverNm') as string,
            serverIp: formData.get('serverIp') as string,
            serverPort: Number(formData.get('serverPort')),
            targetDrctry: formData.get('targetDrctry') as string,
        };

        if (serverId) {
            await syncAdminService.updateSyncServer(serverId, data, axiosConfig);
        } else {
            await syncAdminService.createSyncServer(data, axiosConfig);
        }

        revalidatePath('/admin/system/sync-server');
        return { success: true, message: '?쒕쾭 ?뺣낫媛 ??λ릺?덉뒿?덈떎.' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '?님以님ㅻ쪟 諛쒖깮';
        console.error('Save Sync Server Error:', error);
        return { success: false, message: errorMessage };
    }
}

export async function deleteSyncServerAction(id: string): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        await syncAdminService.deleteSyncServer(id, axiosConfig);

        revalidatePath('/admin/system/sync-server');
        return { success: true, message: '?쒕쾭 ?뺣낫媛 님젣?섏뿀?듬땲님' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '님젣 以님ㅻ쪟 諛쒖깮';
        console.error('Delete Sync Server Error:', error);
        return { success: false, message: errorMessage };
    }
}

export async function executeSyncAction(id: string): Promise<ActionResponse> {
    try {
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

        await syncAdminService.executeSync(id, axiosConfig);

        revalidatePath('/admin/system/sync-server');
        return { success: true, message: '?숆린님紐낅졊님?꾩넚?섏뿀?듬땲님' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '?숆린님以님ㅻ쪟 諛쒖깮';
        console.error('Execute Sync Error:', error);
        return { success: false, message: errorMessage };
    }
}
