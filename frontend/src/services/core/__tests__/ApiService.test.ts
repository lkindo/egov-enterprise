vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { ApiService } from '../ApiService';
import { AxiosRequestConfig } from 'axios';
import {
  changePasswordOperation,
  deleteScrapOperation,
  getMyScrapListOperation,
  getScrapOperation,
  uploadFilesOperation,
} from '@/types/generated-operations';

vi.mock('@/lib/api/client', () => ({
 default: {
 get: vi.fn(),
 getRaw: vi.fn(),
 requestRaw: vi.fn(),
 post: vi.fn(),
 put: vi.fn(),
 delete: vi.fn(),
 patch: vi.fn(),
 }
}));

class TestService extends ApiService {
 constructor() {
 super('/test');
 }
 public async testGet<T>(path: string = '', config?: AxiosRequestConfig) { return this.get<T>(path, config); }
 public async testPost<T>(path: string = '', data?: unknown, config?: AxiosRequestConfig) { return this.post<T>(path, data, config); }
 public async testDelete<T>(path: string = '', config?: AxiosRequestConfig) { return this.delete<T>(path, config); }
 public async testGeneratedGet(scrapSn: number) {
  return this.executeGenerated(getScrapOperation, { path: { scrapSn } });
 }
 public async testGeneratedList(query: { pageIndex?: number; pageUnit?: number }) {
  return this.executeGenerated(getMyScrapListOperation, { query });
 }
 public async testGeneratedWrite(oldPassword: string, newPassword: string) {
  return this.executeGenerated(changePasswordOperation, { body: { oldPassword, newPassword } });
 }
 public async testGeneratedDelete(scrapSn: number) {
  return this.executeGenerated(deleteScrapOperation, { path: { scrapSn } });
 }
 public async testGeneratedMultipart(files: File[], config?: AxiosRequestConfig) {
  return this.executeGeneratedMultipart(uploadFilesOperation, { body: { files }, config });
 }
}

describe('ApiService', () => {
 let service: TestService;

 beforeEach(() => {
 vi.clearAllMocks();
 service = new TestService();
 });

 it('get should prepend baseURL correctly', async () => {
 await service.testGet('/list', { params: { id: 1 } });
 expect(client.get).toHaveBeenCalledWith('test/list', { params: { id: 1 } });
 });

 it('post should work with data', async () => {
 const data = { name: 'item' };
 await service.testPost('/create', data);
 expect(client.post).toHaveBeenCalledWith('test/create', data, undefined);
 });

 it('delete should work with correct path', async () => {
 await service.testDelete('/1');
 expect(client.delete).toHaveBeenCalledWith('test/1', undefined);
 });

 it('generated operation은 path와 응답을 같은 계약으로 검증한다', async () => {
  vi.mocked(client.getRaw).mockResolvedValue({
   success: true,
   code: 'S000',
   message: '성공',
   data: { scrapSn: 7, scrapNm: '문서', useYn: 'Y' },
  });

  await expect(service.testGeneratedGet(7)).resolves.toMatchObject({ scrapSn: 7, useYn: 'Y' });
  expect(client.getRaw).toHaveBeenCalledWith('scraps/7', undefined);

  vi.mocked(client.getRaw).mockResolvedValueOnce({
   success: true,
   code: 'S000',
   message: '성공',
   data: { scrapSn: '7', useYn: 'Y' },
  });
  await expect(service.testGeneratedGet(7)).rejects.toThrow(
   '생성 API 응답이 OpenAPI 계약과 일치하지 않습니다.',
  );
 });

 it('generated operation은 query의 이름과 타입을 검증한 뒤 전송한다', async () => {
  vi.mocked(client.getRaw).mockResolvedValue({
   success: true,
   code: 'S000',
   message: '성공',
   data: { list: [], total: 0, page: 1, size: 20, totalPage: 0 },
  });

  await service.testGeneratedList({ pageIndex: 1, pageUnit: 20 });
  expect(client.getRaw).toHaveBeenCalledWith('scraps', { params: { pageIndex: 1, pageUnit: 20 } });

  await expect(service.testGeneratedList({ pageIndex: 1.5 })).rejects.toThrow(
   '생성 API 쿼리 파라미터가 OpenAPI 계약과 일치하지 않습니다.',
  );
 });

 it('generated operation은 HTTP method와 request body를 descriptor에서 소유한다', async () => {
  vi.mocked(client.requestRaw).mockResolvedValue({
   success: true,
   code: 'S000',
   message: '성공',
   data: null,
  });

  await service.testGeneratedWrite('old-password', 'new-password');
  expect(client.requestRaw).toHaveBeenCalledWith({
   url: 'users/me/password',
   method: 'put',
   data: { oldPassword: 'old-password', newPassword: 'new-password' },
  });
 });

 it('void operation도 잘못된 URL generic 없이 실행한다', async () => {
  vi.mocked(client.requestRaw).mockResolvedValue({
   success: true,
   code: 'S000',
   message: '성공',
   data: null,
  });

  await expect(service.testGeneratedDelete(9)).resolves.toBeUndefined();
  expect(client.requestRaw).toHaveBeenCalledWith({ url: 'scraps/9', method: 'delete' });
 });

 it('multipart operation은 FormData와 boundary를 전용 adapter가 소유한다', async () => {
  const file = new File(['hello'], 'hello.txt');
  vi.mocked(client.requestRaw).mockResolvedValue({
   success: true,
   code: 'S000',
   message: '성공',
   data: 101,
  });

  await expect(service.testGeneratedMultipart([file], { timeout: 5000 })).resolves.toBe(101);
  expect(client.requestRaw).toHaveBeenCalledWith(expect.objectContaining({
   url: 'files',
   method: 'post',
   data: expect.any(FormData),
   timeout: 5000,
   headers: { 'Content-Type': undefined },
  }));
  const request = vi.mocked(client.requestRaw).mock.calls[0][0] as { data: FormData };
  expect(request.data.getAll('files')).toStrictEqual([file]);

  await expect(service.testGeneratedMultipart([file], {
   headers: { 'Content-Type': 'multipart/form-data' },
  })).rejects.toThrow('생성 API 요청 설정이 operation 계약을 덮어쓸 수 없습니다.');
 });
});
