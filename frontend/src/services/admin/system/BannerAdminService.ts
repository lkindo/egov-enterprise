import { UserService } from '@/services/core/ApiService';
import { Banner } from '@/types/banner';

class BannerAdminService extends UserService {
    constructor() {
        super('/banners');
    }

    async getBanners(params: { page?: number; size?: number; keyword?: string }, config?: any) {
        return this.get<any>('', { ...config, params });
    }

    async getReflectedBanners(config?: any) {
        return this.get<any>('/reflected', config);
    }

    async getBanner(bannerId: string, config?: any) {
        return this.get<any>(`/${bannerId}`, config);
    }

    async createBanner(data: Banner, config?: any) {
        return this.post<any>('', data, config);
    }

    async updateBanner(bannerId: string, data: Banner, config?: any) {
        return this.put<any>(`/${bannerId}`, data, config);
    }

    async deleteBanner(bannerId: string, config?: any) {
        return this.delete<any>(`/${bannerId}`, config);
    }
}

export const bannerAdminService = new BannerAdminService();