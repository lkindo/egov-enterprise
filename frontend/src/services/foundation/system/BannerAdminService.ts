import { AdminService } from '@/services/core/ApiService';
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
 const rawSort = params.sort;
 return {
 keyword: params.keyword || params.searchKeyword || params.searchWrd || '',
 ...(params.pageIndex !== undefined
 ? { page: Math.max(0, params.pageIndex - 1) }
 : params.page !== undefined
 ? { page: params.page }
 : params.pageNo !== undefined
 ? { page: Math.max(0, params.pageNo - 1) }
 : {}),
 ...(params.size !== undefined
 ? { size: params.size }
 : params.pageUnit !== undefined
 ? { size: params.pageUnit }
 : params.pageSize !== undefined
 ? { size: params.pageSize as number }
 : params.recordCountPerPage !== undefined
 ? { size: params.recordCountPerPage as number }
 : {}),
 ...(rawSort === undefined ? {} : { sort: rawSort as string[] }),
 };
}

function requireBannerPage(
 response: { list?: Banner[]; total?: number; page?: number; size?: number; totalPage?: number },
): PageResponse<Banner> {
 if (
 !Array.isArray(response.list)
 || typeof response.total !== 'number'
 || typeof response.page !== 'number'
 || typeof response.size !== 'number'
 || typeof response.totalPage !== 'number'
 ) {
 throw new Error('배너 페이지 응답이 필수 계약과 일치하지 않습니다.');
 }
 return response as PageResponse<Banner>;
}

/**
 * 배너 관리님쒕퉬님(Admin)
 */
class BannerAdminService extends AdminService {
 constructor() {
 super('/banners', 'system');
 }

 /** 배너 목록 조회 */
 async getBannerList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Banner>> {
 const response = await this.executeGenerated(getBannersOperation, {
 query: toBannerListQuery(params),
 config,
 });
 return requireBannerPage(response as PageResponse<Banner>);
 }

 /** 배너 전체 트리님조회 */
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

 /** 배너 님젣 */
 async deleteBanner(bnrSn: number, config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(deleteBannerOperation, { path: { bnrSn }, config });
 }
}

export const bannerAdminService = new BannerAdminService();
