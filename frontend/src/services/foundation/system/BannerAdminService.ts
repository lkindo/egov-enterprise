import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { Banner } from '@/types/foundation/banner';
import { AxiosRequestConfig } from 'axios';

/**
 * 배너 관리님쒕퉬님(Admin)
 */
class BannerAdminService extends AdminService {
 constructor() {
 super('/banners', 'system');
 }

 /** 배너 목록 조회 */
 async getBannerList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Banner>> {
 return this.get<PageResponse<Banner>>('', {
 ...config,
 params: {
 ...params,
 keyword: params?.searchKeyword || params?.searchWrd || '',
 },
 });
 }

 /** 배너 전체 트리님조회 */
 async getReflectedBanners(config?: AxiosRequestConfig): Promise<Banner[]> {
 return this.get<Banner[]>('/reflected', config);
 }

 /** 배너 상세 조회 */
 async getBanner(bnrSn: number, config?: AxiosRequestConfig): Promise<Banner> {
 return this.get<Banner>(`/${bnrSn}`, config);
 }

 /** 배너 등록 */
 async createBanner(data: Partial<Banner>, config?: AxiosRequestConfig): Promise<number> {
 return this.post<number>('', data, config);
 }

 /** 배너 수정 */
 async updateBanner(bnrSn: number, data: Partial<Banner>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/${bnrSn}`, data, config);
 }

 /** 배너 님젣 */
 async deleteBanner(bnrSn: number, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/${bnrSn}`, config);
 }
}

export const bannerAdminService = new BannerAdminService();
