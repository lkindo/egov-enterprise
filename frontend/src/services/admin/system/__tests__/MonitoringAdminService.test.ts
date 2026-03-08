import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { monitoringAdminService } from '../MonitoringAdminService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('MonitoringAdminService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getServerResourceLogs should call correct API', async () => {
    const params = { page: 1 };
    await monitoringAdminService.getServerResourceLogs(params);
    expect(client.get).toHaveBeenCalledWith(expect.stringContaining('/logs'), expect.objectContaining({ params }));
  });

  it('recordServerResource should call post with params', async () => {
    await monitoringAdminService.recordServerResource('SVR01', 'EQ01');
    expect(client.post).toHaveBeenCalledWith(expect.stringContaining('/logs/record'), null, expect.objectContaining({ params: { serverId: 'SVR01', serverEqpmnId: 'EQ01' } }));
  });

  it('getHttpMonList should call explicit path', async () => {
    await monitoringAdminService.getHttpMonList({ page: 1 });
    expect(client.get).toHaveBeenCalledWith('/admin/system/http-monitoring', expect.objectContaining({ params: { page: 1 } }));
  });

  it('createHttpMon should call post', async () => {
    const data = { sysId: 'SYS01' };
    await monitoringAdminService.createHttpMon(data);
    expect(client.post).toHaveBeenCalledWith('/admin/system/http-monitoring', data, undefined);
  });

  it('checkHttpStatus should call check endpoint', async () => {
    await monitoringAdminService.checkHttpStatus('SYS01');
    expect(client.post).toHaveBeenCalledWith('/admin/system/http-monitoring/SYS01/check', {}, undefined);
  });

  it('deleteHttpMon should call delete', async () => {
    await monitoringAdminService.deleteHttpMon('SYS01');
    expect(client.delete).toHaveBeenCalledWith('/admin/system/http-monitoring/SYS01', undefined);
  });

  it('getDbMntrngList should call correct API', async () => {
    await monitoringAdminService.getDbMntrngList({ page: 1 });
    expect(client.get).toHaveBeenCalledWith('/admin/system/db-monitoring', expect.objectContaining({ params: { page: 1 } }));
  });

  it('createDbMntrng should call post', async () => {
    const data = { dataSourcNm: 'DS01' };
    await monitoringAdminService.createDbMntrng(data);
    expect(client.post).toHaveBeenCalledWith('/admin/system/db-monitoring', data, undefined);
  });

  it('checkDbStatus should call check endpoint', async () => {
    await monitoringAdminService.checkDbStatus('DS01');
    expect(client.post).toHaveBeenCalledWith('/admin/system/db-monitoring/DS01/check', {}, undefined);
  });

  it('deleteDbMntrng should call delete', async () => {
    await monitoringAdminService.deleteDbMntrng('DS01');
    expect(client.delete).toHaveBeenCalledWith('/admin/system/db-monitoring/DS01', undefined);
  });

  it('getFileSysMntrngList should call correct API', async () => {
    await monitoringAdminService.getFileSysMntrngList({ page: 1 });
    expect(client.get).toHaveBeenCalledWith('/admin/system/filesys-monitoring', expect.objectContaining({ params: { page: 1 } }));
  });

  it('createFileSysMntrng should call post', async () => {
    const data = { fileSysId: 'FS01' };
    await monitoringAdminService.createFileSysMntrng(data);
    expect(client.post).toHaveBeenCalledWith('/admin/system/filesys-monitoring', data, undefined);
  });

  it('getProcessMonList should call correct API', async () => {
    await monitoringAdminService.getProcessMonList({ page: 1 });
    expect(client.get).toHaveBeenCalledWith('/admin/system/process-monitoring', expect.objectContaining({ params: { page: 1 } }));
  });

  it('getNetSvcMntrngList should call correct API', async () => {
    await monitoringAdminService.getNtwrkSvcMntrngList({ page: 1 });
    expect(client.get).toHaveBeenCalledWith('/admin/system/ntwrksvc-monitoring', expect.objectContaining({ params: { page: 1 } }));
  });

  it('checkNtwrkSvcStatus should call with query params', async () => {
    await monitoringAdminService.checkNtwrkSvcStatus('127.0.0.1', 8080);
    expect(client.post).toHaveBeenCalledWith('/admin/system/ntwrksvc-monitoring/check', null, expect.objectContaining({ params: { sysIp: '127.0.0.1', sysPort: 8080 } }));
  });

  it('deleteNtwrkSvcMntrng should call delete with params', async () => {
    await monitoringAdminService.deleteNtwrkSvcMntrng('127.0.0.1', 8080);
    expect(client.delete).toHaveBeenCalledWith('/admin/system/ntwrksvc-monitoring', expect.objectContaining({ params: { sysIp: '127.0.0.1', sysPort: 8080 } }));
  });
});
