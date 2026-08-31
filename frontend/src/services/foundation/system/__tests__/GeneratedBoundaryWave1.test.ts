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
import { authorAdminService } from '../AuthorAdminService';
import { ismAdminService, SANCTION_STATUS } from '../IsmAdminService';
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

    await expect(auditAdminService.getAuditLogs({ page: 0, size: 20, searchKeyword: 'login' }))
      .resolves.toBe(page);
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/logs/system', {
      params: { pageIndex: 1, pageUnit: 20, recordCountPerPage: 20, searchKeyword: 'login' },
    });
  });

  it('권한 상세의 operation path 변수를 안전하게 치환한다', async () => {
    const author = { authrtCd: 'ROLE_ADMIN', authrtNm: '관리자' };
    client.getRaw.mockResolvedValueOnce(success(author));

    await expect(authorAdminService.getAuthor('ROLE_ADMIN')).resolves.toBe(author);
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/authorities/ROLE_ADMIN', undefined);
  });

  it('권한별 역할 조회·전체 교체도 각각의 generated operation을 사용한다', async () => {
    const page = { list: [], total: 0, page: 1, size: 100, totalPage: 0 };
    client.getRaw.mockResolvedValueOnce(success(page));

    await expect(authorAdminService.getAuthorRoles('ROLE_ADMIN', { pageIndex: 1, pageUnit: 100 }))
      .resolves.toBe(page);
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/authorities/ROLE_ADMIN/roles', {
      params: { pageIndex: 1, pageUnit: 100 },
    });

    await authorAdminService.saveAuthorRoles('ROLE_ADMIN', ['ROLE_READ', 'ROLE_WRITE']);
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/system/authorities/ROLE_ADMIN/roles',
      method: 'post',
      data: ['ROLE_READ', 'ROLE_WRITE'],
    });
  });

  it('권한 생성 필수 필드가 누락되면 transport 전에 차단한다', async () => {
    await expect(authorAdminService.createAuthor({})).rejects.toThrow(
      '생성 API 요청이 OpenAPI 계약과 일치하지 않습니다.',
    );
    expect(client.requestRaw).not.toHaveBeenCalled();
  });

  it('ISM 승인 요청은 generated PATCH operation을 사용한다', async () => {
    await ismAdminService.confirmInfrmlSanctn(7, SANCTION_STATUS.REJECTED, '증빙 누락');

    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'informal-sanctions/7/confirm',
      method: 'patch',
      params: { confmAt: 'R', returnResn: '증빙 누락' },
    });
  });

  it('사용자 로그 목록은 generated operation과 정규화된 query를 사용한다', async () => {
    const page = { list: [], total: 0, page: 3, size: 25, totalPage: 0 };
    client.getRaw.mockResolvedValueOnce(success(page));

    await expect(systemLogAdminService.getUserLogs({ page: 2, size: 25, searchWrd: 'alice' }))
      .resolves.toBe(page);
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/logs/user', {
      params: { pageIndex: 3, pageUnit: 25, searchKeyword: 'alice' },
    });
  });

  it('템플릿 등록은 generated request/void envelope 계약을 사용한다', async () => {
    const template: TmplatInfo = {
      tmpltId: 'TMPLT_BASIC',
      tmpltNm: '기본',
      tmpltPath: '/templates/basic',
      tmpltSeCd: 'TMPT01',
      useYn: 'Y',
    };

    await expect(templateAdminService.createTemplate(template)).resolves.toBeUndefined();
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/system/templates',
      method: 'post',
      data: template,
    });
  });
});
