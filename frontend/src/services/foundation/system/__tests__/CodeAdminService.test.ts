vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { codeAdminService } from '../CodeAdminService';

vi.mock('@/lib/api/client', () => ({
 default: {
 get: vi.fn(),
 post: vi.fn(),
 put: vi.fn(),
 delete: vi.fn(),
 }
}));

describe('CodeAdminService', () => {
 beforeEach(() => vi.clearAllMocks());

 describe('Classification Code', () => {
 it('getClCodeList should call correct API', async () => {
 await codeAdminService.getClCodeList({ page: 1 });
 expect(client.get).toHaveBeenCalledWith('admin/system/codes/cl', { params: { page: 1 } });
 });

 it('createClCode should call post', async () => {
 const data = { clCode: 'CL01', clCodeNm: 'Test' };
 await codeAdminService.createClCode(data as any);
 expect(client.post).toHaveBeenCalledWith('admin/system/codes/cl', data, undefined);
 });

 it('updateClCode should handle string clCode', async () => {
 const data = { clCode: 'CL01', clCodeNm: 'Updated' };
 await codeAdminService.updateClCode('CL01', data as any);
 expect(client.put).toHaveBeenCalledWith('admin/system/codes/cl/CL01', data, undefined);
 });

 it('deleteClCode should call delete', async () => {
 await codeAdminService.deleteClCode('CL01');
 expect(client.delete).toHaveBeenCalledWith('admin/system/codes/cl/CL01', undefined);
 });
 });

 describe('Common Code', () => {
 it('getCmmnCodeList should call correct API', async () => {
 await codeAdminService.getCmmnCodeList({ page: 1 });
 expect(client.get).toHaveBeenCalledWith('admin/system/codes/cmmn', { params: { page: 1 } });
 });

 it('updateCmmnCode should use codeId from data', async () => {
 const data = { codeId: 'GRP01', codeIdNm: 'Group' };
 await codeAdminService.updateCmmnCode('GRP01', data as any);
 expect(client.put).toHaveBeenCalledWith('admin/system/codes/cmmn/GRP01', data, undefined);
 });
 });

 describe('Detail Code', () => {
 it('getDetailCodeList should call correct API', async () => {
 await codeAdminService.getDetailCodeList({ page: 1 });
 expect(client.get).toHaveBeenCalledWith('admin/system/codes/detail', { params: { page: 1 } });
 });

 it('getDetailCode should call with codeId and code', async () => {
 await codeAdminService.getDetailCode('GRP01', 'DET01');
 expect(client.get).toHaveBeenCalledWith('admin/system/codes/detail/GRP01/DET01', undefined);
 });

 it('deleteDetailCode should handle arguments', async () => {
 await codeAdminService.deleteDetailCode('GRP01', 'DET01');
 expect(client.delete).toHaveBeenCalledWith('admin/system/codes/detail/GRP01/DET01', undefined);
 });
 });
});
