import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { attachmentIntegrityService } from '../AttachmentIntegrityService';
import { auditAdminService } from '../AuditAdminService';
import { systemLogAdminService } from '../SystemLogAdminService';
import { templateAdminService, type TmplatInfo } from '../TemplateAdminService';

const success = <T,>(data: T) => ({
  success: true as const,
  code: 'S000',
  message: 'success',
  data,
});

describe('foundation system generated operation 경계', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.requestRaw.mockResolvedValue(success(null));
  });

  it('첨부 정합성 응답을 generated Zod 계약으로 검증한다', async () => {
    const report = {
      checked: 2,
      missing: 0,
      samples: [],
      storageRoot: '/data/files',
      storedFilesChecked: 2,
      orphanCandidates: 0,
      undecidable: 0,
      orphanSamples: [],
      healthy: true,
    };
    client.getRaw.mockResolvedValueOnce(success(report));

    await expect(attachmentIntegrityService.scan()).resolves.toBe(report);
    expect(client.getRaw).toHaveBeenCalledWith('admin/files/integrity', undefined);
  });

  it('첨부 정합성 필수 필드가 누락되면 화면에 전달하지 않는다', async () => {
    client.getRaw.mockResolvedValueOnce(success({ checked: 2 }));

    await expect(attachmentIntegrityService.scan()).rejects.toThrow(
      '생성 API 응답이 OpenAPI 계약과 일치하지 않습니다.',
    );
  });

  it('감사 로그 query는 OpenAPI 키만 전송한다', async () => {
    const page = { list: [], total: 0, page: 1, size: 20, totalPage: 0 };
    client.getRaw.mockResolvedValueOnce(success(page));

    await expect(auditAdminService.getAuditLogs({ page: 1, size: 20, searchKeyword: 'login' }))
      .resolves.toBe(page);
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/logs/system', {
      params: { page: 1, size: 20, searchKeyword: 'login' },
    });
  });
  it('사용자 로그 목록은 generated operation과 정규화된 query를 사용한다', async () => {
    const page = { list: [], total: 0, page: 3, size: 25, totalPage: 0 };
    client.getRaw.mockResolvedValueOnce(success(page));

    await expect(systemLogAdminService.getUserLogs({ page: 3, size: 25, searchWrd: 'alice' }))
      .resolves.toBe(page);
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/logs/user', {
      params: { page: 3, size: 25, searchKeyword: 'alice' },
    });
  });

  it('템플릿 등록은 generated request와 새 ID envelope 계약을 사용한다(ADR-0036)', async () => {
    const template: TmplatInfo = {
      tmpltId: 'TMPLT_BASIC',
      tmpltNm: '기본',
      tmpltPath: '/templates/basic',
      tmpltSeCd: 'TMPT01',
      useYn: 'Y',
    };

    // [ADR-0036] 자원을 만드는 POST 는 새 식별자를 data 로 돌려준다 — 템플릿 등록은 새 템플릿 ID 를 돌려준다(종전 void).
    client.requestRaw.mockResolvedValueOnce(success('TMPLT_NEW'));
    await expect(templateAdminService.createTemplate(template)).resolves.toBe('TMPLT_NEW');
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/system/templates',
      method: 'post',
      data: template,
    });
  });
});
