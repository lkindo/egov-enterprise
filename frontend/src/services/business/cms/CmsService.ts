import { ApiService } from '@/services/core/ApiService';
import type { AxiosRequestConfig } from 'axios';
import type { GeneratedOperationResponse } from '@/types/generated-operations';
import {
  archiveOperation,
  createPageOperation,
  getHomeIntroOperation,
  getHomeOperation,
  getPageOperation,
  getPagesOperation,
  getPublishedPageOperation,
  getRevisionOperation,
  getRevisionsOperation,
  publishOperation,
  saveDraftOperation,
  unarchiveOperation,
  unpublishOperation,
  updateHomeOperation,
} from '@/types/generated-operations';
import { normalizeCmsDocument, type CmsDocument } from '@/lib/cms/document';

type PageList = GeneratedOperationResponse<typeof getPagesOperation>;
type PageDetailDto = GeneratedOperationResponse<typeof getPageOperation>;
type RevisionDetailDto = GeneratedOperationResponse<typeof getRevisionOperation>;
type PublishedDto = NonNullable<GeneratedOperationResponse<typeof getPublishedPageOperation>>;

export type CmsPageStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CmsPageSummary = PageList['list'][number];
export type CmsRevisionSummary = GeneratedOperationResponse<typeof getRevisionsOperation>[number];
export type CmsPageDetail = Omit<PageDetailDto, 'document'> & { document: CmsDocument };
export type CmsRevisionDetail = Omit<RevisionDetailDto, 'document'> & { document: CmsDocument };
export type CmsPublishedPage = Omit<PublishedDto, 'document'> & { document: CmsDocument };
export type CmsHome = GeneratedOperationResponse<typeof getHomeOperation>;

export interface CmsPageInput {
  contsPathNm: string;
  contsTtl: string;
  contsExpln?: string;
  document: CmsDocument;
}

/** 서버는 검증을 통과한 문서만 저장한다 — 읽은 문서가 형식에 맞지 않으면 화면이 조용히 고치지 않고 실패로 드러낸다. */
function readDocument(raw: unknown): CmsDocument {
  const result = normalizeCmsDocument(raw);
  if (!result.ok) throw new Error(`콘텐츠 문서를 읽지 못했습니다. ${result.error}`);
  return result.document;
}

const withDocument = <T extends { document?: unknown }>(dto: T): Omit<T, 'document'> & { document: CmsDocument } =>
  ({ ...dto, document: readDocument(dto.document) });

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
    return withDocument(await this.executeGenerated(getPageOperation, { path: { contsSn }, config }));
  }

  async createPage(input: CmsPageInput): Promise<number> {
    return this.executeGenerated(createPageOperation, {
      body: { ...input, document: input.document as unknown as Record<string, unknown> },
    });
  }

  async saveDraft(contsSn: number, input: CmsPageInput & { version: number }): Promise<CmsPageDetail> {
    return withDocument(await this.executeGenerated(saveDraftOperation, {
      path: { contsSn },
      body: { ...input, document: input.document as unknown as Record<string, unknown> },
    }));
  }

  async publish(contsSn: number, version: number, rvsnRsn?: string): Promise<CmsPageDetail> {
    return withDocument(await this.executeGenerated(publishOperation, {
      path: { contsSn },
      body: { version, ...(rvsnRsn ? { rvsnRsn } : {}) },
    }));
  }

  async unpublish(contsSn: number, version: number): Promise<CmsPageDetail> {
    return withDocument(await this.executeGenerated(unpublishOperation, { path: { contsSn }, body: { version } }));
  }

  async archive(contsSn: number, version: number): Promise<CmsPageDetail> {
    return withDocument(await this.executeGenerated(archiveOperation, { path: { contsSn }, body: { version } }));
  }

  async unarchive(contsSn: number, version: number): Promise<CmsPageDetail> {
    return withDocument(await this.executeGenerated(unarchiveOperation, { path: { contsSn }, body: { version } }));
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
