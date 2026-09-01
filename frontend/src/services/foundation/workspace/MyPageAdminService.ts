import { AdminService } from '@/services/core/ApiService';
import type { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import {
  createContentOperation,
  deleteContentOperation,
  getContentsOperation,
  updateContentOperation,
} from '@/types/generated-operations';

interface MyPageContent {
  contsSn: number;
  cntntsNm: string;
  cntcUrl: string;
  cntntsUseYn: 'Y' | 'N';
  cntntsLinkUrl: string;
  cntntsDc: string;
}

type MyPageQuery = NonNullable<operations['getContents']['parameters']['query']>;

function requireMyPageContent(
  item: components['schemas']['MyPageContentDto'],
): MyPageContent {
  if (
    typeof item.contsSn !== 'number'
    || typeof item.cntntsNm !== 'string'
    || typeof item.cntcUrl !== 'string'
    || (item.cntntsUseYn !== 'Y' && item.cntntsUseYn !== 'N')
    || typeof item.cntntsLinkUrl !== 'string'
    || typeof item.cntntsDc !== 'string'
  ) {
    throw new Error('마이페이지 콘텐츠 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    contsSn: item.contsSn,
    cntntsNm: item.cntntsNm,
    cntcUrl: item.cntcUrl,
    cntntsUseYn: item.cntntsUseYn,
    cntntsLinkUrl: item.cntntsLinkUrl,
    cntntsDc: item.cntntsDc,
  };
}

/** 마이페이지 콘텐츠 관리 서비스(Admin). */
class MyPageAdminService extends AdminService {
  constructor() {
    super('/workspace/mypage/contents');
  }

  async getContents(params: MyPageQuery = {}, config?: AxiosRequestConfig): Promise<MyPageContent[]> {
    const response = await this.executeGenerated(getContentsOperation, { query: params, config });
    return response.map(requireMyPageContent);
  }

  async createContent(data: Partial<MyPageContent>, config?: AxiosRequestConfig): Promise<number> {
    return this.executeGenerated(createContentOperation, { body: data, config });
  }

  async updateContent(
    contsSn: number,
    data: Partial<MyPageContent>,
    config?: AxiosRequestConfig,
  ): Promise<void> {
    return this.executeGenerated(updateContentOperation, { path: { contsSn }, body: data, config });
  }

  async deleteContent(contsSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteContentOperation, { path: { contsSn }, config });
  }
}

export const myPageAdminService = new MyPageAdminService();
