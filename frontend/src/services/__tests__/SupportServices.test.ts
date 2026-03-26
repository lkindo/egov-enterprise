import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import * as pollService from '../poll/pollService';
import commentService from '../business/comment/commentService';
import fileService from '../file/fileService';
import * as securityService from '../security/securityService';

vi.mock('@/lib/api/client', () => ({
 default: {
 get: vi.fn(),
 post: vi.fn(),
 put: vi.fn(),
 delete: vi.fn(),
 }
}));

describe('Common Support Services', () => {
 beforeEach(() => vi.clearAllMocks());

 it('pollService calls correct endpoints', async () => {
 await pollService.getPollList({});
 expect(client.get).toHaveBeenCalledWith('/uss/olp/opm/listOnlinePollManage.do', expect.any(Object));
 });

 it('commentService calls correct endpoints', async () => {
 // Correct method is getComments
 await commentService.getComments({} as any);
 expect(client.get).toHaveBeenCalledWith('/v1/comments', expect.any(Object));
 });

 it('fileService calls correct endpoints', async () => {
 // Correct method is getAdminFileList
 await fileService.getAdminFileList({} as any);
 expect(client.get).toHaveBeenCalledWith('/admin/cmm/fms/selectFileList.do', expect.any(Object));
 });

 it('securityService calls correct endpoints', async () => {
 // Correct method is getAuthorList
 await securityService.getAuthorList({});
 expect(client.get).toHaveBeenCalledWith('/admin/system/authorities', expect.any(Object));
 });
});
