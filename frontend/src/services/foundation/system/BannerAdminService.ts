import { ApiService } from '@/services/core/ApiService';
import { requirePageResponse } from '@/services/core/page-response';
import { toAdminPageQuery } from '@/services/core/admin-page-query';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { Banner } from '@/types/foundation/banner';
import { AxiosRequestConfig } from 'axios';
import type { operations } from '@/types/generated-api';
import {
 deleteBannerOperation,
 getBannerOperation,
 getBannersOperation,
 getReflectedBanners_1Operation,
 insertBannerOperation,
 type GeneratedOperationRequest,
 updateBannerOperation,
} from '@/types/generated-operations';

type BannerListQuery = NonNullable<operations['getBanners']['parameters']['query']>;

function toBannerListQuery(params?: SearchParams): BannerListQuery {
 if (!params) return { keyword: '' };
 return {
 keyword: params.keyword || params.searchKeyword || params.searchWrd || '',
 ...toAdminPageQuery(params),
 };
}

/**
 * 배너 관리 서비스 (Admin)
 */
class BannerAdminService extends ApiService {
 /** 배너 목록 조회 */
 async getBannerList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Banner>> {
 const response = await this.executeGenerated(getBannersOperation, {
 query: toBannerListQuery(params),
 config,
 });
 return requirePageResponse(response as PageResponse<Banner>, '배너');
 }

 /** 반영(게시)된 배너 목록 조회 */
 async getReflectedBanners(config?: AxiosRequestConfig): Promise<Banner[]> {
 return this.executeGenerated(getReflectedBanners_1Operation, { config }) as Promise<Banner[]>;
 }

 /** 배너 상세 조회 */
 async getBanner(bnrSn: number, config?: AxiosRequestConfig): Promise<Banner> {
 return this.executeGenerated(getBannerOperation, { path: { bnrSn }, config }) as Promise<Banner>;
 }

 /** 배너 등록 */
 async createBanner(data: Partial<Banner>, config?: AxiosRequestConfig): Promise<number> {
 return this.executeGenerated(insertBannerOperation, {
 body: data as GeneratedOperationRequest<'insertBanner'>,
 config,
 });
 }

 /** 배너 수정 */
 async updateBanner(bnrSn: number, data: Partial<Banner>, config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(updateBannerOperation, {
 path: { bnrSn },
 body: data as GeneratedOperationRequest<'updateBanner'>,
 config,
 });
 }

 /** 배너 삭제 */
 async deleteBanner(bnrSn: number, config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(deleteBannerOperation, { path: { bnrSn }, config });
 }
}

export const bannerAdminService = new BannerAdminService();
