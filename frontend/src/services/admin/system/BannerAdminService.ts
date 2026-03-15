import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/system';
import { AxiosRequestConfig } from 'axios';

export interface Banner {
    bannerId: string;
    bannerNm: string;
    linkCours: string;
    bannerImage: string;
    bannerImageFile: string;
    bannerDc: string;
    reflctAt: 'Y' | 'N';
    userId: string;
    regDate: string;
}

/**
 * 배너 관리 서비스 (Admin)
 */
class BannerAdminService extends AdminService {
    constructor() {
        super('/banners');
    }

    /** 배너 목록 조회 */
    async getBannerList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Banner>> {
        const response = await this.get<any>('', {
            ...config,
            params: {
                ...params,
                keyword: params?.searchKeyword || params?.searchWrd || '',
            },
        });
        return response?.list ? response : { list: response?.result || [], total: response?.totalCount || 0, page: params?.pageIndex || 1, size: params?.size || 10, totalPage: 1 };
    }

    /** 배너 상세 조회 */
    async getBanner(id: string, config?: AxiosRequestConfig): Promise<Banner> {
        const response = await this.get<any>(`/${id}`, config);
        return response?.result || response;
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
