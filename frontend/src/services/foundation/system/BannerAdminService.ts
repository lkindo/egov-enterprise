import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { Banner } from '@/types/foundation/banner';
import { AxiosRequestConfig } from 'axios';

/**
 * 諛곕꼫 관리님쒕퉬님(Admin)
 */
class BannerAdminService extends AdminService {
 constructor() {
 super('/banners', 'content');
 }

 /** 諛곕꼫 紐⑸줉 조회 */
 async getBannerList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Banner>> {
 return this.get<PageResponse<Banner>>('', {
 ...config,
 params: {
 ...params,
 keyword: params?.searchKeyword || params?.searchWrd || '',
 },
 });
 }

 /** 諛곕꼫 ?꾩껜 ?몃━님조회 */
 async getReflectedBanners(config?: AxiosRequestConfig): Promise<Banner[]> {
 return this.get<Banner[]>('/reflected', config);
 }

 /** 諛곕꼫 상세 조회 */
 async getBanner(id: string, config?: AxiosRequestConfig): Promise<Banner> {
 return this.get<Banner>(`/${id}`, config);
 }

 /** 諛곕꼫 등록 */
 async createBanner(data: Partial<Banner>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('', data, config);
 }

 /** 諛곕꼫 ?섏젙 */
 async updateBanner(id: string, data: Partial<Banner>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/${id}`, data, config);
 }

 /** 諛곕꼫 님젣 */
 async deleteBanner(id: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/${id}`, config);
 }
}

export const bannerAdminService = new BannerAdminService();
