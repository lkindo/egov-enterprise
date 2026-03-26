import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { Banner } from '@/types/foundation/banner';
import { AxiosRequestConfig } from 'axios';

/**
 * 배너 관리 서비스 (Admin)
 */
class BannerAdminService extends AdminService {
 constructor() {
 super('/banners');
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

 /** 배너 전체 트리용 조회 */
 async getReflectedBanners(config?: AxiosRequestConfig): Promise<Banner[]> {
 return this.get<Banner[]>('/reflected', config);
 }

 /** 배너 상세 조회 */
 async getBanner(id: string, config?: AxiosRequestConfig): Promise<Banner> {
 return this.get<Banner>(`/${id}`, config);
 }

 /** 배너 등록 */
 async createBanner(data: Partial<Banner>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('', data, config);
 }

 /** 배너 수정 */
 async updateBanner(id: string, data: Partial<Banner>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/${id}`, data, config);
 }

 /** 배너 삭제 */
 async deleteBanner(id: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/${id}`, config);
 }
}

export const bannerAdminService = new BannerAdminService();
