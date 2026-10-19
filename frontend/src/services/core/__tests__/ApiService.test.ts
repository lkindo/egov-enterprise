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
  deleteDeptJobOperation,
  getDeptJobListOperation,
  getDeptJobOperation,
  uploadFilesOperation,
} from '@/types/generated-operations';

/*
 * 예시 서술자는 core 업무(부서 업무)다 — 생성물은 생성 계약(api-docs → 생성 서술자·Zod·타입)을 구성으로 줄이므로(Phase 2 10단계 10c)
 * 스크랩·댓글 서술자를 쓰면 그 기능이 빠진 구성에서 이 시험이 사라진 이름을 import 한다.
 */

vi.mock('@/lib/api/client', () => ({
 default: {
 getRaw: vi.fn(),
 requestRaw: vi.fn(),
 }
}));

class TestService extends ApiService {
 public async testGeneratedGet(deptTaskSn: number) {
  return this.executeGenerated(getDeptJobOperation, { path: { deptTaskSn } });
 }
 public async testGeneratedList(query: { page?: number; size?: number }) {
  return this.executeGenerated(getDeptJobListOperation, { query });
 }
 public async testGeneratedWrite(oldPassword: string, newPassword: string) {
  return this.executeGenerated(changePasswordOperation, { body: { oldPassword, newPassword } });
 }
 public async testGeneratedDelete(deptTaskSn: number) {
  return this.executeGenerated(deleteDeptJobOperation, { path: { deptTaskSn } });
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

 it('generated operation은 path와 응답을 같은 계약으로 검증한다', async () => {
  vi.mocked(client.getRaw).mockResolvedValue({
   success: true,
   code: 'S000',
   message: '성공',
   data: { deptTaskSn: 7, deptTaskNm: '문서' },
  });

  await expect(service.testGeneratedGet(7)).resolves.toMatchObject({ deptTaskSn: 7, deptTaskNm: '문서' });
  expect(client.getRaw).toHaveBeenCalledWith('dept-jobs/7', undefined);

  vi.mocked(client.getRaw).mockResolvedValueOnce({
   success: true,
   code: 'S000',
   message: '성공',
   data: { deptTaskSn: '7', deptTaskNm: '문서' },
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

  await service.testGeneratedList({ page: 1, size: 20 });
  expect(client.getRaw).toHaveBeenCalledWith('dept-jobs', { params: { page: 1, size: 20 } });

  await expect(service.testGeneratedList({ page: 1.5 })).rejects.toThrow(
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

  await service.testGeneratedWrite('old-password', 'New-password1!');
  expect(client.requestRaw).toHaveBeenCalledWith({
   url: 'users/me/password',
   method: 'put',
   data: { oldPassword: 'old-password', newPassword: 'New-password1!' },
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
  expect(client.requestRaw).toHaveBeenCalledWith({ url: 'dept-jobs/9', method: 'delete' });
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
