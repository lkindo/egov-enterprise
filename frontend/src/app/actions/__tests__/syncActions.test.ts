import { vi, describe, it, expect, beforeEach } from 'vitest';
import { saveSyncServerAction, deleteSyncServerAction, executeSyncAction } from '../syncActions';
import { syncAdminService } from '@/services/foundation/system/SyncAdminService';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

vi.mock('next/headers', () => ({
 cookies: vi.fn(),
}));

vi.mock('next/cache', () => ({
 revalidatePath: vi.fn(),
}));

vi.mock('@/services/admin/system/SyncAdminService', () => ({
 syncAdminService: {
 createSyncServer: vi.fn(),
 updateSyncServer: vi.fn(),
 deleteSyncServer: vi.fn(),
 executeSync: vi.fn(),
 },
}));

describe('syncActions', () => {
 beforeEach(() => {
 vi.clearAllMocks();
 (cookies as any).mockResolvedValue({
 get: vi.fn().mockReturnValue({ value: 'token' }),
 });
 });

 describe('saveSyncServerAction', () => {
 it('should create a new sync server if serverId is missing', async () => {
 const formData = new FormData();
 formData.append('serverNm', 'Test Server');
 formData.append('serverIp', '127.0.0.1');
 formData.append('serverPort', '8080');
 formData.append('targetDrctry', '/tmp');

 const result = await saveSyncServerAction({}, formData);

 expect(syncAdminService.createSyncServer).toHaveBeenCalledWith(
 expect.objectContaining({ serverNm: 'Test Server' }),
 expect.any(Object)
 );
 expect(revalidatePath).toHaveBeenCalledWith('/admin/system/sync-server');
 expect(result.success).toBe(true);
 });

 it('should update existing sync server if serverId is provided', async () => {
 const formData = new FormData();
 formData.append('serverId', 'SERVER_001');
 formData.append('serverNm', 'Updated Server');

 const result = await saveSyncServerAction({}, formData);

 expect(syncAdminService.updateSyncServer).toHaveBeenCalledWith(
 'SERVER_001',
 expect.objectContaining({ serverNm: 'Updated Server' }),
 expect.any(Object)
 );
 expect(result.success).toBe(true);
 });

 it('should handle errors', async () => {
 const formData = new FormData();
 (syncAdminService.createSyncServer as any).mockRejectedValue(new Error('Save Failed'));

 const result = await saveSyncServerAction({}, formData);

 expect(result.success).toBe(false);
 expect(result.message).toBe('Save Failed');
 });
 });

 describe('deleteSyncServerAction', () => {
 it('should delete sync server and revalidate', async () => {
 const result = await deleteSyncServerAction('SERVER_001');

 expect(syncAdminService.deleteSyncServer).toHaveBeenCalledWith('SERVER_001', expect.any(Object));
 expect(revalidatePath).toHaveBeenCalledWith('/admin/system/sync-server');
 expect(result.success).toBe(true);
 });
 });

 describe('executeSyncAction', () => {
 it('should execute sync and revalidate', async () => {
 const result = await executeSyncAction('SERVER_001');

 expect(syncAdminService.executeSync).toHaveBeenCalledWith('SERVER_001', expect.any(Object));
 expect(revalidatePath).toHaveBeenCalledWith('/admin/system/sync-server');
 expect(result.success).toBe(true);
 });
 });
});
