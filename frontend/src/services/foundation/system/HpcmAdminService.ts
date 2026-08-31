import { ApiService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';
import type { GeneratedOperationRequest } from '@/types/generated-operations';
import {
  deleteHpcmOperation,
  getHpcmListOperation,
  getHpcmOperation,
  insertHpcmOperation,
  updateHpcmOperation,
} from '@/types/generated-operations';

export interface Hpcm {
  hlpSn?: number;
  hlpSeCd?: string;
  hlpDfn?: string;
  hlpExpln?: string;
  frstRgtrId?: string;
  lastMdfrId?: string;
}

class HpcmAdminService extends ApiService {
  constructor() {
    super('help/hpcm'); // /api/v1/help/hpcm
  }

  /** 도움말 목록 조회 */
  async getHpcmList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Hpcm>> {
    const sort = Array.isArray(params?.sort)
      ? params.sort.filter((value): value is string => typeof value === 'string')
      : typeof params?.sort === 'string'
        ? [params.sort]
        : undefined;
    const generatedConfig = config ? { ...config } : undefined;
    if (generatedConfig) delete generatedConfig.params;
    return this.executeGenerated(getHpcmListOperation, {
      query: {
        ...(params?.keyword !== undefined || params?.searchKeyword !== undefined || params?.searchWrd !== undefined
          ? { keyword: params.keyword ?? params.searchKeyword ?? params.searchWrd }
          : {}),
        ...(params?.page !== undefined ? { page: params.page } : {}),
        ...(params?.size !== undefined ? { size: params.size } : {}),
        ...(sort !== undefined ? { sort } : {}),
      },
      config: generatedConfig,
    }) as Promise<PageResponse<Hpcm>>;
  }

  /** 도움말 상세 조회 */
  async getHpcm(hlpSn: number, config?: AxiosRequestConfig): Promise<Hpcm> {
    return this.executeGenerated(getHpcmOperation, {
      path: { hlpSn },
      config,
    }) as Promise<Hpcm>;
  }

  /** 도움말 등록 */
  async createHpcm(data: Partial<Hpcm>, config?: AxiosRequestConfig): Promise<number> {
    return this.executeGenerated(insertHpcmOperation, {
      body: data as GeneratedOperationRequest<'insertHpcm'>,
      config,
    });
  }

  /** 도움말 수정 */
  async updateHpcm(hlpSn: number, data: Partial<Hpcm>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateHpcmOperation, {
      path: { hlpSn },
      body: data as GeneratedOperationRequest<'updateHpcm'>,
      config,
    });
  }

  /** 도움말 삭제 */
  async deleteHpcm(hlpSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteHpcmOperation, {
      path: { hlpSn },
      config,
    });
  }
}

export const hpcmAdminService = new HpcmAdminService();
