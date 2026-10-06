import { ApiService } from '@/services/core/ApiService';
import { copyPageResponse } from '@/services/core/page-response';
import type { PageResponse } from '@/types/foundation/system';
import type { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import {
  createManualOperation,
  deleteManualOperation,
  getManualOperation,
  getManualsOperation,
  updateManualOperation,
} from '@/types/generated-operations';

/** 온라인 매뉴얼의 현재 공개 표면. */
export interface ManualDto {
  onlnMnlSn?: number;
  onlnMnlNm: string;
  onlnMnlExpln: string;
  onlnMnlDfn: string;
  onlnMnlSeCd: string;
  frstRgtrId?: string;
  crtDt?: string;
}

export type ManualSearchParams = NonNullable<operations['getManuals']['parameters']['query']>;

function requireManual(item: components['schemas']['OnlineManualDto']): ManualDto {
  if (
    typeof item.onlnMnlNm !== 'string'
    || typeof item.onlnMnlSeCd !== 'string'
    || typeof item.onlnMnlDfn !== 'string'
    || typeof item.onlnMnlExpln !== 'string'
  ) {
    throw new Error('온라인 매뉴얼 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    ...(item.onlnMnlSn === undefined ? {} : { onlnMnlSn: item.onlnMnlSn }),
    onlnMnlNm: item.onlnMnlNm,
    onlnMnlExpln: item.onlnMnlExpln,
    onlnMnlDfn: item.onlnMnlDfn,
    onlnMnlSeCd: item.onlnMnlSeCd,
    ...(item.frstRgtrId === undefined ? {} : { frstRgtrId: item.frstRgtrId }),
    ...(item.crtDt === undefined ? {} : { crtDt: item.crtDt }),
  };
}

/** 백엔드 HelpApiController(`/api/v1/help/manuals`)와 연동하는 매뉴얼 관리 서비스. */
class ManualAdminService extends ApiService {
  async getManualList(
    params: ManualSearchParams = {},
    config?: AxiosRequestConfig,
  ): Promise<PageResponse<ManualDto>> {
    const response = await this.executeGenerated(getManualsOperation, { query: params, config });
    return copyPageResponse(response, '온라인 매뉴얼', requireManual);
  }

  async getManual(onlnMnlSn: number, config?: AxiosRequestConfig): Promise<ManualDto> {
    const response = await this.executeGenerated(getManualOperation, {
      path: { onlnMnlSn },
      config,
    });
    return requireManual(response);
  }

  async createManual(manual: ManualDto, config?: AxiosRequestConfig): Promise<number> {
    return this.executeGenerated(createManualOperation, { body: manual, config });
  }

  async updateManual(
    onlnMnlSn: number,
    manual: ManualDto,
    config?: AxiosRequestConfig,
  ): Promise<void> {
    return this.executeGenerated(updateManualOperation, {
      path: { onlnMnlSn },
      body: manual,
      config,
    });
  }

  async deleteManual(onlnMnlSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteManualOperation, { path: { onlnMnlSn }, config });
  }
}

export const manualAdminService = new ManualAdminService();
