import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { addressbookUserService } from '../addressbook/AddressbookUserService';
import { communityUserService } from '../community/CommunityUserService';
import { deptJobUserService } from '../deptJob/DeptJobUserService';

vi.mock('@/lib/api/client', () => ({
 default: {
 get: vi.fn(),
 post: vi.fn(),
 put: vi.fn(),
 delete: vi.fn(),
 }
}));

describe('Comprehensive User Services', () => {
 beforeEach(() => vi.clearAllMocks());

 it('addressbookUserService calls correct endpoints', async () => {
 (client.get as any).mockResolvedValue({ result: { content: [] } });
 await addressbookUserService.getAddressBooks({ page번호: 1 });
 expect(client.get).toHaveBeenCalledWith('address-books', expect.any(Object));
 });

 it('communityUserService calls correct endpoints', async () => {
 await communityUserService.getCommunityList({} as any);
 // Path matches what UserService.get prepends/handles
 expect(client.get).toHaveBeenCalledWith('cop/cmy/selectCommuMasterList.do', expect.any(Object));
 });

 it('deptJobUserService calls correct endpoints', async () => {
 await deptJobUserService.getDeptJobs({ page: 0 });
 expect(client.get).toHaveBeenCalledWith('deptjob', expect.any(Object));
 });
});
