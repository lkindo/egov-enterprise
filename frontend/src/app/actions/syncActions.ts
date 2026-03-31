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
        return { success: true, message: '서버 정보가 저장되었습니다.' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '저장 중 오류 발생';
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
        return { success: true, message: '서버 정보가 삭제되었습니다.' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '삭제 중 오류 발생';
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
        return { success: true, message: '동기화 명령이 전송되었습니다.' };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '동기화 중 오류 발생';
        console.error('Execute Sync Error:', error);
        return { success: false, message: errorMessage };
    }
}
