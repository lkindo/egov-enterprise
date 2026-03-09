import { AdminService } from '@/services/core/ApiService';
import { Popup } from '@/types/banner';

class PopupAdminService extends AdminService {
    constructor() {
        super('/popups');
    }

    async getPopups(params: { page?: number; size?: number; searchWrd?: string }, config?: any) {
        // Override directly with client or use this if the backend handles /admin/system/popups
        return this.get<any>('', { ...config, params });
    }

    async getPopup(popupId: string, config?: any) {
        return this.get<any>(`/${popupId}`, config);
    }

    async createPopup(data: Popup, config?: any) {
        return this.post<any>('', data, config);
    }

    async updatePopup(popupId: string, data: Popup, config?: any) {
        return this.put<any>(`/${popupId}`, data, config);
    }

    async deletePopup(popupId: string, config?: any) {
        return this.delete<any>(`/${popupId}`, config);
    }
}

export const popupAdminService = new PopupAdminService();
