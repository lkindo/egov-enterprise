import { ApiService } from '@/services/core/ApiService';
import type { AxiosRequestConfig } from 'axios';
import type { GeneratedOperationResponse } from '@/types/generated-operations';
import {
  archiveOperation,
  createPageOperation,
  deleteDraftPageOperation,
  getHomeIntroOperation,
  getHomeOperation,
  getPageOperation,
  getPagesOperation,
  getPublishedPageOperation,
  getPublishedPagesOperation,
  getRevisionOperation,
  getRevisionsOperation,
  publishOperation,
  purgePageOperation,
  purgeRevisionOperation,
  saveDraftOperation,
  unarchiveOperation,
  unpublishOperation,
  updateHomeOperation,
} from '@/types/generated-operations';
import { createSection, normalizeCmsDocument, type CmsDocument } from '@/lib/cms/document';

const createRecoveryDocument = (): CmsDocument => ({ schemaVersion: 1, sections: [createSection([], 'one')] });

type PageList = GeneratedOperationResponse<typeof getPagesOperation>;
type PageDetailDto = GeneratedOperationResponse<typeof getPageOperation>;
type RevisionDetailDto = GeneratedOperationResponse<typeof getRevisionOperation>;
type PublishedDto = NonNullable<GeneratedOperationResponse<typeof getPublishedPageOperation>>;
type PublishedList = GeneratedOperationResponse<typeof getPublishedPagesOperation>;

/** DRAFT 는 한 번도 게시하지 않은 페이지, UNPUBLISHED 는 게시한 적이 있지만 지금은 내린 페이지다(ADR-0042). */
export type CmsPageStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';
export type CmsPageSummary = PageList['list'][number];
export type CmsPublishedPageSummary = PublishedList['list'][number];
export type CmsRevisionSummary = GeneratedOperationResponse<typeof getRevisionsOperation>[number];
/**
 * 관리 화면의 페이지 하나. `documentError` 는 저장된 초안을 지금 판정 규칙으로 읽지 못했을 때의 사유다 — 그때 `document` 는 빈
 * 본문 한 영역으로 대신 채워 편집기가 열리고, 화면은 그 사실을 알린다(지난 게시본 불러오기로 복구한다).
 */
export type CmsPageDetail = Omit<PageDetailDto, 'document'> & { document: CmsDocument; documentError?: string };
export type CmsRevisionDetail = Omit<RevisionDetailDto, 'document'> & { document: CmsDocument };
export type CmsPublishedPage = Omit<PublishedDto, 'document'> & { document: CmsDocument };
export type CmsHome = GeneratedOperationResponse<typeof getHomeOperation>;

export interface CmsPageInput {
  contsPathNm: string;
  contsTtl: string;
  contsExpln?: string;
  document: CmsDocument;
}

/**
 * 서버는 검증을 통과한 문서만 저장한다 — 읽은 문서가 형식에 맞지 않으면 화면이 조용히 고치지 않고 실패로 드러낸다. 초안은 미완성 칸을
 * 담을 수 있으므로(ADR-0042) 읽기는 초안 판정을 쓴다. 게시본은 게시 판정을 통과한 문서라 초안 판정도 통과한다.
 */
function readDocument(raw: unknown): CmsDocument {
  const result = normalizeCmsDocument(raw, 'draft');
  if (!result.ok) throw new Error(`콘텐츠 문서를 읽지 못했습니다. ${result.error}`);
  return result.document;
}

const withDocument = <T extends { document?: unknown }>(dto: T): Omit<T, 'document'> & { document: CmsDocument } =>
  ({ ...dto, document: readDocument(dto.document) });

/**
 * 관리 화면용 읽기. 저장된 초안을 지금 규칙으로 읽지 못해도 편집기를 열 수 있게 한다 — 판정 규칙을 좁히거나 형식을 올린 뒤 남은 옛 문서를
 * 운영자가 고칠 길이 없으면 페이지가 영영 열리지 않는다. 빈 본문 한 영역으로 대신하고 사유를 함께 준다. 게시본·업무 홈 소개 읽기는
 * 그대로 실패로 드러낸다(사용자 화면을 조용히 바꾸지 않는다).
 */
const withRecoverableDocument = <T extends { document?: unknown }>(dto: T):
  Omit<T, 'document'> & { document: CmsDocument; documentError?: string } => {
  const result = normalizeCmsDocument(dto.document, 'draft');
  if (result.ok) return { ...dto, document: result.document };
  return { ...dto, document: createRecoveryDocument(), documentError: result.error };
};

class CmsService extends ApiService {
  async getPages(params: { keyword?: string; status?: string; page?: number; size?: number },
    config?: AxiosRequestConfig): Promise<PageList> {
    return this.executeGenerated(getPagesOperation, {
      query: {
        ...(params.keyword ? { keyword: params.keyword } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.page !== undefined ? { page: params.page } : {}),
        ...(params.size !== undefined ? { size: params.size } : {}),
      },
      config,
    });
  }

  async getPage(contsSn: number, config?: AxiosRequestConfig): Promise<CmsPageDetail> {
    return withRecoverableDocument(await this.executeGenerated(getPageOperation, { path: { contsSn }, config }));
  }

  async createPage(input: CmsPageInput): Promise<number> {
    return this.executeGenerated(createPageOperation, {
      body: { ...input, document: input.document as unknown as Record<string, unknown> },
    });
  }

  async saveDraft(contsSn: number, input: CmsPageInput & { version: number }): Promise<CmsPageDetail> {
    return withRecoverableDocument(await this.executeGenerated(saveDraftOperation, {
      path: { contsSn },
      body: { ...input, document: input.document as unknown as Record<string, unknown> },
    }));
  }

  async publish(contsSn: number, version: number, rvsnRsn?: string): Promise<CmsPageDetail> {
    return withRecoverableDocument(await this.executeGenerated(publishOperation, {
      path: { contsSn },
      body: { version, ...(rvsnRsn ? { rvsnRsn } : {}) },
    }));
  }

  async unpublish(contsSn: number, version: number): Promise<CmsPageDetail> {
    return withRecoverableDocument(await this.executeGenerated(unpublishOperation, { path: { contsSn }, body: { version } }));
  }

  async archive(contsSn: number, version: number): Promise<CmsPageDetail> {
    return withRecoverableDocument(await this.executeGenerated(archiveOperation, { path: { contsSn }, body: { version } }));
  }

  async unarchive(contsSn: number, version: number): Promise<CmsPageDetail> {
    return withRecoverableDocument(await this.executeGenerated(unarchiveOperation, { path: { contsSn }, body: { version } }));
  }

  /** 한 번도 게시하지 않은 페이지를 지운다(ADR-0042). 게시한 적이 있으면 400 이다. */
  async deleteDraftPage(contsSn: number, version: number): Promise<void> {
    await this.executeGenerated(deleteDraftPageOperation, { path: { contsSn }, query: { version } });
  }

  /** 게시를 중지한 페이지를 파기한다(ADR-0042). 주소를 다시 입력받고 처리 근거 번호를 감사에 남긴다. */
  async purgePage(contsSn: number, input: { version: number; contsPathNm: string; caseReference: string }): Promise<void> {
    await this.executeGenerated(purgePageOperation, { path: { contsSn }, body: input });
  }

  /** 지난 게시본 하나를 파기한다(ADR-0042). 지금 보이는 게시본은 서버가 거부한다. */
  async purgeRevision(contsSn: number, contsRvsnSn: number, input: { version: number; caseReference: string }):
    Promise<CmsPageDetail> {
    return withRecoverableDocument(await this.executeGenerated(purgeRevisionOperation, {
      path: { contsSn, contsRvsnSn },
      body: input,
    }));
  }

  /** 사용자 화면의 안내 페이지 목록 — 게시 중인 페이지의 게시본 제목·요약, 최근 게시 순(ADR-0042). */
  async getPublishedPages(params: { keyword?: string; page?: number; size?: number },
    config?: AxiosRequestConfig): Promise<PublishedList> {
    return this.executeGenerated(getPublishedPagesOperation, {
      query: {
        ...(params.keyword ? { keyword: params.keyword } : {}),
        ...(params.page !== undefined ? { page: params.page } : {}),
        ...(params.size !== undefined ? { size: params.size } : {}),
      },
      config,
    });
  }

  async getRevisions(contsSn: number): Promise<CmsRevisionSummary[]> {
    return this.executeGenerated(getRevisionsOperation, { path: { contsSn } });
  }

  async getRevision(contsSn: number, contsRvsnSn: number): Promise<CmsRevisionDetail> {
    return withDocument(await this.executeGenerated(getRevisionOperation, { path: { contsSn, contsRvsnSn } }));
  }

  async getHome(): Promise<CmsHome> {
    return this.executeGenerated(getHomeOperation, {});
  }

  async updateHome(contsSn: number | null, version: number): Promise<CmsHome> {
    return this.executeGenerated(updateHomeOperation, {
      body: { version, ...(contsSn !== null ? { contsSn } : {}) },
    });
  }

  async getPublishedPage(contsPathNm: string, config?: AxiosRequestConfig): Promise<CmsPublishedPage> {
    const dto = await this.executeGenerated(getPublishedPageOperation, { path: { contsPathNm }, config });
    return withDocument(dto as PublishedDto);
  }

  /** 업무 홈 소개. 지정이 없거나 게시 중이 아니면 null 이다. */
  async getHomeIntro(): Promise<CmsPublishedPage | null> {
    // 지정이 없는 것이 기본이다 — 응답은 늘 객체이고 보일 게시본이 없으면 page 가 비어 있다.
    const { page } = await this.executeGenerated(getHomeIntroOperation, {});
    return page ? withDocument(page as PublishedDto) : null;
  }
}

export const cmsService = new CmsService();
