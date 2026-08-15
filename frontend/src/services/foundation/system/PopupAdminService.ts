import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { Popup } from '@/types/foundation/banner';

/**
 * 팝업李관리님쒕퉬님(Admin)
 */
class PopupAdminService extends AdminService {
  constructor() {
    super('/popups', 'system');
  }

  /** 팝업李목록 조회 */
  async getPopupList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Popup>> {
    return this.get<PageResponse<Popup>>('', { ...config, params });
  }

  /** 팝업李님곸꽭 조회 */
  async getPopup(popupSn: number, config?: AxiosRequestConfig): Promise<Popup> {
    return this.get<Popup>(`/${popupSn}`, config);
  }

  /** 팝업李등록 */
  async createPopup(data: Partial<Popup>, config?: AxiosRequestConfig): Promise<number> {
    return this.post<number>('', data, config);
  }

  /** 팝업李님섏젙 */
  async updatePopup(popupSn: number, data: Partial<Popup>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${popupSn}`, data, config);
  }

  /** 팝업李님삭제 */
  async deletePopup(popupSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${popupSn}`, config);
  }
}

export const popupAdminService = new PopupAdminService();
